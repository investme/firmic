import datetime
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class LaunchApplication(Base):
    """
    Represents a founder's company-launch journey.

    A LaunchApplication belongs to one authenticated user and may be linked
    to an existing Firmic Company workspace.
    """

    __tablename__ = "launch_applications"

    id = Column(
        String,
        primary_key=True,
        index=True,
        default=generate_uuid,
    )

    user_id = Column(
        String,
        nullable=False,
        index=True,
    )

    company_id = Column(
        String,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    status = Column(
        String,
        nullable=False,
        default="in_progress",
        index=True,
    )

    country = Column(
        String,
        nullable=False,
        default="United Arab Emirates",
    )

    jurisdiction = Column(
        String,
        nullable=True,
        index=True,
    )

    business_activity = Column(
        String,
        nullable=True,
    )

    business_description = Column(
        Text,
        nullable=True,
    )

    formation_partner_id = Column(
        String,
        ForeignKey("formation_partners.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    bank_partner_id = Column(
        String,
        ForeignKey("bank_partners.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    formation_status = Column(
        String,
        nullable=False,
        default="not_started",
        index=True,
    )

    banking_status = Column(
        String,
        nullable=False,
        default="not_started",
        index=True,
    )

    office_status = Column(
        String,
        nullable=False,
        default="not_started",
        index=True,
    )

    workspace_status = Column(
        String,
        nullable=False,
        default="initiated",
        index=True,
    )

    estimated_completion_at = Column(
        DateTime,
        nullable=True,
    )

    completed_at = Column(
        DateTime,
        nullable=True,
    )

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

    company = relationship(
        "Company",
        passive_deletes=True,
    )

    formation_partner = relationship(
        "FormationPartner",
        back_populates="launch_applications",
    )

    bank_partner = relationship(
        "BankPartner",
        back_populates="launch_applications",
    )

    milestones = relationship(
        "LaunchMilestone",
        back_populates="launch_application",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="LaunchMilestone.position",
    )


class LaunchMilestone(Base):
    """
    Tracks each stage of a launch application.

    Example milestones:
    - company_profile
    - jurisdiction
    - formation_partner
    - licensing
    - banking
    - virtual_office
    - workspace_activation
    """

    __tablename__ = "launch_milestones"

    id = Column(
        String,
        primary_key=True,
        index=True,
        default=generate_uuid,
    )

    launch_application_id = Column(
        String,
        ForeignKey(
            "launch_applications.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    key = Column(
        String,
        nullable=False,
        index=True,
    )

    title = Column(
        String,
        nullable=False,
    )

    status = Column(
        String,
        nullable=False,
        default="not_started",
        index=True,
    )

    position = Column(
        Float,
        nullable=False,
        default=0,
    )

    notes = Column(
        Text,
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

    launch_application = relationship(
        "LaunchApplication",
        back_populates="milestones",
    )


class FormationPartner(Base):
    """
    Trusted company-formation provider.

    Firmic coordinates requests through partners but does not represent
    itself as the government authority or licensed formation provider.
    """

    __tablename__ = "formation_partners"

    id = Column(
        String,
        primary_key=True,
        index=True,
        default=generate_uuid,
    )

    name = Column(
        String,
        nullable=False,
        unique=True,
        index=True,
    )

    country = Column(
        String,
        nullable=False,
        index=True,
    )

    jurisdiction = Column(
        String,
        nullable=True,
        index=True,
    )

    description = Column(
        Text,
        nullable=True,
    )

    website = Column(
        String,
        nullable=True,
    )

    logo_url = Column(
        String,
        nullable=True,
    )

    contact_email = Column(
        String,
        nullable=True,
    )

    contact_phone = Column(
        String,
        nullable=True,
    )

    languages = Column(
        String,
        nullable=True,
    )

    services = Column(
        Text,
        nullable=True,
    )

    starting_price_usd = Column(
        Float,
        nullable=True,
    )

    average_completion_days = Column(
        Float,
        nullable=True,
    )

    rating = Column(
        Float,
        nullable=True,
    )

    is_verified = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

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

    launch_applications = relationship(
        "LaunchApplication",
        back_populates="formation_partner",
    )


class BankPartner(Base):
    """
    Corporate banking or fintech introduction partner.

    A banking request is an introduction or application-assistance workflow.
    Firmic does not guarantee account approval.
    """

    __tablename__ = "bank_partners"

    id = Column(
        String,
        primary_key=True,
        index=True,
        default=generate_uuid,
    )

    name = Column(
        String,
        nullable=False,
        unique=True,
        index=True,
    )

    country = Column(
        String,
        nullable=False,
        index=True,
    )

    description = Column(
        Text,
        nullable=True,
    )

    website = Column(
        String,
        nullable=True,
    )

    logo_url = Column(
        String,
        nullable=True,
    )

    contact_email = Column(
        String,
        nullable=True,
    )

    supported_company_types = Column(
        Text,
        nullable=True,
    )

    requirements = Column(
        Text,
        nullable=True,
    )

    minimum_balance_usd = Column(
        Float,
        nullable=True,
    )

    average_review_days = Column(
        Float,
        nullable=True,
    )

    supports_remote_onboarding = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    is_verified = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

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

    launch_applications = relationship(
        "LaunchApplication",
        back_populates="bank_partner",
    )