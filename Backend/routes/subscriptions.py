from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from models.subscription import Plan, ServiceCatalog
from schemas.subscription import (
    CompanySubscriptionResponse,
    PlanResponse,
    ServiceCatalogResponse,
    SubscriptionActivateRequest,
    SubscriptionCreateRequest,
    SubscriptionPlanChangeRequest,
    SubscriptionPreviewItem,
    SubscriptionPreviewRequest,
    SubscriptionPreviewResponse,
    SubscriptionServiceAddRequest,
)
from services.subscription_service import (
    COMPANY_LAUNCH_FEE_USD,
    DEFAULT_TAX_RATE,
    activate_subscription,
    add_subscription_item,
    calculate_subscription_totals,
    change_subscription_plan,
    create_company_subscription,
    get_owned_company,
    get_plan_by_code,
    get_service_by_code,
    require_company_subscription,
    remove_subscription_item,
    service_is_available,
    service_is_included,
)


router = APIRouter(
    prefix="/api/subscriptions",
    tags=["Subscriptions"],
)


def require_user_id(token: dict) -> str:
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    return str(user_id)


def commit_and_refresh(
    db: Session,
    subscription,
):
    try:
        db.commit()
        db.refresh(subscription)

        return require_company_subscription(
            db,
            subscription.company_id,
        )

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise


@router.get(
    "/plans",
    response_model=list[PlanResponse],
)
def list_plans(
    db: Session = Depends(get_db),
):
    return (
        db.query(Plan)
        .filter(Plan.active.is_(True))
        .order_by(Plan.monthly_price.asc())
        .all()
    )


@router.get(
    "/services",
    response_model=list[ServiceCatalogResponse],
)
def list_services(
    category: str | None = None,
    plan_code: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(ServiceCatalog).filter(
        ServiceCatalog.active.is_(True)
    )

    if category:
        query = query.filter(
            ServiceCatalog.category == category.strip()
        )

    services = query.order_by(
        ServiceCatalog.category.asc(),
        ServiceCatalog.name.asc(),
    ).all()

    if not plan_code:
        return services

    normalized_plan_code = plan_code.strip().upper()

    return [
        service
        for service in services
        if service_is_available(
            service,
            normalized_plan_code,
        )
    ]


@router.get(
    "/company/{company_id}",
    response_model=CompanySubscriptionResponse,
)
def get_subscription_for_company(
    company_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = require_user_id(token)

    get_owned_company(
        db,
        company_id=company_id,
        user_id=user_id,
    )

    return require_company_subscription(
        db,
        company_id,
    )


@router.post(
    "",
    response_model=CompanySubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_subscription(
    payload: SubscriptionCreateRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = require_user_id(token)

    company = get_owned_company(
        db,
        company_id=payload.company_id,
        user_id=user_id,
    )

    billing_cycle = payload.billing_cycle.strip().lower()

    if billing_cycle not in {"monthly", "yearly"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Billing cycle must be monthly or yearly",
        )

    subscription = create_company_subscription(
        db,
        company=company,
        plan_code=payload.plan_code,
        actor=user_id,
        billing_cycle=billing_cycle,
    )

    return commit_and_refresh(
        db,
        subscription,
    )


@router.post(
    "/activate",
    response_model=CompanySubscriptionResponse,
)
def activate_company_subscription(
    payload: SubscriptionActivateRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = require_user_id(token)

    get_owned_company(
        db,
        company_id=payload.company_id,
        user_id=user_id,
    )

    subscription = require_company_subscription(
        db,
        payload.company_id,
    )

    # SECURITY / BILLING BOUNDARY:
    # Tenant authentication proves identity, not payment.
    #
    # Subscription activation must only be performed by an
    # authoritative server-side payment-success flow.
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=(
            "Subscription activation requires verified payment."
        ),
    )


@router.patch(
    "/company/{company_id}/plan",
    response_model=CompanySubscriptionResponse,
)
def update_subscription_plan(
    company_id: str,
    payload: SubscriptionPlanChangeRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = require_user_id(token)

    get_owned_company(
        db,
        company_id=company_id,
        user_id=user_id,
    )

    subscription = require_company_subscription(
        db,
        company_id,
    )

    change_subscription_plan(
        db,
        subscription=subscription,
        plan_code=payload.plan_code,
        actor=user_id,
    )

    return commit_and_refresh(
        db,
        subscription,
    )


@router.post(
    "/company/{company_id}/services",
    response_model=CompanySubscriptionResponse,
)
def add_service_to_subscription(
    company_id: str,
    payload: SubscriptionServiceAddRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = require_user_id(token)

    get_owned_company(
        db,
        company_id=company_id,
        user_id=user_id,
    )

    subscription = require_company_subscription(
        db,
        company_id,
    )

    service = get_service_by_code(
        db,
        payload.service_code,
    )

    add_subscription_item(
        db,
        subscription=subscription,
        service=service,
        quantity=payload.quantity,
        actor=user_id,
        metadata=payload.metadata,
    )

    db.flush()
    calculate_subscription_totals(subscription)

    return commit_and_refresh(
        db,
        subscription,
    )


@router.delete(
    "/company/{company_id}/services/{item_id}",
    response_model=CompanySubscriptionResponse,
)
def remove_service_from_subscription(
    company_id: str,
    item_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    user_id = require_user_id(token)

    get_owned_company(
        db,
        company_id=company_id,
        user_id=user_id,
    )

    subscription = require_company_subscription(
        db,
        company_id,
    )

    remove_subscription_item(
        db,
        subscription=subscription,
        item_id=item_id,
        actor=user_id,
    )

    db.flush()
    calculate_subscription_totals(subscription)

    return commit_and_refresh(
        db,
        subscription,
    )


@router.post(
    "/preview",
    response_model=SubscriptionPreviewResponse,
)
def preview_subscription(
    payload: SubscriptionPreviewRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    require_user_id(token)

    plan = get_plan_by_code(
        db,
        payload.plan_code,
    )

    preview_items: list[SubscriptionPreviewItem] = []
    additional_services_total = 0.0
    seen_codes: set[str] = set()

    for raw_service_code in payload.service_codes:
        service_code = raw_service_code.strip().upper()

        if not service_code or service_code in seen_codes:
            continue

        seen_codes.add(service_code)

        service = get_service_by_code(
            db,
            service_code,
        )

        if not service_is_available(
            service,
            plan.code,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"{service.name} is not available "
                    f"on {plan.name}"
                ),
            )

        included = service_is_included(
            service,
            plan.code,
        )

        monthly_price = (
            0.0
            if included
            else round(
                float(service.monthly_price or 0),
                2,
            )
        )

        additional_services_total += monthly_price

        preview_items.append(
            SubscriptionPreviewItem(
                service_code=service.code,
                service_name=service.name,
                quantity=1,
                unit_price=float(
                    service.monthly_price or 0
                ),
                monthly_price=monthly_price,
                included_by_plan=included,
            )
        )

    plan_monthly_price = round(
        float(plan.monthly_price or 0),
        2,
    )

    monthly_subtotal = round(
        plan_monthly_price
        + additional_services_total,
        2,
    )

    tax_total = round(
        monthly_subtotal * DEFAULT_TAX_RATE,
        2,
    )

    monthly_total = round(
        monthly_subtotal + tax_total,
        2,
    )

    due_today = round(
        monthly_total + COMPANY_LAUNCH_FEE_USD,
        2,
    )

    return SubscriptionPreviewResponse(
        plan_code=plan.code,
        plan_name=plan.name,
        plan_monthly_price=plan_monthly_price,
        launch_activation_fee=COMPANY_LAUNCH_FEE_USD,
        items=preview_items,
        monthly_subtotal=monthly_subtotal,
        tax_total=tax_total,
        monthly_total=monthly_total,
        due_today=due_today,
    )