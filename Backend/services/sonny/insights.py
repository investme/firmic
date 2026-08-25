from __future__ import annotations

import datetime
import hashlib
import json
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from models.activity_log import ActivityLog
from models.company import Company
from models.sonny_decision import SonnyDecision
from models.sonny_insight import SonnyInsight, SonnyInsightEvidence
from models.sonny_plan import SonnyPlan
from models.sonny_workflow import SonnyWorkflow, SonnyWorkflowStep
from models.support_ticket import SupportTicket
from models.usage_ledger import UsageLedger
from services.activity_service import record_activity
from services.sonny.state import build_company_state


ACTIVE_INSIGHT_STATUSES = {
    "active",
}

FINAL_INSIGHT_STATUSES = {
    "resolved",
    "dismissed",
}

SEVERITY_ORDER = {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 3,
    "informational": 4,
}


@dataclass(frozen=True)
class EvidenceCandidate:
    source_type: str
    source_id: str | None
    event_type: str | None
    description: str
    evidence_data: dict[str, Any]
    observed_at: datetime.datetime


@dataclass(frozen=True)
class InsightCandidate:
    code: str
    category: str
    title: str
    summary: str
    pattern_type: str
    severity: str
    confidence: float
    trend: str
    recommended_action: str | None
    is_actionable: bool
    source_summary: dict[str, Any]
    evidence: tuple[EvidenceCandidate, ...]


def utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()


def normalize(value: Any) -> str:
    return str(value or "").strip().lower()


def stable_json(value: Any) -> str:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        default=str,
    )


def insight_fingerprint(
    company_id: str,
    candidate: InsightCandidate,
) -> str:
    payload = {
        "company_id": company_id,
        "code": candidate.code,
        "category": candidate.category,
        "pattern_type": candidate.pattern_type,
    }

    return hashlib.sha256(
        stable_json(payload).encode("utf-8")
    ).hexdigest()


def evidence_fingerprint(
    insight_fingerprint_value: str,
    evidence: EvidenceCandidate,
) -> str:
    payload = {
        "insight_fingerprint": insight_fingerprint_value,
        "source_type": evidence.source_type,
        "source_id": evidence.source_id,
        "event_type": evidence.event_type,
        "description": evidence.description,
        "evidence_data": evidence.evidence_data,
        "observed_at": evidence.observed_at.isoformat(),
    }

    return hashlib.sha256(
        stable_json(payload).encode("utf-8")
    ).hexdigest()


def serialize_evidence(
    evidence: SonnyInsightEvidence,
) -> dict[str, Any]:
    return {
        "id": evidence.id,
        "insight_id": evidence.insight_id,
        "company_id": evidence.company_id,
        "evidence_fingerprint": evidence.evidence_fingerprint,
        "source_type": evidence.source_type,
        "source_id": evidence.source_id,
        "event_type": evidence.event_type,
        "description": evidence.description,
        "evidence_data": evidence.evidence_data or {},
        "observed_at": (
            evidence.observed_at.isoformat()
            if evidence.observed_at
            else None
        ),
        "created_at": (
            evidence.created_at.isoformat()
            if evidence.created_at
            else None
        ),
    }


def serialize_insight(
    insight: SonnyInsight,
) -> dict[str, Any]:
    return {
        "id": insight.id,
        "company_id": insight.company_id,
        "fingerprint": insight.fingerprint,
        "insight_code": insight.insight_code,
        "category": insight.category,
        "title": insight.title,
        "summary": insight.summary,
        "pattern_type": insight.pattern_type,
        "severity": insight.severity,
        "confidence": round(
            float(insight.confidence or 0),
            4,
        ),
        "trend": insight.trend,
        "status": insight.status,
        "recommended_action": insight.recommended_action,
        "source_summary": insight.source_summary or {},
        "occurrence_count": insight.occurrence_count,
        "first_detected_at": (
            insight.first_detected_at.isoformat()
            if insight.first_detected_at
            else None
        ),
        "last_detected_at": (
            insight.last_detected_at.isoformat()
            if insight.last_detected_at
            else None
        ),
        "resolved_at": (
            insight.resolved_at.isoformat()
            if insight.resolved_at
            else None
        ),
        "dismissed_at": (
            insight.dismissed_at.isoformat()
            if insight.dismissed_at
            else None
        ),
        "dismissed_by": insight.dismissed_by,
        "is_actionable": bool(insight.is_actionable),
        "state_version": insight.state_version,
        "generated_by": insight.generated_by,
        "created_at": (
            insight.created_at.isoformat()
            if insight.created_at
            else None
        ),
        "updated_at": (
            insight.updated_at.isoformat()
            if insight.updated_at
            else None
        ),
        "evidence": [
            serialize_evidence(item)
            for item in insight.evidence
        ],
    }


