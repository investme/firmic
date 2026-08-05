from __future__ import annotations

import datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text

from database import Base


class CompanyLaunch(Base):
    """
    Single source of truth for a company's Firmic launch lifecycle.

    One CompanyLaunch record exists per company. Requirement states are
    persisted individually, while progress and the next step are calculated
    later by the Launch Engine service.

    Operational services must remain unavailable until:
    - all mandatory compliance requirements are fulfilled,
    - Firmic Admin approves the compliance package, and
    - infrastructure provisioning completes.
    """

    __tablename__ = "company_launches"

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
        unique=True,
        index=True,
    )

    # Overall launch lifecycle:
    # draft
    # pending_compliance
    # under_review
    # provisioning
    # active
    # suspended
    status = Column(
        String,
        nullable=False,
        default="pending_compliance",
        index=True,
    )

    # Company foundation
    company_profile_completed = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    subscription_completed = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    # Headquarters lifecycle:
    # not_selected
    # reserved
    # awaiting_compliance
    # provisioning
    # active
    # suspended
    office_status = Column(
        String,
        nullable=False,
        default="not_selected",
        index=True,
    )

    office_reserved = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    # Core company compliance documents
    trade_license_required = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    trade_license_uploaded = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    trade_license_approved = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    certificate_of_incorporation_required = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    certificate_of_incorporation_uploaded = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    certificate_of_incorporation_approved = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    beneficial_owner_declaration_required = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    beneficial_owner_declaration_uploaded = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    beneficial_owner_declaration_approved = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    # Tenant identity and KYC
    passport_required = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    passport_uploaded = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    passport_approved = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    proof_of_address_required = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    proof_of_address_uploaded = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    proof_of_address_approved = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    # Administrative review
    compliance_submitted = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    admin_approved = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    admin_approved_by = Column(
        String,
        nullable=True,
        index=True,
    )

    admin_approved_at = Column(
        DateTime,
        nullable=True,
    )

    rejection_reason = Column(
        Text,
        nullable=True,
    )

    # Provisioning gates
    headquarters_provisioned = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    mailbox_provisioned = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    voip_provisioned = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    ai_workforce_provisioned = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    workspace_provisioned = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    infrastructure_provisioned = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    # Activation and suspension
    activated_at = Column(
        DateTime,
        nullable=True,
    )

    suspended_at = Column(
        DateTime,
        nullable=True,
    )

    suspension_reason = Column(
        Text,
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
    )