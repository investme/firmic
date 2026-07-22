from __future__ import annotations

import datetime
import hashlib
import json
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from models.company import Company
from models.sonny_decision import SonnyDecision
from services.activity_service import record_activity
from services.sonny.state import build_company_state


ACTIVE_DECISION_STATUSES = {
    "proposed",
    "approved",
}

FINAL_DECISION_STATUSES = {
    "rejected",
    "cancelled",
    "expired",
    "completed",
    "failed",
}

ALLOWED_PRIORITIES = {
    "critical",
    "high",
    "medium",
    "low",
    "informational",
}

ALLOWED_RISK_LEVELS = {
    "critical",
    "high",
    "medium",
    "low",
}

PRIORITY_ORDER = {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 3,
    "informational": 4,
}


@dataclass(frozen=True)
class DecisionCandidate:
    code: str
    decision_type: str
    title: str
    summary: str
    reasoning: str
    recommended_action: str
    expected_outcome: str
    priority: str
    confidence: float
    risk_level: str
    approval_required: bool
    evidence: dict[str, Any]


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


def decision_fingerprint(
    company_id: str,
    candidate: DecisionCandidate,
) -> str:
    fingerprint_payload = {
        "company_id": company_id,
        "decision_code": candidate.code,
        "decision_type": candidate.decision_type,
        "evidence": candidate.evidence,
    }

    return hashlib.sha256(
        stable_json(fingerprint_payload).encode("utf-8")
    ).hexdigest()


def serialize_decision(
    decision: SonnyDecision,
) -> dict[str, Any]:
    return {
        "id": decision.id,
        "company_id": decision.company_id,
        "fingerprint": decision.fingerprint,
        "decision_code": decision.decision_code,
        "decision_type": decision.decision_type,
        "title": decision.title,
        "summary": decision.summary,
        "reasoning": decision.reasoning,
        "recommended_action": decision.recommended_action,
        "expected_outcome": decision.expected_outcome,
        "priority": decision.priority,
        "confidence": round(float(decision.confidence or 0), 4),
        "risk_level": decision.risk_level,
        "status": decision.status,
        "approval_required": bool(decision.approval_required),
        "approved_by": decision.approved_by,
        "approved_at": (
            decision.approved_at.isoformat()
            if decision.approved_at
            else None
        ),
        "rejected_by": decision.rejected_by,
        "rejected_at": (
            decision.rejected_at.isoformat()
            if decision.rejected_at
            else None
        ),
        "rejection_reason": decision.rejection_reason,
        "cancelled_by": decision.cancelled_by,
        "cancelled_at": (
            decision.cancelled_at.isoformat()
            if decision.cancelled_at
            else None
        ),
        "execution_status": decision.execution_status,
        "executed_at": (
            decision.executed_at.isoformat()
            if decision.executed_at
            else None
        ),
        "execution_result": decision.execution_result,
        "state_version": decision.state_version,
        "evidence": decision.evidence or {},
        "source": decision.source,
        "created_by": decision.created_by,
        "created_at": (
            decision.created_at.isoformat()
            if decision.created_at
            else None
        ),
        "updated_at": (
            decision.updated_at.isoformat()
            if decision.updated_at
            else None
        ),
        "expires_at": (
            decision.expires_at.isoformat()
            if decision.expires_at
            else None
        ),
    }


def build_candidates(
    state: dict[str, Any],
) -> list[DecisionCandidate]:
    candidates: list[DecisionCandidate] = []

    company = state["company"]
    documents = state["documents"]
    tasks = state["tasks"]
    support = state["support"]
    billing = state["billing"]
    workforce = state["ai_workforce"]
    meetings = state["meetings"]

    if not company["headquarters"]["active"]:
        candidates.append(
            DecisionCandidate(
                code="activate_headquarters",
                decision_type="infrastructure",
                title="Activate company headquarters",
                summary=(
                    "The company does not currently have an active "
                    "Firmic headquarters."
                ),
                reasoning=(
                    "Headquarters is a core operating dependency for "
                    "business infrastructure, communications, office services, "
                    "and related recurring billing."
                ),
                recommended_action=(
                    "Open the Office Marketplace and activate an eligible "
                    "headquarters for this company."
                ),
                expected_outcome=(
                    "The company gains an active operating address and can "
                    "provision related infrastructure services."
                ),
                priority="high",
                confidence=0.99,
                risk_level="high",
                approval_required=True,
                evidence={
                    "headquarters_active": False,
                    "office_code": None,
                },
            )
        )

    core_requirements = {
        "trade_license": "Trade License",
        "passport_copy": "Passport Copy",
        "incorporation_certificate": "Incorporation Certificate",
        "proof_of_address": "Proof of Address",
    }

    missing_documents = [
        label
        for key, label in core_requirements.items()
        if not documents["signals"]["requirements"].get(key)
    ]

    if missing_documents:
        candidates.append(
            DecisionCandidate(
                code="complete_compliance_documents",
                decision_type="compliance",
                title="Complete required compliance documents",
                summary=(
                    f'{len(missing_documents)} required compliance '
                    "document(s) are missing."
                ),
                reasoning=(
                    "Sonny compared the company document inventory with "
                    "Firmic's four core compliance requirements."
                ),
                recommended_action=(
                    "Upload and submit the missing documents through the "
                    "Document Vault for Hermes review."
                ),
                expected_outcome=(
                    "The company can progress toward full compliance readiness."
                ),
                priority="high",
                confidence=0.98,
                risk_level="high",
                approval_required=True,
                evidence={
                    "missing_documents": sorted(missing_documents),
                    "document_total": documents["summary"]["total"],
                    "approved_documents": documents["summary"]["approved"],
                },
            )
        )

    pending_task_count = int(tasks["summary"]["pending"] or 0)

    if pending_task_count > 0:
        pending_task_ids = sorted(
            str(item["id"])
            for item in tasks["items"]
            if normalize(item.get("status"))
            not in {"completed", "complete", "done", "closed"}
        )

        candidates.append(
            DecisionCandidate(
                code="review_pending_tasks",
                decision_type="operations",
                title="Review pending operational tasks",
                summary=(
                    f"{pending_task_count} task(s) remain pending."
                ),
                reasoning=(
                    "Open tasks represent unfinished operational work and "
                    "may block company readiness or customer service."
                ),
                recommended_action=(
                    "Review the task queue, confirm priorities, assign owners, "
                    "and complete or reschedule each open task."
                ),
                expected_outcome=(
                    "Operational work is prioritized and company progress improves."
                ),
                priority="medium",
                confidence=0.96,
                risk_level="medium",
                approval_required=False,
                evidence={
                    "pending_task_count": pending_task_count,
                    "pending_task_ids": pending_task_ids,
                },
            )
        )

    urgent_ticket_ids = sorted(
        str(item["id"])
        for item in support["items"]
        if normalize(item.get("priority")) == "urgent"
        and normalize(item.get("status"))
        in {"open", "pending", "waiting_on_tenant"}
    )

    if urgent_ticket_ids:
        candidates.append(
            DecisionCandidate(
                code="resolve_urgent_support",
                decision_type="support",
                title="Resolve urgent support tickets",
                summary=(
                    f"{len(urgent_ticket_ids)} urgent support ticket(s) "
                    "require immediate attention."
                ),
                reasoning=(
                    "Urgent unresolved support issues can interrupt tenant "
                    "operations and damage service quality."
                ),
                recommended_action=(
                    "Open Support Inbox, assign each urgent ticket, respond, "
                    "and establish a resolution deadline."
                ),
                expected_outcome=(
                    "Urgent tenant issues receive accountable ownership and resolution."
                ),
                priority="critical",
                confidence=0.99,
                risk_level="critical",
                approval_required=False,
                evidence={
                    "urgent_ticket_ids": urgent_ticket_ids,
                    "urgent_ticket_count": len(urgent_ticket_ids),
                },
            )
        )
    elif int(support["summary"]["open"] or 0) > 0:
        open_ticket_ids = sorted(
            str(item["id"])
            for item in support["items"]
            if normalize(item.get("status"))
            in {"open", "pending", "waiting_on_tenant"}
        )

        candidates.append(
            DecisionCandidate(
                code="review_open_support",
                decision_type="support",
                title="Review open support tickets",
                summary=(
                    f'{support["summary"]["open"]} support ticket(s) '
                    "remain open."
                ),
                reasoning=(
                    "Open support conversations require monitoring until "
                    "the tenant confirms resolution."
                ),
                recommended_action=(
                    "Review the Support Inbox and update assignment, status, "
                    "priority, and tenant communication."
                ),
                expected_outcome=(
                    "Support requests progress toward timely resolution."
                ),
                priority="medium",
                confidence=0.95,
                risk_level="medium",
                approval_required=False,
                evidence={
                    "open_ticket_ids": open_ticket_ids,
                    "open_ticket_count": len(open_ticket_ids),
                },
            )
        )

    unbilled = float(billing.get("unbilled_usd") or 0)

    if unbilled > 0:
        candidates.append(
            DecisionCandidate(
                code="review_unbilled_usage",
                decision_type="billing",
                title="Review unbilled company usage",
                summary=f"${unbilled:.2f} remains unbilled.",
                reasoning=(
                    "The PostgreSQL Usage Ledger contains charges that have "
                    "not yet entered the billed or paid lifecycle."
                ),
                recommended_action=(
                    "Review the Billing Center and confirm whether the usage "
                    "should be billed, corrected, or voided."
                ),
                expected_outcome=(
                    "The ledger accurately reflects collectible revenue and "
                    "tenant billing status."
                ),
                priority="high",
                confidence=0.99,
                risk_level="high",
                approval_required=True,
                evidence={
                    "unbilled_usd": round(unbilled, 2),
                    "invoice_month": billing.get("current_invoice_month"),
                    "entry_count": billing.get("entry_count"),
                },
            )
        )

    active_agents = int(workforce["summary"]["active"] or 0)

    if active_agents == 0:
        candidates.append(
            DecisionCandidate(
                code="evaluate_ai_workforce",
                decision_type="ai_workforce",
                title="Evaluate an AI workforce activation",
                summary="The company has no active AI employees.",
                reasoning=(
                    "Firmic is designed to operate with an AI-native workforce, "
                    "but the company currently has no active AI role."
                ),
                recommended_action=(
                    "Review available AI templates and activate a role only "
                    "where a defined operational need and budget exist."
                ),
                expected_outcome=(
                    "A suitable AI employee can begin handling repeatable company work."
                ),
                priority="low",
                confidence=0.88,
                risk_level="low",
                approval_required=True,
                evidence={
                    "active_agents": 0,
                    "available_current_agents": workforce["summary"]["total"],
                },
            )
        )

    if int(meetings["summary"]["active"] or 0) > 0:
        candidates.append(
            DecisionCandidate(
                code="monitor_meeting_commitments",
                decision_type="meetings",
                title="Monitor active meeting commitments",
                summary=(
                    f'{meetings["summary"]["active"]} active meeting '
                    "booking(s) are scheduled."
                ),
                reasoning=(
                    "Active bookings create time, room, and service commitments "
                    "that should remain visible to operations."
                ),
                recommended_action=(
                    "Confirm the meeting schedule, room details, attendees, "
                    "and any required preparation."
                ),
                expected_outcome=(
                    "Meeting commitments are delivered without conflicts or missed preparation."
                ),
                priority="informational",
                confidence=0.94,
                risk_level="low",
                approval_required=False,
                evidence={
                    "active_bookings": meetings["summary"]["active"],
                    "booked_hours": meetings["summary"]["booked_hours"],
                },
            )
        )

    candidates.sort(
        key=lambda item: PRIORITY_ORDER.get(
            item.priority,
            99,
        )
    )

    return candidates


