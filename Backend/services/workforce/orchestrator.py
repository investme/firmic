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
from services.sonny.orchestration import (
    create_assignment,
    create_orchestration_run,
)


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


def create_sonny_workforce_orchestration(
    db: Session,
    *,
    company: Any,
    request_text: str,
    dispatch: dict[str, Any],
    actor_id: str | None = None,
    source_type: str = "manual",
    source_id: str | None = None,
    metadata: dict[str, Any] | None = None,
):
    """
    Create the canonical Sonny orchestration + assignment for a workforce request.

    Sonny remains the coordinator. Specialist execution is delegated through
    services.sonny.orchestration.create_assignment(), which enforces the
    tenant's active CompanyAIAgent workforce membership.
    """

    company_id = str(company.id)
    actor = clean(actor_id) or "sonny"

    agent_key = clean(dispatch.get("agent_key")).lower()
    capabilities = dispatch.get("capabilities") or []

    if not agent_key:
        raise ValueError("Workforce dispatch did not provide an agent key.")

    if not capabilities:
        raise ValueError(
            f"{dispatch.get('agent_name') or agent_key} has no dispatch capability."
        )

    required_capability = clean(capabilities[0])

    orchestration = create_orchestration_run(
        db,
        company_id=company_id,
        orchestration_type="workforce_request",
        created_by=actor,
        trigger_type=clean(source_type) or "manual",
        approval_required=False,
        input_payload={
            "request_text": request_text,
            "source_type": clean(source_type) or "manual",
            "source_id": clean(source_id) or None,
            "dispatch": dispatch,
            "metadata": metadata or {},
        },
        orchestration_metadata={
            "source": "workforce_orchestrator",
            "dispatch_agent": dispatch.get("agent_name"),
            "dispatch_agent_key": agent_key,
        },
        commit=False
    )

    assignment = create_assignment(
        db,
        run=orchestration,
        assignment_code=f"workforce:{agent_key}",
        title=request_text[:255],
        instructions=request_text,
        required_capability=required_capability,
        assigned_by="sonny",
        preferred_agent_code=agent_key,
        agent_code=agent_key,
        approval_required=False,
        confidence=float(dispatch.get("confidence") or 1.0),
        input_payload={
            "request_text": request_text,
            "source_type": clean(source_type) or "manual",
            "source_id": clean(source_id) or None,
            "metadata": metadata or {},
        },
        assignment_metadata={
            "source": "workforce_orchestrator",
            "requested_by": actor,
        },
        commit=False,
    )

    return orchestration, assignment



