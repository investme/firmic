from __future__ import annotations

import datetime
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from models.sonny_decision import SonnyDecision
from models.sonny_workflow import (
    SonnyWorkflow,
    SonnyWorkflowStep,
)
from services.activity_service import record_activity
from services.sonny.decisions import serialize_decision


WORKFLOW_ACTIVE_STATUSES = {
    "draft",
    "running",
    "waiting",
}

WORKFLOW_FINAL_STATUSES = {
    "completed",
    "cancelled",
    "failed",
}

STEP_FINAL_STATUSES = {
    "completed",
    "skipped",
}


@dataclass(frozen=True)
class StepTemplate:
    code: str
    title: str
    description: str
    assigned_role: str


@dataclass(frozen=True)
class WorkflowTemplate:
    code: str
    name: str
    description: str
    steps: tuple[StepTemplate, ...]


def utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()


TEMPLATES: dict[str, WorkflowTemplate] = {
    "activate_headquarters": WorkflowTemplate(
        code="headquarters_activation",
        name="Activate Company Headquarters",
        description=(
            "Controlled process for selecting and activating a Firmic "
            "headquarters."
        ),
        steps=(
            StepTemplate(
                "review_office_requirements",
                "Review office requirements",
                "Confirm jurisdiction, plan, monthly budget, and infrastructure needs.",
                "sonny",
            ),
            StepTemplate(
                "select_office",
                "Select eligible office",
                "Choose an available office that satisfies the approved requirements.",
                "founder",
            ),
            StepTemplate(
                "approve_cost",
                "Approve headquarters cost",
                "Confirm office pricing and related setup charges before activation.",
                "founder",
            ),
            StepTemplate(
                "activate_office",
                "Activate headquarters",
                "Complete the controlled headquarters activation action.",
                "firmic_admin",
            ),
            StepTemplate(
                "verify_infrastructure",
                "Verify infrastructure",
                "Confirm the office, billing, phone, and workspace state are synchronized.",
                "sonny",
            ),
        ),
    ),
    "complete_compliance_documents": WorkflowTemplate(
        code="compliance_completion",
        name="Complete Compliance Documents",
        description=(
            "Collect, review, and verify the company's missing compliance documents."
        ),
        steps=(
            StepTemplate(
                "request_missing_documents",
                "Request missing documents",
                "Create one deduplicated request for all currently missing requirements.",
                "hermes",
            ),
            StepTemplate(
                "await_document_upload",
                "Await document upload",
                "Wait until the founder supplies the required documents.",
                "founder",
            ),
            StepTemplate(
                "hermes_verification",
                "Hermes document verification",
                "Verify document identity, type, and compliance status.",
                "hermes",
            ),
            StepTemplate(
                "compliance_review",
                "Complete compliance review",
                "Review the verified compliance package and readiness score.",
                "firmic_admin",
            ),
            StepTemplate(
                "confirm_readiness",
                "Confirm company readiness",
                "Rebuild company state and confirm the compliance issue is resolved.",
                "sonny",
            ),
        ),
    ),
    "review_pending_tasks": WorkflowTemplate(
        code="task_recovery",
        name="Review Pending Operational Tasks",
        description=(
            "Prioritize and close the company's pending operational work."
        ),
        steps=(
            StepTemplate(
                "triage_tasks",
                "Triage pending tasks",
                "Review open tasks and identify blockers, urgency, and ownership.",
                "sonny",
            ),
            StepTemplate(
                "assign_priorities",
                "Assign task priorities",
                "Confirm the order in which pending work should be completed.",
                "founder",
            ),
            StepTemplate(
                "execute_tasks",
                "Execute operational tasks",
                "Complete the approved task actions through the relevant company modules.",
                "company_team",
            ),
            StepTemplate(
                "verify_task_completion",
                "Verify task completion",
                "Confirm completed tasks and identify any remaining blockers.",
                "sonny",
            ),
        ),
    ),
    "resolve_urgent_support": WorkflowTemplate(
        code="urgent_support_resolution",
        name="Resolve Urgent Support Tickets",
        description=(
            "Assign, investigate, respond to, and resolve urgent tenant support."
        ),
        steps=(
            StepTemplate(
                "assign_urgent_tickets",
                "Assign urgent tickets",
                "Assign every urgent support ticket to an accountable Firmic Admin.",
                "firmic_admin",
            ),
            StepTemplate(
                "investigate_issue",
                "Investigate support issue",
                "Review the complete conversation and underlying company state.",
                "firmic_admin",
            ),
            StepTemplate(
                "respond_to_tenant",
                "Respond to tenant",
                "Provide the tenant with a clear update or resolution plan.",
                "firmic_admin",
            ),
            StepTemplate(
                "confirm_resolution",
                "Confirm resolution",
                "Confirm the tenant issue has been resolved and close the ticket.",
                "firmic_admin",
            ),
            StepTemplate(
                "record_outcome",
                "Record support outcome",
                "Store the support result in activity and Sonny memory.",
                "sonny",
            ),
        ),
    ),
    "review_open_support": WorkflowTemplate(
        code="support_queue_review",
        name="Review Open Support Tickets",
        description=(
            "Monitor and progress unresolved tenant support conversations."
        ),
        steps=(
            StepTemplate(
                "review_support_queue",
                "Review support queue",
                "Review all open and waiting support tickets.",
                "firmic_admin",
            ),
            StepTemplate(
                "confirm_assignment",
                "Confirm ticket assignment",
                "Ensure every open ticket has an accountable owner.",
                "firmic_admin",
            ),
            StepTemplate(
                "send_updates",
                "Send tenant updates",
                "Reply where additional communication or information is required.",
                "firmic_admin",
            ),
            StepTemplate(
                "resolve_completed_tickets",
                "Resolve completed tickets",
                "Close tickets whose issues have been resolved.",
                "firmic_admin",
            ),
        ),
    ),
    "review_unbilled_usage": WorkflowTemplate(
        code="billing_review",
        name="Review Unbilled Company Usage",
        description=(
            "Validate unbilled ledger entries and prepare a controlled billing outcome."
        ),
        steps=(
            StepTemplate(
                "inspect_usage_ledger",
                "Inspect usage ledger",
                "Review each unbilled entry, service, quantity, tax, and total.",
                "finance_ai",
            ),
            StepTemplate(
                "validate_charges",
                "Validate ledger charges",
                "Confirm that each charge is legitimate and associated with delivered services.",
                "firmic_admin",
            ),
            StepTemplate(
                "prepare_billing_action",
                "Prepare billing action",
                "Prepare the recommended bill, correction, or void action.",
                "finance_ai",
            ),
            StepTemplate(
                "approve_billing_action",
                "Approve billing action",
                "Founder approves the final billing action before any financial execution.",
                "founder",
            ),
            StepTemplate(
                "confirm_ledger_state",
                "Confirm ledger state",
                "Rebuild company state and verify that the ledger reflects the approved outcome.",
                "sonny",
            ),
        ),
    ),
    "evaluate_ai_workforce": WorkflowTemplate(
        code="ai_workforce_evaluation",
        name="Evaluate AI Workforce Activation",
        description=(
            "Evaluate whether an AI employee should be activated for a defined need."
        ),
        steps=(
            StepTemplate(
                "identify_operational_need",
                "Identify operational need",
                "Define the repeatable workload that may benefit from an AI employee.",
                "sonny",
            ),
            StepTemplate(
                "select_ai_template",
                "Select AI template",
                "Compare available AI roles against the identified workload.",
                "founder",
            ),
            StepTemplate(
                "review_monthly_cost",
                "Review monthly cost",
                "Confirm the monthly price and expected operational return.",
                "founder",
            ),
            StepTemplate(
                "approve_activation",
                "Approve AI activation",
                "Approve or decline the selected AI employee.",
                "founder",
            ),
            StepTemplate(
                "provision_ai_employee",
                "Provision AI employee",
                "Activate the approved AI role and verify company assignment.",
                "firmic_admin",
            ),
        ),
    ),
    "monitor_meeting_commitments": WorkflowTemplate(
        code="meeting_commitment_review",
        name="Monitor Meeting Commitments",
        description=(
            "Confirm upcoming room commitments and required preparation."
        ),
        steps=(
            StepTemplate(
                "review_bookings",
                "Review active bookings",
                "Review room, date, time, duration, and current booking status.",
                "meeting_coordinator",
            ),
            StepTemplate(
                "confirm_requirements",
                "Confirm meeting requirements",
                "Confirm attendees, preparation, and special room requirements.",
                "founder",
            ),
            StepTemplate(
                "verify_schedule",
                "Verify meeting schedule",
                "Confirm no conflicts or missing operational preparation remain.",
                "sonny",
            ),
        ),
    ),
}


def serialize_step(
    step: SonnyWorkflowStep,
) -> dict[str, Any]:
    return {
        "id": step.id,
        "workflow_id": step.workflow_id,
        "step_order": step.step_order,
        "step_code": step.step_code,
        "title": step.title,
        "description": step.description,
        "assigned_role": step.assigned_role,
        "status": step.status,
        "started_at": (
            step.started_at.isoformat()
            if step.started_at
            else None
        ),
        "completed_at": (
            step.completed_at.isoformat()
            if step.completed_at
            else None
        ),
        "completed_by": step.completed_by,
        "output": step.output,
        "created_at": (
            step.created_at.isoformat()
            if step.created_at
            else None
        ),
        "updated_at": (
            step.updated_at.isoformat()
            if step.updated_at
            else None
        ),
    }


def serialize_workflow(
    workflow: SonnyWorkflow,
    *,
    include_decision: SonnyDecision | None = None,
) -> dict[str, Any]:
    return {
        "id": workflow.id,
        "company_id": workflow.company_id,
        "decision_id": workflow.decision_id,
        "template_code": workflow.template_code,
        "name": workflow.name,
        "description": workflow.description,
        "status": workflow.status,
        "progress_percent": workflow.progress_percent,
        "current_step_order": workflow.current_step_order,
        "started_at": (
            workflow.started_at.isoformat()
            if workflow.started_at
            else None
        ),
        "completed_at": (
            workflow.completed_at.isoformat()
            if workflow.completed_at
            else None
        ),
        "cancelled_at": (
            workflow.cancelled_at.isoformat()
            if workflow.cancelled_at
            else None
        ),
        "cancelled_by": workflow.cancelled_by,
        "result": workflow.result,
        "created_by": workflow.created_by,
        "created_at": (
            workflow.created_at.isoformat()
            if workflow.created_at
            else None
        ),
        "updated_at": (
            workflow.updated_at.isoformat()
            if workflow.updated_at
            else None
        ),
        "steps": [
            serialize_step(step)
            for step in workflow.steps
        ],
        "decision": (
            serialize_decision(include_decision)
            if include_decision
            else None
        ),
    }


def template_for_decision(
    decision: SonnyDecision,
) -> WorkflowTemplate:
    template = TEMPLATES.get(decision.decision_code)

    if not template:
        raise ValueError(
            f"No workflow template exists for decision code "
            f"'{decision.decision_code}'."
        )

    return template


def update_progress(
    workflow: SonnyWorkflow,
) -> None:
    steps = list(workflow.steps or [])

    if not steps:
        workflow.progress_percent = 0
        workflow.current_step_order = None
        return

    completed = sum(
        step.status in STEP_FINAL_STATUSES
        for step in steps
    )

    workflow.progress_percent = round(
        completed / len(steps) * 100
    )

    active = next(
        (
            step
            for step in steps
            if step.status == "in_progress"
        ),
        None,
    )

    pending = next(
        (
            step
            for step in steps
            if step.status == "pending"
        ),
        None,
    )

    workflow.current_step_order = (
        active.step_order
        if active
        else (
            pending.step_order
            if pending
            else None
        )
    )


def record_workflow_activity(
    db: Session,
    *,
    workflow: SonnyWorkflow,
    event_type: str,
    title: str,
    description: str,
    actor_type: str,
    actor_id: str | None,
    metadata: dict[str, Any] | None = None,
) -> None:
    record_activity(
        db,
        company_id=workflow.company_id,
        event_type=event_type,
        title=title,
        description=description,
        actor_type=actor_type,
        actor_id=actor_id,
        source_type="sonny_workflow",
        source_id=workflow.id,
        metadata=metadata,
        commit=False,
    )