def create_activity(
    db: Session,
    *,
    decision: SonnyDecision,
    event_type: str,
    title: str,
    description: str,
    actor_type: str,
    actor_id: str | None,
    metadata: dict[str, Any] | None = None,
) -> None:
    record_activity(
        db,
        company_id=decision.company_id,
        event_type=event_type,
        title=title,
        description=description,
        actor_type=actor_type,
        actor_id=actor_id,
        source_type="sonny_decision",
        source_id=decision.id,
        metadata=metadata,
        commit=False,
    )


def generate_company_decisions(
    db: Session,
    company: Company,
    *,
    actor_id: str | None = None,
) -> dict[str, Any]:
    state = build_company_state(
        db,
        company,
        activity_limit=30,
        memory_limit=20,
    )

    candidates = build_candidates(state)
    generated_fingerprints: set[str] = set()

    existing = (
        db.query(SonnyDecision)
        .filter(
            SonnyDecision.company_id == company.id,
            SonnyDecision.source == "sonny_state_engine",
        )
        .all()
    )

    existing_by_fingerprint = {
        item.fingerprint: item
        for item in existing
    }

    created: list[SonnyDecision] = []
    updated: list[SonnyDecision] = []
    expired: list[SonnyDecision] = []

    now = utcnow()

    for candidate in candidates:
        fingerprint = decision_fingerprint(
            company.id,
            candidate,
        )
        generated_fingerprints.add(fingerprint)

        decision = existing_by_fingerprint.get(fingerprint)

        if decision and decision.status in ACTIVE_DECISION_STATUSES:
            decision.title = candidate.title
            decision.summary = candidate.summary
            decision.reasoning = candidate.reasoning
            decision.recommended_action = candidate.recommended_action
            decision.expected_outcome = candidate.expected_outcome
            decision.priority = candidate.priority
            decision.confidence = candidate.confidence
            decision.risk_level = candidate.risk_level
            decision.approval_required = candidate.approval_required
            decision.evidence = candidate.evidence
            decision.state_version = state["state_version"]
            decision.updated_at = now
            updated.append(decision)
            continue

        if decision and decision.status in FINAL_DECISION_STATUSES:
            # Preserve the historical final decision. A future recurrence
            # receives a new fingerprint generation suffix.
            recurrence = 2
            base_fingerprint = fingerprint

            while fingerprint in existing_by_fingerprint:
                fingerprint = hashlib.sha256(
                    f"{base_fingerprint}:recurrence:{recurrence}".encode("utf-8")
                ).hexdigest()
                recurrence += 1

        decision = SonnyDecision(
            company_id=company.id,
            fingerprint=fingerprint,
            decision_code=candidate.code,
            decision_type=candidate.decision_type,
            title=candidate.title,
            summary=candidate.summary,
            reasoning=candidate.reasoning,
            recommended_action=candidate.recommended_action,
            expected_outcome=candidate.expected_outcome,
            priority=candidate.priority,
            confidence=candidate.confidence,
            risk_level=candidate.risk_level,
            status="proposed",
            approval_required=candidate.approval_required,
            execution_status="not_started",
            state_version=state["state_version"],
            evidence=candidate.evidence,
            source="sonny_state_engine",
            created_by="sonny",
        )

        db.add(decision)
        db.flush()

        create_activity(
            db,
            decision=decision,
            event_type="sonny_decision_proposed",
            title="Sonny proposed a decision",
            description=decision.title,
            actor_type="sonny",
            actor_id="sonny",
            metadata={
                "decision_code": decision.decision_code,
                "decision_type": decision.decision_type,
                "priority": decision.priority,
                "confidence": decision.confidence,
                "approval_required": decision.approval_required,
            },
        )

        created.append(decision)
        existing_by_fingerprint[fingerprint] = decision

    for decision in existing:
        if (
            decision.status in ACTIVE_DECISION_STATUSES
            and decision.fingerprint not in generated_fingerprints
        ):
            decision.status = "expired"
            decision.updated_at = now

            create_activity(
                db,
                decision=decision,
                event_type="sonny_decision_expired",
                title="Sonny decision expired",
                description=(
                    f'{decision.title} is no longer supported by the '
                    "current company state."
                ),
                actor_type="sonny",
                actor_id="sonny",
                metadata={
                    "decision_code": decision.decision_code,
                    "previous_status": (
                        "approved"
                        if decision.approved_at
                        else "proposed"
                    ),
                },
            )

            expired.append(decision)

    db.commit()

    active = (
        db.query(SonnyDecision)
        .filter(
            SonnyDecision.company_id == company.id,
            SonnyDecision.status.in_(ACTIVE_DECISION_STATUSES),
        )
        .order_by(
            SonnyDecision.created_at.desc()
        )
        .all()
    )

    active.sort(
        key=lambda item: (
            PRIORITY_ORDER.get(item.priority, 99),
            item.created_at or now,
        )
    )

    return {
        "company_id": company.id,
        "state_version": state["state_version"],
        "generation_summary": {
            "candidate_count": len(candidates),
            "created": len(created),
            "updated": len(updated),
            "expired": len(expired),
            "active": len(active),
        },
        "decisions": [
            serialize_decision(item)
            for item in active
        ],
    }


