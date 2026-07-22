from __future__ import annotations

import datetime
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


class SonnyAutomationRun(Base):
    __tablename__ = "sonny_automation_runs"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "idempotency_key",
            name="uq_sonny_automation_company_idempotency",
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

    decision_id = Column(
        String,
        ForeignKey("sonny_decisions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    workflow_id = Column(
        String,
        ForeignKey("sonny_workflows.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    trigger_type = Column(
        String,
        nullable=False,
        default="manual",
        index=True,
    )

    automation_type = Column(
        String,
        nullable=False,
        index=True,
    )

    idempotency_key = Column(
        String,
        nullable=False,
        index=True,
    )

    status = Column(
        String,
        nullable=False,
        default="draft",
        index=True,
    )

    approval_required = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    approved_by = Column(
        String,
        nullable=True,
    )

    approved_at = Column(
        DateTime,
        nullable=True,
    )

    started_at = Column(
        DateTime,
        nullable=True,
        index=True,
    )

    completed_at = Column(
        DateTime,
        nullable=True,
        index=True,
    )

    cancelled_at = Column(
        DateTime,
        nullable=True,
    )

    failed_at = Column(
        DateTime,
        nullable=True,
    )

    created_by = Column(
        String,
        nullable=False,
        default="sonny",
    )

    retry_count = Column(
        Integer,
        nullable=False,
        default=0,
    )

    max_retries = Column(
        Integer,
        nullable=False,
        default=3,
    )

    error_message = Column(
        Text,
        nullable=True,
    )

    input_payload = Column(
        JSON,
        nullable=False,
        default=dict,
    )

    output_payload = Column(
        JSON,
        nullable=False,
        default=dict,
    )

    run_metadata = Column(
        JSON,
        nullable=False,
        default=dict,
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

    actions = relationship(
        "SonnyAutomationAction",
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="SonnyAutomationAction.action_order",
    )


class SonnyAutomationAction(Base):
    __tablename__ = "sonny_automation_actions"
    __table_args__ = (
        UniqueConstraint(
            "automation_run_id",
            "action_order",
            name="uq_sonny_automation_action_order",
        ),
        UniqueConstraint(
            "automation_run_id",
            "idempotency_key",
            name="uq_sonny_automation_action_idempotency",
        ),
    )

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )

    automation_run_id = Column(
        String,
        ForeignKey("sonny_automation_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    company_id = Column(
        String,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    workflow_step_id = Column(
        String,
        ForeignKey("sonny_workflow_steps.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    action_order = Column(
        Integer,
        nullable=False,
        index=True,
    )

    action_code = Column(
        String,
        nullable=False,
        index=True,
    )

    service_name = Column(
        String,
        nullable=False,
        index=True,
    )

    target_type = Column(
        String,
        nullable=True,
        index=True,
    )

    target_id = Column(
        String,
        nullable=True,
        index=True,
    )

    idempotency_key = Column(
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

    approval_required = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    approved_by = Column(
        String,
        nullable=True,
    )

    approved_at = Column(
        DateTime,
        nullable=True,
    )

    attempt_count = Column(
        Integer,
        nullable=False,
        default=0,
    )

    max_attempts = Column(
        Integer,
        nullable=False,
        default=3,
    )

    started_at = Column(
        DateTime,
        nullable=True,
        index=True,
    )

    completed_at = Column(
        DateTime,
        nullable=True,
        index=True,
    )

    failed_at = Column(
        DateTime,
        nullable=True,
    )

    cancelled_at = Column(
        DateTime,
        nullable=True,
    )

    error_message = Column(
        Text,
        nullable=True,
    )

    payload = Column(
        JSON,
        nullable=False,
        default=dict,
    )

    result = Column(
        JSON,
        nullable=False,
        default=dict,
    )

    action_metadata = Column(
        JSON,
        nullable=False,
        default=dict,
    )

    is_compensating_action = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
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

    run = relationship(
        "SonnyAutomationRun",
        back_populates="actions",
    )
