from __future__ import annotations

import datetime
import hashlib
import json
from typing import Any

from sqlalchemy.orm import Session

from models.sonny_automation import (
    SonnyAutomationAction,
    SonnyAutomationRun,
)
from models.sonny_decision import SonnyDecision
from models.company_ai_agent import CompanyAIAgent
from models.sonny_orchestration import (
    SonnyAgentAssignment,
    SonnyAgentMessage,
    SonnyOrchestrationRun,
)
from models.sonny_workflow import (
    SonnyWorkflow,
    SonnyWorkflowStep,
)
from services.activity_service import record_activity
from services.sonny.agent_registry import (
    get_agent_by_code,
    select_best_agent,
    serialize_agent,
    validate_agent_assignment,
)


RUN_FINAL_STATUSES = {
    "completed",
    "failed",
    "cancelled",
}

ASSIGNMENT_FINAL_STATUSES = {
    "completed",
    "failed",
    "cancelled",
}

ASSIGNMENT_ACTIVE_STATUSES = {
    "pending",
    "awaiting_approval",
    "approved",
    "accepted",
    "running",
}


def utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()


def stable_json(value: Any) -> str:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )


def make_key(payload: dict[str, Any]) -> str:
    return hashlib.sha256(
        stable_json(payload).encode("utf-8")
    ).hexdigest()


def build_orchestration_key(
    *,
    company_id: str,
    orchestration_type: str,
    decision_id: str | None,
    workflow_id: str | None,
    automation_run_id: str | None,
    input_payload: dict[str, Any] | None,
) -> str:
    return make_key(
        {
            "company_id": company_id,
            "orchestration_type": orchestration_type,
            "decision_id": decision_id,
            "workflow_id": workflow_id,
            "automation_run_id": automation_run_id,
            "input_payload": input_payload or {},
        }
    )


def build_assignment_key(
    *,
    company_id: str,
    orchestration_run_id: str,
    assignment_code: str,
    agent_code: str,
    required_capability: str,
    automation_action_id: str | None,
    workflow_step_id: str | None,
    input_payload: dict[str, Any] | None,
) -> str:
    return make_key(
        {
            "company_id": company_id,
            "orchestration_run_id": orchestration_run_id,
            "assignment_code": assignment_code,
            "agent_code": agent_code,
            "required_capability": required_capability,
            "automation_action_id": automation_action_id,
            "workflow_step_id": workflow_step_id,
            "input_payload": input_payload or {},
        }
    )


def build_message_key(
    *,
    assignment_id: str,
    sender_agent_code: str,
    recipient_agent_code: str,
    message_type: str,
    subject: str | None,
    content: str,
    message_data: dict[str, Any] | None,
) -> str:
    return make_key(
        {
            "assignment_id": assignment_id,
            "sender_agent_code": sender_agent_code,
            "recipient_agent_code": recipient_agent_code,
            "message_type": message_type,
            "subject": subject,
            "content": content,
            "message_data": message_data or {},
        }
    )


def serialize_message(
    message: SonnyAgentMessage,
) -> dict[str, Any]:
    return {
        "id": message.id,
        "assignment_id": message.assignment_id,
        "company_id": message.company_id,
        "sender_agent_code": message.sender_agent_code,
        "recipient_agent_code": message.recipient_agent_code,
        "message_type": message.message_type,
        "idempotency_key": message.idempotency_key,
        "subject": message.subject,
        "content": message.content,
        "message_data": message.message_data or {},
        "created_at": (
            message.created_at.isoformat()
            if message.created_at
            else None
        ),
    }


