from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from models.company import Company
from services.sonny.memory import add_memory, remember_founder_message
from services.sonny.state import build_company_state

router = APIRouter()


class SonnyChatRequest(BaseModel):
    company_id: str
    message: str = Field(min_length=1, max_length=10000)


def verify_company_access(company_id: str, user_id: str, db: Session) -> Company:
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.user_id == str(user_id),
        Company.status != "terminated",
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found or access denied.")
    return company


@router.post("/chat")
def sonny_chat(
    payload: SonnyChatRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    company = verify_company_access(payload.company_id, str(token.get("sub") or ""), db)
    message = payload.message.strip()
    remember_founder_message(db=db, company_id=company.id, message=message)
    state = build_company_state(db, company, activity_limit=20, memory_limit=20)
    reply = build_sonny_reply(state, message)
    add_memory(db=db, company_id=company.id, memory_type="conversation", title="Sonny operational reply", content=reply, source="sonny")
    return {
        "reply": reply,
        "company_id": company.id,
        "memory_saved": True,
        "state_version": state["state_version"],
        "attention_required": state["intelligence"]["attention_required"],
        "alerts": state["intelligence"]["alerts"][:5],
        "recommendations": state["intelligence"]["recommendations"][:5],
    }


def build_sonny_reply(state: dict, message: str) -> str:
    lower = message.lower()
    company = state["company"]
    tasks = state["tasks"]["summary"]
    docs = state["documents"]["summary"]
    workforce = state["ai_workforce"]["summary"]
    meetings = state["meetings"]["summary"]
    support = state["support"]["summary"]
    billing = state["billing"]
    intelligence = state["intelligence"]

    if any(word in lower for word in ["brief", "summary", "overview", "what changed", "morning"]):
        alerts = "; ".join(item["title"] for item in intelligence["alerts"][:3]) or "No major alerts"
        recs = "; ".join(item["title"] for item in intelligence["recommendations"][:3]) or "Continue normal monitoring"
        return f'{company["name"]} brief: progress {state["progress"]["score"]}%, {tasks["pending"]} pending task(s), {docs["approved"]}/{docs["total"]} approved document(s), {support["open"]} open support ticket(s), and ${billing["current_month_total_usd"]:.2f} current billing. Attention: {alerts}. Next: {recs}.'

    if any(word in lower for word in ["billing", "invoice", "cost", "spend", "payment"]):
        return f'Current ledger total is ${billing["total_usd"]:.2f}. Current-month billing is ${billing["current_month_total_usd"]:.2f}; ${billing["unbilled_usd"]:.2f} is unbilled, ${billing["billed_usd"]:.2f} billed, and ${billing["paid_usd"]:.2f} paid.'

    if any(word in lower for word in ["support", "ticket", "problem", "issue"]):
        return f'{company["name"]} has {support["open"]} open support ticket(s), {support["urgent"]} urgent, and {support["resolved"]} resolved or closed.'

    if any(word in lower for word in ["document", "license", "kyb", "compliance"]):
        missing = [key.replace("_", " ").title() for key, present in state["documents"]["signals"]["requirements"].items() if key in {"trade_license", "passport_copy", "incorporation_certificate", "proof_of_address"} and not present]
        return f'I found {docs["total"]} document(s), with {docs["approved"]} approved. Missing core items: {", ".join(missing) if missing else "none"}.'

    if any(word in lower for word in ["task", "next step", "todo", "to do"]):
        pending = [item["title"] for item in state["tasks"]["items"] if str(item["status"] or "").lower() not in {"completed", "complete", "done", "closed"}][:5]
        if pending:
            return "Current pending tasks: " + "; ".join(pending) + "."
        recs = [item["title"] for item in intelligence["recommendations"][:3]]
        return "There are no pending tasks. Recommended actions: " + ("; ".join(recs) if recs else "continue normal monitoring") + "."

    if any(word in lower for word in ["agent", "workforce", "employee"]):
        names = [item["agent_name"] for item in state["ai_workforce"]["items"] if str(item["status"] or "").lower() == "active"]
        return f'{workforce["active"]} AI employee(s) are active: {", ".join(names) if names else "none"}. Active monthly cost is ${workforce["active_monthly_cost_usd"]:.2f}.'

    if any(word in lower for word in ["meeting", "booking", "room"]):
        return f'{company["name"]} has {meetings["active"]} active meeting booking(s), {meetings["booked_hours"]} booked hours, and {meetings["cancelled"]} cancelled booking(s).'

    if "memory" in lower or "remember" in lower:
        return "I saved this inside company-specific Sonny memory. It is isolated to this company and will be available to the later Decision, Workflow, Voice, and Automation engines."

    recommendation = intelligence["recommendations"][0]["title"] if intelligence["recommendations"] else "Continue normal company monitoring"
    return f'I received your instruction for {company["name"]}. The unified company state is active. My current highest-priority recommendation is: {recommendation}.'
