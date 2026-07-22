from __future__ import annotations

import datetime
import hashlib
import json
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from models.sonny_automation import (
    SonnyAutomationAction,
    SonnyAutomationRun,
)
from models.sonny_decision import SonnyDecision
from models.sonny_workflow import SonnyWorkflow, SonnyWorkflowStep
from services.activity_service import record_activity


RUN_ACTIVE_STATUSES = {
    "draft",
    "awaiting_approval",
    "approved",
    "running",
}

RUN_FINAL_STATUSES = {
    "completed",
    "failed",
    "cancelled",
}

ACTION_ACTIVE_STATUSES = {
    "pending",
    "awaiting_approval",
    "approved",
    "running",
}

ACTION_FINAL_STATUSES = {
    "completed",
    "failed",
    "cancelled",
}


@dataclass(frozen=True)
class AllowedAction:
    code: str
    service_name: str
    approval_required: bool
    description: str


ALLOWED_ACTIONS: dict[str, AllowedAction] = {
    "inspect_usage_ledger": AllowedAction(
        code="inspect_usage_ledger",
        service_name="ledger",
        approval_required=False,
        description="Read and validate company Usage Ledger entries.",
    ),
    "prepare_billing_action": AllowedAction(
        code="prepare_billing_action",
        service_name="billing",
        approval_required=True,
        description="Prepare a billing recommendation without applying charges.",
    ),
    "request_missing_documents": AllowedAction(
        code="request_missing_documents",
        service_name="compliance",
        approval_required=True,
        description="Prepare a deduplicated missing-document request.",
    ),
    "review_support_queue": AllowedAction(
        code="review_support_queue",
        service_name="support",
        approval_required=False,
        description="Inspect open support tickets and assignments.",
    ),
    "prepare_support_response": AllowedAction(
        code="prepare_support_response",
        service_name="support",
        approval_required=True,
        description="Prepare a support response without sending it.",
    ),
    "review_pending_tasks": AllowedAction(
        code="review_pending_tasks",
        service_name="tasks",
        approval_required=False,
        description="Inspect pending company tasks.",
    ),
    "prepare_task_updates": AllowedAction(
        code="prepare_task_updates",
        service_name="tasks",
        approval_required=True,
        description="Prepare recommended task status updates.",
    ),
    "review_meeting_commitments": AllowedAction(
        code="review_meeting_commitments",
        service_name="meetings",
        approval_required=False,
        description="Inspect active meeting commitments.",
    ),
    "evaluate_ai_workforce": AllowedAction(
        code="evaluate_ai_workforce",
        service_name="ai_workforce",
        approval_required=False,
        description="Evaluate AI workforce utilization and opportunities.",
    ),
    "prepare_ai_activation": AllowedAction(
        code="prepare_ai_activation",
        service_name="ai_workforce",
        approval_required=True,
        description="Prepare an AI employee activation recommendation.",
    ),
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


def build_idempotency_key(
    *,
    company_id: str,
    automation_type: str,
    workflow_id: str | None,
    decision_id: str | None,
    input_payload: dict[str, Any] | None,
) -> str:
    payload = {
        "company_id": company_id,
        "automation_type": automation_type,
        "workflow_id": workflow_id,
        "decision_id": decision_id,
        "input_payload": input_payload or {},
    }

    return hashlib.sha256(
        stable_json(payload).encode("utf-8")
    ).hexdigest()


def build_action_idempotency_key(
    *,
    run_id: str,
    action_code: str,
    action_order: int,
    workflow_step_id: str | None,
    payload: dict[str, Any] | None,
) -> str:
    raw = {
        "run_id": run_id,
        "action_code": action_code,
        "action_order": action_order,
        "workflow_step_id": workflow_step_id,
        "payload": payload or {},
    }

    return hashlib.sha256(
        stable_json(raw).encode("utf-8")
    ).hexdigest()


def serialize_action(
    action: SonnyAutomationAction,
) -> dict[str, Any]:
    return {
        "id": action.id,
        "automation_run_id": action.automation_run_id,
        "company_id": action.company_id,
        "workflow_step_id": action.workflow_step_id,
        "action_order": action.action_order,
        "action_code": action.action_code,
        "service_name": action.service_name,
        "target_type": action.target_type,
        "target_id": action.target_id,
        "idempotency_key": action.idempotency_key,
        "status": action.status,
        "approval_required": bool(action.approval_required),
        "approved_by": action.approved_by,
        "approved_at": (
            action.approved_at.isoformat()
            if action.approved_at
            else None
        ),
        "attempt_count": action.attempt_count,
        "max_attempts": action.max_attempts,
        "started_at": (
            action.started_at.isoformat()
            if action.started_at
            else None
        ),
        "completed_at": (
            action.completed_at.isoformat()
            if action.completed_at
            else None
        ),
        "failed_at": (
            action.failed_at.isoformat()
            if action.failed_at
            else None
        ),
        "cancelled_at": (
            action.cancelled_at.isoformat()
            if action.cancelled_at
            else None
        ),
        "error_message": action.error_message,
        "payload": action.payload or {},
        "result": action.result or {},
        "action_metadata": action.action_metadata or {},
        "is_compensating_action": bool(
            action.is_compensating_action
        ),
        "created_at": (
            action.created_at.isoformat()
            if action.created_at
            else None
        ),
        "updated_at": (
            action.updated_at.isoformat()
            if action.updated_at
            else None
        ),
    }


def serialize_run(
    run: SonnyAutomationRun,
) -> dict[str, Any]:
    return {
        "id": run.id,
        "company_id": run.company_id,
        "decision_id": run.decision_id,
        "workflow_id": run.workflow_id,
        "trigger_type": run.trigger_type,
        "automation_type": run.automation_type,
        "idempotency_key": run.idempotency_key,
        "status": run.status,
        "approval_required": bool(run.approval_required),
        "approved_by": run.approved_by,
        "approved_at": (
            run.approved_at.isoformat()
            if run.approved_at
            else None
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
        "cancelled_at": (
            run.cancelled_at.isoformat()
            if run.cancelled_at
            else None
        ),
        "failed_at": (
            run.failed_at.isoformat()
            if run.failed_at
            else None
        ),
        "created_by": run.created_by,
        "retry_count": run.retry_count,
        "max_retries": run.max_retries,
        "error_message": run.error_message,
        "input_payload": run.input_payload or {},
        "output_payload": run.output_payload or {},
        "run_metadata": run.run_metadata or {},
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
            "total_actions": len(run.actions),
            "pending_actions": sum(
                item.status in {"pending", "awaiting_approval", "approved"}
                for item in run.actions
            ),
            "running_actions": sum(
                item.status == "running"
                for item in run.actions
            ),
            "completed_actions": sum(
                item.status == "completed"
                for item in run.actions
            ),
            "failed_actions": sum(
                item.status == "failed"
                for item in run.actions
            ),
            "cancelled_actions": sum(
                item.status == "cancelled"
                for item in run.actions
            ),
        },
        "actions": [
            serialize_action(action)
            for action in run.actions
        ],
    }


def record_automation_activity(
    db: Session,
    *,
    run: SonnyAutomationRun,
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
        source_type="sonny_automation",
        source_id=run.id,
        metadata=metadata,
        commit=False,
    )


def create_automation_run(
    db: Session,
    *,
    company_id: str,
    automation_type: str,
    created_by: str,
    trigger_type: str = "manual",
    decision_id: str | None = None,
    workflow_id: str | None = None,
    input_payload: dict[str, Any] | None = None,
    approval_required: bool = True,
    run_metadata: dict[str, Any] | None = None,
) -> SonnyAutomationRun:
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
            raise ValueError("Decision not found.")

        if decision.status not in {"approved", "completed"}:
            raise ValueError(
                "Automation requires an approved decision."
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
            raise ValueError("Workflow not found.")

        if workflow.status not in {
            "draft",
            "running",
            "waiting",
            "completed",
        }:
            raise ValueError(
                "Workflow is not eligible for automation."
            )

    idempotency_key = build_idempotency_key(
        company_id=company_id,
        automation_type=automation_type,
        workflow_id=workflow_id,
        decision_id=decision_id,
        input_payload=input_payload,
    )

    existing = (
        db.query(SonnyAutomationRun)
        .filter(
            SonnyAutomationRun.company_id == company_id,
            SonnyAutomationRun.idempotency_key == idempotency_key,
        )
        .first()
    )

    if existing:
        return existing

    run = SonnyAutomationRun(
        company_id=company_id,
        decision_id=decision_id,
        workflow_id=workflow_id,
        trigger_type=trigger_type,
        automation_type=automation_type,
        idempotency_key=idempotency_key,
        status=(
            "awaiting_approval"
            if approval_required
            else "approved"
        ),
        approval_required=approval_required,
        created_by=created_by,
        input_payload=input_payload or {},
        output_payload={},
        run_metadata=run_metadata or {},
    )

    if not approval_required:
        run.approved_by = "system"
        run.approved_at = utcnow()

    db.add(run)
    db.flush()

    record_automation_activity(
        db,
        run=run,
        event_type="sonny_automation_created",
        title="Sonny automation created",
        description=f"{automation_type} automation was created.",
        actor_type="tenant",
        actor_id=created_by,
        metadata={
            "automation_type": automation_type,
            "trigger_type": trigger_type,
            "decision_id": decision_id,
            "workflow_id": workflow_id,
            "approval_required": approval_required,
        },
    )

    db.commit()
    db.refresh(run)

    return run


def add_automation_action(
    db: Session,
    *,
    run: SonnyAutomationRun,
    action_code: str,
    action_order: int,
    payload: dict[str, Any] | None = None,
    workflow_step_id: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    approval_required: bool | None = None,
    action_metadata: dict[str, Any] | None = None,
) -> SonnyAutomationAction:
    if run.status in RUN_FINAL_STATUSES:
        raise ValueError(
            "Cannot add actions to a final automation run."
        )

    allowed = ALLOWED_ACTIONS.get(action_code)

    if not allowed:
        raise ValueError(
            f"Action '{action_code}' is not allowlisted."
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

        workflow = (
            db.query(SonnyWorkflow)
            .filter(
                SonnyWorkflow.id == step.workflow_id,
                SonnyWorkflow.company_id == run.company_id,
            )
            .first()
        )

        if not workflow:
            raise ValueError(
                "Workflow step does not belong to this company."
            )

    required = (
        allowed.approval_required
        if approval_required is None
        else bool(approval_required)
    )

    action_key = build_action_idempotency_key(
        run_id=run.id,
        action_code=action_code,
        action_order=action_order,
        workflow_step_id=workflow_step_id,
        payload=payload,
    )

    existing = (
        db.query(SonnyAutomationAction)
        .filter(
            SonnyAutomationAction.automation_run_id == run.id,
            SonnyAutomationAction.idempotency_key == action_key,
        )
        .first()
    )

    if existing:
        return existing

    action = SonnyAutomationAction(
        automation_run_id=run.id,
        company_id=run.company_id,
        workflow_step_id=workflow_step_id,
        action_order=action_order,
        action_code=action_code,
        service_name=allowed.service_name,
        target_type=target_type,
        target_id=target_id,
        idempotency_key=action_key,
        status=(
            "awaiting_approval"
            if required
            else "approved"
        ),
        approval_required=required,
        payload=payload or {},
        result={},
        action_metadata={
            "description": allowed.description,
            **(action_metadata or {}),
        },
    )

    if not required:
        action.approved_by = "system"
        action.approved_at = utcnow()

    db.add(action)
    db.flush()

    record_automation_activity(
        db,
        run=run,
        event_type="sonny_automation_action_added",
        title="Automation action added",
        description=action_code,
        actor_type="sonny",
        actor_id="sonny",
        metadata={
            "action_id": action.id,
            "action_code": action_code,
            "action_order": action_order,
            "service_name": allowed.service_name,
            "approval_required": required,
        },
    )

    db.commit()
    db.refresh(action)

    return action


def approve_run(
    db: Session,
    *,
    run: SonnyAutomationRun,
    actor_id: str,
) -> SonnyAutomationRun:
    if run.status != "awaiting_approval":
        raise ValueError(
            "Only automation runs awaiting approval can be approved."
        )

    run.status = "approved"
    run.approved_by = actor_id
    run.approved_at = utcnow()
    run.updated_at = utcnow()

    record_automation_activity(
        db,
        run=run,
        event_type="sonny_automation_approved",
        title="Sonny automation approved",
        description=run.automation_type,
        actor_type="tenant",
        actor_id=actor_id,
    )

    db.commit()
    db.refresh(run)
    return run


def approve_action(
    db: Session,
    *,
    run: SonnyAutomationRun,
    action: SonnyAutomationAction,
    actor_id: str,
) -> SonnyAutomationAction:
    if action.automation_run_id != run.id:
        raise ValueError(
            "Action does not belong to this run."
        )

    if action.status != "awaiting_approval":
        raise ValueError(
            "Only actions awaiting approval can be approved."
        )

    action.status = "approved"
    action.approved_by = actor_id
    action.approved_at = utcnow()
    action.updated_at = utcnow()

    record_automation_activity(
        db,
        run=run,
        event_type="sonny_automation_action_approved",
        title="Automation action approved",
        description=action.action_code,
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "action_id": action.id,
        },
    )

    db.commit()
    db.refresh(action)
    return action


def start_run(
    db: Session,
    *,
    run: SonnyAutomationRun,
    actor_id: str,
) -> SonnyAutomationRun:
    if run.status != "approved":
        raise ValueError(
            "Only approved automation runs can start."
        )

    if not run.actions:
        raise ValueError(
            "Automation run has no actions."
        )

    awaiting_actions = [
        action
        for action in run.actions
        if action.status == "awaiting_approval"
    ]

    if awaiting_actions:
        raise ValueError(
            "All required automation actions must be approved first."
        )

    run.status = "running"
    run.started_at = utcnow()
    run.updated_at = utcnow()

    record_automation_activity(
        db,
        run=run,
        event_type="sonny_automation_started",
        title="Sonny automation started",
        description=run.automation_type,
        actor_type="tenant",
        actor_id=actor_id,
    )

    db.commit()
    db.refresh(run)
    return run


def start_action(
    db: Session,
    *,
    run: SonnyAutomationRun,
    action: SonnyAutomationAction,
    actor_id: str,
) -> SonnyAutomationAction:
    if run.status != "running":
        raise ValueError(
            "Automation run must be running."
        )

    if action.automation_run_id != run.id:
        raise ValueError(
            "Action does not belong to this run."
        )

    if action.status != "approved":
        raise ValueError(
            "Only approved actions can start."
        )

    unfinished_before = [
        item
        for item in run.actions
        if item.action_order < action.action_order
        and item.status != "completed"
    ]

    if unfinished_before:
        raise ValueError(
            "Previous automation actions must complete first."
        )

    action.status = "running"
    action.attempt_count = int(
        action.attempt_count or 0
    ) + 1
    action.started_at = utcnow()
    action.updated_at = utcnow()

    record_automation_activity(
        db,
        run=run,
        event_type="sonny_automation_action_started",
        title="Automation action started",
        description=action.action_code,
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "action_id": action.id,
            "attempt_count": action.attempt_count,
        },
    )

    db.commit()
    db.refresh(action)
    return action


def complete_action(
    db: Session,
    *,
    run: SonnyAutomationRun,
    action: SonnyAutomationAction,
    actor_id: str,
    result: dict[str, Any] | None = None,
) -> SonnyAutomationAction:
    if action.automation_run_id != run.id:
        raise ValueError(
            "Action does not belong to this run."
        )

    if action.status != "running":
        raise ValueError(
            "Only running actions can be completed."
        )

    action.status = "completed"
    action.result = result or {}
    action.completed_at = utcnow()
    action.updated_at = utcnow()
    action.error_message = None

    record_automation_activity(
        db,
        run=run,
        event_type="sonny_automation_action_completed",
        title="Automation action completed",
        description=action.action_code,
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "action_id": action.id,
            "result": action.result,
        },
    )

    db.commit()
    db.refresh(action)
    return action