def serialize_assignment(
    assignment: SonnyAgentAssignment,
) -> dict[str, Any]:
    return {
        "id": assignment.id,
        "company_id": assignment.company_id,
        "agent_id": assignment.agent_id,
        "agent": (
            serialize_agent(assignment.agent)
            if assignment.agent
            else None
        ),
        "orchestration_run_id": assignment.orchestration_run_id,
        "automation_run_id": assignment.automation_run_id,
        "automation_action_id": assignment.automation_action_id,
        "workflow_id": assignment.workflow_id,
        "workflow_step_id": assignment.workflow_step_id,
        "assignment_code": assignment.assignment_code,
        "title": assignment.title,
        "instructions": assignment.instructions,
        "required_capability": assignment.required_capability,
        "idempotency_key": assignment.idempotency_key,
        "priority": assignment.priority,
        "status": assignment.status,
        "approval_required": bool(
            assignment.approval_required
        ),
        "approved_by": assignment.approved_by,
        "approved_at": (
            assignment.approved_at.isoformat()
            if assignment.approved_at
            else None
        ),
        "assigned_by": assignment.assigned_by,
        "assigned_at": (
            assignment.assigned_at.isoformat()
            if assignment.assigned_at
            else None
        ),
        "accepted_at": (
            assignment.accepted_at.isoformat()
            if assignment.accepted_at
            else None
        ),
        "started_at": (
            assignment.started_at.isoformat()
            if assignment.started_at
            else None
        ),
        "completed_at": (
            assignment.completed_at.isoformat()
            if assignment.completed_at
            else None
        ),
        "failed_at": (
            assignment.failed_at.isoformat()
            if assignment.failed_at
            else None
        ),
        "cancelled_at": (
            assignment.cancelled_at.isoformat()
            if assignment.cancelled_at
            else None
        ),
        "due_at": (
            assignment.due_at.isoformat()
            if assignment.due_at
            else None
        ),
        "attempt_count": assignment.attempt_count,
        "max_attempts": assignment.max_attempts,
        "confidence": round(
            float(assignment.confidence or 0),
            4,
        ),
        "input_payload": assignment.input_payload or {},
        "result_payload": assignment.result_payload or {},
        "error_message": assignment.error_message,
        "assignment_metadata": (
            assignment.assignment_metadata or {}
        ),
        "created_at": (
            assignment.created_at.isoformat()
            if assignment.created_at
            else None
        ),
        "updated_at": (
            assignment.updated_at.isoformat()
            if assignment.updated_at
            else None
        ),
        "messages": [
            serialize_message(message)
            for message in assignment.messages
        ],
    }


def serialize_orchestration_run(
    run: SonnyOrchestrationRun,
) -> dict[str, Any]:
    return {
        "id": run.id,
        "company_id": run.company_id,
        "decision_id": run.decision_id,
        "workflow_id": run.workflow_id,
        "automation_run_id": run.automation_run_id,
        "orchestration_type": run.orchestration_type,
        "trigger_type": run.trigger_type,
        "idempotency_key": run.idempotency_key,
        "status": run.status,
        "approval_required": bool(
            run.approval_required
        ),
        "approved_by": run.approved_by,
        "approved_at": (
            run.approved_at.isoformat()
            if run.approved_at
            else None
        ),
        "coordinator_agent_code": (
            run.coordinator_agent_code
        ),
        "started_at": (
            run.started_at.isoformat()
            if run.started_at
            else None
        ),
        "completed_at": (
            run.completed_at.isoformat()
            if run.completed_at
            else None
        ),
        "failed_at": (
            run.failed_at.isoformat()
            if run.failed_at
            else None
        ),
        "cancelled_at": (
            run.cancelled_at.isoformat()
            if run.cancelled_at
            else None
        ),
        "retry_count": run.retry_count,
        "max_retries": run.max_retries,
        "input_payload": run.input_payload or {},
        "output_payload": run.output_payload or {},
        "orchestration_metadata": (
            run.orchestration_metadata or {}
        ),
        "error_message": run.error_message,
        "created_by": run.created_by,
        "created_at": (
            run.created_at.isoformat()
            if run.created_at
            else None
        ),
        "updated_at": (
            run.updated_at.isoformat()
            if run.updated_at
            else None
        ),
        "metrics": {
            "total_assignments": len(run.assignments),
            "awaiting_approval": sum(
                item.status == "awaiting_approval"
                for item in run.assignments
            ),
            "approved": sum(
                item.status == "approved"
                for item in run.assignments
            ),
            "accepted": sum(
                item.status == "accepted"
                for item in run.assignments
            ),
            "running": sum(
                item.status == "running"
                for item in run.assignments
            ),
            "completed": sum(
                item.status == "completed"
                for item in run.assignments
            ),
            "failed": sum(
                item.status == "failed"
                for item in run.assignments
            ),
            "cancelled": sum(
                item.status == "cancelled"
                for item in run.assignments
            ),
        },
        "assignments": [
            serialize_assignment(assignment)
            for assignment in run.assignments
        ],
    }


def record_orchestration_activity(
    db: Session,
    *,
    run: SonnyOrchestrationRun,
    event_type: str,
    title: str,
    description: str,
    actor_type: str,
    actor_id: str | None,
    metadata: dict[str, Any] | None = None,
) -> None:
    record_activity(
        db,
        company_id=run.company_id,
        event_type=event_type,
        title=title,
        description=description,
        actor_type=actor_type,
        actor_id=actor_id,
        source_type="sonny_orchestration",
        source_id=run.id,
        metadata=metadata,
        commit=False,
    )


def validate_linked_records(
    db: Session,
    *,
    company_id: str,
    decision_id: str | None,
    workflow_id: str | None,
    automation_run_id: str | None,
) -> None:
    if decision_id:
        decision = (
            db.query(SonnyDecision)
            .filter(
                SonnyDecision.id == decision_id,
                SonnyDecision.company_id == company_id,
            )
            .first()
        )

        if not decision:
            raise ValueError(
                "Decision not found."
            )

        if decision.status not in {
            "approved",
            "completed",
        }:
            raise ValueError(
                "Orchestration requires an approved decision."
            )

    if workflow_id:
        workflow = (
            db.query(SonnyWorkflow)
            .filter(
                SonnyWorkflow.id == workflow_id,
                SonnyWorkflow.company_id == company_id,
            )
            .first()
        )

        if not workflow:
            raise ValueError(
                "Workflow not found."
            )

    if automation_run_id:
        automation_run = (
            db.query(SonnyAutomationRun)
            .filter(
                SonnyAutomationRun.id == automation_run_id,
                SonnyAutomationRun.company_id == company_id,
            )
            .first()
        )

        if not automation_run:
            raise ValueError(
                "Automation run not found."
            )


def create_orchestration_run(
    db: Session,
    *,
    company_id: str,
    orchestration_type: str,
    created_by: str,
    trigger_type: str = "manual",
    decision_id: str | None = None,
    workflow_id: str | None = None,
    automation_run_id: str | None = None,
    approval_required: bool = True,
    input_payload: dict[str, Any] | None = None,
    orchestration_metadata: dict[str, Any] | None = None,
    commit: bool = True
) -> SonnyOrchestrationRun:
    validate_linked_records(
        db,
        company_id=company_id,
        decision_id=decision_id,
        workflow_id=workflow_id,
        automation_run_id=automation_run_id,
    )

    key = build_orchestration_key(
        company_id=company_id,
        orchestration_type=orchestration_type,
        decision_id=decision_id,
        workflow_id=workflow_id,
        automation_run_id=automation_run_id,
        input_payload=input_payload,
    )

    existing = (
        db.query(SonnyOrchestrationRun)
        .filter(
            SonnyOrchestrationRun.company_id == company_id,
            SonnyOrchestrationRun.idempotency_key == key,
        )
        .first()
    )

    if existing:
        return existing

    run = SonnyOrchestrationRun(
        company_id=company_id,
        decision_id=decision_id,
        workflow_id=workflow_id,
        automation_run_id=automation_run_id,
        orchestration_type=orchestration_type,
        trigger_type=trigger_type,
        idempotency_key=key,
        status=(
            "awaiting_approval"
            if approval_required
            else "approved"
        ),
        approval_required=approval_required,
        approved_by=(
            None
            if approval_required
            else "system"
        ),
        approved_at=(
            None
            if approval_required
            else utcnow()
        ),
        coordinator_agent_code="sonny",
        input_payload=input_payload or {},
        output_payload={},
        orchestration_metadata=(
            orchestration_metadata or {}
        ),
        created_by=created_by,
    )

    db.add(run)
    db.flush()

    record_orchestration_activity(
        db,
        run=run,
        event_type="sonny_orchestration_created",
        title="Sonny orchestration created",
        description=orchestration_type,
        actor_type="tenant",
        actor_id=created_by,
        metadata={
            "decision_id": decision_id,
            "workflow_id": workflow_id,
            "automation_run_id": automation_run_id,
            "approval_required": approval_required,
        },
    )

    if commit:
        db.commit()
        db.refresh(run)
    else:
        db.flush()

    return run