def get_company_decision(
    db: Session,
    *,
    company_id: str,
    decision_id: str,
) -> SonnyDecision:
    decision = (
        db.query(SonnyDecision)
        .filter(
            SonnyDecision.id == decision_id,
            SonnyDecision.company_id == company_id,
        )
        .first()
    )

    if not decision:
        raise ValueError("Decision not found.")

    return decision


def approve_decision(
    db: Session,
    *,
    decision: SonnyDecision,
    actor_id: str,
) -> SonnyDecision:
    if decision.status != "proposed":
        raise ValueError(
            "Only proposed decisions can be approved."
        )

    decision.status = "approved"
    decision.approved_by = actor_id
    decision.approved_at = utcnow()
    decision.updated_at = utcnow()

    create_activity(
        db,
        decision=decision,
        event_type="sonny_decision_approved",
        title="Sonny decision approved",
        description=decision.title,
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "decision_code": decision.decision_code,
            "priority": decision.priority,
        },
    )

    db.commit()
    db.refresh(decision)
    return decision


def reject_decision(
    db: Session,
    *,
    decision: SonnyDecision,
    actor_id: str,
    reason: str | None,
) -> SonnyDecision:
    if decision.status not in {"proposed", "approved"}:
        raise ValueError(
            "Only proposed or approved decisions can be rejected."
        )

    decision.status = "rejected"
    decision.rejected_by = actor_id
    decision.rejected_at = utcnow()
    decision.rejection_reason = (
        reason.strip()
        if reason
        else None
    )
    decision.updated_at = utcnow()

    create_activity(
        db,
        decision=decision,
        event_type="sonny_decision_rejected",
        title="Sonny decision rejected",
        description=decision.title,
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "decision_code": decision.decision_code,
            "reason": decision.rejection_reason,
        },
    )

    db.commit()
    db.refresh(decision)
    return decision


def cancel_decision(
    db: Session,
    *,
    decision: SonnyDecision,
    actor_id: str,
) -> SonnyDecision:
    if decision.status not in {"proposed", "approved"}:
        raise ValueError(
            "Only proposed or approved decisions can be cancelled."
        )

    decision.status = "cancelled"
    decision.cancelled_by = actor_id
    decision.cancelled_at = utcnow()
    decision.updated_at = utcnow()

    create_activity(
        db,
        decision=decision,
        event_type="sonny_decision_cancelled",
        title="Sonny decision cancelled",
        description=decision.title,
        actor_type="tenant",
        actor_id=actor_id,
        metadata={
            "decision_code": decision.decision_code,
        },
    )

    db.commit()
    db.refresh(decision)
    return decision
