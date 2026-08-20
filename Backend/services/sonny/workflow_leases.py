from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from models.sonny_workflow import SonnyWorkflow


DEFAULT_WORKFLOW_LEASE_SECONDS = 120


def _utcnow() -> datetime:
    return datetime.utcnow()


def _validate_worker_id(worker_id: str) -> str:
    value = str(worker_id or "").strip()

    if not value:
        raise ValueError(
            "worker_id is required."
        )

    return value


def _validate_lease_seconds(
    lease_seconds: int,
) -> int:
    try:
        value = int(lease_seconds)
    except (TypeError, ValueError):
        raise ValueError(
            "lease_seconds must be a positive integer."
        )

    if value <= 0:
        raise ValueError(
            "lease_seconds must be greater than zero."
        )

    return value


def workflow_lease_is_active(
    workflow: SonnyWorkflow,
    *,
    now: datetime | None = None,
) -> bool:
    current_time = now or _utcnow()

    return bool(
        workflow.execution_claimed_by
        and workflow.execution_lease_expires_at
        and (
            workflow.execution_lease_expires_at
            > current_time
        )
    )


def workflow_lease_owned_by(
    workflow: SonnyWorkflow,
    *,
    worker_id: str,
    now: datetime | None = None,
) -> bool:
    owner = _validate_worker_id(
        worker_id
    )

    return bool(
        workflow.execution_claimed_by
        == owner
        and workflow_lease_is_active(
            workflow,
            now=now,
        )
    )


def claim_next_runnable_workflow(
    db: Session,
    *,
    worker_id: str,
    lease_seconds: int = (
        DEFAULT_WORKFLOW_LEASE_SECONDS
    ),
    company_id: str | None = None,
    commit: bool = True,
) -> SonnyWorkflow | None:
    """
    Atomically claim one runnable workflow.

    PostgreSQL FOR UPDATE SKIP LOCKED prevents concurrent
    workers from claiming the same candidate in the same
    claim window.

    A workflow is claimable when:
      - its business status is running;
      - it is unclaimed, or
      - its previous execution lease has expired.

    The database transaction should remain short. The caller
    should commit the claim before performing long-running
    autonomous execution.
    """

    owner = _validate_worker_id(
        worker_id
    )

    duration = _validate_lease_seconds(
        lease_seconds
    )

    now = _utcnow()
    lease_expires_at = (
        now
        + timedelta(
            seconds=duration,
        )
    )

    query = (
        db.query(SonnyWorkflow)
        .filter(
            SonnyWorkflow.status
            == "running",
            or_(
                SonnyWorkflow.execution_claimed_by
                .is_(None),
                SonnyWorkflow.execution_lease_expires_at
                .is_(None),
                SonnyWorkflow.execution_lease_expires_at
                <= now,
            ),
        )
    )

    if company_id is not None:
        query = query.filter(
            SonnyWorkflow.company_id
            == company_id
        )

    workflow = (
        query
        .order_by(
            SonnyWorkflow.updated_at.asc(),
            SonnyWorkflow.created_at.asc(),
            SonnyWorkflow.id.asc(),
        )
        .with_for_update(
            skip_locked=True,
        )
        .first()
    )

    if workflow is None:
        if commit:
            db.commit()
        else:
            db.flush()

        return None

    workflow.execution_claimed_by = owner
    workflow.execution_claimed_at = now
    workflow.execution_heartbeat_at = now
    workflow.execution_lease_expires_at = (
        lease_expires_at
    )

    if commit:
        db.commit()
        db.refresh(workflow)
    else:
        db.flush()

    return workflow


def heartbeat_workflow_lease(
    db: Session,
    *,
    workflow_id: str,
    worker_id: str,
    lease_seconds: int = (
        DEFAULT_WORKFLOW_LEASE_SECONDS
    ),
    commit: bool = True,
) -> SonnyWorkflow:
    """
    Extend a workflow lease only when worker_id currently
    owns that workflow.

    The row is locked while ownership is checked and the
    lease is extended.
    """

    owner = _validate_worker_id(
        worker_id
    )

    duration = _validate_lease_seconds(
        lease_seconds
    )

    now = _utcnow()

    workflow = (
        db.query(SonnyWorkflow)
        .filter(
            SonnyWorkflow.id
            == workflow_id
        )
        .with_for_update()
        .first()
    )

    if workflow is None:
        raise ValueError(
            "Workflow not found."
        )

    if (
        workflow.execution_claimed_by
        != owner
    ):
        raise ValueError(
            "Workflow lease is owned by another worker."
        )

    if (
        workflow.execution_lease_expires_at
        is None
        or workflow.execution_lease_expires_at
        <= now
    ):
        raise ValueError(
            "Workflow execution lease has expired."
        )

    workflow.execution_heartbeat_at = now
    workflow.execution_lease_expires_at = (
        now
        + timedelta(
            seconds=duration,
        )
    )

    if commit:
        db.commit()
        db.refresh(workflow)
    else:
        db.flush()

    return workflow


def release_workflow_lease(
    db: Session,
    *,
    workflow_id: str,
    worker_id: str,
    commit: bool = True,
) -> SonnyWorkflow:
    """
    Release a workflow lease only when worker_id owns it.

    Ownership validation and release occur while holding
    a row lock.
    """

    owner = _validate_worker_id(
        worker_id
    )

    workflow = (
        db.query(SonnyWorkflow)
        .filter(
            SonnyWorkflow.id
            == workflow_id
        )
        .with_for_update()
        .first()
    )

    if workflow is None:
        raise ValueError(
            "Workflow not found."
        )

    if (
        workflow.execution_claimed_by
        != owner
    ):
        raise ValueError(
            "Workflow lease is owned by another worker."
        )

    workflow.execution_claimed_by = None
    workflow.execution_claimed_at = None
    workflow.execution_heartbeat_at = None
    workflow.execution_lease_expires_at = None

    if commit:
        db.commit()
        db.refresh(workflow)
    else:
        db.flush()

    return workflow


def workflow_lease_snapshot(
    workflow: SonnyWorkflow,
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    current_time = now or _utcnow()

    return {
        "workflow_id": workflow.id,
        "status": workflow.status,
        "execution_claimed_by": (
            workflow.execution_claimed_by
        ),
        "execution_claimed_at": (
            workflow.execution_claimed_at
        ),
        "execution_heartbeat_at": (
            workflow.execution_heartbeat_at
        ),
        "execution_lease_expires_at": (
            workflow.execution_lease_expires_at
        ),
        "lease_active": (
            workflow_lease_is_active(
                workflow,
                now=current_time,
            )
        ),
    }
