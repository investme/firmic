from __future__ import annotations

import hashlib
from typing import Any

from sqlalchemy import desc
from sqlalchemy.orm import Session

from models.intelligence import (
    IntelligenceHandoff,
    IntelligenceLearningEvent,
    IntelligenceMemory,
    utcnow,
)


PREFERENCE_PATTERNS = (
    "i prefer ",
    "we prefer ",
    "our preference ",
    "always ",
    "never ",
    "our goal ",
    "my goal ",
    "we want ",
    "i want ",
)


def _clamp(
    value: float,
    minimum: float,
    maximum: float,
) -> float:
    return max(
        minimum,
        min(maximum, float(value)),
    )


def _normalize(value: Any) -> str:
    return " ".join(
        str(value or "")
        .strip()
        .lower()
        .replace("_", " ")
        .replace("-", " ")
        .split()
    )


def _fingerprint(text: str) -> str:
    normalized = _normalize(text)
    return hashlib.sha256(
        normalized.encode("utf-8")
    ).hexdigest()[:24]


def serialize_memory(
    memory: IntelligenceMemory,
) -> dict[str, Any]:
    return {
        "id": memory.id,
        "company_id": memory.company_id,
        "agent_scope": memory.agent_scope,
        "memory_type": memory.memory_type,
        "memory_key": memory.memory_key,
        "title": memory.title,
        "content": memory.content,
        "source_agent": memory.source_agent,
        "source_type": memory.source_type,
        "source_id": memory.source_id,
        "provenance": memory.provenance or {},
        "confidence": round(
            float(memory.confidence or 0),
            4,
        ),
        "utility_score": round(
            float(memory.utility_score or 0),
            4,
        ),
        "occurrence_count": int(
            memory.occurrence_count or 0
        ),
        "status": memory.status,
        "last_confirmed_at": (
            memory.last_confirmed_at.isoformat()
            if memory.last_confirmed_at
            else None
        ),
        "last_used_at": (
            memory.last_used_at.isoformat()
            if memory.last_used_at
            else None
        ),
        "created_at": (
            memory.created_at.isoformat()
            if memory.created_at
            else None
        ),
        "updated_at": (
            memory.updated_at.isoformat()
            if memory.updated_at
            else None
        ),
    }


def serialize_learning_event(
    event: IntelligenceLearningEvent,
) -> dict[str, Any]:
    return {
        "id": event.id,
        "company_id": event.company_id,
        "agent": event.agent,
        "event_type": event.event_type,
        "subject_type": event.subject_type,
        "subject_id": event.subject_id,
        "action": event.action,
        "outcome": event.outcome,
        "outcome_score": round(
            float(event.outcome_score or 0),
            4,
        ),
        "evidence": event.evidence or {},
        "related_memory_id": (
            event.related_memory_id
        ),
        "created_at": (
            event.created_at.isoformat()
            if event.created_at
            else None
        ),
    }


def serialize_handoff(
    handoff: IntelligenceHandoff,
) -> dict[str, Any]:
    return {
        "id": handoff.id,
        "company_id": handoff.company_id,
        "handoff_key": handoff.handoff_key,
        "from_agent": handoff.from_agent,
        "to_agent": handoff.to_agent,
        "handoff_type": handoff.handoff_type,
        "status": handoff.status,
        "summary": handoff.summary,
        "payload": handoff.payload or {},
        "created_at": (
            handoff.created_at.isoformat()
            if handoff.created_at
            else None
        ),
        "accepted_at": (
            handoff.accepted_at.isoformat()
            if handoff.accepted_at
            else None
        ),
        "completed_at": (
            handoff.completed_at.isoformat()
            if handoff.completed_at
            else None
        ),
    }


def observe_memory(
    db: Session,
    *,
    company_id: str,
    agent_scope: str,
    memory_type: str,
    title: str,
    content: str,
    source_agent: str,
    source_type: str = "observation",
    source_id: str | None = None,
    memory_key: str | None = None,
    provenance: dict[str, Any] | None = None,
    confidence: float = 0.60,
    status: str = "candidate",
    commit: bool = True,
) -> IntelligenceMemory:
    scope = (
        _normalize(agent_scope)
        .replace(" ", "_")
        or "shared"
    )
    mem_type = (
        _normalize(memory_type)
        .replace(" ", "_")
        or "fact"
    )
    key = (
        _normalize(memory_key)
        .replace(" ", "_")
        if memory_key
        else None
    )

    memory = None

    if key:
        memory = (
            db.query(IntelligenceMemory)
            .filter(
                IntelligenceMemory.company_id
                == company_id,
                IntelligenceMemory.agent_scope
                == scope,
                IntelligenceMemory.memory_key
                == key,
            )
            .first()
        )

    now = utcnow()

    if memory:
        old_confidence = float(
            memory.confidence or 0.60
        )
        memory.memory_type = mem_type
        memory.title = title.strip()
        memory.content = content.strip()
        memory.source_agent = source_agent
        memory.source_type = source_type
        memory.source_id = source_id
        memory.provenance = (
            provenance
            or memory.provenance
            or {}
        )
        memory.confidence = _clamp(
            (old_confidence * 0.75)
            + (float(confidence) * 0.25),
            0.0,
            1.0,
        )
        memory.occurrence_count = int(
            memory.occurrence_count or 1
        ) + 1
        memory.status = (
            status or memory.status
        )
        memory.updated_at = now

        if memory.status == "confirmed":
            memory.last_confirmed_at = now

    else:
        memory = IntelligenceMemory(
            company_id=company_id,
            agent_scope=scope,
            memory_type=mem_type,
            memory_key=key,
            title=title.strip(),
            content=content.strip(),
            source_agent=source_agent,
            source_type=source_type,
            source_id=source_id,
            provenance=provenance or {},
            confidence=_clamp(
                confidence,
                0.0,
                1.0,
            ),
            utility_score=0.50,
            occurrence_count=1,
            status=status or "candidate",
            last_confirmed_at=(
                now
                if status == "confirmed"
                else None
            ),
        )
        db.add(memory)

    if commit:
        db.commit()
        db.refresh(memory)
    else:
        db.flush()

    return memory


def record_learning_event(
    db: Session,
    *,
    company_id: str,
    agent: str,
    event_type: str,
    subject_type: str | None = None,
    subject_id: str | None = None,
    action: str | None = None,
    outcome: str | None = None,
    outcome_score: float = 0.0,
    evidence: dict[str, Any] | None = None,
    related_memory: IntelligenceMemory | None = None,
    commit: bool = True,
) -> IntelligenceLearningEvent:
    score = _clamp(
        outcome_score,
        -1.0,
        1.0,
    )

    event = IntelligenceLearningEvent(
        company_id=company_id,
        agent=agent,
        event_type=event_type,
        subject_type=subject_type,
        subject_id=subject_id,
        action=action,
        outcome=outcome,
        outcome_score=score,
        evidence=evidence or {},
        related_memory_id=(
            related_memory.id
            if related_memory
            else None
        ),
    )

    db.add(event)

    if related_memory is not None:
        old_utility = float(
            related_memory.utility_score
            or 0.50
        )
        normalized_score = (
            score + 1.0
        ) / 2.0
        related_memory.utility_score = (
            _clamp(
                (old_utility * 0.80)
                + (normalized_score * 0.20),
                0.0,
                1.0,
            )
        )
        related_memory.updated_at = utcnow()
        db.add(related_memory)

    if commit:
        db.commit()
        db.refresh(event)
    else:
        db.flush()

    return event


def remember_founder_signal(
    db: Session,
    *,
    company_id: str,
    message: str,
    actor_id: str | None = None,
    commit: bool = True,
) -> IntelligenceMemory | None:
    clean = " ".join(
        str(message or "").split()
    )
    lowered = clean.lower()
    memory = None

    if any(
        pattern in lowered
        for pattern in PREFERENCE_PATTERNS
    ):
        memory = observe_memory(
            db,
            company_id=company_id,
            agent_scope="shared",
            memory_type="founder_preference",
            memory_key=(
                "founder_signal_"
                + _fingerprint(clean)
            ),
            title="Founder preference or goal",
            content=clean,
            source_agent="sonny",
            source_type="founder_message",
            source_id=actor_id,
            provenance={
                "actor_id": actor_id,
                "capture_method": (
                    "explicit_language_heuristic"
                ),
            },
            confidence=0.72,
            status="candidate",
            commit=False,
        )

    record_learning_event(
        db,
        company_id=company_id,
        agent="sonny",
        event_type="founder_message_observed",
        subject_type="conversation",
        subject_id=actor_id,
        action="observe",
        outcome="captured",
        outcome_score=0.0,
        evidence={
            "message_preview": clean[:500],
            "promoted_to_memory": bool(memory),
        },
        related_memory=memory,
        commit=False,
    )

    if commit:
        db.commit()
        if memory:
            db.refresh(memory)

    return memory


