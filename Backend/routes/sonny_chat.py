from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from firmic_models import User
from models.company import Company
from services.sonny.memory import add_memory, remember_founder_message
from services.sonny.executive_context import build_executive_context
from services.sonny.executive_decision import build_decision_payload
from services.sonny.executive_planner import build_planner_payload
from services.sonny.executive_actions import execute_action
from services.executive_intelligence.executive_engine import generate_executive_intelligence
from services.sonny.executive_intelligence_bridge import answer_from_executive_intelligence
from services.sonny.navigation import resolve_navigation


router = APIRouter()


class SonnyChatRequest(BaseModel):
    company_id: str
    message: str = Field(min_length=1, max_length=10000)
    confirmed: bool = False
    plan: dict[str, Any] | None = None


def verify_company_access(
    company_id: str,
    user_id: str,
    db: Session,
) -> Company:
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.status != "terminated",
        )
        .first()
    )

    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    try:
        normalized_user_id = int(str(user_id))
    except (TypeError, ValueError):
        normalized_user_id = None

    user = None
    if normalized_user_id is not None:
        user = db.query(User).filter(User.id == normalized_user_id).first()

    is_owner = str(company.user_id) == str(user_id)
    is_admin = bool(
        user
        and str(getattr(user, "role", "") or "").strip().lower() == "admin"
    )

    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="Company access denied.")

    return company


def action_preview(plan: dict[str, Any]) -> str:
    action = str(plan.get("action") or "").strip()
    parameters = plan.get("parameters")
    if not isinstance(parameters, dict):
        parameters = {}

    if action == "schedule_meeting":
        return (
            "I prepared the meeting booking:\n"
            f"• {parameters.get('title') or 'Business Meeting'}\n"
            f"• {parameters.get('booking_date')} at {parameters.get('booking_time')}\n"
            f"• {parameters.get('room_name')}\n"
            f"• {parameters.get('duration_hours', 1)} hour(s)\n\n"
            "Please confirm before I create the booking and billing entry."
        )

    if action == "cancel_meeting":
        return "I found the meeting booking. Please confirm before I cancel it."

    if action == "create_task":
        return (
            f'I prepared a new task: "{parameters.get("title")}". '
            "Please confirm before I create it."
        )

    if action == "assign_task":
        return (
            f'I prepared the assignment to {parameters.get("assignee")}. '
            "Please confirm before I update the task."
        )

    return "The requested action is ready. Please confirm before I continue."


@router.post("/chat")
def sonny_chat(
    payload: SonnyChatRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    actor_id = str(token.get("sub") or "")
    company = verify_company_access(payload.company_id, actor_id, db)
    message = payload.message.strip()

    remember_founder_message(
        db=db,
        company_id=company.id,
        message=message,
    )

    navigation = resolve_navigation(message)
    if navigation.get("has_navigation"):
        reply = str(navigation.get("reply") or "Opening the requested destination.")

        add_memory(
            db=db,
            company_id=company.id,
            memory_type="conversation",
            title="Sonny navigation reply",
            content=reply,
            source="sonny",
        )

        return {
            "reply": reply,
            "speech": navigation.get("speech") or reply,
            "actions": navigation.get("actions") or [],
            "company_id": company.id,
            "memory_saved": True,
            "has_action": False,
            "ready_to_execute": True,
            "requires_confirmation": False,
            "missing_fields": [],
            "plan": None,
            "action_result": None,
        }

    context = build_executive_context(
        db=db,
        company=company,
        founder_message=message,
        activity_limit=20,
        memory_limit=20,
    )

    intelligence = generate_executive_intelligence(
        db=db,
        company=company,
    )

    intelligence_answer = answer_from_executive_intelligence(
        intelligence=intelligence,
        founder_message=message,
    )

    decision = build_decision_payload(
        context={
            **context,
            "executive_intelligence": intelligence,
        },
        founder_message=message,
    )

    planner = build_planner_payload(
        context=context,
        founder_message=message,
    )

    plan = payload.plan if payload.confirmed and payload.plan else planner["plan"]
    action_result = None

    if payload.confirmed and plan:
        action_result = execute_action(
            context={
                **context,
                "db": db,
                "company": company,
                "token": token,
                "actor_id": actor_id,
            },
            action_request=plan,
            confirmed=True,
        )
        reply = action_result["message"]

    elif planner["has_action"] and planner["missing_fields"]:
        missing = ", ".join(
            field.replace("_", " ")
            for field in planner["missing_fields"]
        )
        reply = (
            f"I can do that, but I still need: {missing}. "
            "Please provide the missing information."
        )

    elif planner["has_action"] and planner["ready_to_execute"]:
        reply = action_preview(planner["plan"])

    elif intelligence_answer:
        reply = intelligence_answer["reply"]

    else:
        reply = decision["reply"]

    add_memory(
        db=db,
        company_id=company.id,
        memory_type="conversation",
        title="Sonny executive reply",
        content=reply,
        source="sonny",
    )

    return {
        "reply": reply,
        "speech": reply,
        "actions": [],
        "company_id": company.id,
        "memory_saved": True,
        "context_version": context.get("context_version"),
        "decision": decision,
        "executive_intelligence": intelligence,
        "intelligence_answer": intelligence_answer,
        "plan": plan,
        "has_action": bool(planner["has_action"]),
        "ready_to_execute": bool(planner["ready_to_execute"]),
        "requires_confirmation": bool(
            planner["requires_confirmation"]
            and planner["ready_to_execute"]
            and not payload.confirmed
        ),
        "missing_fields": planner["missing_fields"],
        "action_result": action_result,
    }