def create_workflow_from_decision(
    db: Session,
    *,
    decision: SonnyDecision,
    actor_id: str,
) -> SonnyWorkflow:
    if decision.status != "approved":
        raise ValueError(
            "Only approved decisions can create workflows."
        )

    existing = (
        db.query(SonnyWorkflow)
        .filter(
            SonnyWorkflow.decision_id == decision.id
        )
        .first()
    )

    if existing:
        return existing

    template = template_for_decision(decision)

    workflow = SonnyWorkflow(
        company_id=decision.company_id,
        decision_id=decision.id,
        template_code=template.code,
        name=template.name,
        description=template.description,
        status="draft",
        progress_percent=0,
        current_step_order=1,
        created_by=actor_id,
    )

    db.add(workflow)
    db.flush()

    for order, step_template in enumerate(
        template.steps,
        start=1,
    ):
        db.add(
            SonnyWorkflowStep(
                workflow_id=workflow.id,
                step_order=order,
                step_code=step_template.code,
                title=step_template.title,
                description=step_template.description,
                assigned_role=step_template.assigned_role,
                status="pending",
            )
        )

    decision.execution_status = "queued"
    decision.updated_at = utcnow()

    record_workflow_activity(
        db,
        workflow=workflow,
        event_type="sonny_workflow_created",
        title="Sonny workflow created",
        description=(
            f'{workflow.name} was created from the approved '
            f'decision "{decision.title}".'
        ),
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "decision_id": decision.id,
            "decision_code": decision.decision_code,
            "template_code": workflow.template_code,
            "step_count": len(template.steps),
        },
    )

    db.commit()
    db.refresh(workflow)
    return workflow


def get_company_workflow(
    db: Session,
    *,
    company_id: str,
    workflow_id: str,
) -> SonnyWorkflow:
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

    return workflow


def start_workflow(
    db: Session,
    *,
    workflow: SonnyWorkflow,
    actor_id: str,
) -> SonnyWorkflow:
    if workflow.status != "draft":
        raise ValueError(
            "Only draft workflows can be started."
        )

    steps = list(workflow.steps or [])

    if not steps:
        raise ValueError(
            "Workflow has no steps."
        )

    now = utcnow()
    first_step = steps[0]

    workflow.status = "running"
    workflow.started_at = now
    workflow.updated_at = now

    first_step.status = "in_progress"
    first_step.started_at = now
    first_step.updated_at = now

    workflow.current_step_order = first_step.step_order

    decision = (
        db.query(SonnyDecision)
        .filter(
            SonnyDecision.id == workflow.decision_id
        )
        .first()
    )

    if decision:
        decision.execution_status = "executing"
        decision.updated_at = now

    record_workflow_activity(
        db,
        workflow=workflow,
        event_type="sonny_workflow_started",
        title="Sonny workflow started",
        description=workflow.name,
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "first_step_id": first_step.id,
            "first_step_title": first_step.title,
        },
    )

    db.commit()
    db.refresh(workflow)
    return workflow


def complete_workflow_step(
    db: Session,
    *,
    workflow: SonnyWorkflow,
    step_id: str,
    actor_id: str,
    output: dict[str, Any] | None,
) -> SonnyWorkflow:
    if workflow.status not in {"running", "waiting"}:
        raise ValueError(
            "Only running or waiting workflows can advance."
        )

    step = next(
        (
            item
            for item in workflow.steps
            if item.id == step_id
        ),
        None,
    )

    if not step:
        raise ValueError(
            "Workflow step not found."
        )

    if step.status != "in_progress":
        raise ValueError(
            "Only the active in-progress step can be completed."
        )

    now = utcnow()

    step.status = "completed"
    step.completed_at = now
    step.completed_by = actor_id
    step.output = output or {}
    step.updated_at = now

    next_step = next(
        (
            item
            for item in workflow.steps
            if item.step_order > step.step_order
            and item.status == "pending"
        ),
        None,
    )

    if next_step:
        next_step.status = "in_progress"
        next_step.started_at = now
        next_step.updated_at = now

        workflow.status = "running"
        workflow.current_step_order = next_step.step_order
        workflow.updated_at = now

        record_workflow_activity(
            db,
            workflow=workflow,
            event_type="sonny_workflow_step_completed",
            title="Sonny workflow step completed",
            description=step.title,
            actor_type="tenant",
            actor_id=actor_id,
            metadata={
                "completed_step_id": step.id,
                "completed_step_order": step.step_order,
                "next_step_id": next_step.id,
                "next_step_title": next_step.title,
                "output": step.output,
            },
        )
    else:
        workflow.status = "completed"
        workflow.progress_percent = 100
        workflow.current_step_order = None
        workflow.completed_at = now
        workflow.updated_at = now
        workflow.result = {
            "completed_steps": len(workflow.steps),
            "completed_by": actor_id,
            "completed_at": now.isoformat(),
        }

        decision = (
            db.query(SonnyDecision)
            .filter(
                SonnyDecision.id == workflow.decision_id
            )
            .first()
        )

        if decision:
            decision.status = "completed"
            decision.execution_status = "completed"
            decision.executed_at = now
            decision.execution_result = {
                "workflow_id": workflow.id,
                "workflow_status": "completed",
                "completed_at": now.isoformat(),
            }
            decision.updated_at = now

        record_workflow_activity(
            db,
            workflow=workflow,
            event_type="sonny_workflow_completed",
            title="Sonny workflow completed",
            description=workflow.name,
            actor_type="tenant",
            actor_id=actor_id,
            metadata={
                "final_step_id": step.id,
                "final_step_title": step.title,
                "result": workflow.result,
            },
        )

    update_progress(workflow)

    db.commit()
    db.refresh(workflow)
    return workflow


def cancel_workflow(
    db: Session,
    *,
    workflow: SonnyWorkflow,
    actor_id: str,
) -> SonnyWorkflow:
    if workflow.status in WORKFLOW_FINAL_STATUSES:
        raise ValueError(
            "This workflow is already final."
        )

    now = utcnow()

    workflow.status = "cancelled"
    workflow.cancelled_at = now
    workflow.cancelled_by = actor_id
    workflow.updated_at = now

    for step in workflow.steps:
        if step.status in {"pending", "in_progress"}:
            step.status = "cancelled"
            step.updated_at = now

    decision = (
        db.query(SonnyDecision)
        .filter(
            SonnyDecision.id == workflow.decision_id
        )
        .first()
    )

    if decision:
        decision.status = "cancelled"
        decision.execution_status = "cancelled"
        decision.cancelled_by = actor_id
        decision.cancelled_at = now
        decision.updated_at = now

    record_workflow_activity(
        db,
        workflow=workflow,
        event_type="sonny_workflow_cancelled",
        title="Sonny workflow cancelled",
        description=workflow.name,
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "decision_id": workflow.decision_id,
        },
    )

    db.commit()
    db.refresh(workflow)
    return workflow
