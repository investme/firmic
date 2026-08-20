from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from models.company import Company
from models.sonny_orchestration import (
    SonnyAgentAssignment,
    SonnyOrchestrationRun,
)
from models.sonny_workflow import (
    SonnyWorkflow,
    SonnyWorkflowStep,
)
from models.workforce_job import WorkforceJob

from services.sonny.workflow_leases import (
    DEFAULT_WORKFLOW_LEASE_SECONDS,
    claim_next_runnable_workflow,
    heartbeat_workflow_lease,
    release_workflow_lease,
    workflow_lease_owned_by,
)
from services.workforce.executor import (
    run_workflow_autonomously,
)
from services.workforce.workflow_retry import (
    reopen_failed_execution_for_retry,
    retry_policy_snapshot,
)


DEFAULT_DISPATCH_MAX_STEPS = 5


def _clean_worker_id(
    worker_id: str,
) -> str:
    value = str(
        worker_id or ""
    ).strip()

    if not value:
        raise ValueError(
            "worker_id is required."
        )

    return value


def _validate_max_steps(
    max_steps: int,
) -> int:
    try:
        value = int(
            max_steps
        )
    except (TypeError, ValueError):
        raise ValueError(
            "max_steps must be a positive integer."
        )

    if value <= 0:
        raise ValueError(
            "max_steps must be greater than zero."
        )

    return value


def _load_claimed_workflow(
    db: Session,
    *,
    workflow_id: str,
    worker_id: str,
) -> SonnyWorkflow:
    workflow = (
        db.query(SonnyWorkflow)
        .filter(
            SonnyWorkflow.id
            == workflow_id
        )
        .first()
    )

    if workflow is None:
        raise ValueError(
            "Claimed workflow no longer exists."
        )

    if not workflow_lease_owned_by(
        workflow,
        worker_id=worker_id,
    ):
        raise ValueError(
            "Workflow execution lease is no longer "
            "owned by this worker."
        )

    return workflow


def _load_workflow_company(
    db: Session,
    *,
    workflow: SonnyWorkflow,
) -> Company:
    company = (
        db.query(Company)
        .filter(
            Company.id
            == workflow.company_id
        )
        .first()
    )

    if company is None:
        raise ValueError(
            "Workflow company no longer exists."
        )

    return company



def _failed_current_step_execution(
    db: Session,
    *,
    workflow: SonnyWorkflow,
) -> dict[str, Any] | None:
    """
    Locate canonical failed execution state for the workflow's
    currently active step.

    No mutation occurs here.
    """

    if workflow.current_step_order is None:
        return None

    step = (
        db.query(SonnyWorkflowStep)
        .filter(
            SonnyWorkflowStep.workflow_id
            == workflow.id,
            SonnyWorkflowStep.step_order
            == workflow.current_step_order,
            SonnyWorkflowStep.status
            == "in_progress",
        )
        .first()
    )

    if step is None:
        return None

    assignment = (
        db.query(SonnyAgentAssignment)
        .filter(
            SonnyAgentAssignment.workflow_id
            == workflow.id,
            SonnyAgentAssignment.workflow_step_id
            == step.id,
            SonnyAgentAssignment.status
            == "failed",
        )
        .order_by(
            SonnyAgentAssignment.created_at.desc()
        )
        .first()
    )

    if assignment is None:
        return None

    run = (
        db.query(SonnyOrchestrationRun)
        .filter(
            SonnyOrchestrationRun.id
            == assignment.orchestration_run_id,
            SonnyOrchestrationRun.workflow_id
            == workflow.id,
        )
        .first()
    )

    if run is None:
        raise ValueError(
            "Failed workflow assignment has no "
            "orchestration run."
        )

    if str(run.status or "").lower() != "failed":
        raise ValueError(
            "Failed assignment orchestration run "
            "is not failed."
        )

    jobs = (
        db.query(WorkforceJob)
        .filter(
            WorkforceJob.source_type
            == "sonny_workflow",
            WorkforceJob.source_id
            == str(workflow.id),
        )
        .order_by(
            WorkforceJob.created_at.desc()
        )
        .all()
    )

    job = next(
        (
            item
            for item in jobs
            if str(
                (
                    item.metadata_json
                    or {}
                ).get(
                    "assignment_id"
                )
            )
            == str(assignment.id)
        ),
        None,
    )

    if job is None:
        raise ValueError(
            "Failed workflow assignment has no "
            "canonical WorkforceJob."
        )

    if str(job.status or "").lower() != "failed":
        raise ValueError(
            "Failed assignment WorkforceJob "
            "is not failed."
        )

    return {
        "step": step,
        "run": run,
        "assignment": assignment,
        "job": job,
        "policy": retry_policy_snapshot(
            run,
            assignment,
        ),
    }


