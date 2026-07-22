from __future__ import annotations

import datetime
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    JSON,
    String,
    Text,
    UniqueConstraint,
)

from database import Base


class SonnyDecision(Base):
    __tablename__ = "sonny_decisions"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "fingerprint",
            name="uq_sonny_decision_company_fingerprint",
        ),
    )

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )

    company_id = Column(
        String,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    fingerprint = Column(
        String,
        nullable=False,
        index=True,
    )

    decision_code = Column(
        String,
        nullable=False,
        index=True,
    )

    decision_type = Column(
        String,
        nullable=False,
        index=True,
    )

    title = Column(
        String,
        nullable=False,
    )

    summary = Column(
        Text,
        nullable=False,
    )

    reasoning = Column(
        Text,
        nullable=False,
    )

    recommended_action = Column(
        Text,
        nullable=False,
    )

    expected_outcome = Column(
        Text,
        nullable=True,
    )

    priority = Column(
        String,
        nullable=False,
        default="medium",
        index=True,
    )

    confidence = Column(
        Float,
        nullable=False,
        default=0.80,
    )

    risk_level = Column(
        String,
        nullable=False,
        default="medium",
        index=True,
    )

    status = Column(
        String,
        nullable=False,
        default="proposed",
        index=True,
    )

    approval_required = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    approved_by = Column(
        String,
        nullable=True,
    )

    approved_at = Column(
        DateTime,
        nullable=True,
    )

    rejected_by = Column(
        String,
        nullable=True,
    )

    rejected_at = Column(
        DateTime,
        nullable=True,
    )

    rejection_reason = Column(
        Text,
        nullable=True,
    )

    cancelled_by = Column(
        String,
        nullable=True,
    )

    cancelled_at = Column(
        DateTime,
        nullable=True,
    )

    execution_status = Column(
        String,
        nullable=False,
        default="not_started",
        index=True,
    )

    executed_at = Column(
        DateTime,
        nullable=True,
    )

    execution_result = Column(
        JSON,
        nullable=True,
    )

    state_version = Column(
        String,
        nullable=False,
        default="b1.1",
    )

    evidence = Column(
        JSON,
        nullable=False,
        default=dict,
    )

    source = Column(
        String,
        nullable=False,
        default="sonny_state_engine",
        index=True,
    )

    created_by = Column(
        String,
        nullable=False,
        default="sonny",
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        index=True,
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        index=True,
    )

    expires_at = Column(
        DateTime,
        nullable=True,
    )