def ensure_workflow_assignment_job(
    db: Session,
    *,
    company: Any,
    workflow: Any,
    step: Any,
    run: Any,
    assignment: Any,
    actor_id: str = "sonny",
    commit: bool = True,
) -> WorkforceJob:
    """
    Ensure one canonical WorkforceJob exists for a workflow
    assignment that was already created by the Sonny workflow
    execution bridge.

    This function does NOT create another orchestration run or
    another SonnyAgentAssignment.

    Idempotency key:
        company_id + source_type=sonny_workflow
        + assignment_id in metadata_json
    """

    company_id = str(company.id)
    workflow_id = str(workflow.id)
    step_id = str(step.id)
    run_id = str(run.id)
    assignment_id = str(assignment.id)

    if str(workflow.company_id) != company_id:
        raise ValueError(
            "Workflow does not belong to the supplied company."
        )

    if str(step.workflow_id) != workflow_id:
        raise ValueError(
            "Workflow step does not belong to the workflow."
        )

    if str(assignment.company_id) != company_id:
        raise ValueError(
            "Assignment does not belong to the supplied company."
        )

    if str(assignment.workflow_id) != workflow_id:
        raise ValueError(
            "Assignment does not belong to the workflow."
        )

    if str(assignment.workflow_step_id) != step_id:
        raise ValueError(
            "Assignment does not belong to the workflow step."
        )

    if str(assignment.orchestration_run_id) != run_id:
        raise ValueError(
            "Assignment does not belong to the orchestration run."
        )

    if str(run.company_id) != company_id:
        raise ValueError(
            "Orchestration run does not belong to the company."
        )

    if str(run.workflow_id) != workflow_id:
        raise ValueError(
            "Orchestration run does not belong to the workflow."
        )

    # --------------------------------------------------------
    # Idempotency.
    #
    # SQLite/Postgres JSON querying differs, so keep this
    # deterministic and portable by narrowing on company +
    # source first, then validating metadata in Python.
    # --------------------------------------------------------

    candidates = (
        db.query(WorkforceJob)
        .filter(
            WorkforceJob.company_id == company_id,
            WorkforceJob.source_type == "sonny_workflow",
            WorkforceJob.source_id == workflow_id,
        )
        .order_by(WorkforceJob.created_at.asc())
        .all()
    )

    for existing in candidates:
        metadata = existing.metadata_json or {}

        if str(metadata.get("assignment_id") or "") == assignment_id:
            return existing

    assignment_metadata = (
        assignment.assignment_metadata or {}
    )

    agent_code = clean(
        assignment_metadata.get("agent_code")
    )

    assigned_agent = (
        agent_code
        or clean(getattr(assignment, "assigned_agent", None))
        or clean(getattr(assignment, "assigned_role", None))
        or clean(getattr(step, "assigned_role", None))
        or "AI Employee"
    )

    assigned_role = (
        clean(getattr(step, "assigned_role", None))
        or clean(getattr(assignment, "required_capability", None))
        or "AI Employee"
    )

    request_text = (
        clean(getattr(assignment, "instructions", None))
        or clean(getattr(step, "description", None))
        or clean(getattr(step, "title", None))
        or "Execute workflow step."
    )

    title = (
        clean(getattr(assignment, "title", None))
        or clean(getattr(step, "title", None))
        or request_text[:120]
    )

    job = WorkforceJob(
        company_id=company_id,
        title=title[:255],
        request_text=request_text,
        assigned_agent=assigned_agent[:80],
        assigned_role=assigned_role[:120],
        status="accepted",
        progress=10,
        source_type="sonny_workflow",
        source_id=workflow_id,
        metadata_json={
            "workflow_id": workflow_id,
            "workflow_step_id": step_id,
            "orchestration_run_id": run_id,
            "assignment_id": assignment_id,
            "agent_code": agent_code or None,
            "required_capability": (
                assignment.required_capability
            ),
            "action_code": assignment_metadata.get(
                "action_code"
            ),
            "delegation_status": assignment.status,
            "source": "sonny_workflow",
        },
        accepted_at=datetime.datetime.utcnow(),
    )

    db.add(job)
    db.flush()

    add_timeline_event(
        db,
        job=job,
        event_type="work_delegated",
        actor="Sonny",
        title=f"Delegated workflow step to {job.assigned_agent}",
        description=request_text,
        status="accepted",
        progress=10,
        metadata={
            "workflow_id": workflow_id,
            "workflow_step_id": step_id,
            "assignment_id": assignment_id,
            "orchestration_run_id": run_id,
        },
    )

    record_activity(
        db,
        company_id=company_id,
        event_type="workforce_job_created",
        title=f"{job.assigned_agent} received workflow work",
        description=job.title,
        actor_type="sonny",
        actor_id=clean(actor_id) or "sonny",
        source_type="workforce_job",
        source_id=job.id,
        metadata={
            "workflow_id": workflow_id,
            "workflow_step_id": step_id,
            "assignment_id": assignment_id,
            "orchestration_run_id": run_id,
            "assigned_agent": job.assigned_agent,
            "assigned_role": job.assigned_role,
            "status": job.status,
            "progress": job.progress,
        },
        commit=False,
    )

    if commit:
        db.commit()
        db.refresh(job)
    else:
        db.flush()

    return job


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

    orchestration, assignment = create_sonny_workforce_orchestration(
        db,
        company=company,
        request_text=request_text,
        dispatch=dispatch,
        actor_id=actor_id,
        source_type=source_type,
        source_id=source_id,
        metadata=metadata,
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
            "orchestration_run_id": orchestration.id,
            "assignment_id": assignment.id,
            "delegation_status": assignment.status,
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
    commit: bool = True) -> WorkforceJob:
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

    if commit:
        db.commit()
        db.refresh(job)
    else:
        db.flush()
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
