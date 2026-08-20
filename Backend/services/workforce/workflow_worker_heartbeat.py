from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from models.workflow_worker_heartbeat import (
    WorkflowWorkerHeartbeat,
)


DEFAULT_WORKER_STALE_SECONDS = 30


def _utcnow() -> datetime:
    return datetime.utcnow()


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


def _get_worker(
    db: Session,
    *,
    worker_id: str,
) -> WorkflowWorkerHeartbeat | None:
    owner = _clean_worker_id(
        worker_id
    )

    return (
        db.query(
            WorkflowWorkerHeartbeat
        )
        .filter(
            WorkflowWorkerHeartbeat.worker_id
            == owner
        )
        .one_or_none()
    )


def register_worker(
    db: Session,
    *,
    worker_id: str,
    company_id: str | None = None,
    now: datetime | None = None,
    commit: bool = True,
) -> WorkflowWorkerHeartbeat:
    owner = _clean_worker_id(
        worker_id
    )

    current_time = (
        now
        or _utcnow()
    )

    row = _get_worker(
        db,
        worker_id=owner,
    )

    if row is None:
        row = WorkflowWorkerHeartbeat(
            worker_id=owner,
            company_id=company_id,
            status="running",
            started_at=current_time,
            last_heartbeat_at=current_time,
            created_at=current_time,
            updated_at=current_time,
        )

        db.add(
            row
        )

    else:
        row.company_id = company_id
        row.status = "running"
        row.started_at = current_time
        row.last_heartbeat_at = current_time
        row.stopped_at = None
        row.last_error_at = None
        row.last_error_message = None
        row.updated_at = current_time

    if commit:
        db.commit()
        db.refresh(
            row
        )
    else:
        db.flush()

    return row


def heartbeat_worker(
    db: Session,
    *,
    worker_id: str,
    now: datetime | None = None,
    commit: bool = True,
) -> WorkflowWorkerHeartbeat:
    row = _get_worker(
        db,
        worker_id=worker_id,
    )

    if row is None:
        raise ValueError(
            "Workflow worker heartbeat row does not exist."
        )

    current_time = (
        now
        or _utcnow()
    )

    row.status = "running"
    row.last_heartbeat_at = current_time
    row.stopped_at = None
    row.updated_at = current_time

    if commit:
        db.commit()
        db.refresh(
            row
        )
    else:
        db.flush()

    return row


def record_worker_dispatch(
    db: Session,
    *,
    worker_id: str,
    dispatch_status: str,
    now: datetime | None = None,
    commit: bool = True,
) -> WorkflowWorkerHeartbeat:
    row = _get_worker(
        db,
        worker_id=worker_id,
    )

    if row is None:
        raise ValueError(
            "Workflow worker heartbeat row does not exist."
        )

    current_time = (
        now
        or _utcnow()
    )

    row.status = "running"
    row.last_heartbeat_at = current_time
    row.last_dispatch_at = current_time
    row.last_dispatch_status = str(
        dispatch_status
        or ""
    ).strip() or None
    row.updated_at = current_time

    if commit:
        db.commit()
        db.refresh(
            row
        )
    else:
        db.flush()

    return row


def record_worker_error(
    db: Session,
    *,
    worker_id: str,
    error_message: str,
    now: datetime | None = None,
    commit: bool = True,
) -> WorkflowWorkerHeartbeat:
    row = _get_worker(
        db,
        worker_id=worker_id,
    )

    if row is None:
        raise ValueError(
            "Workflow worker heartbeat row does not exist."
        )

    current_time = (
        now
        or _utcnow()
    )

    row.status = "running"
    row.last_heartbeat_at = current_time
    row.last_error_at = current_time
    row.last_error_message = str(
        error_message
        or ""
    ).strip() or None
    row.updated_at = current_time

    if commit:
        db.commit()
        db.refresh(
            row
        )
    else:
        db.flush()

    return row