def fail_action(
    db: Session,
    *,
    run: SonnyAutomationRun,
    action: SonnyAutomationAction,
    actor_id: str,
    error_message: str,
) -> SonnyAutomationAction:
    if action.automation_run_id != run.id:
        raise ValueError(
            "Action does not belong to this run."
        )

    if action.status != "running":
        raise ValueError(
            "Only running actions can fail."
        )

    action.status = "failed"
    action.failed_at = utcnow()
    action.error_message = error_message
    action.updated_at = utcnow()

    record_automation_activity(
        db,
        run=run,
        event_type="sonny_automation_action_failed",
        title="Automation action failed",
        description=action.action_code,
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "action_id": action.id,
            "error_message": error_message,
            "attempt_count": action.attempt_count,
        },
    )

    db.commit()
    db.refresh(action)
    return action


def complete_run(
    db: Session,
    *,
    run: SonnyAutomationRun,
    actor_id: str,
    output_payload: dict[str, Any] | None = None,
) -> SonnyAutomationRun:
    if run.status != "running":
        raise ValueError(
            "Only running automation runs can complete."
        )

    incomplete = [
        action
        for action in run.actions
        if action.status != "completed"
    ]

    if incomplete:
        raise ValueError(
            "All automation actions must complete first."
        )

    run.status = "completed"
    run.output_payload = output_payload or {}
    run.completed_at = utcnow()
    run.updated_at = utcnow()
    run.error_message = None

    record_automation_activity(
        db,
        run=run,
        event_type="sonny_automation_completed",
        title="Sonny automation completed",
        description=run.automation_type,
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "output_payload": run.output_payload,
        },
    )

    db.commit()
    db.refresh(run)
    return run


