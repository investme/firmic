from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class SonnyKnowledgeUpdate(BaseModel):
    company_summary: str | None = Field(default=None, max_length=20000)
    mission: str | None = Field(default=None, max_length=10000)
    vision: str | None = Field(default=None, max_length=10000)
    industry: str | None = Field(default=None, max_length=255)
    products: str | None = Field(default=None, max_length=30000)
    services: str | None = Field(default=None, max_length=30000)
    pricing: str | None = Field(default=None, max_length=30000)
    communication_style: str | None = Field(default=None, max_length=10000)
    sales_pitch: str | None = Field(default=None, max_length=20000)
    founder_notes: str | None = Field(default=None, max_length=30000)
    company_rules: str | None = Field(default=None, max_length=30000)
    operating_procedures: str | None = Field(default=None, max_length=50000)
    faq: str | None = Field(default=None, max_length=50000)


class SonnyKnowledgeImportRequest(BaseModel):
    raw_text: str = Field(min_length=1, max_length=200000)
    replace_existing_import: bool = False


class SonnyKnowledgeResponse(SonnyKnowledgeUpdate):
    id: str
    company_id: str
    imported_source_text: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
