from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from database import Base


class SonnyPlan(Base):
    __tablename__ = "sonny_plans"
    __table_args__ = (
        UniqueConstraint("company_id", "plan_date", "plan_type", name="uq_sonny_plan_company_date_type"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_date = Column(Date, nullable=False, index=True)
    plan_type = Column(String, nullable=False, default="daily", index=True)
    title = Column(String, nullable=False)
    executive_brief = Column(Text, nullable=False)
    health_score = Column(Integer, nullable=False, default=0, index=True)
    status = Column(String, nullable=False, default="active", index=True)
    critical_count = Column(Integer, nullable=False, default=0)
    high_count = Column(Integer, nullable=False, default=0)
    approval_count = Column(Integer, nullable=False, default=0)
    running_workflow_count = Column(Integer, nullable=False, default=0)
    blocked_workflow_count = Column(Integer, nullable=False, default=0)
    state_version = Column(String, nullable=False, default="b1.1")
    source_snapshot = Column(JSON, nullable=False, default=dict)
    generated_by = Column(String, nullable=False, default="sonny")
    generated_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, index=True)

    items = relationship(
        "SonnyPlanItem",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="SonnyPlanItem.sort_order",
    )


class SonnyPlanItem(Base):
    __tablename__ = "sonny_plan_items"
    __table_args__ = (
        UniqueConstraint("plan_id", "fingerprint", name="uq_sonny_plan_item_fingerprint"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    plan_id = Column(String, ForeignKey("sonny_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(String, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    fingerprint = Column(String, nullable=False, index=True)
    item_code = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=True)
    priority = Column(String, nullable=False, default="medium", index=True)
    priority_score = Column(Integer, nullable=False, default=50, index=True)
    status = Column(String, nullable=False, default="planned", index=True)
    assigned_role = Column(String, nullable=True, index=True)
    requires_founder_approval = Column(Integer, nullable=False, default=0)
    decision_id = Column(String, ForeignKey("sonny_decisions.id", ondelete="SET NULL"), nullable=True, index=True)
    workflow_id = Column(String, ForeignKey("sonny_workflows.id", ondelete="SET NULL"), nullable=True, index=True)
    task_id = Column(String, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    support_ticket_id = Column(String, ForeignKey("support_tickets.id", ondelete="SET NULL"), nullable=True, index=True)
    scheduled_for = Column(DateTime, nullable=True, index=True)
    due_at = Column(DateTime, nullable=True, index=True)
    source_type = Column(String, nullable=False, default="sonny_planner", index=True)
    source_id = Column(String, nullable=True, index=True)
    evidence = Column(JSON, nullable=False, default=dict)
    sort_order = Column(Integer, nullable=False, default=0, index=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, index=True)

    plan = relationship("SonnyPlan", back_populates="items")