def require_company_agent_activation(
    db: Session,
    *,
    company_id: str,
    agent,
) -> CompanyAIAgent | None:
    """
    Enforce tenant workforce membership for specialist execution.

    Sonny is the Firmic system coordinator and does not require a normal
    CompanyAIAgent employment row. All other registry-backed workers must be
    actively provisioned for the tenant before Sonny may delegate work to them.
    """

    if str(agent.agent_code or "").strip().lower() == "sonny":
        return None

    company_agent = (
        db.query(CompanyAIAgent)
        .filter(
            CompanyAIAgent.company_id == company_id,
            CompanyAIAgent.registry_agent_id == agent.id,
            CompanyAIAgent.status == "active",
        )
        .first()
    )

    if not company_agent:
        raise ValueError(
            f"{agent.name} is qualified for this work but is not active "
            "in this company's AI workforce."
        )

    return company_agent


def create_assignment(
    db: Session,
    *,
    run: SonnyOrchestrationRun,
    assignment_code: str,
    title: str,
    instructions: str,
    required_capability: str,
    assigned_by: str,
    action_code: str | None = None,
    preferred_agent_code: str | None = None,
    agent_code: str | None = None,
    priority: str = "medium",
    approval_required: bool = True,
    due_at: datetime.datetime | None = None,
    confidence: float = 1.0,
    input_payload: dict[str, Any] | None = None,
    automation_run_id: str | None = None,
    automation_action_id: str | None = None,
    workflow_id: str | None = None,
    workflow_step_id: str | None = None,
    assignment_metadata: dict[str, Any] | None = None,
    commit: bool = True
) -> SonnyAgentAssignment:
    if run.status in RUN_FINAL_STATUSES:
        raise ValueError(
            "Cannot add assignments to a final orchestration run."
        )

    if agent_code:
        agent = get_agent_by_code(
            db,
            agent_code=agent_code,
        )

        validate_agent_assignment(
            agent,
            required_capability=required_capability,
            action_code=action_code,
        )
    else:
        agent = select_best_agent(
            db,
            required_capability=required_capability,
            action_code=action_code,
            preferred_agent_code=preferred_agent_code,
        )

    company_agent = require_company_agent_activation(
        db,
        company_id=run.company_id,
        agent=agent,
    )

    if automation_run_id:
        automation_run = (
            db.query(SonnyAutomationRun)
            .filter(
                SonnyAutomationRun.id == automation_run_id,
                SonnyAutomationRun.company_id == run.company_id,
            )
            .first()
        )

        if not automation_run:
            raise ValueError(
                "Automation run not found."
            )

    if automation_action_id:
        automation_action = (
            db.query(SonnyAutomationAction)
            .filter(
                SonnyAutomationAction.id == automation_action_id,
                SonnyAutomationAction.company_id == run.company_id,
            )
            .first()
        )

        if not automation_action:
            raise ValueError(
                "Automation action not found."
            )

    if workflow_id:
        workflow = (
            db.query(SonnyWorkflow)
            .filter(
                SonnyWorkflow.id == workflow_id,
                SonnyWorkflow.company_id == run.company_id,
            )
            .first()
        )

        if not workflow:
            raise ValueError(
                "Workflow not found."
            )

    if workflow_step_id:
        step = (
            db.query(SonnyWorkflowStep)
            .filter(
                SonnyWorkflowStep.id == workflow_step_id,
            )
            .first()
        )

        if not step:
            raise ValueError(
                "Workflow step not found."
            )

    key = build_assignment_key(
        company_id=run.company_id,
        orchestration_run_id=run.id,
        assignment_code=assignment_code,
        agent_code=agent.agent_code,
        required_capability=required_capability,
        automation_action_id=automation_action_id,
        workflow_step_id=workflow_step_id,
        input_payload=input_payload,
    )

    existing = (
        db.query(SonnyAgentAssignment)
        .filter(
            SonnyAgentAssignment.company_id == run.company_id,
            SonnyAgentAssignment.idempotency_key == key,
        )
        .first()
    )

    if existing:
        return existing

    assignment = SonnyAgentAssignment(
        company_id=run.company_id,
        agent_id=agent.id,
        orchestration_run_id=run.id,
        automation_run_id=automation_run_id,
        automation_action_id=automation_action_id,
        workflow_id=workflow_id,
        workflow_step_id=workflow_step_id,
        assignment_code=assignment_code,
        title=title,
        instructions=instructions,
        required_capability=required_capability,
        idempotency_key=key,
        priority=priority,
        status=(
            "awaiting_approval"
            if approval_required
            else "approved"
        ),
        approval_required=approval_required,
        approved_by=(
            None
            if approval_required
            else "system"
        ),
        approved_at=(
            None
            if approval_required
            else utcnow()
        ),
        assigned_by=assigned_by,
        assigned_at=utcnow(),
        due_at=due_at,
        confidence=max(
            0.0,
            min(float(confidence), 1.0),
        ),
        input_payload=input_payload or {},
        result_payload={},
        assignment_metadata={
            "action_code": action_code,
            "preferred_agent_code": preferred_agent_code,
            "company_ai_agent_id": (
                company_agent.id
                if company_agent
                else None
            ),
            "registry_agent_id": agent.id,
            "agent_code": agent.agent_code,
            **(assignment_metadata or {}),
        },
    )

    db.add(assignment)
    db.flush()

    add_agent_message(
        db,
        assignment=assignment,
        sender_agent_code="sonny",
        recipient_agent_code=agent.agent_code,
        message_type="assignment_created",
        subject=title,
        content=instructions,
        message_data={
            "required_capability": required_capability,
            "priority": priority,
            "due_at": (
                due_at.isoformat()
                if due_at
                else None
            ),
        },
        commit=False,
    )

    record_orchestration_activity(
        db,
        run=run,
        event_type="sonny_agent_assignment_created",
        title="Agent assignment created",
        description=title,
        actor_type="sonny",
        actor_id="sonny",
        metadata={
            "assignment_id": assignment.id,
            "agent_code": agent.agent_code,
            "required_capability": required_capability,
            "approval_required": approval_required,
            "priority": priority,
        },
    )

    if commit:
        db.commit()
        db.refresh(assignment)
    else:
        db.flush()

    return assignment


def add_agent_message(
    db: Session,
    *,
    assignment: SonnyAgentAssignment,
    sender_agent_code: str,
    recipient_agent_code: str,
    message_type: str,
    content: str,
    subject: str | None = None,
    message_data: dict[str, Any] | None = None,
    commit: bool = True,
) -> SonnyAgentMessage:
    key = build_message_key(
        assignment_id=assignment.id,
        sender_agent_code=sender_agent_code,
        recipient_agent_code=recipient_agent_code,
        message_type=message_type,
        subject=subject,
        content=content,
        message_data=message_data,
    )

    existing = (
        db.query(SonnyAgentMessage)
        .filter(
            SonnyAgentMessage.assignment_id == assignment.id,
            SonnyAgentMessage.idempotency_key == key,
        )
        .first()
    )

    if existing:
        return existing

    message = SonnyAgentMessage(
        assignment_id=assignment.id,
        company_id=assignment.company_id,
        sender_agent_code=sender_agent_code,
        recipient_agent_code=recipient_agent_code,
        message_type=message_type,
        idempotency_key=key,
        subject=subject,
        content=content,
        message_data=message_data or {},
    )

    db.add(message)

    if commit:
        db.commit()
        db.refresh(message)

    return message


def approve_orchestration_run(
    db: Session,
    *,
    run: SonnyOrchestrationRun,
    actor_id: str,
) -> SonnyOrchestrationRun:
    if run.status != "awaiting_approval":
        raise ValueError(
            "Only orchestration runs awaiting approval can be approved."
        )

    run.status = "approved"
    run.approved_by = actor_id
    run.approved_at = utcnow()
    run.updated_at = utcnow()

    record_orchestration_activity(
        db,
        run=run,
        event_type="sonny_orchestration_approved",
        title="Sonny orchestration approved",
        description=run.orchestration_type,
        actor_type="tenant",
        actor_id=actor_id,
    )

    db.commit()
    db.refresh(run)

    return run


