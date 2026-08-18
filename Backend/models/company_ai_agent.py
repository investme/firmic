from sqlalchemy import Column, DateTime, Float, ForeignKey, String, UniqueConstraint
from database import Base
import datetime
import uuid


class CompanyAIAgent(Base):
    __tablename__ = "company_ai_agents"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "agent_name",
            name="uq_company_ai_agent",
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
    registry_agent_id = Column(
        String,
        ForeignKey("sonny_agent_registry.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    agent_name = Column(String, nullable=False, index=True)
    monthly_price_usd = Column(Float, nullable=False, default=0.0)
    status = Column(String, nullable=False, default="active", index=True)
    activated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
    )
    deactivated_at = Column(DateTime, nullable=True)
    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )
