from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Any
import datetime
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from models.company import Company
from firmic_models import User
from models.sonny_decision import SonnyDecision
from models.sonny_workflow import SonnyWorkflow
from services.sonny.dashboard import build_sonny_dashboard
from models.sonny_orchestration import (
    SonnyAgentAssignment,
    SonnyOrchestrationRun,
)
from services.sonny.agent_registry import (
    build_capability_matrix,
    explain_agent_selection,
    list_active_agents,
    serialize_agent,
    sync_default_agents,
)
from services.sonny.orchestration import (
    accept_assignment,
    add_agent_message,
    approve_assignment,
    approve_orchestration_run,
    cancel_orchestration_run,
    complete_assignment,
    complete_orchestration_run,
    create_assignment,
    create_orchestration_run,
    fail_assignment,
    fail_orchestration_run,
    get_assignment,
    get_company_orchestration_run,
    serialize_assignment,
    serialize_message,
    serialize_orchestration_run,
    start_assignment,
    start_orchestration_run,
)
from services.sonny.automation import (
    add_automation_action,
    approve_action,
    approve_run,
    cancel_run,
    complete_action,
    complete_run,
    create_automation_run,
    fail_action,
    fail_run,
    get_company_run,
    get_run_action,
    serialize_action,
    serialize_run,
    start_action,
    start_run,
)
from services.sonny.decisions import (
    ACTIVE_DECISION_STATUSES,
    PRIORITY_ORDER,
    approve_decision,
    cancel_decision,
    generate_company_decisions,
    get_company_decision,
    reject_decision,
    serialize_decision,
)
from services.sonny.workflows import (
    WORKFLOW_ACTIVE_STATUSES,
    cancel_workflow,
    complete_workflow_step,
    create_workflow_from_decision,
    get_company_workflow,
    serialize_workflow,
    start_workflow,
)
from services.sonny.insights import (
    dismiss_insight,
    generate_company_insights,
    get_company_insight,
    list_company_insights,
    serialize_insight,
)
from services.sonny.planner import (
    build_daily_plan,
    get_daily_plan,
    get_plan_history,
    serialize_plan,
)
from services.sonny.state import (
    build_company_state,
    build_state_prompt_context,
)


router = APIRouter()








class CreateOrchestrationRunRequest(BaseModel):
    orchestration_type: str = Field(min_length=1, max_length=120)
    trigger_type: str = Field(default="manual", min_length=1, max_length=80)
    decision_id: str | None = None
    workflow_id: str | None = None
    automation_run_id: str | None = None
    approval_required: bool = True
    input_payload: dict[str, Any] | None = None
    orchestration_metadata: dict[str, Any] | None = None


class CreateAgentAssignmentRequest(BaseModel):
    assignment_code: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=255)
    instructions: str = Field(min_length=1, max_length=8000)
    required_capability: str = Field(min_length=1, max_length=120)
    action_code: str | None = Field(default=None, max_length=120)
    preferred_agent_code: str | None = Field(default=None, max_length=120)
    agent_code: str | None = Field(default=None, max_length=120)
    priority: str = Field(default="medium", max_length=30)
    approval_required: bool = True
    due_at: datetime.datetime | None = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    input_payload: dict[str, Any] | None = None
    automation_run_id: str | None = None
    automation_action_id: str | None = None
    workflow_id: str | None = None
    workflow_step_id: str | None = None
    assignment_metadata: dict[str, Any] | None = None


class CompleteAgentAssignmentRequest(BaseModel):
    result_payload: dict[str, Any] | None = None


class FailAgentAssignmentRequest(BaseModel):
    error_message: str = Field(min_length=1, max_length=4000)


class CompleteOrchestrationRunRequest(BaseModel):
    output_payload: dict[str, Any] | None = None


class FailOrchestrationRunRequest(BaseModel):
    error_message: str = Field(min_length=1, max_length=4000)


class AgentMessageRequest(BaseModel):
    sender_agent_code: str = Field(min_length=1, max_length=120)
    recipient_agent_code: str = Field(min_length=1, max_length=120)
    message_type: str = Field(default="status_update", max_length=120)
    subject: str | None = Field(default=None, max_length=255)
    content: str = Field(min_length=1, max_length=8000)
    message_data: dict[str, Any] | None = None


class CreateAutomationRunRequest(BaseModel):
    automation_type: str = Field(
        min_length=1,
        max_length=120,
    )
    trigger_type: str = Field(
        default="manual",
        min_length=1,
        max_length=80,
    )
    decision_id: str | None = None
    workflow_id: str | None = None
    input_payload: dict[str, Any] | None = None
    approval_required: bool = True
    run_metadata: dict[str, Any] | None = None