def approve_assignment(
    db: Session,
    *,
    run: SonnyOrchestrationRun,
    assignment: SonnyAgentAssignment,
    actor_id: str,
) -> SonnyAgentAssignment:
    if assignment.orchestration_run_id != run.id:
        raise ValueError(
            "Assignment does not belong to this orchestration run."
        )

    if assignment.status != "awaiting_approval":
        raise ValueError(
            "Only assignments awaiting approval can be approved."
        )

    assignment.status = "approved"
    assignment.approved_by = actor_id
    assignment.approved_at = utcnow()
    assignment.updated_at = utcnow()

    add_agent_message(
        db,
        assignment=assignment,
        sender_agent_code="sonny",
        recipient_agent_code=assignment.agent.agent_code,
        message_type="assignment_approved",
        subject=assignment.title,
        content="Assignment was approved and is ready for acceptance.",
        message_data={
            "approved_by": actor_id,
        },
        commit=False,
    )

    record_orchestration_activity(
        db,
        run=run,
        event_type="sonny_agent_assignment_approved",
        title="Agent assignment approved",
        description=assignment.title,
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "assignment_id": assignment.id,
            "agent_code": assignment.agent.agent_code,
        },
    )

    db.commit()
    db.refresh(assignment)

    return assignment


def start_orchestration_run(
    db: Session,
    *,
    run: SonnyOrchestrationRun,
    actor_id: str,
    commit: bool = True) -> SonnyOrchestrationRun:
    if run.status != "approved":
        raise ValueError(
            "Only approved orchestration runs can start."
        )

    if not run.assignments:
        raise ValueError(
            "Orchestration run has no assignments."
        )

    awaiting = [
        assignment
        for assignment in run.assignments
        if assignment.status == "awaiting_approval"
    ]

    if awaiting:
        raise ValueError(
            "All required assignments must be approved first."
        )

    run.status = "running"
    run.started_at = utcnow()
    run.updated_at = utcnow()

    record_orchestration_activity(
        db,
        run=run,
        event_type="sonny_orchestration_started",
        title="Sonny orchestration started",
        description=run.orchestration_type,
        actor_type="tenant",
        actor_id=actor_id,
    )

    if commit:
        db.commit()
        db.refresh(run)
    else:
        db.flush()

    return run


def accept_assignment(
    db: Session,
    *,
    run: SonnyOrchestrationRun,
    assignment: SonnyAgentAssignment,
    commit: bool = True) -> SonnyAgentAssignment:
    if run.status != "running":
        raise ValueError(
            "Orchestration run must be running."
        )

    if assignment.status != "approved":
        raise ValueError(
            "Only approved assignments can be accepted."
        )

    assignment.status = "accepted"
    assignment.accepted_at = utcnow()
    assignment.updated_at = utcnow()

    add_agent_message(
        db,
        assignment=assignment,
        sender_agent_code=assignment.agent.agent_code,
        recipient_agent_code="sonny",
        message_type="assignment_accepted",
        subject=assignment.title,
        content=(
            "Understood, Sonny. I've accepted the assignment "
            "and I'm ready to begin."
        ),
        message_data={},
        commit=False,
    )

    record_orchestration_activity(
        db,
        run=run,
        event_type="sonny_agent_assignment_accepted",
        title="Agent assignment accepted",
        description=assignment.title,
        actor_type="agent",
        actor_id=assignment.agent.agent_code,
        metadata={
            "assignment_id": assignment.id,
        },
    )

    if commit:
        db.commit()
        db.refresh(assignment)
    else:
        db.flush()

    return assignment


def start_assignment(
    db: Session,
    *,
    run: SonnyOrchestrationRun,
    assignment: SonnyAgentAssignment,
    commit: bool = True) -> SonnyAgentAssignment:
    if run.status != "running":
        raise ValueError(
            "Orchestration run must be running."
        )

    if assignment.status != "accepted":
        raise ValueError(
            "Only accepted assignments can start."
        )

    assignment.status = "running"
    assignment.started_at = utcnow()
    assignment.attempt_count = int(
        assignment.attempt_count or 0
    ) + 1
    assignment.updated_at = utcnow()

    add_agent_message(
        db,
        assignment=assignment,
        sender_agent_code=assignment.agent.agent_code,
        recipient_agent_code="sonny",
        message_type="assignment_started",
        subject=assignment.title,
        content=(
            "Sonny, I'm starting the assignment now. "
            "I'll report back when the work is complete."
        ),
        message_data={
            "attempt_count": assignment.attempt_count,
        },
        commit=False,
    )

    record_orchestration_activity(
        db,
        run=run,
        event_type="sonny_agent_assignment_started",
        title="Agent assignment started",
        description=assignment.title,
        actor_type="agent",
        actor_id=assignment.agent.agent_code,
        metadata={
            "assignment_id": assignment.id,
            "attempt_count": assignment.attempt_count,
        },
    )

    if commit:
        db.commit()
        db.refresh(assignment)
    else:
        db.flush()

    return assignment


