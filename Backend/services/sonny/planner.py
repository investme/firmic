from __future__ import annotations

import datetime
import hashlib
import json
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from models.company import Company
from models.sonny_decision import SonnyDecision
from models.sonny_plan import SonnyPlan, SonnyPlanItem
from models.sonny_workflow import SonnyWorkflow
from services.activity_service import record_activity
from services.sonny.state import build_company_state


PRIORITY_ORDER = {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 3,
    "informational": 4,
}

CATEGORY_ORDER = {
    "critical": 0,
    "approval": 1,
    "workflow": 2,
    "scheduled": 3,
    "opportunity": 4,
    "maintenance": 5,
}

ACTIVE_DECISION_STATUSES = {
    "proposed",
    "approved",
}

ACTIVE_WORKFLOW_STATUSES = {
    "draft",
    "running",
    "waiting",
}


@dataclass(frozen=True)
class PlannerCandidate:
    code: str
    category: str
    title: str
    summary: str
    recommended_action: str | None
    priority: str
    priority_score: int
    assigned_role: str | None
    requires_founder_approval: bool
    decision_id: str | None
    workflow_id: str | None
    task_id: str | None
    support_ticket_id: str | None
    source_type: str
    source_id: str | None
    evidence: dict[str, Any]
    scheduled_for: datetime.datetime | None = None
    due_at: datetime.datetime | None = None


def utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()


def today_utc() -> datetime.date:
    return utcnow().date()


def normalize(value: Any) -> str:
    return str(value or "").strip().lower()


def stable_json(value: Any) -> str:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )


def candidate_fingerprint(
    company_id: str,
    plan_date: datetime.date,
    candidate: PlannerCandidate,
) -> str:
    payload = {
        "company_id": company_id,
        "plan_date": plan_date.isoformat(),
        "code": candidate.code,
        "category": candidate.category,
        "decision_id": candidate.decision_id,
        "workflow_id": candidate.workflow_id,
        "task_id": candidate.task_id,
        "support_ticket_id": candidate.support_ticket_id,
        "source_type": candidate.source_type,
        "source_id": candidate.source_id,
        "evidence": candidate.evidence,
    }

    return hashlib.sha256(
        stable_json(payload).encode("utf-8")
    ).hexdigest()


def score_for_priority(
    priority: str,
    *,
    approval_required: bool = False,
    running_workflow: bool = False,
    urgent: bool = False,
) -> int:
    base = {
        "critical": 95,
        "high": 82,
        "medium": 65,
        "low": 45,
        "informational": 30,
    }.get(priority, 50)

    if approval_required:
        base += 5

    if running_workflow:
        base += 3

    if urgent:
        base += 4

    return min(base, 100)


def serialize_plan_item(
    item: SonnyPlanItem,
) -> dict[str, Any]:
    return {
        "id": item.id,
        "plan_id": item.plan_id,
        "company_id": item.company_id,
        "fingerprint": item.fingerprint,
        "item_code": item.item_code,
        "category": item.category,
        "title": item.title,
        "summary": item.summary,
        "recommended_action": item.recommended_action,
        "priority": item.priority,
        "priority_score": item.priority_score,
        "status": item.status,
        "assigned_role": item.assigned_role,
        "requires_founder_approval": bool(
            item.requires_founder_approval
        ),
        "decision_id": item.decision_id,
        "workflow_id": item.workflow_id,
        "task_id": item.task_id,
        "support_ticket_id": item.support_ticket_id,
        "scheduled_for": (
            item.scheduled_for.isoformat()
            if item.scheduled_for
            else None
        ),
        "due_at": (
            item.due_at.isoformat()
            if item.due_at
            else None
        ),
        "source_type": item.source_type,
        "source_id": item.source_id,
        "evidence": item.evidence or {},
        "sort_order": item.sort_order,
        "completed_at": (
            item.completed_at.isoformat()
            if item.completed_at
            else None
        ),
        "created_at": (
            item.created_at.isoformat()
            if item.created_at
            else None
        ),
        "updated_at": (
            item.updated_at.isoformat()
            if item.updated_at
            else None
        ),
    }


