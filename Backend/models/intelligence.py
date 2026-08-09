from __future__ import annotations

import datetime
import uuid

from sqlalchemy import (
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

from database import Base


def utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()


class IntelligenceMemory(Base):
    __tablename__ = "firmic_intelligence_memories"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "agent_scope",
            "memory_key",
            name="uq_firmic_intelligence_memory_key",
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
    agent_scope = Column(
        String,
        nullable=False,
        default="shared",
        index=True,
    )
    memory_type = Column(
        String,
        nullable=False,
        default="fact",
        index=True,
    )
    memory_key = Column(
        String,
        nullable=True,
        index=True,
    )
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    source_agent = Column(
        String,
        nullable=False,
        default="system",
        index=True,
    )
    source_type = Column(
        String,
        nullable=False,
        default="observation",
        index=True,
    )
    source_id = Column(
        String,
        nullable=True,
        index=True,
    )
    provenance = Column(
        JSON,
        nullable=False,
        default=dict,
    )
    confidence = Column(
        Float,
        nullable=False,
        default=0.60,
    )
    utility_score = Column(
        Float,
        nullable=False,
        default=0.50,
    )
    occurrence_count = Column(
        Integer,
        nullable=False,
        default=1,
    )
    status = Column(
        String,
        nullable=False,
        default="candidate",
        index=True,
    )
    last_confirmed_at = Column(
        DateTime,
        nullable=True,
    )
    last_used_at = Column(
        DateTime,
        nullable=True,
    )
    created_at = Column(
        DateTime,
        nullable=False,
        default=utcnow,
        index=True,
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
        index=True,
    )


class IntelligenceLearningEvent(Base):
    __tablename__ = "firmic_intelligence_learning_events"

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
    agent = Column(
        String,
        nullable=False,
        default="system",
        index=True,
    )
    event_type = Column(
        String,
        nullable=False,
        index=True,
    )
    subject_type = Column(
        String,
        nullable=True,
        index=True,
    )
    subject_id = Column(
        String,
        nullable=True,
        index=True,
    )
    action = Column(String, nullable=True)
    outcome = Column(String, nullable=True)
    outcome_score = Column(
        Float,
        nullable=False,
        default=0.0,
    )
    evidence = Column(
        JSON,
        nullable=False,
        default=dict,
    )
    related_memory_id = Column(
        String,
        ForeignKey(
            "firmic_intelligence_memories.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )
    created_at = Column(
        DateTime,
        nullable=False,
        default=utcnow,
        index=True,
    )


class IntelligenceHandoff(Base):
    __tablename__ = "firmic_intelligence_handoffs"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "handoff_key",
            name="uq_firmic_intelligence_handoff_key",
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
    handoff_key = Column(
        String,
        nullable=False,
        index=True,
    )
    from_agent = Column(
        String,
        nullable=False,
        index=True,
    )
    to_agent = Column(
        String,
        nullable=False,
        index=True,
    )
    handoff_type = Column(
        String,
        nullable=False,
        index=True,
    )
    status = Column(
        String,
        nullable=False,
        default="pending",
        index=True,
    )
    summary = Column(Text, nullable=False)
    payload = Column(
        JSON,
        nullable=False,
        default=dict,
    )
    created_at = Column(
        DateTime,
        nullable=False,
        default=utcnow,
        index=True,
    )
    accepted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
