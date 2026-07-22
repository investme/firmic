from __future__ import annotations

import datetime
from typing import Any

from sqlalchemy.orm import Session

from models.workforce_job import (
    WorkforceJob,
    WorkforceTimelineEvent,
)
from services.activity_service import record_activity
from services.workforce.dispatcher import dispatch_work


VALID_STATUSES = {
    "pending",
    "accepted",
    "working",
    "completed",
    "failed",
    "cancelled",
}


def clean(value: Any) -> str:
    return str(value or "").strip()


def clamp_progress(value: Any) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = 0
    return max(0, min(number, 100))


def add_timeline_event(
    db: Session,
    *,
    job: WorkforceJob,
    event_type: str,
    actor: str,
    title: str,
    description: str = "",
    status: str | None = None,
    progress: int | None = None,
    metadata: dict[str, Any] | None = None,
) -> WorkforceTimelineEvent:
    event = WorkforceTimelineEvent(
        company_id=job.company_id,
        job_id=job.id,
        event_type=clean(event_type),
        actor=clean(actor) or "Sonny",
        title=clean(title),
        description=clean(description) or None,
        status=clean(status) or None,
        progress=clamp_progress(progress) if progress is not None else None,
        event_metadata=metadata or None,
    )
    db.add(event)
    db.flush()
    return event


def create_workforce_job(
    db: Session,
    *,
    company: Any,
    request_text: str,
    title: str | None = None,
    preferred_agent: str | None = None,
    actor_id: str | None = None,
    source_type: str = "manual",
    source_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> WorkforceJob:
    request_text = clean(request_text)

    if not request_text:
        raise ValueError("Work request cannot be empty.")

    dispatch = dispatch_work(
        request_text=request_text,
        preferred_agent=preferred_agent,
    )

    job = WorkforceJob(
        company_id=str(company.id),
        title=clean(title) or request_text[:120],
        request_text=request_text,
        assigned_agent=dispatch["agent_name"],
        assigned_role=dispatch["agent_role"],
        status="pending",
        progress=0,
        source_type=clean(source_type) or "manual",
        source_id=clean(source_id) or None,
        metadata_json={
            **(metadata or {}),
            "dispatch": dispatch,
        },
    )
    db.add(job)
    db.flush()

    add_timeline_event(
        db,
        job=job,
        event_type="request_received",
        actor="Sonny",
        title="Sonny accepted the founder request",
        description=request_text,
        status="pending",
        progress=0,
    )

    add_timeline_event(
        db,
        job=job,
        event_type="work_delegated",
        actor="Sonny",
        title=f"Delegated to {job.assigned_agent}",
        description=dispatch["reason"],
        status="accepted",
        progress=10,
        metadata={"dispatch_confidence": dispatch["confidence"]},
    )

    job.status = "accepted"
    job.progress = 10
    job.accepted_at = datetime.datetime.utcnow()

    record_activity(
        db,
        company_id=str(company.id),
        event_type="workforce_job_created",
        title=f"{job.assigned_agent} received new work",
        description=job.title,
        actor_type="sonny",
        actor_id=clean(actor_id) or "sonny",
        source_type="workforce_job",
        source_id=job.id,
        metadata={
            "assigned_agent": job.assigned_agent,
            "assigned_role": job.assigned_role,
            "status": job.status,
            "progress": job.progress,
        },
        commit=False,
    )

    db.commit()
    db.refresh(job)
    return job


def update_workforce_job(
    db: Session,
    *,
    job: WorkforceJob,
    status: str,
    progress: int | None = None,
    result_summary: str | None = None,
    failure_reason: str | None = None,
    actor: str | None = None,
) -> WorkforceJob:
    normalized_status = clean(status).lower()

    if normalized_status not in VALID_STATUSES:
        raise ValueError(f"Unsupported workforce status: {normalized_status}")

    now = datetime.datetime.utcnow()
    next_progress = (
        clamp_progress(progress)
        if progress is not None
        else job.progress
    )

    if normalized_status == "working":
        job.started_at = job.started_at or now
        next_progress = max(next_progress, 20)
    elif normalized_status == "completed":
        job.completed_at = now
        next_progress = 100
    elif normalized_status == "failed":
        job.failed_at = now
    elif normalized_status == "cancelled":
        next_progress = min(next_progress, 99)

    job.status = normalized_status
    job.progress = next_progress
    job.result_summary = clean(result_summary) or job.result_summary
    job.failure_reason = clean(failure_reason) or job.failure_reason

    event_titles = {
        "pending": "Work is pending",
        "accepted": f"{job.assigned_agent} accepted the work",
        "working": f"{job.assigned_agent} started working",
        "completed": f"{job.assigned_agent} completed the work",
        "failed": f"{job.assigned_agent} could not complete the work",
        "cancelled": "The workforce job was cancelled",
    }

    add_timeline_event(
        db,
        job=job,
        event_type=f"job_{normalized_status}",
        actor=clean(actor) or job.assigned_agent,
        title=event_titles[normalized_status],
        description=(
            clean(result_summary)
            or clean(failure_reason)
            or f"Progress updated to {next_progress}%."
        ),
        status=normalized_status,
        progress=next_progress,
    )

    record_activity(
        db,
        company_id=job.company_id,
        event_type=f"workforce_job_{normalized_status}",
        title=event_titles[normalized_status],
        description=job.title,
        actor_type="ai_agent",
        actor_id=clean(actor) or job.assigned_agent,
        source_type="workforce_job",
        source_id=job.id,
        metadata={
            "assigned_agent": job.assigned_agent,
            "status": normalized_status,
            "progress": next_progress,
        },
        commit=False,
    )

    db.commit()
    db.refresh(job)
    return job


def serialize_timeline_event(
    event: WorkforceTimelineEvent,
) -> dict[str, Any]:
    return {
        "id": event.id,
        "job_id": event.job_id,
        "event_type": event.event_type,
        "actor": event.actor,
        "title": event.title,
        "description": event.description,
        "status": event.status,
        "progress": event.progress,
        "metadata": event.event_metadata,
        "created_at": (
            event.created_at.isoformat()
            if event.created_at
            else None
        ),
    }


def serialize_job(
    job: WorkforceJob,
    *,
    include_timeline: bool = True,
) -> dict[str, Any]:
    payload = {
        "id": job.id,
        "company_id": job.company_id,
        "title": job.title,
        "request_text": job.request_text,
        "assigned_agent": job.assigned_agent,
        "assigned_role": job.assigned_role,
        "status": job.status,
        "progress": job.progress,
        "result_summary": job.result_summary,
        "failure_reason": job.failure_reason,
        "source_type": job.source_type,
        "source_id": job.source_id,
        "metadata": job.metadata_json,
        "created_at": (
            job.created_at.isoformat()
            if job.created_at
            else None
        ),
        "updated_at": (
            job.updated_at.isoformat()
            if job.updated_at
            else None
        ),
        "completed_at": (
            job.completed_at.isoformat()
            if job.completed_at
            else None
        ),
    }

    if include_timeline:
        payload["timeline"] = [
            serialize_timeline_event(event)
            for event in job.timeline
        ]

    return payload