def record_agent_reply(
    db: Session,
    *,
    company_id: str,
    agent: str,
    reply: str,
    source_id: str | None = None,
    commit: bool = True,
) -> IntelligenceLearningEvent:
    return record_learning_event(
        db,
        company_id=company_id,
        agent=agent,
        event_type="agent_reply",
        subject_type="conversation",
        subject_id=source_id,
        action="reply",
        outcome="delivered",
        outcome_score=0.0,
        evidence={
            "reply_preview": str(
                reply or ""
            )[:500],
        },
        commit=commit,
    )


def record_action_outcome(
    db: Session,
    *,
    company_id: str,
    agent: str,
    action: str,
    result: dict[str, Any] | None,
    commit: bool = True,
) -> IntelligenceLearningEvent:
    payload = result or {}
    status = _normalize(
        payload.get("status")
        or payload.get("result")
        or payload.get("outcome")
    )

    if status in {
        "success",
        "succeeded",
        "completed",
        "complete",
        "created",
        "updated",
        "approved",
        "active",
    }:
        score = 1.0
    elif status in {
        "failed",
        "error",
        "rejected",
        "cancelled",
        "canceled",
    }:
        score = -1.0
    else:
        score = (
            0.25
            if payload
            else 0.0
        )

    return record_learning_event(
        db,
        company_id=company_id,
        agent=agent,
        event_type="action_outcome",
        subject_type="action",
        action=action,
        outcome=status or "unknown",
        outcome_score=score,
        evidence=payload,
        commit=commit,
    )


def retrieve_memories(
    db: Session,
    *,
    company_id: str,
    agent: str,
    limit: int = 12,
    include_candidates: bool = True,
) -> list[IntelligenceMemory]:
    scopes = {
        "shared",
        _normalize(agent)
        .replace(" ", "_"),
    }

    query = (
        db.query(IntelligenceMemory)
        .filter(
            IntelligenceMemory.company_id
            == company_id,
            IntelligenceMemory.agent_scope.in_(
                scopes
            ),
            IntelligenceMemory.status
            != "archived",
        )
    )

    if not include_candidates:
        query = query.filter(
            IntelligenceMemory.status
            == "confirmed"
        )

    memories = (
        query.order_by(
            desc(
                IntelligenceMemory.utility_score
            ),
            desc(
                IntelligenceMemory.confidence
            ),
            desc(
                IntelligenceMemory.updated_at
            ),
        )
        .limit(
            max(
                1,
                min(int(limit), 50),
            )
        )
        .all()
    )

    now = utcnow()

    for memory in memories:
        memory.last_used_at = now

    if memories:
        db.commit()

    return memories


def build_memory_context(
    db: Session,
    *,
    company_id: str,
    agent: str,
    limit: int = 12,
) -> dict[str, Any]:
    memories = retrieve_memories(
        db,
        company_id=company_id,
        agent=agent,
        limit=limit,
    )

    return {
        "memory_version": (
            "firmic-intelligence-v1"
        ),
        "company_id": company_id,
        "agent": agent,
        "memories": [
            {
                "type": memory.memory_type,
                "title": memory.title,
                "content": memory.content,
                "confidence": round(
                    float(
                        memory.confidence or 0
                    ),
                    3,
                ),
                "utility_score": round(
                    float(
                        memory.utility_score
                        or 0
                    ),
                    3,
                ),
                "status": memory.status,
                "source_agent": (
                    memory.source_agent
                ),
            }
            for memory in memories
        ],
    }


