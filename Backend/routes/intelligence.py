from __future__ import annotations

from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from firmic_models import User
from models.company import Company
from services.intelligence.engine import (
    accept_handoff,
    company_brain_summary,
    observe_memory,
    record_learning_event,
    serialize_handoff,
    serialize_learning_event,
    serialize_memory,
)


router = APIRouter(
    prefix="/api/intelligence",
    tags=["Firmic Intelligence"],
)


def verify_company_access(
    company_id: str,
    token: dict,
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
        raise HTTPException(
            status_code=404,
            detail="Company not found.",
        )

    actor_id = str(
        token.get("sub") or ""
    )

    try:
        normalized_user_id = int(
            actor_id
        )
    except (TypeError, ValueError):
        normalized_user_id = None

    user = None

    if normalized_user_id is not None:
        user = (
            db.query(User)
            .filter(
                User.id
                == normalized_user_id
            )
            .first()
        )

    is_owner = (
        str(company.user_id)
        == actor_id
    )
    is_admin = bool(
        user
        and str(
            getattr(
                user,
                "role",
                "",
            )
            or ""
        ).strip().lower()
        == "admin"
    )

    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Company access denied.",
        )

    return company


class MemoryObservationRequest(
    BaseModel
):
    agent_scope: str = Field(
        default="shared",
        max_length=80,
    )
    memory_type: str = Field(
        default="fact",
        max_length=120,
    )
    memory_key: str | None = Field(
        default=None,
        max_length=255,
    )
    title: str = Field(
        min_length=1,
        max_length=255,
    )
    content: str = Field(
        min_length=1,
        max_length=20000,
    )
    source_agent: str = Field(
        default="system",
        max_length=80,
    )
    source_type: str = Field(
        default="observation",
        max_length=120,
    )
    source_id: str | None = Field(
        default=None,
        max_length=255,
    )
    provenance: dict[
        str,
        Any,
    ] = Field(default_factory=dict)
    confidence: float = Field(
        default=0.60,
        ge=0.0,
        le=1.0,
    )
    status: str = Field(
        default="candidate",
        max_length=40,
    )


class LearningEventRequest(
    BaseModel
):
    agent: str = Field(
        min_length=1,
        max_length=80,
    )
    event_type: str = Field(
        min_length=1,
        max_length=120,
    )
    subject_type: str | None = (
        Field(
            default=None,
            max_length=120,
        )
    )
    subject_id: str | None = Field(
        default=None,
        max_length=255,
    )
    action: str | None = Field(
        default=None,
        max_length=255,
    )
    outcome: str | None = Field(
        default=None,
        max_length=255,
    )
    outcome_score: float = Field(
        default=0.0,
        ge=-1.0,
        le=1.0,
    )
    evidence: dict[
        str,
        Any,
    ] = Field(default_factory=dict)


@router.get(
    "/company/{company_id}/brain"
)
def get_company_brain(
    company_id: str,
    token: dict = Depends(
        get_token_payload
    ),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        token,
        db,
    )

    return company_brain_summary(
        db,
        company_id=company_id,
    )


@router.post(
    "/company/{company_id}/memories"
)
def create_company_memory(
    company_id: str,
    payload: MemoryObservationRequest,
    token: dict = Depends(
        get_token_payload
    ),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        token,
        db,
    )

    memory = observe_memory(
        db,
        company_id=company_id,
        agent_scope=(
            payload.agent_scope
        ),
        memory_type=(
            payload.memory_type
        ),
        memory_key=(
            payload.memory_key
        ),
        title=payload.title,
        content=payload.content,
        source_agent=(
            payload.source_agent
        ),
        source_type=(
            payload.source_type
        ),
        source_id=payload.source_id,
        provenance=payload.provenance,
        confidence=payload.confidence,
        status=payload.status,
    )

    return {
        "message": (
            "Firmic company memory saved."
        ),
        "memory": serialize_memory(
            memory
        ),
    }


@router.post(
    "/company/{company_id}/learning-events"
)
def create_learning_event(
    company_id: str,
    payload: LearningEventRequest,
    token: dict = Depends(
        get_token_payload
    ),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        token,
        db,
    )

    event = record_learning_event(
        db,
        company_id=company_id,
        agent=payload.agent,
        event_type=payload.event_type,
        subject_type=(
            payload.subject_type
        ),
        subject_id=payload.subject_id,
        action=payload.action,
        outcome=payload.outcome,
        outcome_score=(
            payload.outcome_score
        ),
        evidence=payload.evidence,
    )

    return {
        "message": (
            "Firmic learning event "
            "recorded."
        ),
        "event": (
            serialize_learning_event(
                event
            )
        ),
    }


@router.post(
    "/company/{company_id}/handoffs/"
    "{handoff_key}/accept"
)
def accept_company_handoff(
    company_id: str,
    handoff_key: str,
    token: dict = Depends(
        get_token_payload
    ),
    db: Session = Depends(get_db),
):
    verify_company_access(
        company_id,
        token,
        db,
    )

    handoff = accept_handoff(
        db,
        company_id=company_id,
        to_agent="sonny",
        handoff_key=handoff_key,
    )

    if not handoff:
        raise HTTPException(
            status_code=404,
            detail=(
                "Pending handoff "
                "not found."
            ),
        )

    return {
        "message": (
            "Handoff accepted "
            "by Sonny."
        ),
        "handoff": serialize_handoff(
            handoff
        ),
    }
