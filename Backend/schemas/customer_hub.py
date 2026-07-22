from __future__ import annotations

import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


CustomerStatus = Literal["prospect", "active", "inactive", "archived"]
CustomerHealth = Literal[
    "excellent",
    "healthy",
    "attention",
    "at_risk",
    "critical",
]
OpportunityStage = Literal[
    "lead",
    "qualified",
    "proposal",
    "negotiation",
    "won",
    "lost",
]
TicketPriority = Literal["low", "medium", "high", "urgent"]
TicketStatus = Literal["open", "waiting", "resolved", "closed"]
CommunicationType = Literal[
    "email",
    "call",
    "meeting",
    "whatsapp",
    "teams",
    "sms",
    "note",
]


class CustomerCreate(BaseModel):
    company_id: str = Field(min_length=1)
    name: str = Field(min_length=1, max_length=255)
    industry: str | None = Field(default=None, max_length=120)
    website: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=320)
    owner: str | None = Field(default=None, max_length=255)
    status: CustomerStatus = "prospect"
    relationship_score: int = Field(default=50, ge=0, le=100)
    health: CustomerHealth = "healthy"
    tags: list[str] = []
    notes: str | None = None


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    industry: str | None = Field(default=None, max_length=120)
    website: str | None = Field(default=None, max_length=500)
    phone: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=320)
    owner: str | None = Field(default=None, max_length=255)
    status: CustomerStatus | None = None
    relationship_score: int | None = Field(default=None, ge=0, le=100)
    health: CustomerHealth | None = None
    tags: list[str] | None = None
    notes: str | None = None


class ContactCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=80)
    position: str | None = Field(default=None, max_length=160)
    is_primary: bool = False


class OpportunityCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    value: float = Field(default=0, ge=0)
    probability: int = Field(default=10, ge=0, le=100)
    stage: OpportunityStage = "lead"
    expected_close: datetime.date | None = None
    owner: str | None = Field(default=None, max_length=255)
    notes: str | None = None


class OpportunityUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    value: float | None = Field(default=None, ge=0)
    probability: int | None = Field(default=None, ge=0, le=100)
    stage: OpportunityStage | None = None
    expected_close: datetime.date | None = None
    owner: str | None = Field(default=None, max_length=255)
    notes: str | None = None


class CommunicationCreate(BaseModel):
    type: CommunicationType
    direction: Literal["inbound", "outbound", "internal"] = "outbound"
    subject: str | None = Field(default=None, max_length=255)
    message: str | None = None
    actor: str | None = Field(default=None, max_length=255)


class TicketCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    priority: TicketPriority = "medium"
    status: TicketStatus = "open"
    assigned_to: str | None = Field(default=None, max_length=255)


class TicketUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    priority: TicketPriority | None = None
    status: TicketStatus | None = None
    assigned_to: str | None = Field(default=None, max_length=255)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
