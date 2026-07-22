from __future__ import annotations

from typing import Any
from sqlalchemy.orm import Session
from models.activity_log import ActivityLog


def record_activity(
    db: Session,
    *,
    company_id: str,
    event_type: str,
    title: str,
    description: str | None = None,
    actor_type: str = "system",
    actor_id: str | None = None,
    source_type: str | None = None,
    source_id: str | None = None,
    metadata: dict[str, Any] | None = None,
    commit: bool = True,
) -> ActivityLog:
    event = ActivityLog(
        company_id=company_id,
        event_type=event_type,
        title=title,
        description=description,
        actor_type=actor_type,
        actor_id=actor_id,
        source_type=source_type,
        source_id=source_id,
        event_metadata=metadata,
    )

    db.add(event)

    if commit:
        db.commit()
        db.refresh(event)

    return event


def serialize_activity(event: ActivityLog) -> dict:
    return {
        "id": event.id,
        "company_id": event.company_id,
        "event_type": event.event_type,
        "title": event.title,
        "description": event.description,
        "actor_type": event.actor_type,
        "actor_id": event.actor_id,
        "source_type": event.source_type,
        "source_id": event.source_id,
        "metadata": event.event_metadata,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }
