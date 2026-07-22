from __future__ import annotations

import datetime
import uuid

from sqlalchemy import (
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


class SonnyWorkflow(Base):
    __tablename__ = "sonny_workflows"
    __table_args__ = (
        UniqueConstraint(
            "decision_id",
            name="uq_sonny_workflow_decision",
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
        ForeignKey("sonny_decisions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    template_code = Column(
        String,
        nullable=False,
        index=True,
    )

    name = Column(
        String,
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    status = Column(
        String,
        nullable=False,
        default="draft",
        index=True,
    )

    progress_percent = Column(
        Integer,
        nullable=False,
        default=0,
    )

    current_step_order = Column(
        Integer,
        nullable=True,
    )

    started_at = Column(
        DateTime,
        nullable=True,
    )

    completed_at = Column(
        DateTime,
        nullable=True,
    )

    cancelled_at = Column(
        DateTime,
        nullable=True,
    )

    cancelled_by = Column(
        String,
        nullable=True,
    )

    result = Column(
        JSON,
        nullable=True,
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

    steps = relationship(
        "SonnyWorkflowStep",
        back_populates="workflow",
        cascade="all, delete-orphan",
        order_by="SonnyWorkflowStep.step_order",
    )


class SonnyWorkflowStep(Base):
    __tablename__ = "sonny_workflow_steps"
    __table_args__ = (
        UniqueConstraint(
            "workflow_id",
            "step_order",
            name="uq_sonny_workflow_step_order",
        ),
    )

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )

    workflow_id = Column(
        String,
        ForeignKey("sonny_workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    step_order = Column(
        Integer,
        nullable=False,
        index=True,
    )

    step_code = Column(
        String,
        nullable=False,
        index=True,
    )

    title = Column(
        String,
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    assigned_role = Column(
        String,
        nullable=False,
        default="founder",
        index=True,
    )

    status = Column(
        String,
        nullable=False,
        default="pending",
        index=True,
    )

    started_at = Column(
        DateTime,
        nullable=True,
    )

    completed_at = Column(
        DateTime,
        nullable=True,
    )

    completed_by = Column(
        String,
        nullable=True,
    )

    output = Column(
        JSON,
        nullable=True,
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

    workflow = relationship(
        "SonnyWorkflow",
        back_populates="steps",
    )
