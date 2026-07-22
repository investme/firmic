from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from models.company import Company
from models.sonny_decision import SonnyDecision
from models.sonny_insight import SonnyInsight
from models.sonny_workflow import SonnyWorkflow
from services.sonny.decisions import (
    PRIORITY_ORDER,
    serialize_decision,
)
from services.sonny.insights import (
    generate_company_insights,
    serialize_insight,
)
from services.sonny.planner import (
    build_daily_plan,
    get_daily_plan,
    serialize_plan,
)
from services.sonny.state import build_company_state
from services.sonny.workflows import serialize_workflow


ACTIVE_DECISION_STATUSES = {
    "proposed",
    "approved",
}

ACTIVE_WORKFLOW_STATUSES = {
    "draft",
    "running",
    "waiting",
}


def build_sonny_dashboard(
    db: Session,
    company: Company,
    *,
    actor_id: str | None = None,
    rebuild_plan_if_missing: bool = True,
    rebuild_insights_if_missing: bool = True,
    activity_limit: int = 15,
    memory_limit: int = 10,
) -> dict[str, Any]:
    state = build_company_state(
        db,
        company,
        activity_limit=activity_limit,
        memory_limit=memory_limit,
    )

    plan = get_daily_plan(
        db,
        company_id=company.id,
    )

    if plan is None and rebuild_plan_if_missing:
        plan = build_daily_plan(
            db,
            company,
            actor_id=actor_id,
        )

    insights = (
        db.query(SonnyInsight)
        .filter(
            SonnyInsight.company_id == company.id,
            SonnyInsight.status == "active",
        )
        .order_by(
            SonnyInsight.last_detected_at.desc()
        )
        .all()
    )

    if not insights and rebuild_insights_if_missing:
        generate_company_insights(
            db,
            company,
        )

        insights = (
            db.query(SonnyInsight)
            .filter(
                SonnyInsight.company_id == company.id,
                SonnyInsight.status == "active",
            )
            .order_by(
                SonnyInsight.last_detected_at.desc()
            )
            .all()
        )

    insight_severity_order = {
        "critical": 0,
        "high": 1,
        "medium": 2,
        "low": 3,
        "informational": 4,
    }

    insights.sort(
        key=lambda item: (
            insight_severity_order.get(
                item.severity,
                99,
            ),
            -(
                item.last_detected_at.timestamp()
                if item.last_detected_at
                else 0
            ),
        )
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

    decisions.sort(
        key=lambda item: (
            PRIORITY_ORDER.get(
                item.priority,
                99,
            ),
            -(
                item.created_at.timestamp()
                if item.created_at
                else 0
            ),
        )
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

    decision_map = {
        decision.id: decision
        for decision in decisions
    }

    pending_approvals = [
        decision
        for decision in decisions
        if (
            decision.status == "proposed"
            and bool(decision.approval_required)
        )
    ]

    running_workflows = [
        workflow
        for workflow in workflows
        if workflow.status in {
            "running",
            "waiting",
        }
    ]

    draft_workflows = [
        workflow
        for workflow in workflows
        if workflow.status == "draft"
    ]

    current_steps: list[dict[str, Any]] = []

    for workflow in running_workflows:
        active_step = next(
            (
                step
                for step in workflow.steps
                if step.status == "in_progress"
            ),
            None,
        )

        if active_step:
            current_steps.append(
                {
                    "workflow_id": workflow.id,
                    "workflow_name": workflow.name,
                    "workflow_status": workflow.status,
                    "progress_percent": workflow.progress_percent,
                    "step_id": active_step.id,
                    "step_order": active_step.step_order,
                    "step_code": active_step.step_code,
                    "title": active_step.title,
                    "description": active_step.description,
                    "assigned_role": active_step.assigned_role,
                    "status": active_step.status,
                    "started_at": (
                        active_step.started_at.isoformat()
                        if active_step.started_at
                        else None
                    ),
                }
            )

    top_priority = None

    if plan and plan.items:
        active_plan_items = [
            item
            for item in plan.items
            if item.status in {
                "planned",
                "in_progress",
            }
        ]

        if active_plan_items:
            active_plan_items.sort(
                key=lambda item: (
                    -int(
                        item.priority_score
                        or 0
                    ),
                    int(
                        item.sort_order
                        or 0
                    ),
                )
            )

            first = active_plan_items[0]

            top_priority = {
                "id": first.id,
                "title": first.title,
                "summary": first.summary,
                "priority": first.priority,
                "priority_score": first.priority_score,
                "category": first.category,
                "assigned_role": first.assigned_role,
                "requires_founder_approval": bool(
                    first.requires_founder_approval
                ),
                "decision_id": first.decision_id,
                "workflow_id": first.workflow_id,
            }

    intelligence = state["intelligence"]
    billing = state["billing"]
    support = state["support"]
    documents = state["documents"]
    workforce = state["ai_workforce"]
    meetings = state["meetings"]
    progress = state["progress"]

    required_documents = {
        "trade_license",
        "passport_copy",
        "incorporation_certificate",
        "proof_of_address",
    }

    requirements = documents[
        "signals"
    ]["requirements"]

    missing_documents = [
        key
        for key in sorted(
            required_documents
        )
        if not requirements.get(key)
    ]

    actionable_insights = [
        insight
        for insight in insights
        if bool(insight.is_actionable)
    ]

    top_insight = (
        actionable_insights[0]
        if actionable_insights
        else (
            insights[0]
            if insights
            else None
        )
    )

    top_pattern = (
        {
            "id": top_insight.id,
            "title": top_insight.title,
            "summary": top_insight.summary,
            "category": top_insight.category,
            "pattern_type": top_insight.pattern_type,
            "severity": top_insight.severity,
            "confidence": round(
                float(top_insight.confidence or 0),
                4,
            ),
            "trend": top_insight.trend,
            "recommended_action": (
                top_insight.recommended_action
            ),
            "occurrence_count": (
                top_insight.occurrence_count
            ),
            "last_detected_at": (
                top_insight.last_detected_at.isoformat()
                if top_insight.last_detected_at
                else None
            ),
        }
        if top_insight
        else None
    )

    recurring_patterns = [
        serialize_insight(insight)
        for insight in insights
        if insight.pattern_type in {
            "recurring",
            "backlog",
            "bottleneck",
            "trend",
        }
    ][:10]

    insight_recommendations = [
        {
            "insight_id": insight.id,
            "title": insight.title,
            "severity": insight.severity,
            "category": insight.category,
            "trend": insight.trend,
            "recommended_action": (
                insight.recommended_action
            ),
            "confidence": round(
                float(insight.confidence or 0),
                4,
            ),
        }
        for insight in actionable_insights
        if insight.recommended_action
    ][:10]

    executive_summary = (
        plan.executive_brief
        if plan
        else (
            f'{company.name} health is '
            f'{progress["score"]}%. '
            "No daily plan has been generated."
        )
    )

    return {
        "dashboard_version": "b2.4",
        "company": state["company"],
        "executive_brief": {
            "summary": executive_summary,
            "health_score": progress["score"],
            "top_priority": top_priority,
            "attention_required": intelligence[
                "attention_required"
            ],
            "critical_alerts": intelligence[
                "critical_count"
            ],
            "high_alerts": intelligence[
                "high_count"
            ],
            "pending_founder_approvals": len(
                pending_approvals
            ),
            "running_workflows": len(
                running_workflows
            ),
            "blocked_workflows": sum(
                workflow.status == "waiting"
                for workflow in workflows
            ),
            "active_insights": len(insights),
            "critical_insights": sum(
                insight.severity == "critical"
                for insight in insights
            ),
            "high_insights": sum(
                insight.severity == "high"
                for insight in insights
            ),
        },
        "memory_intelligence": {
            "active_count": len(insights),
            "critical_count": sum(
                insight.severity == "critical"
                for insight in insights
            ),
            "high_count": sum(
                insight.severity == "high"
                for insight in insights
            ),
            "medium_count": sum(
                insight.severity == "medium"
                for insight in insights
            ),
            "low_count": sum(
                insight.severity == "low"
                for insight in insights
            ),
            "actionable_count": len(
                actionable_insights
            ),
            "recurring_count": sum(
                insight.pattern_type
                in {
                    "recurring",
                    "backlog",
                    "bottleneck",
                }
                for insight in insights
            ),
            "improving_count": sum(
                insight.trend == "improving"
                for insight in insights
            ),
            "worsening_count": sum(
                insight.trend == "worsening"
                for insight in insights
            ),
            "top_pattern": top_pattern,
            "recommended_focus": (
                insight_recommendations
            ),
            "recurring_patterns": (
                recurring_patterns
            ),
            "items": [
                serialize_insight(insight)
                for insight in insights[:20]
            ],
        },
        "today_plan": (
            serialize_plan(plan)
            if plan
            else None
        ),
        "approvals": [
            serialize_decision(decision)
            for decision in pending_approvals
        ],
        "decisions": {
            "active_count": len(decisions),
            "proposed_count": sum(
                decision.status == "proposed"
                for decision in decisions
            ),
            "approved_count": sum(
                decision.status == "approved"
                for decision in decisions
            ),
            "critical_count": sum(
                decision.priority == "critical"
                for decision in decisions
            ),
            "high_count": sum(
                decision.priority == "high"
                for decision in decisions
            ),
            "items": [
                serialize_decision(decision)
                for decision in decisions[:20]
            ],
        },
        "workflows": {
            "active_count": len(workflows),
            "running_count": len(
                running_workflows
            ),
            "draft_count": len(
                draft_workflows
            ),
            "waiting_count": sum(
                workflow.status == "waiting"
                for workflow in workflows
            ),
            "current_steps": current_steps,
            "items": [
                serialize_workflow(
                    workflow,
                    include_decision=decision_map.get(
                        workflow.decision_id
                    ),
                )
                for workflow in workflows[:20]
            ],
        },
        "attention": {
            "alerts": intelligence["alerts"],
            "recommendations": intelligence[
                "recommendations"
            ],
            "compliance": {
                "total_documents": documents[
                    "summary"
                ]["total"],
                "approved_documents": documents[
                    "summary"
                ]["approved"],
                "pending_documents": documents[
                    "summary"
                ]["pending"],
                "missing_required_documents": (
                    missing_documents
                ),
                "ready": not bool(
                    missing_documents
                ),
            },
            "billing": {
                "current_invoice_month": billing.get(
                    "current_invoice_month"
                ),
                "current_month_total_usd": billing.get(
                    "current_month_total_usd"
                ),
                "unbilled_usd": billing.get(
                    "unbilled_usd"
                ),
                "billed_usd": billing.get(
                    "billed_usd"
                ),
                "paid_usd": billing.get(
                    "paid_usd"
                ),
                "requires_attention": bool(
                    billing.get(
                        "unbilled_usd"
                    )
                ),
            },
            "support": {
                "total": support[
                    "summary"
                ]["total"],
                "open": support[
                    "summary"
                ]["open"],
                "urgent": support[
                    "summary"
                ]["urgent"],
                "resolved": support[
                    "summary"
                ]["resolved"],
                "requires_attention": bool(
                    support[
                        "summary"
                    ]["open"]
                ),
            },
        },
        "operations": {
            "tasks": state["tasks"]["summary"],
            "meetings": meetings["summary"],
            "ai_workforce": workforce[
                "summary"
            ],
            "headquarters": state[
                "company"
            ]["headquarters"],
            "progress": progress,
        },
        "recent_activity": state[
            "activity"
        ]["items"],
        "recent_memories": state[
            "memory"
        ]["items"],
        "generated_from": {
            "state_version": state[
                "state_version"
            ],
            "plan_id": (
                plan.id
                if plan
                else None
            ),
            "plan_date": (
                plan.plan_date.isoformat()
                if plan
                else None
            ),
            "decision_count": len(decisions),
            "workflow_count": len(workflows),
            "insight_count": len(insights),
        },
    }
