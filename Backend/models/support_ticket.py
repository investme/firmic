from __future__ import annotations

import datetime
import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )

    company_id = Column(
        String,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_by_user_id = Column(
        String,
        nullable=False,
        index=True,
    )

    assigned_admin_id = Column(
        String,
        nullable=True,
        index=True,
    )

    subject = Column(
        String,
        nullable=False,
        index=True,
    )

    category = Column(
        String,
        nullable=False,
        default="general",
        index=True,
    )

    priority = Column(
        String,
        nullable=False,
        default="normal",
        index=True,
    )

    status = Column(
        String,
        nullable=False,
        default="open",
        index=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        index=True,
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        index=True,
    )

    resolved_at = Column(
        DateTime,
        nullable=True,
        index=True,
    )

    messages = relationship(
        "SupportMessage",
        back_populates="ticket",
        cascade="all, delete-orphan",
        order_by="SupportMessage.created_at",
    )


class SupportMessage(Base):
    __tablename__ = "support_messages"

    id = Column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )

    ticket_id = Column(
        String,
        ForeignKey(
            "support_tickets.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    sender_type = Column(
        String,
        nullable=False,
        index=True,
    )

    sender_id = Column(
        String,
        nullable=False,
        index=True,
    )

    message = Column(
        Text,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        index=True,
    )

    ticket = relationship(
        "SupportTicket",
        back_populates="messages",
    )
