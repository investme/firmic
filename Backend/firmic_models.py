from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Office(Base):
    __tablename__ = "offices"

    id = Column(Integer, primary_key=True, index=True)
    office_code = Column(String, unique=True, index=True, nullable=False)  # A047
    location = Column(String, default="Business Bay, Dubai, UAE")
    status = Column(String, default="available")  # available, rented
    monthly_price_usd = Column(Float, default=99.0)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    office_id = Column(Integer, ForeignKey("offices.id"))

    hookup_fee_usd = Column(Float, default=49.0)
    monthly_total_usd = Column(Float, default=0.0)
    monthly_total_aed = Column(Float, default=0.0)

    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)


class Addon(Base):
    __tablename__ = "addons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, nullable=False)
    monthly_price_usd = Column(Float, nullable=False)
    active = Column(Boolean, default=True)


class SubscriptionAddon(Base):
    __tablename__ = "subscription_addons"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"))
    addon_id = Column(Integer, ForeignKey("addons.id"))
    enabled = Column(Boolean, default=True)


class AIAgent(Base):
    __tablename__ = "ai_agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    monthly_price_usd = Column(Float, nullable=False)
    description = Column(String)


class SubscriptionAgent(Base):
    __tablename__ = "subscription_agents"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"))
    agent_id = Column(Integer, ForeignKey("ai_agents.id"))
    enabled = Column(Boolean, default=True)


class MailItem(Base):
    __tablename__ = "mail_items"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"))
    item_type = Column(String)  # letter, package
    sender = Column(String)
    status = Column(String, default="received")
    created_at = Column(DateTime, default=datetime.utcnow)


class VoipCall(Base):
    __tablename__ = "voip_calls"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"))
    caller_number = Column(String)
    handled_by = Column(String)
    status = Column(String)
    duration_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class MeetingRoom(Base):
    __tablename__ = "meeting_rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    capacity = Column(Integer)
    zoom_enabled = Column(Boolean, default=True)
    hourly_price_usd = Column(Float)


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"))
    amount_usd = Column(Float)
    amount_aed = Column(Float)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)