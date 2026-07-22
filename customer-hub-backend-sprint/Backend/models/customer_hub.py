from __future__ import annotations

import datetime
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


def utcnow():
    return datetime.datetime.utcnow()


def uuid4_string():
    return str(uuid.uuid4())


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, default=uuid4_string, index=True)
    company_id = Column(String, nullable=False, index=True)

    name = Column(String(255), nullable=False, index=True)
    industry = Column(String(120), nullable=True, index=True)
    website = Column(String(500), nullable=True)
    phone = Column(String(80), nullable=True)
    email = Column(String(320), nullable=True, index=True)
    owner = Column(String(255), nullable=True, index=True)

    status = Column(String(40), nullable=False, default="prospect", index=True)
    relationship_score = Column(Integer, nullable=False, default=50)
    health = Column(String(40), nullable=False, default="healthy", index=True)
    tags = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )

    contacts = relationship(
        "CustomerContact",
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    opportunities = relationship(
        "CustomerOpportunity",
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    communications = relationship(
        "CustomerCommunication",
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    support_tickets = relationship(
        "CustomerSupportTicket",
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    activities = relationship(
        "CustomerActivity",
        back_populates="customer",
        cascade="all, delete-orphan",
    )


class CustomerContact(Base):
    __tablename__ = "customer_contacts"

    id = Column(String, primary_key=True, default=uuid4_string, index=True)
    customer_id = Column(
        String,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    first_name = Column(String(120), nullable=False)
    last_name = Column(String(120), nullable=True)
    email = Column(String(320), nullable=True, index=True)
    phone = Column(String(80), nullable=True)
    position = Column(String(160), nullable=True)
    is_primary = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )

    customer = relationship("Customer", back_populates="contacts")


class CustomerOpportunity(Base):
    __tablename__ = "customer_opportunities"

    id = Column(String, primary_key=True, default=uuid4_string, index=True)
    customer_id = Column(
        String,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(255), nullable=False)
    value = Column(Float, nullable=False, default=0.0)
    probability = Column(Integer, nullable=False, default=10)
    stage = Column(String(40), nullable=False, default="lead", index=True)
    expected_close = Column(Date, nullable=True, index=True)
    owner = Column(String(255), nullable=True, index=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )

    customer = relationship("Customer", back_populates="opportunities")


class CustomerCommunication(Base):
    __tablename__ = "customer_communications"

    id = Column(String, primary_key=True, default=uuid4_string, index=True)
    customer_id = Column(
        String,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    type = Column(String(40), nullable=False, index=True)
    direction = Column(String(20), nullable=False, default="outbound")
    subject = Column(String(255), nullable=True)
    message = Column(Text, nullable=True)
    actor = Column(String(255), nullable=True)

    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)

    customer = relationship("Customer", back_populates="communications")


class CustomerSupportTicket(Base):
    __tablename__ = "customer_support_tickets"

    id = Column(String, primary_key=True, default=uuid4_string, index=True)
    customer_id = Column(
        String,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(30), nullable=False, default="medium", index=True)
    status = Column(String(30), nullable=False, default="open", index=True)
    assigned_to = Column(String(255), nullable=True, index=True)

    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)
    updated_at = Column(
        DateTime,
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )

    customer = relationship("Customer", back_populates="support_tickets")


class CustomerActivity(Base):
    __tablename__ = "customer_activities"

    id = Column(String, primary_key=True, default=uuid4_string, index=True)
    customer_id = Column(
        String,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company_id = Column(String, nullable=False, index=True)

    event_type = Column(String(80), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    actor_type = Column(String(50), nullable=True)
    actor_name = Column(String(255), nullable=True)
    source_type = Column(String(80), nullable=True)
    source_id = Column(String, nullable=True)

    created_at = Column(DateTime, nullable=False, default=utcnow, index=True)

    customer = relationship("Customer", back_populates="activities")