class AddAutomationActionRequest(BaseModel):
    action_code: str = Field(
        min_length=1,
        max_length=120,
    )
    action_order: int = Field(
        ge=1,
        le=1000,
    )
    payload: dict[str, Any] | None = None
    workflow_step_id: str | None = None
    target_type: str | None = Field(
        default=None,
        max_length=120,
    )
    target_id: str | None = Field(
        default=None,
        max_length=255,
    )
    approval_required: bool | None = None
    action_metadata: dict[str, Any] | None = None


class CompleteAutomationActionRequest(BaseModel):
    result: dict[str, Any] | None = None


class FailAutomationActionRequest(BaseModel):
    error_message: str = Field(
        min_length=1,
        max_length=4000,
    )


class CompleteAutomationRunRequest(BaseModel):
    output_payload: dict[str, Any] | None = None


class FailAutomationRunRequest(BaseModel):
    error_message: str = Field(
        min_length=1,
        max_length=4000,
    )


class CompleteWorkflowStepRequest(BaseModel):
    output: dict[str, Any] | None = None


class RejectDecisionRequest(BaseModel):
    reason: str | None = Field(
        default=None,
        max_length=2000,
    )


def verify_company_access(
    company_id: str,
    user_id: str,
    db: Session,
) -> Company:
    """Allow an active company owner or Firmic administrator."""
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.status != "terminated",
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found.",
        )

    user = None

    try:
        normalized_user_id = int(str(user_id))
    except (TypeError, ValueError):
        normalized_user_id = None

    if normalized_user_id is not None:
        user = (
            db.query(User)
            .filter(User.id == normalized_user_id)
            .first()
        )

    is_owner = str(company.user_id) == str(user_id)
    is_admin = bool(
        user
        and str(getattr(user, "role", "") or "").strip().lower()
        == "admin"
    )

    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Company access denied.",
        )

    return company


def resolve_decision_or_404(
    db: Session,
    *,
    company_id: str,
    decision_id: str,
) -> SonnyDecision:
    try:
        return get_company_decision(
            db,
            company_id=company_id,
            decision_id=decision_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error


@router.get("/company/{company_id}/state")
def sonny_company_state(
    company_id: str,
    activity_limit: int = 30,
    memory_limit: int = 20,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    return build_company_state(
        db,
        company,
        activity_limit=activity_limit,
        memory_limit=memory_limit,
    )


@router.get("/company/{company_id}/context")
def sonny_company_context(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    state = build_company_state(
        db,
        company,
        activity_limit=10,
        memory_limit=10,
    )

    return {
        "company_id": company.id,
        "state_version": state["state_version"],
        "context": build_state_prompt_context(state),
        "alerts": state["intelligence"]["alerts"],
        "recommendations": state["intelligence"]["recommendations"],
    }


@router.get("/company/{company_id}")
def sonny_company_brief(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    state = build_company_state(
        db,
        company,
        activity_limit=20,
        memory_limit=10,
    )

    return {
        "company": state["company"],
        "summary": {
            "documents": state["documents"]["summary"]["total"],
            "approved_documents": state["documents"]["summary"]["approved"],
            "tasks": state["tasks"]["summary"]["total"],
            "pending_tasks": state["tasks"]["summary"]["pending"],
            "completed_tasks": state["tasks"]["summary"]["completed"],
            "progress": state["progress"]["score"],
            "ai_agents": state["ai_workforce"]["summary"]["active"],
            "meeting_bookings": state["meetings"]["summary"]["active"],
            "open_support_tickets": state["support"]["summary"]["open"],
            "current_billing_usd": state["billing"]["current_month_total_usd"],
        },
        "alerts": [
            item["title"]
            for item in state["intelligence"]["alerts"]
        ],
        "recommendations": [
            item["title"]
            for item in state["intelligence"]["recommendations"]
        ],
        "intelligence": state["intelligence"],
        "state_version": state["state_version"],
    }


@router.post("/company/{company_id}/decisions/generate")
def generate_sonny_decisions(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    try:
        return generate_company_decisions(
            db,
            company,
            actor_id=str(token.get("sub") or ""),
        )
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Decision generation failed: {str(error)}",
        ) from error


@router.get("/company/{company_id}/decisions")
def list_sonny_decisions(
    company_id: str,
    status: str | None = Query(default=None),
    decision_type: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    query = db.query(SonnyDecision).filter(
        SonnyDecision.company_id == company_id
    )

    if status:
        query = query.filter(
            SonnyDecision.status == status.strip().lower()
        )

    if decision_type:
        query = query.filter(
            SonnyDecision.decision_type == decision_type.strip().lower()
        )

    if priority:
        query = query.filter(
            SonnyDecision.priority == priority.strip().lower()
        )

    decisions = (
        query.order_by(
            SonnyDecision.created_at.desc()
        )
        .limit(limit)
        .all()
    )

    decisions.sort(
        key=lambda item: (
            PRIORITY_ORDER.get(item.priority, 99),
            -(item.created_at.timestamp() if item.created_at else 0),
        )
    )

    return {
        "company_id": company_id,
        "metrics": {
            "total": len(decisions),
            "proposed": sum(
                item.status == "proposed"
                for item in decisions
            ),
            "approved": sum(
                item.status == "approved"
                for item in decisions
            ),
            "final": sum(
                item.status not in ACTIVE_DECISION_STATUSES
                for item in decisions
            ),
            "critical": sum(
                item.priority == "critical"
                and item.status in ACTIVE_DECISION_STATUSES
                for item in decisions
            ),
            "high": sum(
                item.priority == "high"
                and item.status in ACTIVE_DECISION_STATUSES
                for item in decisions
            ),
        },
        "decisions": [
            serialize_decision(item)
            for item in decisions
        ],
    }


@router.get(
    "/company/{company_id}/decisions/{decision_id}"
)
def get_sonny_decision(
    company_id: str,
    decision_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    decision = resolve_decision_or_404(
        db,
        company_id=company_id,
        decision_id=decision_id,
    )

    return serialize_decision(decision)


@router.post(
    "/company/{company_id}/decisions/{decision_id}/approve"
)
def approve_sonny_decision(
    company_id: str,
    decision_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    decision = resolve_decision_or_404(
        db,
        company_id=company_id,
        decision_id=decision_id,
    )

    try:
        updated = approve_decision(
            db,
            decision=decision,
            actor_id=str(token.get("sub") or ""),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Sonny decision approved.",
        "decision": serialize_decision(updated),
    }


@router.post(
    "/company/{company_id}/decisions/{decision_id}/reject"
)
def reject_sonny_decision(
    company_id: str,
    decision_id: str,
    payload: RejectDecisionRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    decision = resolve_decision_or_404(
        db,
        company_id=company_id,
        decision_id=decision_id,
    )

    try:
        updated = reject_decision(
            db,
            decision=decision,
            actor_id=str(token.get("sub") or ""),
            reason=payload.reason,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Sonny decision rejected.",
        "decision": serialize_decision(updated),
    }


@router.post(
    "/company/{company_id}/decisions/{decision_id}/cancel"
)
def cancel_sonny_decision(
    company_id: str,
    decision_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    decision = resolve_decision_or_404(
        db,
        company_id=company_id,
        decision_id=decision_id,
    )

    try:
        updated = cancel_decision(
            db,
            decision=decision,
            actor_id=str(token.get("sub") or ""),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Sonny decision cancelled.",
        "decision": serialize_decision(updated),
    }

@router.post(
    "/company/{company_id}/decisions/{decision_id}/workflow"
)
def create_sonny_workflow(
    company_id: str,
    decision_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    decision = resolve_decision_or_404(
        db,
        company_id=company_id,
        decision_id=decision_id,
    )

    try:
        workflow = create_workflow_from_decision(
            db,
            decision=decision,
            actor_id=str(token.get("sub") or ""),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Sonny workflow is ready.",
        "workflow": serialize_workflow(
            workflow,
            include_decision=decision,
        ),
    }


@router.get("/company/{company_id}/workflows")
def list_sonny_workflows(
    company_id: str,
    status: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    query = db.query(SonnyWorkflow).filter(
        SonnyWorkflow.company_id == company_id
    )

    if status:
        query = query.filter(
            SonnyWorkflow.status == status.strip().lower()
        )

    workflows = (
        query.order_by(
            SonnyWorkflow.created_at.desc()
        )
        .limit(limit)
        .all()
    )

    decision_ids = [
        workflow.decision_id
        for workflow in workflows
    ]

    decisions = (
        db.query(SonnyDecision)
        .filter(
            SonnyDecision.id.in_(decision_ids)
        )
        .all()
        if decision_ids
        else []
    )

    decision_map = {
        decision.id: decision
        for decision in decisions
    }

    return {
        "company_id": company_id,
        "metrics": {
            "total": len(workflows),
            "draft": sum(
                item.status == "draft"
                for item in workflows
            ),
            "running": sum(
                item.status in {"running", "waiting"}
                for item in workflows
            ),
            "completed": sum(
                item.status == "completed"
                for item in workflows
            ),
            "cancelled": sum(
                item.status == "cancelled"
                for item in workflows
            ),
        },
        "workflows": [
            serialize_workflow(
                workflow,
                include_decision=decision_map.get(
                    workflow.decision_id
                ),
            )
            for workflow in workflows
        ],
    }


@router.get(
    "/company/{company_id}/workflows/{workflow_id}"
)
def get_sonny_workflow(
    company_id: str,
    workflow_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    try:
        workflow = get_company_workflow(
            db,
            company_id=company_id,
            workflow_id=workflow_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error

    decision = (
        db.query(SonnyDecision)
        .filter(
            SonnyDecision.id == workflow.decision_id
        )
        .first()
    )

    return serialize_workflow(
        workflow,
        include_decision=decision,
    )


@router.post(
    "/company/{company_id}/workflows/{workflow_id}/start"
)
def start_sonny_workflow(
    company_id: str,
    workflow_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    try:
        workflow = get_company_workflow(
            db,
            company_id=company_id,
            workflow_id=workflow_id,
        )

        updated = start_workflow(
            db,
            workflow=workflow,
            actor_id=str(token.get("sub") or ""),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Sonny workflow started.",
        "workflow": serialize_workflow(updated),
    }


@router.post(
    "/company/{company_id}/workflows/{workflow_id}/steps/{step_id}/complete"
)
def complete_sonny_workflow_step(
    company_id: str,
    workflow_id: str,
    step_id: str,
    payload: CompleteWorkflowStepRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    try:
        workflow = get_company_workflow(
            db,
            company_id=company_id,
            workflow_id=workflow_id,
        )

        updated = complete_workflow_step(
            db,
            workflow=workflow,
            step_id=step_id,
            actor_id=str(token.get("sub") or ""),
            output=payload.output,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Workflow step completed.",
        "workflow": serialize_workflow(updated),
    }


@router.post(
    "/company/{company_id}/workflows/{workflow_id}/cancel"
)
def cancel_sonny_workflow(
    company_id: str,
    workflow_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    try:
        workflow = get_company_workflow(
            db,
            company_id=company_id,
            workflow_id=workflow_id,
        )

        updated = cancel_workflow(
            db,
            workflow=workflow,
            actor_id=str(token.get("sub") or ""),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Sonny workflow cancelled.",
        "workflow": serialize_workflow(updated),
    }

@router.get("/company/{company_id}/plan")
def get_sonny_daily_plan(
    company_id: str,
    rebuild_if_missing: bool = Query(default=True),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    plan = get_daily_plan(
        db,
        company_id=company.id,
    )

    if plan is None and rebuild_if_missing:
        try:
            plan = build_daily_plan(
                db,
                company,
                actor_id=str(token.get("sub") or ""),
            )
        except Exception as error:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Planner generation failed: {str(error)}",
            ) from error

    if plan is None:
        raise HTTPException(
            status_code=404,
            detail="No daily Sonny plan exists for this company.",
        )

    return serialize_plan(plan)


@router.post("/company/{company_id}/plan/rebuild")
def rebuild_sonny_daily_plan(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    try:
        plan = build_daily_plan(
            db,
            company,
            actor_id=str(token.get("sub") or ""),
        )
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Planner rebuild failed: {str(error)}",
        ) from error

    return {
        "message": "Sonny daily plan rebuilt.",
        "plan": serialize_plan(plan),
    }


@router.get("/company/{company_id}/plan/history")
def get_sonny_plan_history(
    company_id: str,
    limit: int = Query(default=30, ge=1, le=365),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    plans = get_plan_history(
        db,
        company_id=company_id,
        limit=limit,
    )

    return {
        "company_id": company_id,
        "count": len(plans),
        "plans": [
            serialize_plan(plan)
            for plan in plans
        ],
    }

@router.get("/company/{company_id}/dashboard")
def get_sonny_dashboard(
    company_id: str,
    rebuild_plan_if_missing: bool = Query(default=True),
    rebuild_insights_if_missing: bool = Query(default=True),
    activity_limit: int = Query(default=15, ge=1, le=100),
    memory_limit: int = Query(default=10, ge=1, le=100),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    try:
        return build_sonny_dashboard(
            db,
            company,
            actor_id=str(token.get("sub") or ""),
            rebuild_plan_if_missing=rebuild_plan_if_missing,
            rebuild_insights_if_missing=rebuild_insights_if_missing,
            activity_limit=activity_limit,
            memory_limit=memory_limit,
        )
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Sonny dashboard failed: {str(error)}",
        ) from error

def resolve_insight_or_404(
    db: Session,
    *,
    company_id: str,
    insight_id: str,
):
    try:
        return get_company_insight(
            db,
            company_id=company_id,
            insight_id=insight_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error


@router.post("/company/{company_id}/insights/generate")
def generate_sonny_insights(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    try:
        return generate_company_insights(
            db,
            company,
        )
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Insight generation failed: {str(error)}",
        ) from error


@router.get("/company/{company_id}/insights")
def list_sonny_insights(
    company_id: str,
    status: str | None = Query(default=None),
    category: str | None = Query(default=None),
    severity: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    insights = list_company_insights(
        db,
        company_id=company_id,
        status=status,
        category=category,
        severity=severity,
        limit=limit,
    )

    return {
        "company_id": company_id,
        "metrics": {
            "total": len(insights),
            "active": sum(
                item.status == "active"
                for item in insights
            ),
            "resolved": sum(
                item.status == "resolved"
                for item in insights
            ),
            "dismissed": sum(
                item.status == "dismissed"
                for item in insights
            ),
            "critical": sum(
                item.status == "active"
                and item.severity == "critical"
                for item in insights
            ),
            "high": sum(
                item.status == "active"
                and item.severity == "high"
                for item in insights
            ),
            "actionable": sum(
                item.status == "active"
                and bool(item.is_actionable)
                for item in insights
            ),
        },
        "insights": [
            serialize_insight(item)
            for item in insights
        ],
    }


@router.get(
    "/company/{company_id}/insights/{insight_id}"
)
def get_sonny_insight(
    company_id: str,
    insight_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    insight = resolve_insight_or_404(
        db,
        company_id=company_id,
        insight_id=insight_id,
    )

    return serialize_insight(insight)


@router.post(
    "/company/{company_id}/insights/{insight_id}/dismiss"
)
def dismiss_sonny_insight(
    company_id: str,
    insight_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    insight = resolve_insight_or_404(
        db,
        company_id=company_id,
        insight_id=insight_id,
    )

    try:
        updated = dismiss_insight(
            db,
            insight=insight,
            actor_id=str(token.get("sub") or ""),
        )
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Insight dismissal failed: {str(error)}",
        ) from error

    return {
        "message": "Sonny insight dismissed.",
        "insight": serialize_insight(updated),
    }

def resolve_automation_run_or_404(
    db: Session,
    *,
    company_id: str,
    run_id: str,
):
    try:
        return get_company_run(
            db,
            company_id=company_id,
            run_id=run_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error


def resolve_automation_action_or_404(
    db: Session,
    *,
    run,
    action_id: str,
):
    try:
        return get_run_action(
            db,
            run=run,
            action_id=action_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error


@router.post("/company/{company_id}/automations")
def create_sonny_automation(
    company_id: str,
    payload: CreateAutomationRunRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    try:
        run = create_automation_run(
            db,
            company_id=company_id,
            automation_type=payload.automation_type,
            created_by=str(token.get("sub") or ""),
            trigger_type=payload.trigger_type,
            decision_id=payload.decision_id,
            workflow_id=payload.workflow_id,
            input_payload=payload.input_payload,
            approval_required=payload.approval_required,
            run_metadata=payload.run_metadata,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Automation creation failed: {str(error)}",
        ) from error

    return {
        "message": "Sonny automation run is ready.",
        "run": serialize_run(run),
    }


@router.get("/company/{company_id}/automations")
def list_sonny_automations(
    company_id: str,
    status: str | None = Query(default=None),
    automation_type: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    from models.sonny_automation import SonnyAutomationRun

    query = db.query(SonnyAutomationRun).filter(
        SonnyAutomationRun.company_id == company_id
    )

    if status:
        query = query.filter(
            SonnyAutomationRun.status == status.strip().lower()
        )

    if automation_type:
        query = query.filter(
            SonnyAutomationRun.automation_type
            == automation_type.strip()
        )

    runs = (
        query.order_by(
            SonnyAutomationRun.created_at.desc()
        )
        .limit(limit)
        .all()
    )

    return {
        "company_id": company_id,
        "metrics": {
            "total": len(runs),
            "awaiting_approval": sum(
                item.status == "awaiting_approval"
                for item in runs
            ),
            "approved": sum(
                item.status == "approved"
                for item in runs
            ),
            "running": sum(
                item.status == "running"
                for item in runs
            ),
            "completed": sum(
                item.status == "completed"
                for item in runs
            ),
            "failed": sum(
                item.status == "failed"
                for item in runs
            ),
            "cancelled": sum(
                item.status == "cancelled"
                for item in runs
            ),
        },
        "runs": [
            serialize_run(run)
            for run in runs
        ],
    }


@router.get(
    "/company/{company_id}/automations/{run_id}"
)
def get_sonny_automation(
    company_id: str,
    run_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    run = resolve_automation_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )

    return serialize_run(run)


@router.post(
    "/company/{company_id}/automations/{run_id}/actions"
)
def add_sonny_automation_action(
    company_id: str,
    run_id: str,
    payload: AddAutomationActionRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    run = resolve_automation_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )

    try:
        action = add_automation_action(
            db,
            run=run,
            action_code=payload.action_code,
            action_order=payload.action_order,
            payload=payload.payload,
            workflow_step_id=payload.workflow_step_id,
            target_type=payload.target_type,
            target_id=payload.target_id,
            approval_required=payload.approval_required,
            action_metadata=payload.action_metadata,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Automation action creation failed: {str(error)}",
        ) from error

    return {
        "message": "Automation action added.",
        "action": serialize_action(action),
    }


@router.post(
    "/company/{company_id}/automations/{run_id}/approve"
)
def approve_sonny_automation(
    company_id: str,
    run_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    run = resolve_automation_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )

    try:
        updated = approve_run(
            db,
            run=run,
            actor_id=str(token.get("sub") or ""),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Sonny automation approved.",
        "run": serialize_run(updated),
    }


@router.post(
    "/company/{company_id}/automations/{run_id}/start"
)
def start_sonny_automation(
    company_id: str,
    run_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    run = resolve_automation_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )

    try:
        updated = start_run(
            db,
            run=run,
            actor_id=str(token.get("sub") or ""),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Sonny automation started.",
        "run": serialize_run(updated),
    }


@router.post(
    "/company/{company_id}/automations/{run_id}/actions/{action_id}/approve"
)
def approve_sonny_automation_action(
    company_id: str,
    run_id: str,
    action_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    run = resolve_automation_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )

    action = resolve_automation_action_or_404(
        db,
        run=run,
        action_id=action_id,
    )

    try:
        updated = approve_action(
            db,
            run=run,
            action=action,
            actor_id=str(token.get("sub") or ""),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Automation action approved.",
        "action": serialize_action(updated),
    }


@router.post(
    "/company/{company_id}/automations/{run_id}/actions/{action_id}/start"
)
def start_sonny_automation_action(
    company_id: str,
    run_id: str,
    action_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    run = resolve_automation_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )

    action = resolve_automation_action_or_404(
        db,
        run=run,
        action_id=action_id,
    )

    try:
        updated = start_action(
            db,
            run=run,
            action=action,
            actor_id=str(token.get("sub") or ""),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Automation action started.",
        "action": serialize_action(updated),
    }


@router.post(
    "/company/{company_id}/automations/{run_id}/actions/{action_id}/complete"
)
def complete_sonny_automation_action(
    company_id: str,
    run_id: str,
    action_id: str,
    payload: CompleteAutomationActionRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    run = resolve_automation_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )

    action = resolve_automation_action_or_404(
        db,
        run=run,
        action_id=action_id,
    )

    try:
        updated = complete_action(
            db,
            run=run,
            action=action,
            actor_id=str(token.get("sub") or ""),
            result=payload.result,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Automation action completed.",
        "action": serialize_action(updated),
    }


@router.post(
    "/company/{company_id}/automations/{run_id}/actions/{action_id}/fail"
)
def fail_sonny_automation_action(
    company_id: str,
    run_id: str,
    action_id: str,
    payload: FailAutomationActionRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    run = resolve_automation_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )

    action = resolve_automation_action_or_404(
        db,
        run=run,
        action_id=action_id,
    )

    try:
        updated = fail_action(
            db,
            run=run,
            action=action,
            actor_id=str(token.get("sub") or ""),
            error_message=payload.error_message,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Automation action failed.",
        "action": serialize_action(updated),
    }


@router.post(
    "/company/{company_id}/automations/{run_id}/complete"
)
def complete_sonny_automation(
    company_id: str,
    run_id: str,
    payload: CompleteAutomationRunRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    run = resolve_automation_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )

    try:
        updated = complete_run(
            db,
            run=run,
            actor_id=str(token.get("sub") or ""),
            output_payload=payload.output_payload,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Sonny automation completed.",
        "run": serialize_run(updated),
    }


@router.post(
    "/company/{company_id}/automations/{run_id}/fail"
)
def fail_sonny_automation(
    company_id: str,
    run_id: str,
    payload: FailAutomationRunRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    run = resolve_automation_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )

    try:
        updated = fail_run(
            db,
            run=run,
            actor_id=str(token.get("sub") or ""),
            error_message=payload.error_message,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Sonny automation failed.",
        "run": serialize_run(updated),
    }


@router.post(
    "/company/{company_id}/automations/{run_id}/cancel"
)
def cancel_sonny_automation(
    company_id: str,
    run_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    run = resolve_automation_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )

    try:
        updated = cancel_run(
            db,
            run=run,
            actor_id=str(token.get("sub") or ""),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        ) from error

    return {
        "message": "Sonny automation cancelled.",
        "run": serialize_run(updated),
    }

def resolve_orchestration_run_or_404(
    db: Session,
    *,
    company_id: str,
    run_id: str,
):
    try:
        return get_company_orchestration_run(
            db,
            company_id=company_id,
            run_id=run_id,
        )
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


def resolve_agent_assignment_or_404(
    db: Session,
    *,
    run,
    assignment_id: str,
):
    try:
        return get_assignment(
            db,
            run=run,
            assignment_id=assignment_id,
        )
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get("/agents")
def get_sonny_agents(
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    sync_default_agents(db)
    agents = list_active_agents(db)
    return {
        "engine_version": "b5.4",
        "count": len(agents),
        "agents": [serialize_agent(agent) for agent in agents],
    }


@router.get("/agents/capabilities")
def get_sonny_agent_capabilities(
    required_capability: str | None = Query(default=None),
    action_code: str | None = Query(default=None),
    preferred_agent_code: str | None = Query(default=None),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    sync_default_agents(db)
    matrix = build_capability_matrix(db)

    if required_capability:
        matrix["selection"] = explain_agent_selection(
            db,
            required_capability=required_capability,
            action_code=action_code,
            preferred_agent_code=preferred_agent_code,
        )

    return matrix


@router.post("/company/{company_id}/orchestrations")
def create_sonny_orchestration(
    company_id: str,
    payload: CreateOrchestrationRunRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)

    try:
        run = create_orchestration_run(
            db,
            company_id=company_id,
            orchestration_type=payload.orchestration_type,
            created_by=str(token.get("sub") or ""),
            trigger_type=payload.trigger_type,
            decision_id=payload.decision_id,
            workflow_id=payload.workflow_id,
            automation_run_id=payload.automation_run_id,
            approval_required=payload.approval_required,
            input_payload=payload.input_payload,
            orchestration_metadata=payload.orchestration_metadata,
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Orchestration creation failed: {str(error)}",
        ) from error

    return {
        "message": "Sonny orchestration run is ready.",
        "run": serialize_orchestration_run(run),
    }


@router.get("/company/{company_id}/orchestrations")
def list_sonny_orchestrations(
    company_id: str,
    status: str | None = Query(default=None),
    orchestration_type: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)

    query = db.query(SonnyOrchestrationRun).filter(
        SonnyOrchestrationRun.company_id == company_id
    )

    if status:
        query = query.filter(
            SonnyOrchestrationRun.status == status.strip().lower()
        )

    if orchestration_type:
        query = query.filter(
            SonnyOrchestrationRun.orchestration_type
            == orchestration_type.strip()
        )

    runs = (
        query.order_by(SonnyOrchestrationRun.created_at.desc())
        .limit(limit)
        .all()
    )

    return {
        "company_id": company_id,
        "metrics": {
            "total": len(runs),
            "awaiting_approval": sum(
                item.status == "awaiting_approval" for item in runs
            ),
            "approved": sum(item.status == "approved" for item in runs),
            "running": sum(item.status == "running" for item in runs),
            "completed": sum(item.status == "completed" for item in runs),
            "failed": sum(item.status == "failed" for item in runs),
            "cancelled": sum(item.status == "cancelled" for item in runs),
        },
        "runs": [serialize_orchestration_run(run) for run in runs],
    }


@router.get("/company/{company_id}/orchestrations/{run_id}")
def get_sonny_orchestration(
    company_id: str,
    run_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)
    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )
    return serialize_orchestration_run(run)


@router.post(
    "/company/{company_id}/orchestrations/{run_id}/assignments"
)
def create_sonny_agent_assignment(
    company_id: str,
    run_id: str,
    payload: CreateAgentAssignmentRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)
    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )

    try:
        assignment = create_assignment(
            db,
            run=run,
            assignment_code=payload.assignment_code,
            title=payload.title,
            instructions=payload.instructions,
            required_capability=payload.required_capability,
            assigned_by=str(token.get("sub") or ""),
            action_code=payload.action_code,
            preferred_agent_code=payload.preferred_agent_code,
            agent_code=payload.agent_code,
            priority=payload.priority,
            approval_required=payload.approval_required,
            due_at=payload.due_at,
            confidence=payload.confidence,
            input_payload=payload.input_payload,
            automation_run_id=payload.automation_run_id,
            automation_action_id=payload.automation_action_id,
            workflow_id=payload.workflow_id,
            workflow_step_id=payload.workflow_step_id,
            assignment_metadata=payload.assignment_metadata,
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Assignment creation failed: {str(error)}",
        ) from error

    return {
        "message": "Agent assignment created.",
        "assignment": serialize_assignment(assignment),
    }


@router.post("/company/{company_id}/orchestrations/{run_id}/approve")
def approve_sonny_orchestration(
    company_id: str,
    run_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)
    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )
    try:
        updated = approve_orchestration_run(
            db,
            run=run,
            actor_id=str(token.get("sub") or ""),
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return {
        "message": "Sonny orchestration approved.",
        "run": serialize_orchestration_run(updated),
    }


@router.post("/company/{company_id}/orchestrations/{run_id}/start")
def start_sonny_orchestration(
    company_id: str,
    run_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)
    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )
    try:
        updated = start_orchestration_run(
            db,
            run=run,
            actor_id=str(token.get("sub") or ""),
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return {
        "message": "Sonny orchestration started.",
        "run": serialize_orchestration_run(updated),
    }


@router.post(
    "/company/{company_id}/orchestrations/{run_id}/assignments/{assignment_id}/approve"
)
def approve_sonny_assignment(
    company_id: str,
    run_id: str,
    assignment_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)
    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )
    assignment = resolve_agent_assignment_or_404(
        db,
        run=run,
        assignment_id=assignment_id,
    )
    try:
        updated = approve_assignment(
            db,
            run=run,
            assignment=assignment,
            actor_id=str(token.get("sub") or ""),
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return {
        "message": "Agent assignment approved.",
        "assignment": serialize_assignment(updated),
    }


@router.post(
    "/company/{company_id}/orchestrations/{run_id}/assignments/{assignment_id}/accept"
)
def accept_sonny_assignment(
    company_id: str,
    run_id: str,
    assignment_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)
    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )
    assignment = resolve_agent_assignment_or_404(
        db,
        run=run,
        assignment_id=assignment_id,
    )
    try:
        updated = accept_assignment(
            db,
            run=run,
            assignment=assignment,
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return {
        "message": "Agent assignment accepted.",
        "assignment": serialize_assignment(updated),
    }


@router.post(
    "/company/{company_id}/orchestrations/{run_id}/assignments/{assignment_id}/start"
)
def start_sonny_assignment(
    company_id: str,
    run_id: str,
    assignment_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)
    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )
    assignment = resolve_agent_assignment_or_404(
        db,
        run=run,
        assignment_id=assignment_id,
    )
    try:
        updated = start_assignment(
            db,
            run=run,
            assignment=assignment,
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return {
        "message": "Agent assignment started.",
        "assignment": serialize_assignment(updated),
    }


@router.post(
    "/company/{company_id}/orchestrations/{run_id}/assignments/{assignment_id}/complete"
)
def complete_sonny_assignment(
    company_id: str,
    run_id: str,
    assignment_id: str,
    payload: CompleteAgentAssignmentRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)
    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )
    assignment = resolve_agent_assignment_or_404(
        db,
        run=run,
        assignment_id=assignment_id,
    )
    try:
        updated = complete_assignment(
            db,
            run=run,
            assignment=assignment,
            result_payload=payload.result_payload,
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return {
        "message": "Agent assignment completed.",
        "assignment": serialize_assignment(updated),
    }


@router.post(
    "/company/{company_id}/orchestrations/{run_id}/assignments/{assignment_id}/fail"
)
def fail_sonny_assignment(
    company_id: str,
    run_id: str,
    assignment_id: str,
    payload: FailAgentAssignmentRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)
    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )
    assignment = resolve_agent_assignment_or_404(
        db,
        run=run,
        assignment_id=assignment_id,
    )
    try:
        updated = fail_assignment(
            db,
            run=run,
            assignment=assignment,
            error_message=payload.error_message,
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return {
        "message": "Agent assignment failed.",
        "assignment": serialize_assignment(updated),
    }


@router.post(
    "/company/{company_id}/orchestrations/{run_id}/assignments/{assignment_id}/messages"
)
def add_sonny_assignment_message(
    company_id: str,
    run_id: str,
    assignment_id: str,
    payload: AgentMessageRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)
    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )
    assignment = resolve_agent_assignment_or_404(
        db,
        run=run,
        assignment_id=assignment_id,
    )

    try:
        message = add_agent_message(
            db,
            assignment=assignment,
            sender_agent_code=payload.sender_agent_code,
            recipient_agent_code=payload.recipient_agent_code,
            message_type=payload.message_type,
            subject=payload.subject,
            content=payload.content,
            message_data=payload.message_data,
        )
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Agent message creation failed: {str(error)}",
        ) from error

    return {
        "message": "Agent message recorded.",
        "agent_message": serialize_message(message),
    }


@router.post("/company/{company_id}/orchestrations/{run_id}/complete")
def complete_sonny_orchestration(
    company_id: str,
    run_id: str,
    payload: CompleteOrchestrationRunRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)
    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )
    try:
        updated = complete_orchestration_run(
            db,
            run=run,
            actor_id=str(token.get("sub") or ""),
            output_payload=payload.output_payload,
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return {
        "message": "Sonny orchestration completed.",
        "run": serialize_orchestration_run(updated),
    }


@router.post("/company/{company_id}/orchestrations/{run_id}/fail")
def fail_sonny_orchestration(
    company_id: str,
    run_id: str,
    payload: FailOrchestrationRunRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)
    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )
    try:
        updated = fail_orchestration_run(
            db,
            run=run,
            actor_id=str(token.get("sub") or ""),
            error_message=payload.error_message,
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return {
        "message": "Sonny orchestration failed.",
        "run": serialize_orchestration_run(updated),
    }


@router.post("/company/{company_id}/orchestrations/{run_id}/cancel")
def cancel_sonny_orchestration(
    company_id: str,
    run_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(company_id, str(token.get("sub") or ""), db)
    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )
    try:
        updated = cancel_orchestration_run(
            db,
            run=run,
            actor_id=str(token.get("sub") or ""),
        )
    except ValueError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error

    return {
        "message": "Sonny orchestration cancelled.",
        "run": serialize_orchestration_run(updated),
    }

@router.get(
    "/company/{company_id}/orchestrations/{run_id}/assignments"
)
def list_sonny_orchestration_assignments(
    company_id: str,
    run_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        str(token.get("sub") or ""),
        db,
    )

    run = resolve_orchestration_run_or_404(
        db,
        company_id=company_id,
        run_id=run_id,
    )

    assignments = (
        db.query(SonnyAgentAssignment)
        .filter(
            SonnyAgentAssignment.orchestration_run_id == run.id
        )
        .order_by(SonnyAgentAssignment.created_at.asc())
        .all()
    )

    return {
        "company_id": company_id,
        "run_id": run.id,
        "count": len(assignments),
        "assignments": [
            serialize_assignment(assignment)
            for assignment in assignments
        ],
    }

