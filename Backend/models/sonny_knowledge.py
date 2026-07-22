from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UniqueConstraint

from database import Base


class SonnyCompanyKnowledge(Base):
    """One editable knowledge profile for each Firmic company."""

    __tablename__ = "sonny_company_knowledge"
    __table_args__ = (
        UniqueConstraint(
            "company_id",
            name="uq_sonny_company_knowledge_company_id",
        ),
    )

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    company_id = Column(
        String,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    company_summary = Column(Text, nullable=True)
    mission = Column(Text, nullable=True)
    vision = Column(Text, nullable=True)
    industry = Column(String, nullable=True)
    products = Column(Text, nullable=True)
    services = Column(Text, nullable=True)
    pricing = Column(Text, nullable=True)
    communication_style = Column(Text, nullable=True)
    sales_pitch = Column(Text, nullable=True)
    founder_notes = Column(Text, nullable=True)
    company_rules = Column(Text, nullable=True)
    operating_procedures = Column(Text, nullable=True)
    faq = Column(Text, nullable=True)
    imported_source_text = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        nullable=False,
    )
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )
