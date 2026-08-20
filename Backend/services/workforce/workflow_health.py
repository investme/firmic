from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.exc import (
    ProgrammingError,
)
from sqlalchemy.orm import Session

from models.sonny_orchestration import (
    SonnyAgentAssignment,
    SonnyOrchestrationRun,
)
from models.sonny_workflow import SonnyWorkflow
from models.workforce_job import WorkforceJob

from services.sonny.workflow_leases import (
    workflow_lease_is_active,
    workflow_lease_snapshot,
)
from services.workforce.workflow_retry import (
    assignment_attempt_available,
    orchestration_retry_available,
)

from services.workforce.workflow_worker_heartbeat import (
    DEFAULT_WORKER_STALE_SECONDS,
    list_worker_liveness,
)


def _utcnow() -> datetime:
    return datetime.utcnow()


def _iso(
    value: datetime | None,
) -> str | None:
    return (
        value.isoformat()
        if value is not None
        else None
    )


def _company_filter(
    query,
    model,
    company_id: str | None,
):
    if company_id is None:
        return query

    company_column = getattr(
        model,
        "company_id",
        None,
    )

    if company_column is None:
        return query

    return query.filter(
        company_column == company_id
    )


def _workflow_rows(
    db: Session,
    *,
    company_id: str | None,
) -> list[SonnyWorkflow]:
    query = db.query(
        SonnyWorkflow
    )

    if company_id is not None:
        query = query.filter(
            SonnyWorkflow.company_id
            == company_id
        )

    return query.all()


def _failure_rows(
    db: Session,
    *,
    company_id: str | None,
) -> tuple[
    list[SonnyOrchestrationRun],
    list[SonnyAgentAssignment],
    list[WorkforceJob],
]:
    run_query = (
        db.query(
            SonnyOrchestrationRun
        )
        .filter(
            SonnyOrchestrationRun.status
            == "failed"
        )
    )

    assignment_query = (
        db.query(
            SonnyAgentAssignment
        )
        .filter(
            SonnyAgentAssignment.status
            == "failed"
        )
    )

    job_query = (
        db.query(
            WorkforceJob
        )
        .filter(
            WorkforceJob.status
            == "failed"
        )
    )

    run_query = _company_filter(
        run_query,
        SonnyOrchestrationRun,
        company_id,
    )

    assignment_query = _company_filter(
        assignment_query,
        SonnyAgentAssignment,
        company_id,
    )

    job_query = _company_filter(
        job_query,
        WorkforceJob,
        company_id,
    )

    return (
        run_query.all(),
        assignment_query.all(),
        job_query.all(),
    )


def _worker_liveness_state(
    db: Session,
    *,
    company_id: str | None,
    now: datetime,
    stale_seconds: int,
) -> dict[str, Any]:
    """
    Read persistent worker-process liveness when the B9.2C
    heartbeat schema is available.

    Before the heartbeat migration is installed, return an
    explicit unavailable/unknown state rather than failing the
    entire execution-health snapshot.
    """
    try:
        workers = list_worker_liveness(
            db,
            company_id=company_id,
            now=now,
            stale_seconds=stale_seconds,
        )

    except ProgrammingError:
        db.rollback()

        return {
            "available": False,
            "liveness": "unknown",
            "alive": 0,
            "stale": 0,
            "stopped": 0,
            "unknown": 0,
            "workers": [],
            "reason": (
                "Persistent worker heartbeat schema is "
                "not installed."
            ),
        }

    alive = sum(
        item.get("liveness")
        == "alive"
        for item in workers
    )

    stale = sum(
        item.get("liveness")
        == "stale"
        for item in workers
    )

    stopped = sum(
        item.get("liveness")
        == "stopped"
        for item in workers
    )

    unknown = sum(
        item.get("liveness")
        not in {
            "alive",
            "stale",
            "stopped",
        }
        for item in workers
    )

    if alive:
        aggregate = "alive"
    elif stale:
        aggregate = "stale"
    elif stopped:
        aggregate = "stopped"
    elif workers:
        aggregate = "unknown"
    else:
        aggregate = "absent"

    return {
        "available": True,
        "liveness": aggregate,
        "alive": alive,
        "stale": stale,
        "stopped": stopped,
        "unknown": unknown,
        "workers": workers,
        "reason": (
            "Persistent worker heartbeat state loaded."
        ),
    }


def build_execution_health_snapshot(
    db: Session,
    *,
    company_id: str | None = None,
    now: datetime | None = None,
    worker_stale_seconds: int = DEFAULT_WORKER_STALE_SECONDS,
) -> dict[str, Any]:
    """
    Build a read-only operational snapshot of the B7/B8
    workflow execution runtime.

    This deliberately does NOT claim that the worker process
    itself is alive. Worker-process liveness is a separate
    B9.2 concern.

    No rows are mutated and no transaction is committed.
    """
    current_time = (
        now
        or _utcnow()
    )

    workflows = _workflow_rows(
        db,
        company_id=company_id,
    )

    failed_runs, failed_assignments, failed_jobs = (
        _failure_rows(
            db,
            company_id=company_id,
        )
    )

    worker_state = _worker_liveness_state(
        db,
        company_id=company_id,
        now=current_time,
        stale_seconds=worker_stale_seconds,
    )

    active_leases = []
    expired_leases = []
    non_runnable_leases = []

    for workflow in workflows:
        owner = str(
            workflow.execution_claimed_by
            or ""
        ).strip()

        if not owner:
            continue

        lease = workflow_lease_snapshot(
            workflow,
            now=current_time,
        )

        if bool(
            lease.get(
                "lease_active"
            )
        ):
            active_leases.append(
                lease
            )
        else:
            expired_leases.append(
                lease
            )

        if workflow.status not in {
            "running",
            "waiting",
        }:
            non_runnable_leases.append(
                lease
            )

    exhausted_runs = [
        run
        for run in failed_runs
        if not orchestration_retry_available(
            run
        )
    ]

    exhausted_assignments = [
        assignment
        for assignment in failed_assignments
        if not assignment_attempt_available(
            assignment
        )
    ]

    workflow_counts = {
        "total": len(
            workflows
        ),
        "draft": sum(
            workflow.status == "draft"
            for workflow in workflows
        ),
        "running": sum(
            workflow.status == "running"
            for workflow in workflows
        ),
        "waiting": sum(
            workflow.status == "waiting"
            for workflow in workflows
        ),
        "completed": sum(
            workflow.status == "completed"
            for workflow in workflows
        ),
        "cancelled": sum(
            workflow.status == "cancelled"
            for workflow in workflows
        ),
    }

    failure_counts = {
        "failed_runs": len(
            failed_runs
        ),
        "failed_assignments": len(
            failed_assignments
        ),
        "failed_jobs": len(
            failed_jobs
        ),
        "exhausted_runs": len(
            exhausted_runs
        ),
        "exhausted_assignments": len(
            exhausted_assignments
        ),
    }

    lease_counts = {
        "active": len(
            active_leases
        ),
        "expired": len(
            expired_leases
        ),
        "non_runnable_with_owner": len(
            non_runnable_leases
        ),
    }

    reasons: list[str] = []

    health_status = "healthy"

    if non_runnable_leases:
        health_status = "critical"
        reasons.append(
            "A non-runnable workflow still has execution "
            "lease ownership state."
        )

    if (
        exhausted_runs
        or exhausted_assignments
    ):
        if health_status != "critical":
            health_status = "degraded"

        reasons.append(
            "One or more execution retry/attempt budgets "
            "are exhausted."
        )

    if (
        expired_leases
        and health_status == "healthy"
    ):
        health_status = "degraded"

        reasons.append(
            "One or more workflow execution leases are expired "
            "and awaiting normal reclaim or cleanup."
        )

    if (
        failed_runs
        or failed_assignments
        or failed_jobs
    ):
        if health_status == "healthy":
            health_status = "degraded"

        reasons.append(
            "One or more failed execution records exist."
        )

    if (
        worker_state["available"]
        and worker_state["stale"] > 0
    ):
        if health_status == "healthy":
            health_status = "degraded"

        reasons.append(
            "One or more workflow workers have stale "
            "process heartbeats."
        )

    if (
        worker_state["available"]
        and worker_state["unknown"] > 0
        and health_status == "healthy"
    ):
        health_status = "degraded"

        reasons.append(
            "One or more workflow workers have unknown "
            "liveness state."
        )

    if not reasons:
        reasons.append(
            "No execution-runtime faults were detected."
        )

    return {
        "generated_at": _iso(
            current_time
        ),
        "scope": {
            "company_id": company_id,
            "global": (
                company_id is None
            ),
        },
        "health": {
            "status": health_status,
            "healthy": (
                health_status
                == "healthy"
            ),
            "reasons": reasons,
            "worker_process_liveness_known": (
                worker_state["available"]
            ),
        },
        "workflows": workflow_counts,
        "leases": {
            **lease_counts,
            "active_items": active_leases,
            "expired_items": expired_leases,
            "non_runnable_items": (
                non_runnable_leases
            ),
        },
        "failures": failure_counts,
        "worker": worker_state,
    }