def _reopen_failed_current_step(
    db: Session,
    *,
    workflow: SonnyWorkflow,
    actor_id: str,
) -> dict[str, Any] | None:
    """
    Reopen a failed current-step execution only when both the
    orchestration retry budget and assignment attempt budget
    still permit another attempt.
    """

    failed = _failed_current_step_execution(
        db,
        workflow=workflow,
    )

    if failed is None:
        return None

    policy = failed["policy"]

    if (
        not policy.get(
            "retry_available",
            False,
        )
        or not policy.get(
            "attempt_available",
            False,
        )
    ):
        return {
            "status": "exhausted",
            "workflow_step_id": (
                failed["step"].id
            ),
            "run_id": (
                failed["run"].id
            ),
            "assignment_id": (
                failed["assignment"].id
            ),
            "job_id": (
                failed["job"].id
            ),
            "policy": policy,
        }

    reopened = (
        reopen_failed_execution_for_retry(
            db,
            run=failed["run"],
            assignment=failed["assignment"],
            job=failed["job"],
            actor_id=actor_id,
            commit=False,
        )
    )

    return {
        "status": "reopened",
        "workflow_step_id": (
            failed["step"].id
        ),
        "run_id": (
            failed["run"].id
        ),
        "assignment_id": (
            failed["assignment"].id
        ),
        "job_id": (
            failed["job"].id
        ),
        "retry_count": (
            reopened["retry_count"]
        ),
        "max_retries": (
            reopened["max_retries"]
        ),
        "attempt_count": (
            reopened["attempt_count"]
        ),
        "max_attempts": (
            reopened["max_attempts"]
        ),
    }


