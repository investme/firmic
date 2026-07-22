from __future__ import annotations

from collections import Counter
from typing import Any

from sqlalchemy.orm import Session

from models.activity_log import ActivityLog
from models.company import Company, Document, Task, Workflow
from models.company_ai_agent import CompanyAIAgent
from models.meeting_booking import MeetingBooking
from models.sonny_memory import SonnyMemory
from models.support_ticket import SupportTicket
from models.usage_ledger import UsageLedger

DONE = {"completed", "complete", "done", "closed"}
OPEN_SUPPORT = {"open", "pending", "waiting_on_tenant"}
RESOLVED_SUPPORT = {"resolved", "closed"}


def norm(value: Any) -> str:
    return str(value or "").strip().lower()


def iso(value: Any) -> str | None:
    return value.isoformat() if value is not None and hasattr(value, "isoformat") else None


def amount(value: Any) -> float:
    try:
        return round(float(value or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def document_signals(documents: list[Document]) -> dict[str, Any]:
    texts = [norm(f"{doc.name or ''} {doc.type or ''}") for doc in documents]

    def has(*terms: str) -> bool:
        return any(any(term in text for term in terms) for text in texts)

    return {
        "total": len(documents),
        "approved": sum(norm(doc.status) == "approved" for doc in documents),
        "pending": sum(norm(doc.status) != "approved" for doc in documents),
        "requirements": {
            "trade_license": has("trade license", "trade licence"),
            "passport_copy": has("passport"),
            "incorporation_certificate": has("incorporation certificate", "certificate of incorporation"),
            "proof_of_address": has("proof of address", "address proof"),
            "kyb": has("kyb", "know your business"),
            "beneficial_owner": has("beneficial owner", "ubo", "ownership declaration"),
            "office_agreement": has("office agreement", "virtual office agreement", "headquarters agreement"),
        },
    }


def ledger_state(entries: list[UsageLedger]) -> dict[str, Any]:
    status_totals: dict[str, float] = {}
    service_totals: dict[str, float] = {}
    months = Counter(str(entry.invoice_month) for entry in entries if entry.invoice_month)

    for entry in entries:
        status = norm(entry.status) or "unknown"
        service = norm(entry.service) or "unknown"
        total = amount(entry.total_amount)
        status_totals[status] = amount(status_totals.get(status, 0) + total)
        service_totals[service] = amount(service_totals.get(service, 0) + total)

    current_month = months.most_common(1)[0][0] if months else None
    current_total = amount(sum(
        amount(entry.total_amount)
        for entry in entries
        if current_month and str(entry.invoice_month) == current_month and norm(entry.status) != "void"
    ))

    return {
        "entry_count": len(entries),
        "subtotal_usd": amount(sum(amount(entry.amount) for entry in entries)),
        "tax_usd": amount(sum(amount(entry.tax_amount) for entry in entries)),
        "total_usd": amount(sum(amount(entry.total_amount) for entry in entries)),
        "current_invoice_month": current_month,
        "current_month_total_usd": current_total,
        "unbilled_usd": status_totals.get("unbilled", 0.0),
        "billed_usd": status_totals.get("billed", 0.0),
        "paid_usd": status_totals.get("paid", 0.0),
        "status_totals_usd": status_totals,
        "service_totals_usd": service_totals,
    }


def build_intelligence(state: dict[str, Any]) -> dict[str, Any]:
    alerts: list[dict[str, Any]] = []
    recommendations: list[dict[str, Any]] = []
    company = state["company"]
    docs = state["documents"]["signals"]
    tasks = state["tasks"]["summary"]
    support = state["support"]["summary"]
    billing = state["billing"]
    workforce = state["ai_workforce"]["summary"]

    if not company["headquarters"]["active"]:
        alerts.append({"code": "headquarters_missing", "severity": "high", "title": "Headquarters is not active", "source": "company"})
        recommendations.append({"code": "activate_headquarters", "priority": "high", "title": "Activate company headquarters", "target": "/virtual-offices"})

    required = {"trade_license", "passport_copy", "incorporation_certificate", "proof_of_address"}
    missing = [key for key in required if not docs["requirements"].get(key)]
    if missing:
        alerts.append({
            "code": "compliance_documents_incomplete",
            "severity": "high",
            "title": "Required compliance documents are incomplete",
            "detail": ", ".join(item.replace("_", " ").title() for item in missing),
            "source": "documents",
        })
        recommendations.append({"code": "upload_documents", "priority": "high", "title": "Upload required company documents", "target": "/documents"})

    if tasks["pending"]:
        alerts.append({"code": "tasks_pending", "severity": "medium", "title": f'{tasks["pending"]} task(s) require attention', "source": "tasks"})
        recommendations.append({"code": "review_tasks", "priority": "medium", "title": "Review pending company tasks", "target": "/tasks"})

    if support["urgent"]:
        alerts.append({"code": "urgent_support", "severity": "critical", "title": f'{support["urgent"]} urgent support ticket(s)', "source": "support"})
    if support["open"]:
        recommendations.append({"code": "review_support", "priority": "medium", "title": "Review open support tickets", "target": "/support"})

    if billing["unbilled_usd"]:
        alerts.append({"code": "unbilled_usage", "severity": "medium", "title": "Unbilled usage is present", "detail": f'${billing["unbilled_usd"]:.2f} remains unbilled', "source": "billing"})
        recommendations.append({"code": "review_billing", "priority": "medium", "title": "Review current billing", "target": "/billing"})

    if workforce["active"] == 0:
        recommendations.append({"code": "consider_ai_workforce", "priority": "low", "title": "Consider activating an AI employee", "target": "/ai-workforce"})

    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    alerts.sort(key=lambda item: order.get(item["severity"], 99))
    recommendations.sort(key=lambda item: order.get(item["priority"], 99))
    return {
        "alerts": alerts,
        "recommendations": recommendations,
        "attention_required": bool(alerts),
        "critical_count": sum(item["severity"] == "critical" for item in alerts),
        "high_count": sum(item["severity"] == "high" for item in alerts),
    }


def build_company_state(db: Session, company: Company, *, activity_limit: int = 30, memory_limit: int = 20) -> dict[str, Any]:
    """Build Sonny's unified, read-only company state. This function never commits."""
    company_id = company.id
    documents = db.query(Document).filter(Document.company_id == company_id).order_by(Document.uploaded_at.desc()).all()
    tasks = db.query(Task).filter(Task.company_id == company_id).order_by(Task.created_at.desc()).all()
    workflows = db.query(Workflow).filter(Workflow.company_id == company_id).order_by(Workflow.created_at.desc()).all()
    agents = db.query(CompanyAIAgent).filter(CompanyAIAgent.company_id == company_id).order_by(CompanyAIAgent.agent_name.asc()).all()
    bookings = db.query(MeetingBooking).filter(MeetingBooking.company_id == company_id).order_by(MeetingBooking.created_at.desc()).all()
    ledger = db.query(UsageLedger).filter(UsageLedger.company_id == company_id).order_by(UsageLedger.created_at.desc()).all()
    tickets = db.query(SupportTicket).filter(SupportTicket.company_id == company_id).order_by(SupportTicket.updated_at.desc()).all()
    activity = db.query(ActivityLog).filter(ActivityLog.company_id == company_id).order_by(ActivityLog.created_at.desc()).limit(min(max(activity_limit, 1), 100)).all()
    memories = db.query(SonnyMemory).filter(SonnyMemory.company_id == company_id).order_by(SonnyMemory.created_at.desc()).limit(min(max(memory_limit, 1), 100)).all()

    pending_tasks = [task for task in tasks if norm(task.status) not in DONE]
    completed_tasks = [task for task in tasks if norm(task.status) in DONE]
    active_agents = [agent for agent in agents if norm(agent.status) == "active"]
    active_bookings = [booking for booking in bookings if norm(booking.status) in {"confirmed", "active", "booked"}]
    open_tickets = [ticket for ticket in tickets if norm(ticket.status) in OPEN_SUPPORT]
    resolved_tickets = [ticket for ticket in tickets if norm(ticket.status) in RESOLVED_SUPPORT]
    urgent_tickets = [ticket for ticket in open_tickets if norm(ticket.priority) == "urgent"]
    docs = document_signals(documents)

    state: dict[str, Any] = {
        "state_version": "b1.1",
        "company": {
            "id": company.id,
            "name": company.name,
            "status": company.status,
            "owner_user_id": company.user_id,
            "headquarters": {
                "active": bool(company.headquarters_office_code),
                "office_code": company.headquarters_office_code,
                "location": company.headquarters_location,
                "phone": company.headquarters_phone,
                "monthly_price_usd": amount(company.headquarters_monthly_price_usd),
            },
        },
        "documents": {
            "summary": {"total": len(documents), "approved": docs["approved"], "pending": docs["pending"]},
            "signals": docs,
            "items": [{"id": item.id, "name": item.name, "type": item.type, "status": item.status, "file_path": item.file_path, "uploaded_at": iso(item.uploaded_at)} for item in documents],
        },
        "tasks": {
            "summary": {"total": len(tasks), "pending": len(pending_tasks), "completed": len(completed_tasks)},
            "items": [{"id": item.id, "title": item.title, "description": item.description, "status": item.status, "created_at": iso(item.created_at)} for item in tasks],
        },
        "workflows": {
            "summary": {"total": len(workflows), "running": sum(norm(item.status) == "running" for item in workflows), "completed": sum(norm(item.status) in DONE for item in workflows)},
            "items": [{
                "id": item.id, "name": item.name, "status": item.status, "created_at": iso(item.created_at),
                "steps": [{"id": step.id, "title": step.title, "status": step.status, "created_at": iso(step.created_at)} for step in (item.steps or [])],
            } for item in workflows],
        },
        "ai_workforce": {
            "summary": {"total": len(agents), "active": len(active_agents), "inactive": len(agents) - len(active_agents), "active_monthly_cost_usd": amount(sum(amount(item.monthly_price_usd) for item in active_agents))},
            "items": [{"id": item.id, "agent_name": item.agent_name, "monthly_price_usd": amount(item.monthly_price_usd), "status": item.status, "activated_at": iso(item.activated_at), "deactivated_at": iso(item.deactivated_at)} for item in agents],
        },
        "meetings": {
            "summary": {"total": len(bookings), "active": len(active_bookings), "cancelled": sum(norm(item.status) == "cancelled" for item in bookings), "booked_hours": amount(sum(float(item.duration_hours or 0) for item in active_bookings))},
            "items": [{"id": item.id, "room_id": item.room_id, "room_name": item.room_name, "booking_date": item.booking_date, "booking_time": item.booking_time, "duration_hours": item.duration_hours, "hourly_price_usd": amount(item.hourly_price_usd), "status": item.status, "created_at": iso(item.created_at)} for item in bookings],
        },
        "billing": ledger_state(ledger),
        "support": {
            "summary": {"total": len(tickets), "open": len(open_tickets), "urgent": len(urgent_tickets), "resolved": len(resolved_tickets)},
            "items": [{"id": item.id, "subject": item.subject, "category": item.category, "priority": item.priority, "status": item.status, "assigned_admin_id": item.assigned_admin_id, "message_count": len(item.messages or []), "created_at": iso(item.created_at), "updated_at": iso(item.updated_at), "resolved_at": iso(item.resolved_at)} for item in tickets],
        },
        "activity": {"summary": {"returned": len(activity)}, "items": [{"id": item.id, "event_type": item.event_type, "title": item.title, "description": item.description, "actor_type": item.actor_type, "source_type": item.source_type, "source_id": item.source_id, "metadata": item.event_metadata, "created_at": iso(item.created_at)} for item in activity]},
        "memory": {"summary": {"returned": len(memories), "by_type": dict(Counter(norm(item.memory_type) for item in memories))}, "items": [{"id": item.id, "memory_type": item.memory_type, "title": item.title, "content": item.content, "source": item.source, "created_at": iso(item.created_at)} for item in memories]},
    }

    components = {
        "company_active": norm(company.status) == "active",
        "headquarters_active": bool(company.headquarters_office_code),
        "has_documents": bool(documents),
        "has_ai_workforce": bool(active_agents),
        "tasks_have_progress": bool(tasks) and bool(completed_tasks),
    }
    state["progress"] = {
        "score": round(sum(bool(value) for value in components.values()) / len(components) * 100),
        "task_progress": round(len(completed_tasks) / len(tasks) * 100) if tasks else 0,
        "components": components,
    }
    state["intelligence"] = build_intelligence(state)
    return state


def build_state_prompt_context(state: dict[str, Any]) -> str:
    company = state["company"]
    tasks = state["tasks"]["summary"]
    documents = state["documents"]["summary"]
    support = state["support"]["summary"]
    workforce = state["ai_workforce"]["summary"]
    meetings = state["meetings"]["summary"]
    billing = state["billing"]
    progress = state["progress"]
    alerts = "; ".join(f'{item["severity"]}: {item["title"]}' for item in state["intelligence"]["alerts"][:5]) or "None"
    recommendations = "; ".join(item["title"] for item in state["intelligence"]["recommendations"][:5]) or "None"
    return "\n".join([
        f'Company: {company["name"]}',
        f'Status: {company["status"]}',
        f'Headquarters: {company["headquarters"]["office_code"] or "Not active"}',
        f'Tasks: {tasks["total"]} total, {tasks["pending"]} pending, {tasks["completed"]} completed',
        f'Documents: {documents["total"]} total, {documents["approved"]} approved',
        f'AI workforce: {workforce["active"]} active',
        f'Meetings: {meetings["active"]} active, {meetings["booked_hours"]} booked hours',
        f'Support: {support["open"]} open, {support["urgent"]} urgent',
        f'Current billing: ${billing["current_month_total_usd"]:.2f}',
        f'Operational progress: {progress["score"]}%',
        f'Alerts: {alerts}',
        f'Recommendations: {recommendations}',
    ])
