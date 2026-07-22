from typing import Any
from pydantic import BaseModel, Field


class UsageLedgerCreate(BaseModel):
    company_id: str
    service: str
    category: str
    resource: str | None = None
    action: str
    quantity: float = Field(default=1.0, ge=0)
    unit: str = "unit"
    unit_price: float = Field(default=0.0, ge=0)
    currency: str = "USD"
    tax_rate: float = Field(default=0.0, ge=0)
    status: str = "unbilled"
    invoice_month: str | None = None
    source_type: str | None = None
    source_id: str | None = None
    metadata: dict[str, Any] | None = None
