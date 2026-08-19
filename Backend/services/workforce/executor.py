from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from models.company import Company
from models.sonny_orchestration import (
    SonnyAgentAssignment,
    SonnyOrchestrationRun,
)
from models.workforce_job import WorkforceJob
from models.sonny_workflow import SonnyWorkflow

from services.sonny.agent_registry import (
    validate_agent_assignment,
)
from services.sonny.executive_actions import (
    execute_action,
)
from services.sonny.orchestration import (
    accept_assignment,
    complete_assignment,
    complete_orchestration_run,
    fail_assignment,
    fail_orchestration_run,
    require_company_agent_activation,
    start_assignment,
    start_orchestration_run,
)
from services.workforce.orchestrator import (
    update_workforce_job,
)
from services.sonny.workflows import (
    complete_workflow_step,
    ensure_workflow_step_assignment,
)


EXECUTOR_VERSION = "b5.6.5b"


FINANCE_CAPABILITY_ACTIONS = {
    "ledger_review": "inspect_usage_ledger",
    "billing_analysis": "inspect_usage_ledger",
    "billing_recommendation": "prepare_billing_action",
}


def clean(value: Any) -> str:
    return str(value or "").strip()


def normalize(value: Any) -> str:
    return clean(value).lower()


def resolve_assignment_action(
    assignment: SonnyAgentAssignment,
) -> str:
    """
    Resolve a bounded executable action.

    Explicit assignment.action_code always wins.

    B5.6 currently enables automatic execution only for Finance AI,
    using a fixed capability -> action mapping.
    """
    explicit = normalize(
        getattr(assignment, "action_code", None)
    )

    if explicit:
        return explicit

    agent_code = normalize(
        assignment.agent.agent_code
    )

    capability = normalize(
        assignment.required_capability
    )

    if agent_code == "finance_ai":
        action = FINANCE_CAPABILITY_ACTIONS.get(
            capability
        )

        if action:
            return action

    raise ValueError(
        f"No bounded execution action is configured for "
        f"agent '{agent_code}' and capability "
        f"'{capability}'."
    )


def build_execution_context(
    *,
    db: Session,
    company: Company,
    assignment: SonnyAgentAssignment,
    actor_id: str,
) -> dict[str, Any]:
    return {
        "db": db,
        "company": company,
        "actor_id": clean(actor_id) or "sonny",
        "assignment_id": assignment.id,
        "agent_code": assignment.agent.agent_code,
        "required_capability": (
            assignment.required_capability
        ),
    }


def execute_workforce_assignment(
    db: Session,
    *,
    company: Company,
    job: WorkforceJob,
    run: SonnyOrchestrationRun,
    assignment: SonnyAgentAssignment,
    actor_id: str = "sonny",
    commit: bool = True,
) -> dict[str, Any]:
    """
    Execute one canonical Firmic workforce assignment atomically.

    The executor:
      1. re-validates company/tenant ownership
      2. re-validates active tenant AI employment
      3. resolves a bounded allowlisted action
      4. starts orchestration + assignment
      5. executes the action
      6. completes assignment + orchestration + WorkforceJob
      7. commits once

    Any failure rolls back the complete execution transaction.
    """

    company_id = str(company.id)

    if str(job.company_id) != company_id:
        raise ValueError(
            "Workforce job does not belong to the verified company."
        )

    if str(run.company_id) != company_id:
        raise ValueError(
            "Orchestration run does not belong to the verified company."
        )

    if str(assignment.orchestration_run_id) != str(run.id):
        raise ValueError(
            "Assignment does not belong to the orchestration run."
        )

    agent = assignment.agent

    if agent is None:
        raise ValueError(
            "Assignment has no canonical agent."
        )

    # Re-check tenant workforce membership at execution time.
    require_company_agent_activation(
        db,
        company_id=company_id,
        agent=agent,
    )

    action_code = resolve_assignment_action(
        assignment
    )

    # Re-check canonical capability + action boundary.
    validate_agent_assignment(
        agent,
        required_capability=assignment.required_capability,
        action_code=action_code,
    )

    actor = clean(actor_id) or "sonny"

    try:
        # ----------------------------------------------------
        # Normalize lifecycle into runnable state.
        # ----------------------------------------------------

        if run.status == "approved":
            start_orchestration_run(
                db,
                run=run,
                actor_id=actor,
                commit=False,
            )
        elif run.status != "running":
            raise ValueError(
                f"Orchestration cannot execute from status "
                f"'{run.status}'."
            )

        if assignment.status == "approved":
            accept_assignment(
                db,
                run=run,
                assignment=assignment,
                commit=False,
            )

        if assignment.status == "accepted":
            start_assignment(
                db,
                run=run,
                assignment=assignment,
                commit=False,
            )
        elif assignment.status != "running":
            raise ValueError(
                f"Assignment cannot execute from status "
                f"'{assignment.status}'."
            )

        update_workforce_job(
            db,
            job=job,
            status="working",
            progress=40,
            actor=agent.agent_code,
            commit=False,
        )

        # ----------------------------------------------------
        # Perform the bounded agent action.
        # Finance B5.6 actions are read/prepare operations.
        # ----------------------------------------------------

        result = execute_action(
            context=build_execution_context(
                db=db,
                company=company,
                assignment=assignment,
                actor_id=actor,
            ),
            action_request={
                "action": action_code,
                "parameters": {
                    "company_id": company_id,
                },
                # These B5.6 Finance actions do not mutate
                # billing records.
                "requires_confirmation": False,
            },
            confirmed=False,
        )

        status = normalize(
            result.get("status")
        )

        if status != "completed":
            message = (
                clean(result.get("message"))
                or f"Execution returned status '{status}'."
            )

            raise RuntimeError(message)

        # ----------------------------------------------------
        # Persist successful result across all layers.
        # ----------------------------------------------------

        result_payload = {
            "executor_version": EXECUTOR_VERSION,
            "agent_code": agent.agent_code,
            "required_capability": (
                assignment.required_capability
            ),
            "action_code": action_code,
            "execution_result": result,
        }

        complete_assignment(
            db,
            run=run,
            assignment=assignment,
            result_payload=result_payload,
            commit=False,
        )

        # ----------------------------------------------------
        # B6.3 — advance linked workflow step atomically.
        #
        # Standalone B5 assignments have no workflow links and
        # therefore retain their existing execution lifecycle.
        # ----------------------------------------------------

        workflow_progression = None

        if assignment.workflow_id or assignment.workflow_step_id:
            if not (
                assignment.workflow_id
                and assignment.workflow_step_id
            ):
                raise ValueError(
                    "Workflow-linked assignment must include both "
                    "workflow_id and workflow_step_id."
                )

            workflow = (
                db.query(SonnyWorkflow)
                .filter(
                    SonnyWorkflow.id
                    == assignment.workflow_id,
                    SonnyWorkflow.company_id
                    == company_id,
                )
                .first()
            )

            if not workflow:
                raise ValueError(
                    "Linked workflow not found for assignment."
                )

            complete_workflow_step(
                db,
                workflow=workflow,
                step_id=assignment.workflow_step_id,
                actor_id=agent.agent_code,
                output=result_payload,
                commit=False,
            )

            # ------------------------------------------------
            # B6.4 — automatically establish the execution
            # boundary for the newly promoted workflow step.
            #
            # This does NOT execute the next assignment.
            # Actor-owned steps create no AI assignment.
            # Agent-owned steps receive an idempotent canonical
            # orchestration run + specialist assignment.
            #
            # commit=False preserves the executor as the single
            # outer transaction owner.
            # ------------------------------------------------

            next_step_assignment = None

            if (
                workflow.status == "running"
                and workflow.current_step_order is not None
            ):
                next_step = next(
                    (
                        item
                        for item in workflow.steps
                        if (
                            item.step_order
                            == workflow.current_step_order
                            and item.status == "in_progress"
                        )
                    ),
                    None,
                )

                if next_step:
                    next_step_assignment = (
                        ensure_workflow_step_assignment(
                            db,
                            workflow=workflow,
                            step=next_step,
                            actor_id="sonny",
                            commit=False,
                        )
                    )

            workflow_progression = {
                "workflow_id": workflow.id,
                "workflow_status": workflow.status,
                "workflow_step_id": (
                    assignment.workflow_step_id
                ),
                "current_step_order": (
                    workflow.current_step_order
                ),
                "progress_percent": (
                    workflow.progress_percent
                ),
                "next_step_assignment": (
                    {
                        "kind": next_step_assignment.get(
                            "kind"
                        ),
                        "created": next_step_assignment.get(
                            "created"
                        ),
                        "workflow_step_id": (
                            next_step_assignment.get(
                                "workflow_step_id"
                            )
                        ),
                        "assigned_role": (
                            next_step_assignment.get(
                                "assigned_role"
                            )
                        ),
                        "agent_code": (
                            next_step_assignment.get(
                                "agent_code"
                            )
                        ),
                        "required_capability": (
                            next_step_assignment.get(
                                "required_capability"
                            )
                        ),
                        "assignment_id": (
                            next_step_assignment[
                                "assignment"
                            ].id
                            if next_step_assignment.get(
                                "assignment"
                            )
                            else None
                        ),
                        "orchestration_run_id": (
                            next_step_assignment[
                                "run"
                            ].id
                            if next_step_assignment.get(
                                "run"
                            )
                            else None
                        ),
                    }
                    if next_step_assignment
                    else None
                ),
            }

        complete_orchestration_run(
            db,
            run=run,
            actor_id=actor,
            output_payload=result_payload,
            commit=False,
        )

        summary = (
            clean(result.get("message"))
            or f"{agent.name} completed the assignment."
        )

        update_workforce_job(
            db,
            job=job,
            status="completed",
            progress=100,
            result_summary=summary,
            actor=agent.agent_code,
            commit=False,
        )

        metadata = dict(
            job.metadata_json or {}
        )

        metadata["execution"] = {
            "executor_version": EXECUTOR_VERSION,
            "agent_code": agent.agent_code,
            "action_code": action_code,
            "assignment_id": assignment.id,
            "orchestration_run_id": run.id,
            "workflow_progression": workflow_progression,
            "status": "completed",
        }

        job.metadata_json = metadata

        if commit:
            db.commit()

            db.refresh(job)
            db.refresh(run)
            db.refresh(assignment)
        else:
            db.flush()

        return {
            "status": "completed",
            "job": job,
            "run": run,
            "assignment": assignment,
            "action_code": action_code,
            "result": result,
            "workflow_progression": workflow_progression,
        }

    except Exception:
        db.rollback()
        raise
