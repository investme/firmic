from __future__ import annotations

import datetime
from typing import Any

from sqlalchemy.orm import Session

from models.activity_log import ActivityLog
from models.company import Company, Document, Task, Workflow
from models.company_ai_agent import CompanyAIAgent
from models.meeting_booking import MeetingBooking
from models.usage_ledger import UsageLedger
from models.workforce_job import WorkforceJob


DONE = {"completed", "complete", "done", "closed", "approved"}
ACTIVE = {"pending", "accepted", "working", "running", "in_progress"}
FAILED = {"failed", "error", "cancelled"}


def norm(value: Any) -> str:
    return str(value or "").strip().lower()


def money(value: Any) -> float:
    try:
        return round(float(value or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def iso(value: Any) -> str | None:
    if value is None:
        return None
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def clamp(value: int) -> int:
    return max(0, min(int(value), 100))


def generate_executive_intelligence(
    db: Session,
    company: Company,
) -> dict[str, Any]:
    """Build a live, deterministic executive intelligence report."""

    company_id = str(company.id)
    now = datetime.datetime.utcnow()
    month = now.strftime("%Y-%m")
    activity_cutoff = now - datetime.timedelta(days=30)

    tasks = db.query(Task).filter(Task.company_id == company_id).all()
    documents = db.query(Document).filter(Document.company_id == company_id).all()
    workflows = db.query(Workflow).filter(Workflow.company_id == company_id).all()
    jobs = db.query(WorkforceJob).filter(WorkforceJob.company_id == company_id).all()
    agents = db.query(CompanyAIAgent).filter(CompanyAIAgent.company_id == company_id).all()
    meetings = db.query(MeetingBooking).filter(MeetingBooking.company_id == company_id).all()
    ledger = db.query(UsageLedger).filter(UsageLedger.company_id == company_id).all()
    activity = (
        db.query(ActivityLog)
        .filter(
            ActivityLog.company_id == company_id,
            ActivityLog.created_at >= activity_cutoff,
        )
        .order_by(ActivityLog.created_at.desc())
        .limit(20)
        .all()
    )

    completed_tasks = sum(norm(item.status) in DONE for item in tasks)
    open_tasks = len(tasks) - completed_tasks
    completed_jobs = sum(norm(item.status) in DONE for item in jobs)
    active_jobs = sum(norm(item.status) in ACTIVE for item in jobs)
    failed_jobs = sum(norm(item.status) in FAILED for item in jobs)
    running_workflows = sum(norm(item.status) in ACTIVE for item in workflows)
    failed_workflows = sum(norm(item.status) in FAILED for item in workflows)
    approved_documents = sum(norm(item.status) in DONE for item in documents)
    pending_documents = len(documents) - approved_documents
    active_agents = [item for item in agents if norm(item.status) == "active"]
    confirmed_meetings = [item for item in meetings if norm(item.status) == "confirmed"]
    meeting_hours = sum(int(item.duration_hours or 0) for item in confirmed_meetings)

    current_ledger = [
        item
        for item in ledger
        if str(item.invoice_month or "") == month and norm(item.status) != "void"
    ]
    current_expenses = round(sum(money(item.total_amount) for item in current_ledger), 2)
    outstanding_amount = round(
        sum(
            money(item.total_amount)
            for item in current_ledger
            if norm(item.status) in {"unbilled", "pending", "overdue"}
        ),
        2,
    )

    headquarters_active = bool(company.headquarters_office_code)

    infrastructure = 40
    infrastructure += 35 if headquarters_active else 0
    infrastructure += min(len(active_agents) * 8, 25)

    operations = 55
    if tasks:
        operations += int((completed_tasks / len(tasks)) * 25)
    if jobs:
        operations += int((completed_jobs / len(jobs)) * 15)
    operations -= min(failed_jobs * 10, 30)
    operations -= min(failed_workflows * 10, 20)

    compliance = 55
    if documents:
        compliance += int((approved_documents / len(documents)) * 35)
    elif headquarters_active:
        compliance += 10
    compliance -= min(pending_documents * 4, 25)

    growth = 45
    growth += min(len(active_agents) * 8, 24)
    growth += min(len(confirmed_meetings) * 4, 16)
    growth += min(len(activity) * 1, 15)

    infrastructure = clamp(infrastructure)
    operations = clamp(operations)
    compliance = clamp(compliance)
    growth = clamp(growth)
    overall = clamp(round(
        infrastructure * 0.30
        + operations * 0.30
        + compliance * 0.25
        + growth * 0.15
    ))

    risks: list[dict[str, str]] = []
    if not headquarters_active:
        risks.append({
            "severity": "high",
            "title": "Headquarters not active",
            "description": "Activate a Firmic headquarters to complete the company infrastructure.",
        })
    if failed_jobs:
        risks.append({
            "severity": "high",
            "title": "AI workforce failures detected",
            "description": f"{failed_jobs} workforce job(s) require review.",
        })
    if pending_documents:
        risks.append({
            "severity": "medium",
            "title": "Documents require attention",
            "description": f"{pending_documents} document(s) are not yet approved.",
        })
    if outstanding_amount > 0:
        risks.append({
            "severity": "medium",
            "title": "Billing items pending",
            "description": f"${outstanding_amount:.2f} is currently unbilled or pending.",
        })
    if not active_agents:
        risks.append({
            "severity": "medium",
            "title": "No active AI workforce",
            "description": "Activate at least one AI executive to automate operations.",
        })
    if failed_workflows:
        risks.append({
            "severity": "high",
            "title": "Workflow failure detected",
            "description": f"{failed_workflows} workflow(s) failed and should be reviewed.",
        })

    recommendations: list[dict[str, str]] = []
    if not headquarters_active:
        recommendations.append({
            "priority": "high",
            "title": "Activate Headquarters",
            "impact": "Completes the company's operating infrastructure.",
        })
    if pending_documents:
        recommendations.append({
            "priority": "high",
            "title": "Complete document approval",
            "impact": "Reduces compliance and onboarding risk.",
        })
    if failed_jobs:
        recommendations.append({
            "priority": "high",
            "title": "Review failed AI jobs",
            "impact": "Restores operational continuity and improves automation reliability.",
        })
    if len(active_agents) < 2:
        recommendations.append({
            "priority": "medium",
            "title": "Expand the AI workforce",
            "impact": "Adds capacity across compliance, operations, and growth.",
        })
    if not confirmed_meetings:
        recommendations.append({
            "priority": "low",
            "title": "Schedule an executive meeting",
            "impact": "Creates a structured checkpoint for leadership decisions.",
        })
    if not recommendations:
        recommendations.append({
            "priority": "low",
            "title": "Maintain current operating rhythm",
            "impact": "The company is stable; continue monitoring KPIs and execution.",
        })

    status_word = "strong" if overall >= 85 else "stable" if overall >= 70 else "requires attention"
    risk_summary = (
        "No critical operational risks are currently detected."
        if not risks
        else f"{len(risks)} operational risk(s) require attention."
    )
    executive_brief = (
        f"{company.name} is in a {status_word} operating position with a business health score "
        f"of {overall}/100. Headquarters is {'active' if headquarters_active else 'not active'}, "
        f"{len(active_agents)} AI executive(s) are active, and {active_jobs} workforce job(s) are in progress. "
        f"{completed_tasks} of {len(tasks)} task(s) are complete. {risk_summary}"
    )

    return {
        "generated_at": now.isoformat(),
        "company": {
            "id": company_id,
            "name": company.name,
            "status": company.status,
            "headquarters_active": headquarters_active,
            "headquarters_office_code": company.headquarters_office_code,
        },
        "health": {
            "overall": overall,
            "operations": operations,
            "infrastructure": infrastructure,
            "compliance": compliance,
            "growth": growth,
        },
        "kpis": {
            "active_ai_agents": len(active_agents),
            "active_ai_jobs": active_jobs,
            "completed_ai_jobs": completed_jobs,
            "failed_ai_jobs": failed_jobs,
            "open_tasks": open_tasks,
            "completed_tasks": completed_tasks,
            "running_workflows": running_workflows,
            "approved_documents": approved_documents,
            "pending_documents": pending_documents,
            "meeting_hours": meeting_hours,
            "confirmed_meetings": len(confirmed_meetings),
            "monthly_expenses_usd": current_expenses,
            "outstanding_amount_usd": outstanding_amount,
            "recent_activity_count": len(activity),
        },
        "risks": risks,
        "recommendations": recommendations,
        "executive_brief": executive_brief,
        "recent_activity": [
            {
                "id": item.id,
                "event_type": item.event_type,
                "title": item.title,
                "description": item.description,
                "actor_type": item.actor_type,
                "created_at": iso(item.created_at),
            }
            for item in activity[:8]
        ],
    }
