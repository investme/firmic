from __future__ import annotations

import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    description: str | None = None
    monthly_price: float
    yearly_price: float | None = None
    max_ai_employees: int
    max_users: int
    active: bool


class ServiceCatalogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    category: str
    name: str
    description: str | None = None
    monthly_price: float
    yearly_price: float | None = None
    setup_fee: float
    starter_available: bool
    business_available: bool
    enterprise_available: bool
    active: bool
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class SubscriptionItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subscription_id: str
    service_id: str
    quantity: int
    unit_price: float
    monthly_price: float
    status: str
    billing_behavior: str
    provisioned: bool
    activated_at: datetime.datetime | None = None
    cancelled_at: datetime.datetime | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime.datetime
    updated_at: datetime.datetime
    service: ServiceCatalogResponse


class SubscriptionEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subscription_id: str
    event_type: str
    actor: str | None = None
    title: str
    description: str | None = None
    old_value: dict[str, Any] | None = None
    new_value: dict[str, Any] | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime.datetime


class CompanySubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_id: str
    plan_id: str
    status: str
    billing_cycle: str
    currency: str
    monthly_subtotal: float
    discount_total: float
    tax_total: float
    monthly_total: float
    launch_activation_fee: float
    next_invoice_date: datetime.datetime | None = None
    trial_ends_at: datetime.datetime | None = None
    started_at: datetime.datetime
    cancel_at_period_end: bool
    cancelled_at: datetime.datetime | None = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    plan: PlanResponse
    items: list[SubscriptionItemResponse] = Field(default_factory=list)
    events: list[SubscriptionEventResponse] = Field(default_factory=list)


class SubscriptionCreateRequest(BaseModel):
    company_id: str
    plan_code: str
    billing_cycle: str = "monthly"


class SubscriptionActivateRequest(BaseModel):
    company_id: str


class SubscriptionPlanChangeRequest(BaseModel):
    plan_code: str


class SubscriptionServiceAddRequest(BaseModel):
    service_code: str
    quantity: int = Field(default=1, ge=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SubscriptionPreviewRequest(BaseModel):
    plan_code: str
    service_codes: list[str] = Field(default_factory=list)


class SubscriptionPreviewItem(BaseModel):
    service_code: str
    service_name: str
    quantity: int
    unit_price: float
    monthly_price: float
    included_by_plan: bool


class SubscriptionPreviewResponse(BaseModel):
    plan_code: str
    plan_name: str
    plan_monthly_price: float
    launch_activation_fee: float
    items: list[SubscriptionPreviewItem]
    monthly_subtotal: float
    tax_total: float
    monthly_total: float
    due_today: float