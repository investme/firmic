from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Index,
    String,
    Text,
)

from database import Base


class WorkflowWorkerHeartbeat(Base):
    __tablename__ = "workflow_worker_heartbeats"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    worker_id = Column(
        String,
        nullable=False,
        unique=True,
        index=True,
    )

    company_id = Column(
        String,
        nullable=True,
        index=True,
    )

    status = Column(
        String,
        nullable=False,
        default="starting",
        index=True,
    )

    started_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    last_heartbeat_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        index=True,
    )

    last_dispatch_at = Column(
        DateTime,
        nullable=True,
    )

    last_dispatch_status = Column(
        String,
        nullable=True,
    )

    last_error_at = Column(
        DateTime,
        nullable=True,
    )

    last_error_message = Column(
        Text,
        nullable=True,
    )

    stopped_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    __table_args__ = (
        Index(
            "ix_workflow_worker_heartbeats_status_heartbeat",
            "status",
            "last_heartbeat_at",
        ),
    )
