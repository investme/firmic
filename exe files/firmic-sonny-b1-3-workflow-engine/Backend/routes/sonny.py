from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Any
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from models.company import Company
from models.sonny_decision import SonnyDecision
from models.sonny_workflow import SonnyWorkflow
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
from services.sonny.state import (
    build_company_state,
    build_state_prompt_context,
)


router = APIRouter()




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
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == str(user_id),
            Company.status != "terminated",
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company not found or access denied.",
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