def fail_run(
    db: Session,
    *,
    run: SonnyAutomationRun,
    actor_id: str,
    error_message: str,
) -> SonnyAutomationRun:
    if run.status != "running":
        raise ValueError(
            "Only running automation runs can fail."
        )

    run.status = "failed"
    run.failed_at = utcnow()
    run.error_message = error_message
    run.retry_count = int(
        run.retry_count or 0
    ) + 1
    run.updated_at = utcnow()

    record_automation_activity(
        db,
        run=run,
        event_type="sonny_automation_failed",
        title="Sonny automation failed",
        description=run.automation_type,
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "error_message": error_message,
            "retry_count": run.retry_count,
        },
    )

    db.commit()
    db.refresh(run)
    return run


def cancel_run(
    db: Session,
    *,
    run: SonnyAutomationRun,
    actor_id: str,
) -> SonnyAutomationRun:
    if run.status in RUN_FINAL_STATUSES:
        raise ValueError(
            "Automation run is already final."
        )

    now = utcnow()

    run.status = "cancelled"
    run.cancelled_at = now
    run.updated_at = now

    for action in run.actions:
        if action.status in ACTION_ACTIVE_STATUSES:
            action.status = "cancelled"
            action.cancelled_at = now
            action.updated_at = now

    record_automation_activity(
        db,
        run=run,
        event_type="sonny_automation_cancelled",
        title="Sonny automation cancelled",
        description=run.automation_type,
        actor_type="tenant",
        actor_id=actor_id,
    )

    db.commit()
    db.refresh(run)
    return run


def get_company_run(
    db: Session,
    *,
    company_id: str,
    run_id: str,
) -> SonnyAutomationRun:
    run = (
        db.query(SonnyAutomationRun)
        .filter(
            SonnyAutomationRun.id == run_id,
            SonnyAutomationRun.company_id == company_id,
        )
        .first()
    )

    if not run:
        raise ValueError(
            "Automation run not found."
        )

    return run


def get_run_action(
    db: Session,
    *,
    run: SonnyAutomationRun,
    action_id: str,
) -> SonnyAutomationAction:
    action = (
        db.query(SonnyAutomationAction)
        .filter(
            SonnyAutomationAction.id == action_id,
            SonnyAutomationAction.automation_run_id == run.id,
        )
        .first()
    )

    if not action:
        raise ValueError(
            "Automation action not found."
        )

    return action