def complete_assignment(
    db: Session,
    *,
    run: SonnyOrchestrationRun,
    assignment: SonnyAgentAssignment,
    result_payload: dict[str, Any] | None = None,
    commit: bool = True) -> SonnyAgentAssignment:
    if assignment.status != "running":
        raise ValueError(
            "Only running assignments can be completed."
        )

    assignment.status = "completed"
    assignment.result_payload = result_payload or {}
    assignment.completed_at = utcnow()
    assignment.updated_at = utcnow()
    assignment.error_message = None

    execution_result = (
        assignment.result_payload.get(
            "execution_result"
        )
        if isinstance(
            assignment.result_payload,
            dict,
        )
        else None
    )

    execution_summary = ""

    if isinstance(
        execution_result,
        dict,
    ):
        execution_summary = str(
            execution_result.get(
                "message"
            )
            or ""
        ).strip()

    completion_message = (
        "Sonny, the assignment is complete."
    )

    if execution_summary:
        completion_message = (
            "Sonny, the assignment is complete. "
            + execution_summary
        )

    add_agent_message(
        db,
        assignment=assignment,
        sender_agent_code=assignment.agent.agent_code,
        recipient_agent_code="sonny",
        message_type="assignment_completed",
        subject=assignment.title,
        content=completion_message,
        message_data={
            "result_payload": assignment.result_payload,
        },
        commit=False,
    )

    add_agent_message(
        db,
        assignment=assignment,
        sender_agent_code="sonny",
        recipient_agent_code=(
            assignment.agent.agent_code
        ),
        message_type=(
            "assignment_result_acknowledged"
        ),
        subject=assignment.title,
        content=(
            "Received. I've recorded the completed result "
            "and made it available to the founder."
        ),
        message_data={
            "result_payload": (
                assignment.result_payload
            ),
        },
        commit=False,
    )

    record_orchestration_activity(
        db,
        run=run,
        event_type="sonny_agent_assignment_completed",
        title="Agent assignment completed",
        description=assignment.title,
        actor_type="agent",
        actor_id=assignment.agent.agent_code,
        metadata={
            "assignment_id": assignment.id,
            "result_payload": assignment.result_payload,
        },
    )

    if commit:
        db.commit()
        db.refresh(assignment)
    else:
        db.flush()

    return assignment


def fail_assignment(
    db: Session,
    *,
    run: SonnyOrchestrationRun,
    assignment: SonnyAgentAssignment,
    error_message: str,
    commit: bool = True) -> SonnyAgentAssignment:
    if assignment.status != "running":
        raise ValueError(
            "Only running assignments can fail."
        )

    assignment.status = "failed"
    assignment.failed_at = utcnow()
    assignment.error_message = error_message
    assignment.updated_at = utcnow()

    add_agent_message(
        db,
        assignment=assignment,
        sender_agent_code=assignment.agent.agent_code,
        recipient_agent_code="sonny",
        message_type="assignment_failed",
        subject=assignment.title,
        content=(
            "Sonny, I couldn't complete the assignment. "
            + str(error_message).strip()
        ),
        message_data={
            "attempt_count": assignment.attempt_count,
        },
        commit=False,
    )

    add_agent_message(
        db,
        assignment=assignment,
        sender_agent_code="sonny",
        recipient_agent_code=(
            assignment.agent.agent_code
        ),
        message_type=(
            "assignment_failure_acknowledged"
        ),
        subject=assignment.title,
        content=(
            "Understood. I've recorded the failure and "
            "will surface it for founder review."
        ),
        message_data={
            "error_message": error_message,
        },
        commit=False,
    )

    record_orchestration_activity(
        db,
        run=run,
        event_type="sonny_agent_assignment_failed",
        title="Agent assignment failed",
        description=assignment.title,
        actor_type="agent",
        actor_id=assignment.agent.agent_code,
        metadata={
            "assignment_id": assignment.id,
            "error_message": error_message,
        },
    )

    if commit:
        db.commit()
        db.refresh(assignment)
    else:
        db.flush()

    return assignment


