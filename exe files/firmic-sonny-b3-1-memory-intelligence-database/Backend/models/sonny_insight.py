from __future__ import annotations

import datetime
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


class SonnyInsight(Base):
    __tablename__ = "sonny_insights"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "fingerprint",
            name="uq_sonny_insight_company_fingerprint",
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

    insight_code = Column(
        String,
        nullable=False,
        index=True,
    )

    category = Column(
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

    pattern_type = Column(
        String,
        nullable=False,
        index=True,
    )

    severity = Column(
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

    trend = Column(
        String,
        nullable=False,
        default="stable",
        index=True,
    )

    status = Column(
        String,
        nullable=False,
        default="active",
        index=True,
    )

    recommended_action = Column(
        Text,
        nullable=True,
    )

    source_summary = Column(
        JSON,
        nullable=False,
        default=dict,
    )

    occurrence_count = Column(
        Integer,
        nullable=False,
        default=1,
    )

    first_detected_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        index=True,
    )

    last_detected_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        index=True,
    )

    resolved_at = Column(
        DateTime,
        nullable=True,
        index=True,
    )

    dismissed_at = Column(
        DateTime,
        nullable=True,
        index=True,
    )

    dismissed_by = Column(
        String,
        nullable=True,
    )

    is_actionable = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    state_version = Column(
        String,
        nullable=False,
        default="b2.4",
    )

    generated_by = Column(
        String,
        nullable=False,
        default="sonny_memory_intelligence",
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

    evidence = relationship(
        "SonnyInsightEvidence",
        back_populates="insight",
        cascade="all, delete-orphan",
        order_by="SonnyInsightEvidence.observed_at",
    )


class SonnyInsightEvidence(Base):
    __tablename__ = "sonny_insight_evidence"
    __table_args__ = (
        UniqueConstraint(
            "insight_id",
            "evidence_fingerprint",
            name="uq_sonny_insight_evidence_fingerprint",
        ),
    )

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )

    insight_id = Column(
        String,
        ForeignKey("sonny_insights.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    company_id = Column(
        String,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    evidence_fingerprint = Column(
        String,
        nullable=False,
        index=True,
    )

    source_type = Column(
        String,
        nullable=False,
        index=True,
    )

    source_id = Column(
        String,
        nullable=True,
        index=True,
    )

    event_type = Column(
        String,
        nullable=True,
        index=True,
    )

    description = Column(
        Text,
        nullable=False,
    )

    evidence_data = Column(
        JSON,
        nullable=False,
        default=dict,
    )

    observed_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        index=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        index=True,
    )

    insight = relationship(
        "SonnyInsight",
        back_populates="evidence",
    )