def mark_worker_stopped(
    db: Session,
    *,
    worker_id: str,
    now: datetime | None = None,
    commit: bool = True,
) -> WorkflowWorkerHeartbeat:
    row = _get_worker(
        db,
        worker_id=worker_id,
    )

    if row is None:
        raise ValueError(
            "Workflow worker heartbeat row does not exist."
        )

    current_time = (
        now
        or _utcnow()
    )

    row.status = "stopped"
    row.stopped_at = current_time
    row.last_heartbeat_at = current_time
    row.updated_at = current_time

    if commit:
        db.commit()
        db.refresh(
            row
        )
    else:
        db.flush()

    return row


def worker_liveness_snapshot(
    worker: WorkflowWorkerHeartbeat,
    *,
    now: datetime | None = None,
    stale_seconds: int = DEFAULT_WORKER_STALE_SECONDS,
) -> dict[str, Any]:
    if stale_seconds <= 0:
        raise ValueError(
            "stale_seconds must be positive."
        )

    current_time = (
        now
        or _utcnow()
    )

    last_heartbeat = (
        worker.last_heartbeat_at
    )

    stale_after = (
        last_heartbeat
        + timedelta(
            seconds=stale_seconds
        )
        if last_heartbeat is not None
        else None
    )

    stopped = (
        str(
            worker.status
            or ""
        ).lower()
        == "stopped"
        or
        worker.stopped_at
        is not None
    )

    stale = (
        not stopped
        and
        stale_after is not None
        and
        stale_after <= current_time
    )

    alive = (
        not stopped
        and
        not stale
        and
        last_heartbeat
        is not None
    )

    if stopped:
        liveness = "stopped"
    elif stale:
        liveness = "stale"
    elif alive:
        liveness = "alive"
    else:
        liveness = "unknown"

    return {
        "worker_id": worker.worker_id,
        "company_id": worker.company_id,
        "status": worker.status,
        "liveness": liveness,
        "alive": alive,
        "stale": stale,
        "started_at": (
            worker.started_at.isoformat()
            if worker.started_at
            else None
        ),
        "last_heartbeat_at": (
            worker.last_heartbeat_at.isoformat()
            if worker.last_heartbeat_at
            else None
        ),
        "stale_after": (
            stale_after.isoformat()
            if stale_after
            else None
        ),
        "last_dispatch_at": (
            worker.last_dispatch_at.isoformat()
            if worker.last_dispatch_at
            else None
        ),
        "last_dispatch_status": (
            worker.last_dispatch_status
        ),
        "last_error_at": (
            worker.last_error_at.isoformat()
            if worker.last_error_at
            else None
        ),
        "last_error_message": (
            worker.last_error_message
        ),
        "stopped_at": (
            worker.stopped_at.isoformat()
            if worker.stopped_at
            else None
        ),
    }


def get_worker_liveness(
    db: Session,
    *,
    worker_id: str,
    now: datetime | None = None,
    stale_seconds: int = DEFAULT_WORKER_STALE_SECONDS,
) -> dict[str, Any] | None:
    row = _get_worker(
        db,
        worker_id=worker_id,
    )

    if row is None:
        return None

    return worker_liveness_snapshot(
        row,
        now=now,
        stale_seconds=stale_seconds,
    )


def list_worker_liveness(
    db: Session,
    *,
    company_id: str | None = None,
    now: datetime | None = None,
    stale_seconds: int = DEFAULT_WORKER_STALE_SECONDS,
) -> list[dict[str, Any]]:
    query = db.query(
        WorkflowWorkerHeartbeat
    )

    if company_id is not None:
        query = query.filter(
            WorkflowWorkerHeartbeat.company_id
            == company_id
        )

    rows = (
        query
        .order_by(
            WorkflowWorkerHeartbeat.worker_id.asc()
        )
        .all()
    )

    return [
        worker_liveness_snapshot(
            row,
            now=now,
            stale_seconds=stale_seconds,
        )
        for row in rows
    ]