def create_or_update_handoff(
    db: Session,
    *,
    company_id: str,
    handoff_key: str,
    from_agent: str,
    to_agent: str,
    handoff_type: str,
    summary: str,
    payload: dict[str, Any] | None = None,
    commit: bool = True,
) -> IntelligenceHandoff:
    handoff = (
        db.query(IntelligenceHandoff)
        .filter(
            IntelligenceHandoff.company_id
            == company_id,
            IntelligenceHandoff.handoff_key
            == handoff_key,
        )
        .first()
    )

    if handoff:
        handoff.from_agent = from_agent
        handoff.to_agent = to_agent
        handoff.handoff_type = handoff_type
        handoff.summary = summary
        handoff.payload = payload or {}
    else:
        handoff = IntelligenceHandoff(
            company_id=company_id,
            handoff_key=handoff_key,
            from_agent=from_agent,
            to_agent=to_agent,
            handoff_type=handoff_type,
            status="pending",
            summary=summary,
            payload=payload or {},
        )
        db.add(handoff)

    if commit:
        db.commit()
        db.refresh(handoff)
    else:
        db.flush()

    return handoff


def accept_handoff(
    db: Session,
    *,
    company_id: str,
    to_agent: str,
    handoff_key: str | None = None,
    commit: bool = True,
) -> IntelligenceHandoff | None:
    query = (
        db.query(IntelligenceHandoff)
        .filter(
            IntelligenceHandoff.company_id
            == company_id,
            IntelligenceHandoff.to_agent
            == to_agent,
            IntelligenceHandoff.status
            == "pending",
        )
    )

    if handoff_key:
        query = query.filter(
            IntelligenceHandoff.handoff_key
            == handoff_key
        )

    handoff = (
        query.order_by(
            IntelligenceHandoff.created_at.desc()
        )
        .first()
    )

    if not handoff:
        return None

    handoff.status = "accepted"
    handoff.accepted_at = utcnow()

    record_learning_event(
        db,
        company_id=company_id,
        agent=to_agent,
        event_type=(
            "agent_handoff_accepted"
        ),
        subject_type="handoff",
        subject_id=handoff.id,
        action=(
            f"{handoff.from_agent}"
            f"->{handoff.to_agent}"
        ),
        outcome="accepted",
        outcome_score=0.5,
        evidence={
            "handoff_type": (
                handoff.handoff_type
            ),
            "summary": handoff.summary,
        },
        commit=False,
    )

    if commit:
        db.commit()
        db.refresh(handoff)

    return handoff


def company_brain_summary(
    db: Session,
    *,
    company_id: str,
) -> dict[str, Any]:
    memories = (
        db.query(IntelligenceMemory)
        .filter(
            IntelligenceMemory.company_id
            == company_id,
            IntelligenceMemory.status
            != "archived",
        )
        .order_by(
            IntelligenceMemory.updated_at.desc()
        )
        .limit(50)
        .all()
    )

    events = (
        db.query(
            IntelligenceLearningEvent
        )
        .filter(
            IntelligenceLearningEvent.company_id
            == company_id
        )
        .order_by(
            IntelligenceLearningEvent.created_at.desc()
        )
        .limit(30)
        .all()
    )

    handoffs = (
        db.query(IntelligenceHandoff)
        .filter(
            IntelligenceHandoff.company_id
            == company_id
        )
        .order_by(
            IntelligenceHandoff.created_at.desc()
        )
        .limit(10)
        .all()
    )

    confirmed = [
        memory
        for memory in memories
        if memory.status == "confirmed"
    ]

    return {
        "engine": (
            "Firmic Intelligence Engine v1"
        ),
        "company_id": company_id,
        "memory_count": len(memories),
        "confirmed_memory_count": len(
            confirmed
        ),
        "candidate_memory_count": (
            len(memories) - len(confirmed)
        ),
        "recent_learning_event_count": (
            len(events)
        ),
        "pending_handoff_count": sum(
            1
            for handoff in handoffs
            if handoff.status == "pending"
        ),
        "memories": [
            serialize_memory(memory)
            for memory in memories[:20]
        ],
        "recent_learning_events": [
            serialize_learning_event(event)
            for event in events
        ],
        "handoffs": [
            serialize_handoff(handoff)
            for handoff in handoffs
        ],
    }