def dispatch_next_workflow(
    db: Session,
    *,
    worker_id: str,
    lease_seconds: int = (
        DEFAULT_WORKFLOW_LEASE_SECONDS
    ),
    max_steps: int = (
        DEFAULT_DISPATCH_MAX_STEPS
    ),
    company_id: str | None = None,
    actor_id: str = "sonny",
) -> dict[str, Any]:
    """
    Claim and execute at most one runnable Sonny workflow.

    Transaction boundaries:

    1. Lease claim commits immediately.
    2. Ownership is revalidated.
    3. B7 runner executes with commit=False.
    4. Successful workflow mutations and lease release
       commit together.

    Failure recovery policy is intentionally minimal here.
    B8.3 will add bounded retry/failure behavior.
    """

    owner = _clean_worker_id(
        worker_id
    )

    bounded_steps = _validate_max_steps(
        max_steps
    )

    claimed = claim_next_runnable_workflow(
        db,
        worker_id=owner,
        lease_seconds=lease_seconds,
        company_id=company_id,
        commit=True,
    )

    if claimed is None:
        return {
            "status": "idle",
            "worker_id": owner,
            "workflow_id": None,
            "company_id": company_id,
            "runner_status": None,
            "steps_executed": 0,
            "runner_result": None,
            "lease_released": False,
        }

    workflow_id = str(
        claimed.id
    )

    claimed_company_id = str(
        claimed.company_id
    )

    try:
        heartbeat_workflow_lease(
            db,
            workflow_id=workflow_id,
            worker_id=owner,
            lease_seconds=lease_seconds,
            commit=True,
        )

        workflow = _load_claimed_workflow(
            db,
            workflow_id=workflow_id,
            worker_id=owner,
        )

        company = _load_workflow_company(
            db,
            workflow=workflow,
        )

        retry_reopen = (
            _reopen_failed_current_step(
                db,
                workflow=workflow,
                actor_id=actor_id,
            )
        )

        if (
            retry_reopen is not None
            and retry_reopen.get(
                "status"
            )
            == "exhausted"
        ):
            release_workflow_lease(
                db,
                workflow_id=workflow_id,
                worker_id=owner,
                commit=False,
            )

            db.commit()

            return {
                "status": "retry_exhausted",
                "worker_id": owner,
                "workflow_id": workflow_id,
                "company_id": claimed_company_id,
                "runner_status": "retry_exhausted",
                "steps_executed": 0,
                "runner_result": None,
                "retry_reopen": retry_reopen,
                "lease_released": True,
            }

        runner_result = (
            run_workflow_autonomously(
                db,
                company=company,
                workflow=workflow,
                actor_id=actor_id,
                max_steps=bounded_steps,
                commit=False,
            )
        )

        release_workflow_lease(
            db,
            workflow_id=workflow_id,
            worker_id=owner,
            commit=False,
        )

        db.commit()

        return {
            "status": "dispatched",
            "worker_id": owner,
            "workflow_id": workflow_id,
            "company_id": claimed_company_id,
            "runner_status": (
                runner_result.get(
                    "status"
                )
            ),
            "steps_executed": (
                runner_result.get(
                    "steps_executed",
                    0,
                )
            ),
            "runner_result": runner_result,
            "retry_reopen": retry_reopen,
            "lease_released": True,
        }

    except Exception as exc:
        # ----------------------------------------------------
        # B8.3 — canonical failed execution state was already
        # produced by the transaction-aware executor.
        #
        # Preserve that state, release the workflow lease, and
        # commit them together. A later dispatcher invocation
        # may reopen the failed execution if retry budgets
        # permit.
        # ----------------------------------------------------

        error_message = (
            str(exc).strip()
            or exc.__class__.__name__
        )

        try:
            workflow = (
                db.query(SonnyWorkflow)
                .filter(
                    SonnyWorkflow.id
                    == workflow_id
                )
                .first()
            )

            if workflow is None:
                db.rollback()
                raise

            if not workflow_lease_owned_by(
                workflow,
                worker_id=owner,
            ):
                db.rollback()
                raise

            failed_execution = (
                _failed_current_step_execution(
                    db,
                    workflow=workflow,
                )
            )

            failure_policy = (
                failed_execution.get(
                    "policy"
                )
                if failed_execution
                else None
            )

            release_workflow_lease(
                db,
                workflow_id=workflow_id,
                worker_id=owner,
                commit=False,
            )

            db.commit()

            return {
                "status": "failed",
                "worker_id": owner,
                "workflow_id": workflow_id,
                "company_id": claimed_company_id,
                "runner_status": "failed",
                "steps_executed": 0,
                "runner_result": None,
                "error_message": error_message,
                "retry_policy": failure_policy,
                "lease_released": True,
            }

        except Exception:
            db.rollback()
            raise



def dispatch_result_summary(
    result: dict[str, Any],
) -> dict[str, Any]:
    return {
        "status": result.get("status"),
        "worker_id": result.get(
            "worker_id"
        ),
        "workflow_id": result.get(
            "workflow_id"
        ),
        "company_id": result.get(
            "company_id"
        ),
        "runner_status": result.get(
            "runner_status"
        ),
        "steps_executed": result.get(
            "steps_executed",
            0,
        ),
        "lease_released": result.get(
            "lease_released",
            False,
        ),
    }
