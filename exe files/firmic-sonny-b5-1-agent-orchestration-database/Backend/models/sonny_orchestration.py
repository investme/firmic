from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from database import Base


class SonnyAgentRegistry(Base):
    __tablename__ = "sonny_agent_registry"
    __table_args__ = (UniqueConstraint("agent_code", name="uq_sonny_agent_registry_code"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    agent_code = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="active", index=True)
    agent_type = Column(String, nullable=False, default="specialist", index=True)
    capabilities = Column(JSON, nullable=False, default=list)
    allowed_action_codes = Column(JSON, nullable=False, default=list)
    approval_policy = Column(JSON, nullable=False, default=dict)
    configuration = Column(JSON, nullable=False, default=dict)
    system_managed = Column(Boolean, nullable=False, default=True, index=True)
    version = Column(String, nullable=False, default="b5.1")
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, index=True)

    assignments = relationship("SonnyAgentAssignment", back_populates="agent")


class SonnyOrchestrationRun(Base):
    __tablename__ = "sonny_orchestration_runs"
    __table_args__ = (
        UniqueConstraint("company_id", "idempotency_key", name="uq_sonny_orchestration_company_idempotency"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    decision_id = Column(String, ForeignKey("sonny_decisions.id", ondelete="SET NULL"), nullable=True, index=True)
    workflow_id = Column(String, ForeignKey("sonny_workflows.id", ondelete="SET NULL"), nullable=True, index=True)
    automation_run_id = Column(String, ForeignKey("sonny_automation_runs.id", ondelete="SET NULL"), nullable=True, index=True)
    orchestration_type = Column(String, nullable=False, index=True)
    trigger_type = Column(String, nullable=False, default="manual", index=True)
    idempotency_key = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="draft", index=True)
    approval_required = Column(Boolean, nullable=False, default=True, index=True)
    approved_by = Column(String, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    coordinator_agent_code = Column(String, nullable=False, default="sonny", index=True)
    started_at = Column(DateTime, nullable=True, index=True)
    completed_at = Column(DateTime, nullable=True, index=True)
    failed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    max_retries = Column(Integer, nullable=False, default=3)
    input_payload = Column(JSON, nullable=False, default=dict)
    output_payload = Column(JSON, nullable=False, default=dict)
    orchestration_metadata = Column(JSON, nullable=False, default=dict)
    error_message = Column(Text, nullable=True)
    created_by = Column(String, nullable=False, default="sonny")
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, index=True)

    assignments = relationship(
        "SonnyAgentAssignment",
        back_populates="orchestration_run",
        cascade="all, delete-orphan",
        order_by="SonnyAgentAssignment.assigned_at",
    )


class SonnyAgentAssignment(Base):
    __tablename__ = "sonny_agent_assignments"
    __table_args__ = (
        UniqueConstraint("company_id", "idempotency_key", name="uq_sonny_agent_assignment_company_idempotency"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_id = Column(String, ForeignKey("sonny_agent_registry.id", ondelete="RESTRICT"), nullable=False, index=True)
    orchestration_run_id = Column(String, ForeignKey("sonny_orchestration_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    automation_run_id = Column(String, ForeignKey("sonny_automation_runs.id", ondelete="SET NULL"), nullable=True, index=True)
    automation_action_id = Column(String, ForeignKey("sonny_automation_actions.id", ondelete="SET NULL"), nullable=True, index=True)
    workflow_id = Column(String, ForeignKey("sonny_workflows.id", ondelete="SET NULL"), nullable=True, index=True)
    workflow_step_id = Column(String, ForeignKey("sonny_workflow_steps.id", ondelete="SET NULL"), nullable=True, index=True)
    assignment_code = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    instructions = Column(Text, nullable=False)
    required_capability = Column(String, nullable=False, index=True)
    idempotency_key = Column(String, nullable=False, index=True)
    priority = Column(String, nullable=False, default="medium", index=True)
    status = Column(String, nullable=False, default="pending", index=True)
    approval_required = Column(Boolean, nullable=False, default=True, index=True)
    approved_by = Column(String, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    assigned_by = Column(String, nullable=False, default="sonny")
    assigned_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
    accepted_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True, index=True)
    completed_at = Column(DateTime, nullable=True, index=True)
    failed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    due_at = Column(DateTime, nullable=True, index=True)
    attempt_count = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=3)
    confidence = Column(Float, nullable=False, default=1.0)
    input_payload = Column(JSON, nullable=False, default=dict)
    result_payload = Column(JSON, nullable=False, default=dict)
    error_message = Column(Text, nullable=True)
    assignment_metadata = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, index=True)

    agent = relationship("SonnyAgentRegistry", back_populates="assignments")
    orchestration_run = relationship("SonnyOrchestrationRun", back_populates="assignments")
    messages = relationship(
        "SonnyAgentMessage",
        back_populates="assignment",
        cascade="all, delete-orphan",
        order_by="SonnyAgentMessage.created_at",
    )


class SonnyAgentMessage(Base):
    __tablename__ = "sonny_agent_messages"
    __table_args__ = (
        UniqueConstraint("assignment_id", "idempotency_key", name="uq_sonny_agent_message_assignment_idempotency"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    assignment_id = Column(String, ForeignKey("sonny_agent_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_agent_code = Column(String, nullable=False, index=True)
    recipient_agent_code = Column(String, nullable=False, index=True)
    message_type = Column(String, nullable=False, default="status_update", index=True)
    idempotency_key = Column(String, nullable=False, index=True)
    subject = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    message_data = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)

    assignment = relationship("SonnyAgentAssignment", back_populates="messages")