def days_ago(days: int) -> datetime.datetime:
    return utcnow() - datetime.timedelta(days=days)


def recent_activity_count(
    activities: list[ActivityLog],
    *,
    event_type: str,
    days: int,
) -> int:
    threshold = days_ago(days)

    return sum(
        item.event_type == event_type
        and item.created_at
        and item.created_at >= threshold
        for item in activities
    )


def build_candidates(
    db: Session,
    company: Company,
) -> list[InsightCandidate]:
    state = build_company_state(
        db,
        company,
        activity_limit=100,
        memory_limit=50,
    )

    company_id = company.id
    now = utcnow()

    ledger_entries = (
        db.query(UsageLedger)
        .filter(
            UsageLedger.company_id == company_id
        )
        .order_by(
            UsageLedger.created_at.desc()
        )
        .all()
    )

    tickets = (
        db.query(SupportTicket)
        .filter(
            SupportTicket.company_id == company_id
        )
        .order_by(
            SupportTicket.created_at.desc()
        )
        .all()
    )

    decisions = (
        db.query(SonnyDecision)
        .filter(
            SonnyDecision.company_id == company_id
        )
        .order_by(
            SonnyDecision.created_at.desc()
        )
        .all()
    )

    workflows = (
        db.query(SonnyWorkflow)
        .filter(
            SonnyWorkflow.company_id == company_id
        )
        .order_by(
            SonnyWorkflow.created_at.desc()
        )
        .all()
    )

    plans = (
        db.query(SonnyPlan)
        .filter(
            SonnyPlan.company_id == company_id
        )
        .order_by(
            SonnyPlan.plan_date.desc()
        )
        .limit(30)
        .all()
    )

    activities = (
        db.query(ActivityLog)
        .filter(
            ActivityLog.company_id == company_id
        )
        .order_by(
            ActivityLog.created_at.desc()
        )
        .limit(500)
        .all()
    )

    candidates: list[InsightCandidate] = []

    unbilled_entries = [
        item
        for item in ledger_entries
        if normalize(item.status) == "unbilled"
    ]

    unbilled_total = round(
        sum(
            float(item.total_amount or 0)
            for item in unbilled_entries
        ),
        2,
    )

    old_unbilled_entries = [
        item
        for item in unbilled_entries
        if item.created_at
        and item.created_at <= days_ago(7)
    ]

    if len(unbilled_entries) >= 2 or old_unbilled_entries:
        severity = (
            "high"
            if unbilled_total >= 250
            or old_unbilled_entries
            else "medium"
        )

        candidates.append(
            InsightCandidate(
                code="recurring_unbilled_usage",
                category="billing",
                title="Recurring unbilled usage detected",
                summary=(
                    f"{len(unbilled_entries)} unbilled ledger "
                    f"entry or entries total ${unbilled_total:.2f}."
                ),
                pattern_type="recurring",
                severity=severity,
                confidence=0.98,
                trend="worsening",
                recommended_action=(
                    "Review the Usage Ledger, validate each charge, "
                    "and complete the approved billing workflow."
                ),
                is_actionable=True,
                source_summary={
                    "entry_count": len(
                        unbilled_entries
                    ),
                    "old_entry_count": len(
                        old_unbilled_entries
                    ),
                    "total_usd": unbilled_total,
                },
                evidence=tuple(
                    EvidenceCandidate(
                        source_type="usage_ledger",
                        source_id=item.id,
                        event_type="unbilled_usage",
                        description=(
                            f"{item.service} remains unbilled "
                            f"for ${float(item.total_amount or 0):.2f}."
                        ),
                        evidence_data={
                            "service": item.service,
                            "category": item.category,
                            "resource": item.resource,
                            "status": item.status,
                            "invoice_month": item.invoice_month,
                            "total_amount": float(
                                item.total_amount or 0
                            ),
                        },
                        observed_at=(
                            item.updated_at
                            or item.created_at
                            or now
                        ),
                    )
                    for item in unbilled_entries[:20]
                ),
            )
        )

    open_tickets = [
        item
        for item in tickets
        if normalize(item.status)
        in {
            "open",
            "pending",
            "waiting_on_tenant",
        }
    ]

    urgent_tickets = [
        item
        for item in open_tickets
        if normalize(item.priority) == "urgent"
    ]

    old_open_tickets = [
        item
        for item in open_tickets
        if item.created_at
        and item.created_at <= days_ago(3)
    ]

    if len(open_tickets) >= 3 or old_open_tickets:
        candidates.append(
            InsightCandidate(
                code="persistent_support_backlog",
                category="support",
                title="Persistent support backlog detected",
                summary=(
                    f"{len(open_tickets)} support ticket(s) remain open; "
                    f"{len(old_open_tickets)} are older than three days."
                ),
                pattern_type="backlog",
                severity=(
                    "high"
                    if old_open_tickets
                    else "medium"
                ),
                confidence=0.96,
                trend="worsening",
                recommended_action=(
                    "Assign accountable owners and complete the "
                    "support resolution workflow."
                ),
                is_actionable=True,
                source_summary={
                    "open_count": len(open_tickets),
                    "old_open_count": len(
                        old_open_tickets
                    ),
                },
                evidence=tuple(
                    EvidenceCandidate(
                        source_type="support_ticket",
                        source_id=item.id,
                        event_type="support_backlog",
                        description=(
                            f'Support ticket "{item.subject}" '
                            f'remains {item.status}.'
                        ),
                        evidence_data={
                            "subject": item.subject,
                            "category": item.category,
                            "priority": item.priority,
                            "status": item.status,
                            "assigned_admin_id": (
                                item.assigned_admin_id
                            ),
                        },
                        observed_at=(
                            item.updated_at
                            or item.created_at
                            or now
                        ),
                    )
                    for item in open_tickets[:20]
                ),
            )
        )

    if urgent_tickets:
        candidates.append(
            InsightCandidate(
                code="repeated_urgent_support",
                category="support",
                title="Urgent support risk detected",
                summary=(
                    f"{len(urgent_tickets)} urgent support ticket(s) "
                    "require immediate attention."
                ),
                pattern_type="risk",
                severity="critical",
                confidence=0.99,
                trend="worsening",
                recommended_action=(
                    "Escalate urgent tickets and establish a "
                    "resolution deadline."
                ),
                is_actionable=True,
                source_summary={
                    "urgent_count": len(
                        urgent_tickets
                    ),
                },
                evidence=tuple(
                    EvidenceCandidate(
                        source_type="support_ticket",
                        source_id=item.id,
                        event_type="urgent_support",
                        description=(
                            f'Urgent ticket "{item.subject}" '
                            f'is currently {item.status}.'
                        ),
                        evidence_data={
                            "subject": item.subject,
                            "category": item.category,
                            "status": item.status,
                        },
                        observed_at=(
                            item.updated_at
                            or item.created_at
                            or now
                        ),
                    )
                    for item in urgent_tickets
                ),
            )
        )

    requirements = state[
        "documents"
    ]["signals"]["requirements"]

    required_keys = set(requirements)

    missing_documents = sorted(
        key
        for key in required_keys
        if not requirements.get(key)
    )

    compliance_request_count = (
        recent_activity_count(
            activities,
            event_type="compliance_documents_requested",
            days=30,
        )
        + recent_activity_count(
            activities,
            event_type="sonny_decision_proposed",
            days=30,
        )
    )

    if missing_documents:
        candidates.append(
            InsightCandidate(
                code="repeated_compliance_gap",
                category="compliance",
                title="Compliance gap remains unresolved",
                summary=(
                    f"{len(missing_documents)} required document "
                    "type(s) remain unavailable."
                ),
                pattern_type="recurring",
                severity="high",
                confidence=0.98,
                trend=(
                    "worsening"
                    if compliance_request_count >= 2
                    else "stable"
                ),
                recommended_action=(
                    "Complete the compliance document workflow "
                    "and request only currently missing documents."
                ),
                is_actionable=True,
                source_summary={
                    "missing_documents": (
                        missing_documents
                    ),
                    "recent_request_signals": (
                        compliance_request_count
                    ),
                },
                evidence=tuple(
                    EvidenceCandidate(
                        source_type="company_state",
                        source_id=key,
                        event_type="missing_compliance_document",
                        description=(
                            f"{key.replace('_', ' ').title()} "
                            "is missing."
                        ),
                        evidence_data={
                            "requirement": key,
                            "present": False,
                        },
                        observed_at=now,
                    )
                    for key in missing_documents
                ),
            )
        )

    pending_tasks = [
        item
        for item in state["tasks"]["items"]
        if normalize(item.get("status"))
        not in {
            "completed",
            "complete",
            "done",
            "closed",
        }
    ]

    if len(pending_tasks) >= 5:
        candidates.append(
            InsightCandidate(
                code="task_backlog_accumulation",
                category="operations",
                title="Operational task backlog detected",
                summary=(
                    f"{len(pending_tasks)} tasks remain incomplete."
                ),
                pattern_type="backlog",
                severity="medium",
                confidence=0.95,
                trend="worsening",
                recommended_action=(
                    "Triage tasks, assign accountable owners, "
                    "and close or reschedule stale work."
                ),
                is_actionable=True,
                source_summary={
                    "pending_task_count": len(
                        pending_tasks
                    ),
                },
                evidence=tuple(
                    EvidenceCandidate(
                        source_type="task",
                        source_id=str(item["id"]),
                        event_type="pending_task",
                        description=(
                            f'Task "{item["title"]}" '
                            f'remains {item.get("status")}.'
                        ),
                        evidence_data={
                            "title": item["title"],
                            "status": item.get(
                                "status"
                            ),
                            "created_at": item.get(
                                "created_at"
                            ),
                        },
                        observed_at=now,
                    )
                    for item in pending_tasks[:25]
                ),
            )
        )

    pending_approvals = [
        item
        for item in decisions
        if (
            item.status == "proposed"
            and bool(item.approval_required)
        )
    ]

    old_pending_approvals = [
        item
        for item in pending_approvals
        if item.created_at
        and item.created_at <= days_ago(2)
    ]

    if len(pending_approvals) >= 2 or old_pending_approvals:
        candidates.append(
            InsightCandidate(
                code="founder_approval_bottleneck",
                category="governance",
                title="Founder approval bottleneck detected",
                summary=(
                    f"{len(pending_approvals)} decisions await "
                    f"founder approval; {len(old_pending_approvals)} "
                    "are older than two days."
                ),
                pattern_type="bottleneck",
                severity=(
                    "high"
                    if old_pending_approvals
                    else "medium"
                ),
                confidence=0.96,
                trend="worsening",
                recommended_action=(
                    "Review the approval queue and approve, reject, "
                    "or cancel every stale proposal."
                ),
                is_actionable=True,
                source_summary={
                    "pending_approval_count": len(
                        pending_approvals
                    ),
                    "old_pending_count": len(
                        old_pending_approvals
                    ),
                },
                evidence=tuple(
                    EvidenceCandidate(
                        source_type="sonny_decision",
                        source_id=item.id,
                        event_type="pending_founder_approval",
                        description=(
                            f'Decision "{item.title}" awaits approval.'
                        ),
                        evidence_data={
                            "decision_code": (
                                item.decision_code
                            ),
                            "priority": item.priority,
                            "risk_level": item.risk_level,
                            "created_at": (
                                item.created_at.isoformat()
                                if item.created_at
                                else None
                            ),
                        },
                        observed_at=(
                            item.created_at
                            or now
                        ),
                    )
                    for item in pending_approvals
                ),
            )
        )

    active_workflows = [
        item
        for item in workflows
        if item.status in {
            "draft",
            "running",
            "waiting",
        }
    ]

    role_bottlenecks: dict[str, list[SonnyWorkflowStep]] = {}

    for workflow in active_workflows:
        for step in workflow.steps:
            if step.status not in {
                "in_progress",
                "pending",
            }:
                continue

            if (
                step.started_at
                and step.started_at <= days_ago(2)
            ):
                role = step.assigned_role or "unknown"
                role_bottlenecks.setdefault(
                    role,
                    [],
                ).append(step)

    for role, steps in role_bottlenecks.items():
        if len(steps) < 1:
            continue

        candidates.append(
            InsightCandidate(
                code=f"workflow_bottleneck:{role}",
                category="workflow",
                title=(
                    f"Workflow bottleneck detected for {role}"
                ),
                summary=(
                    f"{len(steps)} workflow step(s) assigned to "
                    f"{role} have remained active for more than two days."
                ),
                pattern_type="bottleneck",
                severity="high",
                confidence=0.95,
                trend="worsening",
                recommended_action=(
                    f"Review workload, ownership, and blockers for {role}."
                ),
                is_actionable=True,
                source_summary={
                    "assigned_role": role,
                    "stale_step_count": len(
                        steps
                    ),
                },
                evidence=tuple(
                    EvidenceCandidate(
                        source_type="sonny_workflow_step",
                        source_id=step.id,
                        event_type="stale_workflow_step",
                        description=(
                            f'Workflow step "{step.title}" '
                            f'assigned to {role} remains {step.status}.'
                        ),
                        evidence_data={
                            "workflow_id": (
                                step.workflow_id
                            ),
                            "step_order": (
                                step.step_order
                            ),
                            "step_code": step.step_code,
                            "status": step.status,
                            "started_at": (
                                step.started_at.isoformat()
                                if step.started_at
                                else None
                            ),
                        },
                        observed_at=(
                            step.started_at
                            or now
                        ),
                    )
                    for step in steps
                ),
            )
        )

    workforce_summary = state[
        "ai_workforce"
    ]["summary"]

    workforce_capacity = workforce_summary.get(
        "included_capacity"
    )
    workforce_unlimited = bool(
        workforce_summary.get("unlimited")
    )
    has_workforce_entitlement = (
        workforce_unlimited
        or int(workforce_capacity or 0) > 0
    )

    if (
        has_workforce_entitlement
        and workforce_summary["active"] == 0
    ):
        candidates.append(
            InsightCandidate(
                code="ai_workforce_underutilization",
                category="ai_workforce",
                title="AI workforce is underutilized",
                summary=(
                    "The company has included AI workforce capacity, "
                    "but no company-specific AI employee assignment "
                    "is currently active."
                ),
                pattern_type="opportunity",
                severity="low",
                confidence=0.90,
                trend="stable",
                recommended_action=(
                    "Identify a repeatable operational workload and "
                    "evaluate a suitable AI template."
                ),
                is_actionable=True,
                source_summary={
                    "active_agents": 0,
                    "assigned_agents": (
                        workforce_summary["total"]
                    ),
                    "included_capacity": workforce_capacity,
                    "available_slots": workforce_summary.get(
                        "available_slots"
                    ),
                    "unlimited": workforce_unlimited,
                },
                evidence=(
                    EvidenceCandidate(
                        source_type="company_state",
                        source_id="ai_workforce",
                        event_type="no_active_ai_agents",
                        description=(
                            "No active AI employees are assigned."
                        ),
                        evidence_data={
                            "active_agents": 0,
                            "assigned_agents": (
                                workforce_summary["total"]
                            ),
                            "included_capacity": (
                                workforce_capacity
                            ),
                            "available_slots": (
                                workforce_summary.get(
                                    "available_slots"
                                )
                            ),
                            "unlimited": workforce_unlimited,
                        },
                        observed_at=now,
                    ),
                ),
            )
        )

    health_scores = [
        int(item.health_score or 0)
        for item in plans
        if item.health_score is not None
    ]

    if len(health_scores) >= 3:
        newest = health_scores[0]
        oldest = health_scores[-1]
        delta = newest - oldest

        if abs(delta) >= 5:
            trend = (
                "improving"
                if delta > 0
                else "worsening"
            )

            candidates.append(
                InsightCandidate(
                    code="company_health_trend",
                    category="executive",
                    title=(
                        "Company health is improving"
                        if delta > 0
                        else "Company health is declining"
                    ),
                    summary=(
                        f"Company health changed by {delta:+d} "
                        f"points across {len(health_scores)} recent plans."
                    ),
                    pattern_type="trend",
                    severity=(
                        "informational"
                        if delta > 0
                        else "high"
                    ),
                    confidence=0.93,
                    trend=trend,
                    recommended_action=(
                        "Continue the current operating cadence."
                        if delta > 0
                        else (
                            "Review the highest-priority unresolved "
                            "decisions and workflows."
                        )
                    ),
                    is_actionable=delta < 0,
                    source_summary={
                        "oldest_score": oldest,
                        "newest_score": newest,
                        "delta": delta,
                        "plan_count": len(
                            health_scores
                        ),
                    },
                    evidence=tuple(
                        EvidenceCandidate(
                            source_type="sonny_plan",
                            source_id=item.id,
                            event_type="company_health_score",
                            description=(
                                f"Plan dated {item.plan_date} "
                                f"recorded health score {item.health_score}."
                            ),
                            evidence_data={
                                "plan_date": (
                                    item.plan_date.isoformat()
                                ),
                                "health_score": (
                                    item.health_score
                                ),
                            },
                            observed_at=(
                                item.generated_at
                                or item.created_at
                                or now
                            ),
                        )
                        for item in plans
                        if item.health_score is not None
                    ),
                )
            )

    candidates.sort(
        key=lambda item: (
            SEVERITY_ORDER.get(
                item.severity,
                99,
            ),
            item.title.lower(),
        )
    )

    return candidates


