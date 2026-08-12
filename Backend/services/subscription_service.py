from __future__ import annotations

import datetime
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload

from models.company import Company
from models.usage_ledger import UsageLedger
from services.ledger_service import (
    current_invoice_month,
    record_usage,
)
from models.subscription import (
    CompanySubscription,
    ItemStatus,
    Plan,
    ServiceCatalog,
    SubscriptionEvent,
    SubscriptionItem,
    SubscriptionStatus,
)


COMPANY_LAUNCH_FEE_USD = 79.0
DEFAULT_TAX_RATE = 0.05


def utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()


def generate_id() -> str:
    return str(uuid.uuid4())


def get_owned_company(
    db: Session,
    *,
    company_id: str,
    user_id: str,
) -> Company:
    company = (
        db.query(Company)
        .filter(
            Company.id == company_id,
            Company.user_id == str(user_id),
            Company.status != "terminated",
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return company


def get_plan_by_code(
    db: Session,
    plan_code: str,
) -> Plan:
    normalized_code = str(plan_code or "").strip().upper()

    # Primary ORM lookup.
    plan = (
        db.query(Plan)
        .filter(
            Plan.code == normalized_code,
            Plan.active.is_(True),
        )
        .first()
    )

    if plan:
        return plan

    # Production-safe fallback using the same database session.
    raw_plan = (
        db.execute(
            text(
                """
                SELECT id
                FROM plans
                WHERE UPPER(TRIM(code)) = :plan_code
                  AND active = TRUE
                LIMIT 1
                """
            ),
            {"plan_code": normalized_code},
        )
        .mappings()
        .first()
    )

    if raw_plan:
        plan = db.query(Plan).filter(Plan.id == raw_plan["id"]).first()

        if plan:
            return plan

    available_plans = (
        db.execute(
            text(
                """
                SELECT code, active
                FROM plans
                ORDER BY code
                """
            )
        )
        .mappings()
        .all()
    )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={
            "message": "Subscription plan not found",
            "received_plan_code": plan_code,
            "normalized_plan_code": normalized_code,
            "available_plans": [
                {
                    "code": row["code"],
                    "active": row["active"],
                }
                for row in available_plans
            ],
            "backend_build": "subscription-plan-fix-2026-08-06",
        },
    )

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription plan not found",
        )

    return plan


def get_service_by_code(
    db: Session,
    service_code: str,
) -> ServiceCatalog:
    normalized_code = service_code.strip().upper()

    service = (
        db.query(ServiceCatalog)
        .filter(
            ServiceCatalog.code == normalized_code,
            ServiceCatalog.active.is_(True),
        )
        .first()
    )

    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )

    return service


def get_company_subscription(
    db: Session,
    company_id: str,
) -> CompanySubscription | None:
    return (
        db.query(CompanySubscription)
        .options(
            joinedload(CompanySubscription.plan),
            joinedload(CompanySubscription.items).joinedload(
                SubscriptionItem.service
            ),
            joinedload(CompanySubscription.events),
        )
        .filter(
            CompanySubscription.company_id == company_id,
        )
        .first()
    )


def require_company_subscription(
    db: Session,
    company_id: str,
) -> CompanySubscription:
    subscription = get_company_subscription(
        db,
        company_id,
    )

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company subscription not found",
        )

    return subscription


def service_is_included(
    service: ServiceCatalog,
    plan_code: str,
) -> bool:
    metadata = service.metadata_json or {}
    included_plans = metadata.get("included_in_plans") or []

    return plan_code in included_plans


def service_is_available(
    service: ServiceCatalog,
    plan_code: str,
) -> bool:
    if plan_code == "PLAN_STARTER":
        return bool(service.starter_available)

    if plan_code == "PLAN_BUSINESS":
        return bool(service.business_available)

    if plan_code == "PLAN_ENTERPRISE":
        return bool(service.enterprise_available)

    return False


def included_quantity_for_plan(
    service: ServiceCatalog,
    plan_code: str,
) -> int | None:
    metadata = service.metadata_json or {}
    quantities = metadata.get("included_quantity") or {}

    return quantities.get(plan_code)


def create_subscription_event(
    db: Session,
    *,
    subscription: CompanySubscription,
    event_type: str,
    title: str,
    actor: str | None = None,
    description: str | None = None,
    old_value: dict[str, Any] | None = None,
    new_value: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
) -> SubscriptionEvent:
    event = SubscriptionEvent(
        id=generate_id(),
        subscription_id=subscription.id,
        event_type=event_type,
        actor=actor,
        title=title,
        description=description,
        old_value=old_value,
        new_value=new_value,
        metadata_json=metadata or {},
        created_at=utcnow(),
    )

    db.add(event)

    return event


def calculate_subscription_totals(
    subscription: CompanySubscription,
    *,
    tax_rate: float = DEFAULT_TAX_RATE,
) -> dict[str, float]:
    active_items = [
        item
        for item in subscription.items
        if item.status
        in {
            ItemStatus.ACTIVE.value,
            ItemStatus.PENDING.value,
            ItemStatus.PROVISIONING.value,
        }
    ]

    item_total = sum(
        float(item.monthly_price or 0)
        for item in active_items
    )

    plan_total = float(
        subscription.plan.monthly_price
        if subscription.plan
        else 0
    )

    monthly_subtotal = round(
        plan_total + item_total,
        2,
    )

    discount_total = round(
        float(subscription.discount_total or 0),
        2,
    )

    taxable_amount = max(
        0.0,
        monthly_subtotal - discount_total,
    )

    tax_total = round(
        taxable_amount * tax_rate,
        2,
    )

    monthly_total = round(
        taxable_amount + tax_total,
        2,
    )

    subscription.monthly_subtotal = monthly_subtotal
    subscription.discount_total = discount_total
    subscription.tax_total = tax_total
    subscription.monthly_total = monthly_total

    return {
        "monthly_subtotal": monthly_subtotal,
        "discount_total": discount_total,
        "tax_total": tax_total,
        "monthly_total": monthly_total,
    }


def add_subscription_item(
    db: Session,
    *,
    subscription: CompanySubscription,
    service: ServiceCatalog,
    quantity: int = 1,
    actor: str | None = None,
    metadata: dict[str, Any] | None = None,
    included_by_plan: bool | None = None,
) -> SubscriptionItem:
    if quantity < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Service quantity must be at least one",
        )

    plan_code = subscription.plan.code

    if not service_is_available(service, plan_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{service.name} is not available on "
                f"{subscription.plan.name}"
            ),
        )

    existing = (
        db.query(SubscriptionItem)
        .filter(
            SubscriptionItem.subscription_id == subscription.id,
            SubscriptionItem.service_id == service.id,
            SubscriptionItem.status
            != ItemStatus.CANCELLED.value,
        )
        .first()
    )

    if existing:
        previous_quantity = existing.quantity

        existing.quantity = quantity
        existing.unit_price = float(
            service.monthly_price or 0
        )

        is_included = (
            included_by_plan
            if included_by_plan is not None
            else service_is_included(service, plan_code)
        )

        existing.monthly_price = (
            0.0
            if is_included
            else round(
                existing.unit_price * quantity,
                2,
            )
        )

        existing.metadata_json = {
            **(existing.metadata_json or {}),
            **(metadata or {}),
            "included_by_plan": is_included,
        }

        existing.updated_at = utcnow()

        create_subscription_event(
            db,
            subscription=subscription,
            event_type="item_updated",
            title=f"Updated {service.name}",
            actor=actor,
            old_value={
                "quantity": previous_quantity,
            },
            new_value={
                "quantity": quantity,
                "monthly_price": existing.monthly_price,
            },
        )

        return existing

    is_included = (
        included_by_plan
        if included_by_plan is not None
        else service_is_included(service, plan_code)
    )

    unit_price = float(service.monthly_price or 0)

    item = SubscriptionItem(
        id=generate_id(),
        subscription_id=subscription.id,
        service_id=service.id,
        quantity=quantity,
        unit_price=unit_price,
        monthly_price=(
            0.0
            if is_included
            else round(unit_price * quantity, 2)
        ),
        status=ItemStatus.PENDING.value,
        billing_behavior=(
            "included"
            if is_included
            else "recurring"
        ),
        provisioned=False,
        metadata_json={
            **(metadata or {}),
            "included_by_plan": is_included,
        },
        created_at=utcnow(),
        updated_at=utcnow(),
    )

    db.add(item)

    create_subscription_event(
        db,
        subscription=subscription,
        event_type="item_added",
        title=f"Added {service.name}",
        actor=actor,
        new_value={
            "service_code": service.code,
            "quantity": quantity,
            "monthly_price": item.monthly_price,
            "included_by_plan": is_included,
        },
    )

    return item


def provision_included_plan_services(
    db: Session,
    *,
    subscription: CompanySubscription,
    actor: str | None = None,
) -> list[SubscriptionItem]:
    services = (
        db.query(ServiceCatalog)
        .filter(ServiceCatalog.active.is_(True))
        .order_by(ServiceCatalog.category.asc())
        .all()
    )

    created_items: list[SubscriptionItem] = []

    for service in services:
        if not service_is_included(
            service,
            subscription.plan.code,
        ):
            continue

        quantity = included_quantity_for_plan(
            service,
            subscription.plan.code,
        )

        if quantity is None:
            quantity = 1

        item = add_subscription_item(
            db,
            subscription=subscription,
            service=service,
            quantity=max(1, int(quantity)),
            actor=actor,
            included_by_plan=True,
            metadata={
                "source": "plan_inclusion",
            },
        )

        created_items.append(item)

    return created_items


def create_company_subscription(
    db: Session,
    *,
    company: Company,
    plan_code: str,
    actor: str | None = None,
    billing_cycle: str = "monthly",
) -> CompanySubscription:
    existing = get_company_subscription(
        db,
        company.id,
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Company already has a subscription",
        )

    plan = get_plan_by_code(
        db,
        plan_code,
    )

    now = utcnow()

    subscription = CompanySubscription(
        id=generate_id(),
        company_id=company.id,
        plan_id=plan.id,
        status=SubscriptionStatus.TRIAL.value,
        billing_cycle=billing_cycle,
        currency="USD",
        monthly_subtotal=0.0,
        discount_total=0.0,
        tax_total=0.0,
        monthly_total=0.0,
        launch_activation_fee=COMPANY_LAUNCH_FEE_USD,
        next_invoice_date=now + datetime.timedelta(days=30),
        trial_ends_at=None,
        started_at=now,
        cancel_at_period_end=False,
        created_at=now,
        updated_at=now,
    )

    db.add(subscription)
    db.flush()

    subscription.plan = plan

    create_subscription_event(
        db,
        subscription=subscription,
        event_type="created",
        title=f"Created {plan.name} subscription",
        actor=actor,
        new_value={
            "plan_code": plan.code,
            "billing_cycle": billing_cycle,
            "company_launch_fee": COMPANY_LAUNCH_FEE_USD,
        },
    )

    provision_included_plan_services(
        db,
        subscription=subscription,
        actor=actor,
    )

    db.flush()
    calculate_subscription_totals(subscription)

    return subscription


def ensure_subscription_ledger_entry(
    db: Session,
    *,
    subscription: CompanySubscription,
) -> UsageLedger:
    """
    Ensure the active Firmic base plan appears exactly once
    in the current month's usage ledger.

    Included subscription services remain $0 items and must
    not be duplicated as separate charges here.
    """

    plan = subscription.plan

    if not plan:
        raise RuntimeError(
            "Subscription plan relationship is unavailable."
        )

    invoice_month = current_invoice_month()

    existing = (
        db.query(UsageLedger)
        .filter(
            UsageLedger.company_id
            == subscription.company_id,
            UsageLedger.service
            == "firmic_subscription",
            UsageLedger.action
            == "monthly_plan",
            UsageLedger.source_type
            == "company_subscription",
            UsageLedger.source_id
            == subscription.id,
            UsageLedger.invoice_month
            == invoice_month,
            UsageLedger.status
            != "void",
        )
        .first()
    )

    plan_price = round(
        float(plan.monthly_price or 0),
        2,
    )

    if existing:
        # Keep an existing unbilled row synchronized if
        # the plan price/catalog changed before invoicing.
        if existing.status == "unbilled":
            existing.resource = plan.name
            existing.unit_price = plan_price
            existing.quantity = 1
            existing.amount = plan_price
            existing.tax_rate = DEFAULT_TAX_RATE
            existing.tax_amount = round(
                plan_price * DEFAULT_TAX_RATE,
                2,
            )
            existing.total_amount = round(
                plan_price + existing.tax_amount,
                2,
            )
            existing.entry_metadata = {
                **(existing.entry_metadata or {}),
                "plan_code": plan.code,
                "plan_name": plan.name,
                "billing_cycle": subscription.billing_cycle,
                "subscription_id": subscription.id,
            }

        return existing

    return record_usage(
        db,
        company_id=subscription.company_id,
        service="firmic_subscription",
        category="subscription",
        resource=plan.name,
        action="monthly_plan",
        quantity=1,
        unit="company_month",
        unit_price=plan_price,
        currency=subscription.currency or "USD",
        tax_rate=DEFAULT_TAX_RATE,
        source_type="company_subscription",
        source_id=subscription.id,
        metadata={
            "plan_code": plan.code,
            "plan_name": plan.name,
            "billing_cycle": subscription.billing_cycle,
            "subscription_id": subscription.id,
        },
        commit=False,
    )


def activate_subscription(
    db: Session,
    *,
    subscription: CompanySubscription,
    actor: str | None = None,
) -> CompanySubscription:
    old_status = subscription.status

    subscription.status = SubscriptionStatus.ACTIVE.value
    subscription.started_at = subscription.started_at or utcnow()
    subscription.updated_at = utcnow()

    for item in subscription.items:
        if item.status in {
            ItemStatus.PENDING.value,
            ItemStatus.PROVISIONING.value,
        }:
            item.status = ItemStatus.ACTIVE.value
            item.provisioned = True
            item.activated_at = item.activated_at or utcnow()
            item.updated_at = utcnow()

    calculate_subscription_totals(subscription)

    # Billing source of truth:
    # active base plan -> current-month ledger row.
    ensure_subscription_ledger_entry(
        db,
        subscription=subscription,
    )

    create_subscription_event(
        db,
        subscription=subscription,
        event_type="activated",
        title="Subscription activated",
        actor=actor,
        old_value={
            "status": old_status,
        },
        new_value={
            "status": subscription.status,
            "monthly_total": subscription.monthly_total,
        },
    )

    return subscription


def remove_subscription_item(
    db: Session,
    *,
    subscription: CompanySubscription,
    item_id: str,
    actor: str | None = None,
) -> SubscriptionItem:
    item = (
        db.query(SubscriptionItem)
        .options(joinedload(SubscriptionItem.service))
        .filter(
            SubscriptionItem.id == item_id,
            SubscriptionItem.subscription_id
            == subscription.id,
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription service not found",
        )

    if item.status == ItemStatus.CANCELLED.value:
        return item

    if (item.metadata_json or {}).get("included_by_plan"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Services included in the current plan "
                "cannot be removed individually"
            ),
        )

    old_status = item.status

    item.status = ItemStatus.CANCELLED.value
    item.cancelled_at = utcnow()
    item.updated_at = utcnow()

    calculate_subscription_totals(subscription)

    create_subscription_event(
        db,
        subscription=subscription,
        event_type="item_removed",
        title=f"Removed {item.service.name}",
        actor=actor,
        old_value={
            "status": old_status,
            "monthly_price": item.monthly_price,
        },
        new_value={
            "status": item.status,
        },
    )

    return item


def change_subscription_plan(
    db: Session,
    *,
    subscription: CompanySubscription,
    plan_code: str,
    actor: str | None = None,
) -> CompanySubscription:
    new_plan = get_plan_by_code(
        db,
        plan_code,
    )

    old_plan = subscription.plan

    if old_plan.id == new_plan.id:
        return subscription

    old_plan_code = old_plan.code

    subscription.plan_id = new_plan.id
    subscription.plan = new_plan
    subscription.updated_at = utcnow()

    for item in subscription.items:
        if item.status == ItemStatus.CANCELLED.value:
            continue

        service = item.service

        if not service:
            continue

        if service_is_included(service, new_plan.code):
            item.monthly_price = 0.0
            item.billing_behavior = "included"
            item.metadata_json = {
                **(item.metadata_json or {}),
                "included_by_plan": True,
            }
        else:
            item.monthly_price = round(
                float(item.unit_price or 0)
                * int(item.quantity or 1),
                2,
            )
            item.billing_behavior = "recurring"
            item.metadata_json = {
                **(item.metadata_json or {}),
                "included_by_plan": False,
            }

        item.updated_at = utcnow()

    provision_included_plan_services(
        db,
        subscription=subscription,
        actor=actor,
    )

    calculate_subscription_totals(subscription)

    create_subscription_event(
        db,
        subscription=subscription,
        event_type="plan_changed",
        title=f"Changed plan to {new_plan.name}",
        actor=actor,
        old_value={
            "plan_code": old_plan_code,
        },
        new_value={
            "plan_code": new_plan.code,
            "monthly_total": subscription.monthly_total,
        },
    )

    return subscription