def complete_orchestration_run(
    db: Session,
    *,
    run: SonnyOrchestrationRun,
    actor_id: str,
    output_payload: dict[str, Any] | None = None,
    commit: bool = True) -> SonnyOrchestrationRun:
    if run.status != "running":
        raise ValueError(
            "Only running orchestration runs can complete."
        )

    incomplete = [
        assignment
        for assignment in run.assignments
        if assignment.status != "completed"
    ]

    if incomplete:
        raise ValueError(
            "All agent assignments must complete first."
        )

    run.status = "completed"
    run.output_payload = output_payload or {}
    run.completed_at = utcnow()
    run.updated_at = utcnow()
    run.error_message = None

    record_orchestration_activity(
        db,
        run=run,
        event_type="sonny_orchestration_completed",
        title="Sonny orchestration completed",
        description=run.orchestration_type,
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "output_payload": run.output_payload,
        },
    )

    if commit:
        db.commit()
        db.refresh(run)
    else:
        db.flush()

    return run


def fail_orchestration_run(
    db: Session,
    *,
    run: SonnyOrchestrationRun,
    actor_id: str,
    error_message: str,
    commit: bool = True) -> SonnyOrchestrationRun:
    if run.status != "running":
        raise ValueError(
            "Only running orchestration runs can fail."
        )

    run.status = "failed"
    run.failed_at = utcnow()
    run.retry_count = int(
        run.retry_count or 0
    ) + 1
    run.error_message = error_message
    run.updated_at = utcnow()

    record_orchestration_activity(
        db,
        run=run,
        event_type="sonny_orchestration_failed",
        title="Sonny orchestration failed",
        description=run.orchestration_type,
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "error_message": error_message,
            "retry_count": run.retry_count,
        },
    )

    if commit:
        db.commit()
        db.refresh(run)
    else:
        db.flush()

    return run


def cancel_orchestration_run(
    db: Session,
    *,
    run: SonnyOrchestrationRun,
    actor_id: str,
) -> SonnyOrchestrationRun:
    if run.status in RUN_FINAL_STATUSES:
        raise ValueError(
            "Orchestration run is already final."
        )

    now = utcnow()

    run.status = "cancelled"
    run.cancelled_at = now
    run.updated_at = now

    for assignment in run.assignments:
        if assignment.status in ASSIGNMENT_ACTIVE_STATUSES:
            assignment.status = "cancelled"
            assignment.cancelled_at = now
            assignment.updated_at = now

    record_orchestration_activity(
        db,
        run=run,
        event_type="sonny_orchestration_cancelled",
        title="Sonny orchestration cancelled",
        description=run.orchestration_type,
        actor_type="tenant",
        actor_id=actor_id,
    )

    db.commit()
    db.refresh(run)

    return run


def get_company_orchestration_run(
    db: Session,
    *,
    company_id: str,
    run_id: str,
) -> SonnyOrchestrationRun:
    run = (
        db.query(SonnyOrchestrationRun)
        .filter(
            SonnyOrchestrationRun.id == run_id,
            SonnyOrchestrationRun.company_id == company_id,
        )
        .first()
    )

    if not run:
        raise ValueError(
            "Orchestration run not found."
        )

    return run


def get_assignment(
    db: Session,
    *,
    run: SonnyOrchestrationRun,
    assignment_id: str,
) -> SonnyAgentAssignment:
    assignment = (
        db.query(SonnyAgentAssignment)
        .filter(
            SonnyAgentAssignment.id == assignment_id,
            SonnyAgentAssignment.orchestration_run_id == run.id,
        )
        .first()
    )

    if not assignment:
        raise ValueError(
            "Agent assignment not found."
        )

    return assignment
