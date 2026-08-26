from __future__ import annotations

import datetime
import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    JSON,
    String,
)

from database import Base


class SonnyActionConfirmation(Base):
    __tablename__ = "sonny_action_confirmations"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )

    company_id = Column(
        String,
        ForeignKey(
            "companies.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    actor_id = Column(
        String,
        nullable=False,
        index=True,
    )

    action = Column(
        String,
        nullable=False,
        index=True,
    )

    action_fingerprint = Column(
        String,
        nullable=False,
        index=True,
    )

    plan = Column(
        JSON,
        nullable=False,
    )

    status = Column(
        String,
        nullable=False,
        default="pending",
        index=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        index=True,
    )

    expires_at = Column(
        DateTime,
        nullable=False,
        index=True,
    )

    consumed_at = Column(
        DateTime,
        nullable=True,
        index=True,
    )
