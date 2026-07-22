from typing import Any
from pydantic import BaseModel


class ActivityLogCreate(BaseModel):
    company_id: str
    event_type: str
    title: str
    description: str | None = None
    actor_type: str = "system"
    actor_id: str | None = None
    source_type: str | None = None
    source_id: str | None = None
    metadata: dict[str, Any] | None = None
