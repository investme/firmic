from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class PaymentCreateRequest(BaseModel):
    company_id: str
    idempotency_key: str | None = None


class PaymentResponse(BaseModel):
    id: str
    company_id: str
    subscription_id: str

    provider: str
    provider_session_id: str | None = None
    provider_payment_intent_id: str | None = None

    status: str

    amount: float
    currency: str

    verified_at: datetime | None = None
    failed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    payment_metadata: dict | None = None

    model_config = {
        "from_attributes": True,
    }


class CheckoutSessionResponse(BaseModel):
    payment_id: str
    payment_status: str
    provider: str
    provider_session_id: str
    checkout_url: str
