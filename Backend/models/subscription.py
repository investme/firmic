import datetime
from enum import Enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)

from sqlalchemy.orm import relationship

from database import Base


# ============================================================
# ENUMS
# ============================================================


class SubscriptionStatus(str, Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class BillingCycle(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


class ItemStatus(str, Enum):
    PENDING = "pending"
    PROVISIONING = "provisioning"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class EventType(str, Enum):
    CREATED = "created"
    UPDATED = "updated"
    ACTIVATED = "activated"
    DEACTIVATED = "deactivated"
    PLAN_CHANGED = "plan_changed"
    ITEM_ADDED = "item_added"
    ITEM_REMOVED = "item_removed"
    RENEWED = "renewed"
    CANCELLED = "cancelled"


# ============================================================
# PLANS
# ============================================================


class Plan(Base):
    __tablename__ = "plans"

    id = Column(String, primary_key=True, index=True)

    code = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
    )

    name = Column(
        String,
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    monthly_price = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    yearly_price = Column(
        Float,
        nullable=True,
    )

    max_ai_employees = Column(
        Integer,
        default=0,
    )

    max_users = Column(
        Integer,
        default=1,
    )

    active = Column(
        Boolean,
        default=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
    )

    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    subscriptions = relationship(
        "CompanySubscription",
        back_populates="plan",
    )


# ============================================================
# SERVICE CATALOG
# ============================================================


class ServiceCatalog(Base):
    __tablename__ = "service_catalog"

    id = Column(
        String,
        primary_key=True,
        index=True,
    )

    code = Column(
        String,
        unique=True,
        nullable=False,
        index=True,
    )

    category = Column(
        String,
        nullable=False,
        index=True,
    )

    name = Column(
        String,
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    monthly_price = Column(
        Float,
        default=0.0,
    )

    yearly_price = Column(
        Float,
        nullable=True,
    )

    setup_fee = Column(
        Float,
        default=0.0,
    )

    starter_available = Column(
        Boolean,
        default=True,
    )

    business_available = Column(
        Boolean,
        default=True,
    )

    enterprise_available = Column(
        Boolean,
        default=True,
    )

    active = Column(
        Boolean,
        default=True,
    )

    metadata_json = Column(
        JSON,
        default=dict,
    )

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
    )

    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    subscription_items = relationship(
        "SubscriptionItem",
        back_populates="service",
    )
	# ============================================================
# COMPANY SUBSCRIPTIONS
# ============================================================


class CompanySubscription(Base):
    __tablename__ = "company_subscriptions"

    id = Column(
        String,
        primary_key=True,
        index=True,
    )

    company_id = Column(
        String,
        ForeignKey("companies.id"),
        nullable=False,
        unique=True,
        index=True,
    )

    plan_id = Column(
        String,
        ForeignKey("plans.id"),
        nullable=False,
        index=True,
    )

    status = Column(
        String,
        default=SubscriptionStatus.TRIAL.value,
        nullable=False,
        index=True,
    )

    billing_cycle = Column(
        String,
        default=BillingCycle.MONTHLY.value,
        nullable=False,
    )

    currency = Column(
        String,
        default="USD",
        nullable=False,
    )

    monthly_subtotal = Column(
        Float,
        default=0.0,
    )

    discount_total = Column(
        Float,
        default=0.0,
    )

    tax_total = Column(
        Float,
        default=0.0,
    )

    monthly_total = Column(
        Float,
        default=0.0,
    )

    launch_activation_fee = Column(
        Float,
        default=79.0,
    )

    next_invoice_date = Column(
        DateTime,
        nullable=True,
    )

    trial_ends_at = Column(
        DateTime,
        nullable=True,
    )

    started_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
    )

    cancel_at_period_end = Column(
        Boolean,
        default=False,
    )

    cancelled_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
    )

    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    company = relationship(
        "Company",
        backref="subscription",
    )

    plan = relationship(
        "Plan",
        back_populates="subscriptions",
    )

    items = relationship(
        "SubscriptionItem",
        back_populates="subscription",
        cascade="all, delete-orphan",
    )

    events = relationship(
        "SubscriptionEvent",
        back_populates="subscription",
        cascade="all, delete-orphan",
    )


# ============================================================
# SUBSCRIPTION ITEMS
# ============================================================


class SubscriptionItem(Base):
    __tablename__ = "subscription_items"

    id = Column(
        String,
        primary_key=True,
        index=True,
    )

    subscription_id = Column(
        String,
        ForeignKey("company_subscriptions.id"),
        nullable=False,
        index=True,
    )

    service_id = Column(
        String,
        ForeignKey("service_catalog.id"),
        nullable=False,
        index=True,
    )

    quantity = Column(
        Integer,
        default=1,
    )

    unit_price = Column(
        Float,
        default=0.0,
    )

    monthly_price = Column(
        Float,
        default=0.0,
    )

    status = Column(
        String,
        default=ItemStatus.PENDING.value,
        nullable=False,
        index=True,
    )

    billing_behavior = Column(
        String,
        default="recurring",
    )

    provisioned = Column(
        Boolean,
        default=False,
    )

    activated_at = Column(
        DateTime,
        nullable=True,
    )

    cancelled_at = Column(
        DateTime,
        nullable=True,
    )

    metadata_json = Column(
        JSON,
        default=dict,
    )

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
    )

    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )

    subscription = relationship(
        "CompanySubscription",
        back_populates="items",
    )

    service = relationship(
        "ServiceCatalog",
        back_populates="subscription_items",
    )
	# ============================================================
# SUBSCRIPTION EVENTS
# ============================================================


class SubscriptionEvent(Base):
    __tablename__ = "subscription_events"

    id = Column(
        String,
        primary_key=True,
        index=True,
    )

    subscription_id = Column(
        String,
        ForeignKey("company_subscriptions.id"),
        nullable=False,
        index=True,
    )

    event_type = Column(
        String,
        nullable=False,
        index=True,
    )

    actor = Column(
        String,
        nullable=True,
    )

    title = Column(
        String,
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    old_value = Column(
        JSON,
        nullable=True,
    )

    new_value = Column(
        JSON,
        nullable=True,
    )

    metadata_json = Column(
        JSON,
        default=dict,
    )

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        index=True,
    )

    subscription = relationship(
        "CompanySubscription",
        back_populates="events",
    )


# ============================================================
# COMPANY SUBSCRIPTION HELPERS
# ============================================================


@property
def is_active(self):
    return self.status == SubscriptionStatus.ACTIVE.value


@property
def is_trial(self):
    return self.status == SubscriptionStatus.TRIAL.value


@property
def ai_employee_count(self):
    total = 0

    for item in self.items:
        if (
            item.status == ItemStatus.ACTIVE.value
            and item.service
            and item.service.category == "ai"
        ):
            total += item.quantity

    return total


@property
def active_services(self):
    return [
        item
        for item in self.items
        if item.status == ItemStatus.ACTIVE.value
    ]


@property
def recurring_total(self):
    return sum(
        item.monthly_price
        for item in self.items
        if item.status == ItemStatus.ACTIVE.value
    )


CompanySubscription.is_active = is_active
CompanySubscription.is_trial = is_trial
CompanySubscription.ai_employee_count = ai_employee_count
CompanySubscription.active_services = active_services
CompanySubscription.recurring_total = recurring_total


# ============================================================
# SUBSCRIPTION ITEM HELPERS
# ============================================================


@property
def is_active(self):
    return self.status == ItemStatus.ACTIVE.value


@property
def is_pending(self):
    return self.status == ItemStatus.PENDING.value


SubscriptionItem.is_active = is_active
SubscriptionItem.is_pending = is_pending


# ============================================================
# PLAN HELPERS
# ============================================================


@property
def display_price(self):
    return (
        self.monthly_price
        if self.monthly_price
        else 0.0
    )


Plan.display_price = display_price


# ============================================================
# SERVICE HELPERS
# ============================================================


@property
def available_plans(self):
    plans = []

    if self.starter_available:
        plans.append("starter")

    if self.business_available:
        plans.append("business")

    if self.enterprise_available:
        plans.append("enterprise")

    return plans


ServiceCatalog.available_plans = available_plans