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
)
from sqlalchemy.orm import relationship

from database import Base


def uuid_string() -> str:
    return str(uuid.uuid4())


class WorkforceJob(Base):
    __tablename__ = "workforce_jobs"

    id = Column(String, primary_key=True, default=uuid_string)
    company_id = Column(
        String,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(255), nullable=False)
    request_text = Column(Text, nullable=False)
    assigned_agent = Column(String(80), nullable=False, index=True)
    assigned_role = Column(String(120), nullable=False)

    status = Column(String(40), nullable=False, default="pending", index=True)
    progress = Column(Integer, nullable=False, default=0)
    result_summary = Column(Text, nullable=True)
    failure_reason = Column(Text, nullable=True)

    source_type = Column(String(80), nullable=False, default="manual")
    source_id = Column(String, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
    )
    accepted_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    timeline = relationship(
        "WorkforceTimelineEvent",
        back_populates="job",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="WorkforceTimelineEvent.created_at.asc()",
    )


class WorkforceTimelineEvent(Base):
    __tablename__ = "workforce_timeline_events"

    id = Column(String, primary_key=True, default=uuid_string)
    company_id = Column(
        String,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_id = Column(
        String,
        ForeignKey("workforce_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    event_type = Column(String(80), nullable=False)
    actor = Column(String(80), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(40), nullable=True)
    progress = Column(Integer, nullable=True)
    event_metadata = Column(JSON, nullable=True)

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        index=True,
    )

    job = relationship(
        "WorkforceJob",
        back_populates="timeline",
    )