def serialize_plan(
    plan: SonnyPlan,
) -> dict[str, Any]:
    groups: dict[str, list[dict[str, Any]]] = {
        "critical": [],
        "approval": [],
        "workflow": [],
        "scheduled": [],
        "opportunity": [],
        "maintenance": [],
    }

    for item in plan.items:
        groups.setdefault(
            item.category,
            [],
        ).append(
            serialize_plan_item(item)
        )

    return {
        "id": plan.id,
        "company_id": plan.company_id,
        "plan_date": plan.plan_date.isoformat(),
        "plan_type": plan.plan_type,
        "title": plan.title,
        "executive_brief": plan.executive_brief,
        "health_score": plan.health_score,
        "status": plan.status,
        "critical_count": plan.critical_count,
        "high_count": plan.high_count,
        "approval_count": plan.approval_count,
        "running_workflow_count": plan.running_workflow_count,
        "blocked_workflow_count": plan.blocked_workflow_count,
        "state_version": plan.state_version,
        "source_snapshot": plan.source_snapshot or {},
        "generated_by": plan.generated_by,
        "generated_at": (
            plan.generated_at.isoformat()
            if plan.generated_at
            else None
        ),
        "updated_at": (
            plan.updated_at.isoformat()
            if plan.updated_at
            else None
        ),
        "metrics": {
            "total_items": len(plan.items),
            "planned": sum(
                item.status == "planned"
                for item in plan.items
            ),
            "in_progress": sum(
                item.status == "in_progress"
                for item in plan.items
            ),
            "completed": sum(
                item.status == "completed"
                for item in plan.items
            ),
        },
        "groups": groups,
        "items": [
            serialize_plan_item(item)
            for item in plan.items
        ],
    }


