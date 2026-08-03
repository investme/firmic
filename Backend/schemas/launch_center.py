from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


LaunchStatus = Literal[
    "in_progress",
    "waiting_on_customer",
    "waiting_on_partner",
    "government_processing",
    "approved",
    "rejected",
    "completed",
    "cancelled",
]

MilestoneStatus = Literal[
    "not_started",
    "information_required",
    "in_progress",
    "submitted_to_partner",
    "partner_reviewing",
    "government_processing",
    "approved",
    "rejected",
    "completed",
    "blocked",
]

PartnerRequestStatus = Literal[
    "not_started",
    "information_required",
    "submitted_to_partner",
    "partner_reviewing",
    "government_processing",
    "approved",
    "rejected",
    "completed",
]


class LaunchApplicationCreate(BaseModel):
    company_id: str = Field(min_length=1)
    country: str = Field(default="United Arab Emirates", min_length=2)
    jurisdiction: str | None = None
    business_activity: str | None = None
    business_description: str | None = None


class LaunchApplicationUpdate(BaseModel):
    country: str | None = None
    jurisdiction: str | None = None
    business_activity: str | None = None
    business_description: str | None = None
    formation_partner_id: str | None = None
    bank_partner_id: str | None = None
    formation_status: PartnerRequestStatus | None = None
    banking_status: PartnerRequestStatus | None = None
    office_status: MilestoneStatus | None = None
    workspace_status: MilestoneStatus | None = None
    status: LaunchStatus | None = None
    estimated_completion_at: datetime | None = None


class LaunchMilestoneUpdate(BaseModel):
    status: MilestoneStatus
    notes: str | None = None


class FormationPartnerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    country: str
    jurisdiction: str | None
    description: str | None
    website: str | None
    logo_url: str | None
    languages: str | None
    services: str | None
    starting_price_usd: float | None
    average_completion_days: float | None
    rating: float | None
    is_verified: bool
    is_active: bool


class BankPartnerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    country: str
    description: str | None
    website: str | None
    logo_url: str | None
    supported_company_types: str | None
    requirements: str | None
    minimum_balance_usd: float | None
    average_review_days: float | None
    supports_remote_onboarding: bool
    is_verified: bool
    is_active: bool


class LaunchMilestoneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    key: str
    title: str
    status: str
    position: float
    notes: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class LaunchApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    company_id: str
    status: str
    country: str
    jurisdiction: str | None
    business_activity: str | None
    business_description: str | None
    formation_status: str
    banking_status: str
    office_status: str
    workspace_status: str
    estimated_completion_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    formation_partner: FormationPartnerResponse | None = None
    bank_partner: BankPartnerResponse | None = None
    milestones: list[LaunchMilestoneResponse] = Field(
    default_factory=list
)