def record_insight_activity(
    db: Session,
    *,
    insight: SonnyInsight,
    event_type: str,
    title: str,
    description: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    record_activity(
        db,
        company_id=insight.company_id,
        event_type=event_type,
        title=title,
        description=description,
        actor_type="sonny",
        actor_id="sonny",
        source_type="sonny_insight",
        source_id=insight.id,
        metadata=metadata,
        commit=False,
    )


def generate_company_insights(
    db: Session,
    company: Company,
) -> dict[str, Any]:
    now = utcnow()

    candidates = build_candidates(
        db,
        company,
    )

    existing = (
        db.query(SonnyInsight)
        .filter(
            SonnyInsight.company_id == company.id
        )
        .all()
    )

    existing_by_fingerprint = {
        item.fingerprint: item
        for item in existing
    }

    created: list[SonnyInsight] = []
    refreshed: list[SonnyInsight] = []
    resolved: list[SonnyInsight] = []

    detected_fingerprints: set[str] = set()

    for candidate in candidates:
        fingerprint = insight_fingerprint(
            company.id,
            candidate,
        )

        detected_fingerprints.add(
            fingerprint
        )

        insight = existing_by_fingerprint.get(
            fingerprint
        )

        is_new = insight is None

        if insight is None:
            insight = SonnyInsight(
                company_id=company.id,
                fingerprint=fingerprint,
                insight_code=candidate.code,
                category=candidate.category,
                title=candidate.title,
                summary=candidate.summary,
                pattern_type=candidate.pattern_type,
                severity=candidate.severity,
                confidence=candidate.confidence,
                trend=candidate.trend,
                status="active",
                recommended_action=(
                    candidate.recommended_action
                ),
                source_summary=(
                    candidate.source_summary
                ),
                occurrence_count=1,
                first_detected_at=now,
                last_detected_at=now,
                is_actionable=(
                    candidate.is_actionable
                ),
                state_version="b3.2",
                generated_by=(
                    "sonny_memory_intelligence"
                ),
            )

            db.add(insight)
            db.flush()

            created.append(insight)
            existing_by_fingerprint[
                fingerprint
            ] = insight
        else:
            insight.insight_code = (
                candidate.code
            )
            insight.category = (
                candidate.category
            )
            insight.title = candidate.title
            insight.summary = candidate.summary
            insight.pattern_type = (
                candidate.pattern_type
            )
            insight.severity = (
                candidate.severity
            )
            insight.confidence = (
                candidate.confidence
            )
            insight.trend = candidate.trend
            insight.status = "active"
            insight.recommended_action = (
                candidate.recommended_action
            )
            insight.source_summary = (
                candidate.source_summary
            )
            insight.occurrence_count = int(
                insight.occurrence_count or 0
            ) + 1
            insight.last_detected_at = now
            insight.resolved_at = None
            insight.is_actionable = (
                candidate.is_actionable
            )
            insight.state_version = "b3.2"
            insight.updated_at = now

            refreshed.append(insight)

        known_evidence = {
            item.evidence_fingerprint
            for item in insight.evidence
        }

        added_evidence_count = 0

        for evidence in candidate.evidence:
            evidence_fp = evidence_fingerprint(
                fingerprint,
                evidence,
            )

            if evidence_fp in known_evidence:
                continue

            db.add(
                SonnyInsightEvidence(
                    insight_id=insight.id,
                    company_id=company.id,
                    evidence_fingerprint=(
                        evidence_fp
                    ),
                    source_type=(
                        evidence.source_type
                    ),
                    source_id=evidence.source_id,
                    event_type=evidence.event_type,
                    description=(
                        evidence.description
                    ),
                    evidence_data=(
                        evidence.evidence_data
                    ),
                    observed_at=(
                        evidence.observed_at
                    ),
                )
            )

            known_evidence.add(
                evidence_fp
            )
            added_evidence_count += 1

        record_insight_activity(
            db,
            insight=insight,
            event_type=(
                "sonny_insight_created"
                if is_new
                else "sonny_insight_refreshed"
            ),
            title=(
                "Sonny insight created"
                if is_new
                else "Sonny insight refreshed"
            ),
            description=insight.title,
            metadata={
                "insight_code": (
                    insight.insight_code
                ),
                "category": insight.category,
                "severity": insight.severity,
                "confidence": (
                    insight.confidence
                ),
                "trend": insight.trend,
                "occurrence_count": (
                    insight.occurrence_count
                ),
                "new_evidence_count": (
                    added_evidence_count
                ),
            },
        )

    for insight in existing:
        if (
            insight.status == "active"
            and insight.fingerprint
            not in detected_fingerprints
        ):
            insight.status = "resolved"
            insight.resolved_at = now
            insight.updated_at = now

            record_insight_activity(
                db,
                insight=insight,
                event_type=(
                    "sonny_insight_resolved"
                ),
                title="Sonny insight resolved",
                description=(
                    f'{insight.title} is no longer supported '
                    "by the current company state."
                ),
                metadata={
                    "insight_code": (
                        insight.insight_code
                    ),
                    "occurrence_count": (
                        insight.occurrence_count
                    ),
                },
            )

            resolved.append(insight)

    db.commit()

    active = (
        db.query(SonnyInsight)
        .filter(
            SonnyInsight.company_id
            == company.id,
            SonnyInsight.status == "active",
        )
        .order_by(
            SonnyInsight.last_detected_at.desc()
        )
        .all()
    )

    active.sort(
        key=lambda item: (
            SEVERITY_ORDER.get(
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

    return {
        "company_id": company.id,
        "engine_version": "b3.2",
        "generation_summary": {
            "candidate_count": len(
                candidates
            ),
            "created": len(created),
            "refreshed": len(
                refreshed
            ),
            "resolved": len(resolved),
            "active": len(active),
        },
        "insights": [
            serialize_insight(item)
            for item in active
        ],
    }


def list_company_insights(
    db: Session,
    *,
    company_id: str,
    status: str | None = None,
    category: str | None = None,
    severity: str | None = None,
    limit: int = 100,
) -> list[SonnyInsight]:
    query = db.query(SonnyInsight).filter(
        SonnyInsight.company_id
        == company_id
    )

    if status:
        query = query.filter(
            SonnyInsight.status
            == status.strip().lower()
        )

    if category:
        query = query.filter(
            SonnyInsight.category
            == category.strip().lower()
        )

    if severity:
        query = query.filter(
            SonnyInsight.severity
            == severity.strip().lower()
        )

    results = (
        query.order_by(
            SonnyInsight.last_detected_at.desc()
        )
        .limit(
            min(max(limit, 1), 500)
        )
        .all()
    )

    results.sort(
        key=lambda item: (
            SEVERITY_ORDER.get(
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

    return results


def get_company_insight(
    db: Session,
    *,
    company_id: str,
    insight_id: str,
) -> SonnyInsight:
    insight = (
        db.query(SonnyInsight)
        .filter(
            SonnyInsight.id == insight_id,
            SonnyInsight.company_id
            == company_id,
        )
        .first()
    )

    if not insight:
        raise ValueError(
            "Insight not found."
        )

    return insight


def dismiss_insight(
    db: Session,
    *,
    insight: SonnyInsight,
    actor_id: str,
) -> SonnyInsight:
    if insight.status == "dismissed":
        return insight

    insight.status = "dismissed"
    insight.dismissed_at = utcnow()
    insight.dismissed_by = actor_id
    insight.updated_at = utcnow()

    record_insight_activity(
        db,
        insight=insight,
        event_type="sonny_insight_dismissed",
        title="Sonny insight dismissed",
        description=insight.title,
        metadata={
            "insight_code": (
                insight.insight_code
            ),
            "dismissed_by": actor_id,
        },
    )

    db.commit()
    db.refresh(insight)

    return insight
