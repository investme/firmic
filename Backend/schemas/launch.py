from __future__ import annotations

import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


LaunchStatus = Literal[
    "draft",
    "pending_compliance",
    "under_review",
    "provisioning",
    "active",
    "suspended",
]

OfficeStatus = Literal[
    "not_selected",
    "reserved",
    "awaiting_compliance",
    "provisioning",
    "active",
    "suspended",
]

RequirementStatus = Literal[
    "not_required",
    "required",
    "uploaded",
    "approved",
]


class LaunchRequirementResponse(BaseModel):
    key: str
    label: str
    category: str

    required: bool
    uploaded: bool
    approved: bool

    status: RequirementStatus

    blocking: bool = True
    action_label: str | None = None
    action_href: str | None = None


class LaunchSummaryResponse(BaseModel):
    company_id: str

    status: LaunchStatus
    office_status: OfficeStatus

    progress_percent: float = Field(
        ge=0,
        le=100,
    )

    completed_requirements: int = Field(
        ge=0,
    )

    total_requirements: int = Field(
        ge=0,
    )

    next_step: str | None = None
    next_action_label: str | None = None
    next_action_href: str | None = None

    compliance_ready: bool
    provisioning_ready: bool
    launch_ready: bool

    requirements: list[LaunchRequirementResponse]

    rejection_reason: str | None = None
    suspension_reason: str | None = None

    activated_at: datetime.datetime | None = None
    suspended_at: datetime.datetime | None = None

    created_at: datetime.datetime
    updated_at: datetime.datetime


class LaunchRequirementUpdate(BaseModel):
    uploaded: bool | None = None
    approved: bool | None = None


class LaunchOfficeStatusUpdate(BaseModel):
    office_status: OfficeStatus


class LaunchStatusUpdate(BaseModel):
    status: LaunchStatus
    reason: str | None = Field(
        default=None,
        max_length=2000,
    )


class LaunchAdminReviewRequest(BaseModel):
    approved: bool

    reviewer_id: str | None = None

    rejection_reason: str | None = Field(
        default=None,
        max_length=2000,
    )


class LaunchProvisioningUpdate(BaseModel):
    headquarters_provisioned: bool | None = None
    mailbox_provisioned: bool | None = None
    voip_provisioned: bool | None = None
    ai_workforce_provisioned: bool | None = None
    workspace_provisioned: bool | None = None


class LaunchRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_id: str

    status: str
    office_status: str

    company_profile_completed: bool
    subscription_completed: bool
    office_reserved: bool

    trade_license_required: bool
    trade_license_uploaded: bool
    trade_license_approved: bool

    certificate_of_incorporation_required: bool
    certificate_of_incorporation_uploaded: bool
    certificate_of_incorporation_approved: bool

    beneficial_owner_declaration_required: bool
    beneficial_owner_declaration_uploaded: bool
    beneficial_owner_declaration_approved: bool

    passport_required: bool
    passport_uploaded: bool
    passport_approved: bool

    proof_of_address_required: bool
    proof_of_address_uploaded: bool
    proof_of_address_approved: bool

    compliance_submitted: bool
    admin_approved: bool
    admin_approved_by: str | None = None
    admin_approved_at: datetime.datetime | None = None
    rejection_reason: str | None = None

    headquarters_provisioned: bool
    mailbox_provisioned: bool
    voip_provisioned: bool
    ai_workforce_provisioned: bool
    workspace_provisioned: bool
    infrastructure_provisioned: bool

    activated_at: datetime.datetime | None = None
    suspended_at: datetime.datetime | None = None
    suspension_reason: str | None = None

    created_at: datetime.datetime
    updated_at: datetime.datetime