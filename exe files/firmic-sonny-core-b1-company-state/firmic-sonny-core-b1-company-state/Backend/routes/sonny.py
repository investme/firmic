from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from models.company import Company
from services.sonny.state import build_company_state, build_state_prompt_context

router = APIRouter()


def verify_company_access(company_id: str, user_id: str, db: Session) -> Company:
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.user_id == str(user_id),
        Company.status != "terminated",
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found or access denied.")
    return company


@router.get("/company/{company_id}/state")
def sonny_company_state(
    company_id: str,
    activity_limit: int = 30,
    memory_limit: int = 20,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = verify_company_access(company_id, str(token.get("sub") or ""), db)
    return build_company_state(db, company, activity_limit=activity_limit, memory_limit=memory_limit)


@router.get("/company/{company_id}/context")
def sonny_company_context(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = verify_company_access(company_id, str(token.get("sub") or ""), db)
    state = build_company_state(db, company, activity_limit=10, memory_limit=10)
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
    company = verify_company_access(company_id, str(token.get("sub") or ""), db)
    state = build_company_state(db, company, activity_limit=20, memory_limit=10)
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
        "alerts": [item["title"] for item in state["intelligence"]["alerts"]],
        "recommendations": [item["title"] for item in state["intelligence"]["recommendations"]],
        "intelligence": state["intelligence"],
        "state_version": state["state_version"],
    }