def build_candidates(
    *,
    state: dict[str, Any],
    decisions: list[SonnyDecision],
    workflows: list[SonnyWorkflow],
) -> list[PlannerCandidate]:
    candidates: list[PlannerCandidate] = []

    workflow_by_decision = {
        workflow.decision_id: workflow
        for workflow in workflows
    }

    for decision in decisions:
        workflow = workflow_by_decision.get(
            decision.id
        )

        approval_required = (
            bool(decision.approval_required)
            and decision.status == "proposed"
        )

        if approval_required:
            category = "approval"
            assigned_role = "founder"
            action = (
                "Review Sonny's reasoning and either approve or reject "
                "this executive decision."
            )
        elif workflow and workflow.status in ACTIVE_WORKFLOW_STATUSES:
            category = "workflow"
            assigned_role = (
                next(
                    (
                        step.assigned_role
                        for step in workflow.steps
                        if step.status == "in_progress"
                    ),
                    None,
                )
                or "sonny"
            )
            action = (
                "Continue the active workflow and complete its current step."
            )
        else:
            category = (
                "critical"
                if decision.priority in {"critical", "high"}
                else "maintenance"
            )
            assigned_role = "sonny"
            action = decision.recommended_action

        priority_score = score_for_priority(
            decision.priority,
            approval_required=approval_required,
            running_workflow=bool(
                workflow
                and workflow.status in ACTIVE_WORKFLOW_STATUSES
            ),
        )

        candidates.append(
            PlannerCandidate(
                code=f"decision:{decision.decision_code}",
                category=category,
                title=decision.title,
                summary=decision.summary,
                recommended_action=action,
                priority=decision.priority,
                priority_score=priority_score,
                assigned_role=assigned_role,
                requires_founder_approval=approval_required,
                decision_id=decision.id,
                workflow_id=(
                    workflow.id
                    if workflow
                    else None
                ),
                task_id=None,
                support_ticket_id=None,
                source_type="sonny_decision",
                source_id=decision.id,
                evidence={
                    "decision_code": decision.decision_code,
                    "decision_type": decision.decision_type,
                    "confidence": decision.confidence,
                    "risk_level": decision.risk_level,
                    "decision_status": decision.status,
                    "execution_status": decision.execution_status,
                },
            )
        )

    represented_task_ids = {
        str(candidate.task_id)
        for candidate in candidates
        if candidate.task_id
    }

    for task in state["tasks"]["items"]:
        if normalize(task.get("status")) in {
            "completed",
            "complete",
            "done",
            "closed",
        }:
            continue

        task_id = str(task["id"])

        if task_id in represented_task_ids:
            continue

        candidates.append(
            PlannerCandidate(
                code="pending_task",
                category="maintenance",
                title=task["title"],
                summary=(
                    task.get("description")
                    or "Pending operational task."
                ),
                recommended_action=(
                    "Review and complete this task or update its status."
                ),
                priority="medium",
                priority_score=60,
                assigned_role="company_team",
                requires_founder_approval=False,
                decision_id=None,
                workflow_id=None,
                task_id=task_id,
                support_ticket_id=None,
                source_type="task",
                source_id=task_id,
                evidence={
                    "task_status": task.get("status"),
                    "created_at": task.get("created_at"),
                },
            )
        )

    for ticket in state["support"]["items"]:
        if normalize(ticket.get("status")) not in {
            "open",
            "pending",
            "waiting_on_tenant",
        }:
            continue

        urgent = normalize(
            ticket.get("priority")
        ) == "urgent"

        candidates.append(
            PlannerCandidate(
                code="support_ticket",
                category=(
                    "critical"
                    if urgent
                    else "maintenance"
                ),
                title=f'Support: {ticket["subject"]}',
                summary=(
                    f'{ticket.get("message_count", 0)} message(s); '
                    f'status {ticket.get("status")}.'
                ),
                recommended_action=(
                    "Review the support conversation, assignment, and next response."
                ),
                priority=(
                    "critical"
                    if urgent
                    else "medium"
                ),
                priority_score=score_for_priority(
                    "critical"
                    if urgent
                    else "medium",
                    urgent=urgent,
                ),
                assigned_role="firmic_admin",
                requires_founder_approval=False,
                decision_id=None,
                workflow_id=None,
                task_id=None,
                support_ticket_id=str(
                    ticket["id"]
                ),
                source_type="support_ticket",
                source_id=str(
                    ticket["id"]
                ),
                evidence={
                    "category": ticket.get("category"),
                    "priority": ticket.get("priority"),
                    "status": ticket.get("status"),
                    "assigned_admin_id": ticket.get(
                        "assigned_admin_id"
                    ),
                },
            )
        )

    for meeting in state["meetings"]["items"]:
        if normalize(meeting.get("status")) not in {
            "confirmed",
            "active",
            "booked",
        }:
            continue

        booking_date = meeting.get(
            "booking_date"
        )
        booking_time = meeting.get(
            "booking_time"
        )

        scheduled_for = None

        if booking_date and booking_time:
            try:
                scheduled_for = datetime.datetime.fromisoformat(
                    f"{booking_date}T{booking_time}"
                )
            except ValueError:
                scheduled_for = None

        candidates.append(
            PlannerCandidate(
                code="meeting_commitment",
                category="scheduled",
                title=f'Meeting: {meeting["room_name"]}',
                summary=(
                    f'{meeting.get("duration_hours", 1)} hour(s) '
                    f'on {booking_date} at {booking_time}.'
                ),
                recommended_action=(
                    "Confirm attendees, room requirements, and preparation."
                ),
                priority="informational",
                priority_score=35,
                assigned_role="meeting_coordinator",
                requires_founder_approval=False,
                decision_id=None,
                workflow_id=None,
                task_id=None,
                support_ticket_id=None,
                source_type="meeting_booking",
                source_id=str(
                    meeting["id"]
                ),
                evidence={
                    "room_id": meeting.get("room_id"),
                    "room_name": meeting.get("room_name"),
                    "status": meeting.get("status"),
                    "duration_hours": meeting.get(
                        "duration_hours"
                    ),
                },
                scheduled_for=scheduled_for,
            )
        )

    if (
        state["ai_workforce"]["summary"]["active"] == 0
    ):
        candidates.append(
            PlannerCandidate(
                code="ai_workforce_opportunity",
                category="opportunity",
                title="Evaluate an AI employee",
                summary=(
                    "The company currently has no active AI workforce role."
                ),
                recommended_action=(
                    "Identify a repeatable workload and compare suitable AI templates."
                ),
                priority="low",
                priority_score=45,
                assigned_role="founder",
                requires_founder_approval=True,
                decision_id=None,
                workflow_id=None,
                task_id=None,
                support_ticket_id=None,
                source_type="company_state",
                source_id="ai_workforce",
                evidence={
                    "active_agents": 0,
                    "total_agents": state[
                        "ai_workforce"
                    ]["summary"]["total"],
                },
            )
        )

    candidates.sort(
        key=lambda item: (
            CATEGORY_ORDER.get(
                item.category,
                99,
            ),
            -item.priority_score,
            PRIORITY_ORDER.get(
                item.priority,
                99,
            ),
            item.title.lower(),
        )
    )

    return candidates


def build_executive_brief(
    *,
    company_name: str,
    health_score: int,
    candidates: list[PlannerCandidate],
    running_workflows: int,
    blocked_workflows: int,
) -> str:
    critical_count = sum(
        item.priority == "critical"
        for item in candidates
    )

    high_count = sum(
        item.priority == "high"
        for item in candidates
    )

    approval_count = sum(
        item.requires_founder_approval
        for item in candidates
    )

    top_items = candidates[:3]

    top_text = (
        "; ".join(
            item.title
            for item in top_items
        )
        if top_items
        else "No immediate operational priorities"
    )

    return (
        f"{company_name} health is {health_score}%. "
        f"There are {critical_count} critical item(s), "
        f"{high_count} high-priority item(s), "
        f"{approval_count} founder approval(s), "
        f"{running_workflows} active workflow(s), and "
        f"{blocked_workflows} blocked workflow(s). "
        f"Today's top focus: {top_text}."
    )


def record_planner_activity(
    db: Session,
    *,
    plan: SonnyPlan,
    event_type: str,
    title: str,
    description: str,
    actor_id: str | None,
    metadata: dict[str, Any] | None = None,
) -> None:
    record_activity(
        db,
        company_id=plan.company_id,
        event_type=event_type,
        title=title,
        description=description,
        actor_type="sonny",
        actor_id=actor_id or "sonny",
        source_type="sonny_plan",
        source_id=plan.id,
        metadata=metadata,
        commit=False,
    )


def build_daily_plan(
    db: Session,
    company: Company,
    *,
    actor_id: str | None = None,
    plan_date: datetime.date | None = None,
) -> SonnyPlan:
    selected_date = (
        plan_date
        or today_utc()
    )

    state = build_company_state(
        db,
        company,
        activity_limit=40,
        memory_limit=20,
    )

    decisions = (
        db.query(SonnyDecision)
        .filter(
            SonnyDecision.company_id == company.id,
            SonnyDecision.status.in_(
                ACTIVE_DECISION_STATUSES
            ),
        )
        .order_by(
            SonnyDecision.created_at.desc()
        )
        .all()
    )

    workflows = (
        db.query(SonnyWorkflow)
        .filter(
            SonnyWorkflow.company_id == company.id,
            SonnyWorkflow.status.in_(
                ACTIVE_WORKFLOW_STATUSES
            ),
        )
        .order_by(
            SonnyWorkflow.created_at.desc()
        )
        .all()
    )

    candidates = build_candidates(
        state=state,
        decisions=decisions,
        workflows=workflows,
    )

    running_workflows = sum(
        workflow.status in {
            "running",
            "waiting",
        }
        for workflow in workflows
    )

    blocked_workflows = sum(
        workflow.status == "waiting"
        for workflow in workflows
    )

    health_score = int(
        state["progress"]["score"]
    )

    brief = build_executive_brief(
        company_name=company.name,
        health_score=health_score,
        candidates=candidates,
        running_workflows=running_workflows,
        blocked_workflows=blocked_workflows,
    )

    plan = (
        db.query(SonnyPlan)
        .filter(
            SonnyPlan.company_id == company.id,
            SonnyPlan.plan_date == selected_date,
            SonnyPlan.plan_type == "daily",
        )
        .first()
    )

    created = plan is None

    if plan is None:
        plan = SonnyPlan(
            company_id=company.id,
            plan_date=selected_date,
            plan_type="daily",
            title=f"{company.name} Daily Executive Plan",
            executive_brief=brief,
            health_score=health_score,
            status="active",
            state_version=state["state_version"],
            generated_by="sonny",
        )

        db.add(plan)
        db.flush()
    else:
        plan.title = (
            f"{company.name} Daily Executive Plan"
        )
        plan.executive_brief = brief
        plan.health_score = health_score
        plan.status = "active"
        plan.state_version = state[
            "state_version"
        ]
        plan.updated_at = utcnow()

    plan.critical_count = sum(
        item.priority == "critical"
        for item in candidates
    )

    plan.high_count = sum(
        item.priority == "high"
        for item in candidates
    )

    plan.approval_count = sum(
        item.requires_founder_approval
        for item in candidates
    )

    plan.running_workflow_count = (
        running_workflows
    )

    plan.blocked_workflow_count = (
        blocked_workflows
    )

    plan.source_snapshot = {
        "state_version": state["state_version"],
        "health_score": health_score,
        "decision_count": len(decisions),
        "workflow_count": len(workflows),
        "task_summary": state["tasks"]["summary"],
        "support_summary": state[
            "support"
        ]["summary"],
        "billing": {
            "current_invoice_month": state[
                "billing"
            ].get("current_invoice_month"),
            "current_month_total_usd": state[
                "billing"
            ].get("current_month_total_usd"),
            "unbilled_usd": state[
                "billing"
            ].get("unbilled_usd"),
        },
        "ai_workforce": state[
            "ai_workforce"
        ]["summary"],
        "meetings": state[
            "meetings"
        ]["summary"],
    }

    existing_items = {
        item.fingerprint: item
        for item in plan.items
    }

    current_fingerprints: set[str] = set()

    for sort_order, candidate in enumerate(
        candidates,
        start=1,
    ):
        fingerprint = candidate_fingerprint(
            company.id,
            selected_date,
            candidate,
        )

        current_fingerprints.add(
            fingerprint
        )

        item = existing_items.get(
            fingerprint
        )

        if item is None:
            item = SonnyPlanItem(
                plan_id=plan.id,
                company_id=company.id,
                fingerprint=fingerprint,
                item_code=candidate.code,
                category=candidate.category,
                title=candidate.title,
                summary=candidate.summary,
                recommended_action=(
                    candidate.recommended_action
                ),
                priority=candidate.priority,
                priority_score=(
                    candidate.priority_score
                ),
                status="planned",
                assigned_role=(
                    candidate.assigned_role
                ),
                requires_founder_approval=(
                    1
                    if candidate.requires_founder_approval
                    else 0
                ),
                decision_id=(
                    candidate.decision_id
                ),
                workflow_id=(
                    candidate.workflow_id
                ),
                task_id=candidate.task_id,
                support_ticket_id=(
                    candidate.support_ticket_id
                ),
                scheduled_for=(
                    candidate.scheduled_for
                ),
                due_at=candidate.due_at,
                source_type=(
                    candidate.source_type
                ),
                source_id=candidate.source_id,
                evidence=candidate.evidence,
                sort_order=sort_order,
            )

            db.add(item)
        else:
            item.item_code = candidate.code
            item.category = candidate.category
            item.title = candidate.title
            item.summary = candidate.summary
            item.recommended_action = (
                candidate.recommended_action
            )
            item.priority = candidate.priority
            item.priority_score = (
                candidate.priority_score
            )
            item.assigned_role = (
                candidate.assigned_role
            )
            item.requires_founder_approval = (
                1
                if candidate.requires_founder_approval
                else 0
            )
            item.decision_id = (
                candidate.decision_id
            )
            item.workflow_id = (
                candidate.workflow_id
            )
            item.task_id = candidate.task_id
            item.support_ticket_id = (
                candidate.support_ticket_id
            )
            item.scheduled_for = (
                candidate.scheduled_for
            )
            item.due_at = candidate.due_at
            item.source_type = (
                candidate.source_type
            )
            item.source_id = candidate.source_id
            item.evidence = candidate.evidence
            item.sort_order = sort_order
            item.updated_at = utcnow()

            if item.status == "completed":
                continue

            item.status = (
                "in_progress"
                if (
                    candidate.workflow_id
                    and any(
                        workflow.id
                        == candidate.workflow_id
                        and workflow.status
                        in {"running", "waiting"}
                        for workflow in workflows
                    )
                )
                else "planned"
            )

    for fingerprint, item in existing_items.items():
        if (
            fingerprint
            not in current_fingerprints
            and item.status
            not in {"completed", "cancelled"}
        ):
            item.status = "cancelled"
            item.updated_at = utcnow()

    plan.generated_at = utcnow()

    record_planner_activity(
        db,
        plan=plan,
        event_type=(
            "sonny_plan_created"
            if created
            else "sonny_plan_refreshed"
        ),
        title=(
            "Sonny daily plan created"
            if created
            else "Sonny daily plan refreshed"
        ),
        description=brief,
        actor_id=actor_id,
        metadata={
            "plan_date": selected_date.isoformat(),
            "health_score": health_score,
            "candidate_count": len(candidates),
            "critical_count": plan.critical_count,
            "high_count": plan.high_count,
            "approval_count": plan.approval_count,
            "running_workflow_count": (
                plan.running_workflow_count
            ),
            "blocked_workflow_count": (
                plan.blocked_workflow_count
            ),
        },
    )

    db.commit()
    db.refresh(plan)

    return plan


def get_daily_plan(
    db: Session,
    *,
    company_id: str,
    plan_date: datetime.date | None = None,
) -> SonnyPlan | None:
    selected_date = (
        plan_date
        or today_utc()
    )

    return (
        db.query(SonnyPlan)
        .filter(
            SonnyPlan.company_id == company_id,
            SonnyPlan.plan_date == selected_date,
            SonnyPlan.plan_type == "daily",
        )
        .first()
    )


def get_plan_history(
    db: Session,
    *,
    company_id: str,
    limit: int = 30,
) -> list[SonnyPlan]:
    return (
        db.query(SonnyPlan)
        .filter(
            SonnyPlan.company_id == company_id
        )
        .order_by(
            SonnyPlan.plan_date.desc(),
            SonnyPlan.generated_at.desc(),
        )
        .limit(
            min(max(limit, 1), 365)
        )
        .all()
    )
