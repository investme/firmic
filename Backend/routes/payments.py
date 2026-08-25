from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from auth import get_token_payload
from database import get_db
from models.payment_transaction import PaymentTransaction
from schemas.payment import (
    CheckoutSessionResponse,
    PaymentCreateRequest,
    PaymentResponse,
)
from services.payment_service import (
    activate_subscription_from_verified_payment,
    create_payment_transaction,
    get_payment_by_id,
    mark_payment_verified,
)
from services.subscription_service import (
    get_owned_company,
    require_company_subscription,
)
from services.stripe_provider import (
    create_stripe_checkout_session,
    usd_to_cents,
    verify_stripe_webhook,
)
from services.stripe_provider import (
    create_stripe_checkout_session,
)


router = APIRouter(
    prefix="/api/payments",
    tags=["Payments"],
)


def require_user_id(token: dict) -> str:
    user_id = token.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    return str(user_id)


def serialize_payment(
    payment: PaymentTransaction,
) -> PaymentResponse:
    return PaymentResponse.model_validate(payment)


@router.post(
    "",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment(
    payload: PaymentCreateRequest,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    """
    Create the backend record for a tenant payment attempt.

    SECURITY BOUNDARY:
    This endpoint does NOT verify payment and does NOT activate
    the subscription.

    Amount is derived from the authoritative subscription,
    never accepted from the client.
    """

    user_id = require_user_id(token)

    company = get_owned_company(
        db,
        company_id=payload.company_id,
        user_id=user_id,
    )

    subscription = require_company_subscription(
        db,
        company.id,
    )

    if subscription.status == "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Subscription is already active.",
        )

    # Initial checkout authority:
    # due today = first recurring subscription amount
    #           + one-time Firmic launch activation fee.
    #
    # Both values come from the authoritative backend
    # subscription record. The client supplies neither.
    authoritative_amount = round(
        float(subscription.monthly_total or 0)
        + float(subscription.launch_activation_fee or 0),
        2,
    )

    payment = create_payment_transaction(
        db,
        company_id=company.id,
        subscription=subscription,
        amount=authoritative_amount,
        currency="USD",
        provider="stripe",
        idempotency_key=payload.idempotency_key,
        metadata={
            "source": "tenant_payment_api",
            "subscription_status": subscription.status,
            "monthly_total": round(
                float(subscription.monthly_total or 0),
                2,
            ),
            "launch_activation_fee": round(
                float(subscription.launch_activation_fee or 0),
                2,
            ),
            "due_today": authoritative_amount,
        },
    )

    try:
        db.commit()
        db.refresh(payment)
    except Exception:
        db.rollback()
        raise

    return serialize_payment(payment)


@router.get(
    "/{payment_id}",
    response_model=PaymentResponse,
)
def get_payment(
    payment_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    """
    Read a payment transaction belonging to the authenticated
    tenant.

    A tenant cannot read another company's payment.
    """

    user_id = require_user_id(token)

    payment = get_payment_by_id(
        db,
        payment_id,
    )

    get_owned_company(
        db,
        company_id=payment.company_id,
        user_id=user_id,
    )

    return serialize_payment(payment)



@router.post(
    "/{payment_id}/checkout-session",
    response_model=CheckoutSessionResponse,
)
def create_checkout_session(
    payment_id: str,
    token: dict = Depends(get_token_payload),
    db: Session = Depends(get_db),
):
    """
    Create a Stripe Checkout Session for an existing Firmic
    payment transaction.

    SECURITY:
    - payment must belong to authenticated tenant
    - payment must still be pending
    - subscription remains server authoritative
    - Checkout success redirect does NOT verify payment
    """

    user_id = require_user_id(token)

    payment = get_payment_by_id(
        db,
        payment_id,
    )

    company = get_owned_company(
        db,
        company_id=payment.company_id,
        user_id=user_id,
    )

    subscription = require_company_subscription(
        db,
        company.id,
    )

    if payment.subscription_id != subscription.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Payment transaction does not match "
                "the company subscription."
            ),
        )

    if payment.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Only pending payments may create "
                "a checkout session."
            ),
        )

    if subscription.status == "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Subscription is already active.",
        )

    session = create_stripe_checkout_session(
        payment=payment,
        subscription=subscription,
    )

    session_id = str(
        getattr(session, "id", "") or ""
    ).strip()

    checkout_url = str(
        getattr(session, "url", "") or ""
    ).strip()

    if not session_id or not checkout_url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Stripe did not return a valid "
                "Checkout Session."
            ),
        )

    payment.provider_session_id = session_id

    payment.payment_metadata = {
        **(payment.payment_metadata or {}),
        "checkout_session_created": True,
    }

    try:
        db.commit()
        db.refresh(payment)
    except Exception:
        db.rollback()
        raise

    return CheckoutSessionResponse(
        payment_id=payment.id,
        payment_status=payment.status,
        provider=payment.provider,
        provider_session_id=session_id,
        checkout_url=checkout_url,
    )



@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(
        default=None,
        alias="Stripe-Signature",
    ),
    db: Session = Depends(get_db),
):
    """
    Authoritative Stripe payment-success boundary.

    SECURITY CONTRACT:
    - no tenant JWT is trusted for payment verification
    - raw body + Stripe signature are verified first
    - only checkout.session.completed is considered here
    - Stripe payment_status must be paid
    - Firmic payment/company/subscription metadata must match
    - Checkout Session ID must match the persisted session
    - amount and currency must match the Firmic payment
    - only then may payment become verified
    - only verified payment may activate the subscription
    """

    raw_body = await request.body()

    event = verify_stripe_webhook(
        payload=raw_body,
        signature=stripe_signature or "",
    )

    event_type = str(
        event.get("type") or ""
    )

    event_id = str(
        event.get("id") or ""
    ).strip()

    # Ignore unrelated Stripe events safely.
    if event_type != "checkout.session.completed":
        return {
            "received": True,
            "handled": False,
            "event_type": event_type,
        }

    session = (
        event.get("data", {})
        .get("object", {})
    )

    payment_status = str(
        session.get("payment_status") or ""
    ).lower()

    if payment_status != "paid":
        return {
            "received": True,
            "handled": False,
            "event_type": event_type,
            "reason": "payment_not_paid",
        }

    metadata = session.get("metadata") or {}

    payment_id = str(
        metadata.get("firmic_payment_id")
        or ""
    ).strip()

    company_id = str(
        metadata.get("firmic_company_id")
        or ""
    ).strip()

    subscription_id = str(
        metadata.get("firmic_subscription_id")
        or ""
    ).strip()

    if (
        not payment_id
        or not company_id
        or not subscription_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Stripe Checkout Session is missing "
                "Firmic payment metadata."
            ),
        )

    payment = get_payment_by_id(
        db,
        payment_id,
    )

    subscription = require_company_subscription(
        db,
        payment.company_id,
    )

    # --------------------------------------------------------
    # Firmic identity reconciliation
    # --------------------------------------------------------

    if payment.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe company metadata mismatch.",
        )

    if payment.subscription_id != subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe subscription metadata mismatch.",
        )

    if subscription.id != subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Stripe subscription does not match "
                "the authoritative company subscription."
            ),
        )

    # --------------------------------------------------------
    # Stripe Checkout Session reconciliation
    # --------------------------------------------------------

    stripe_session_id = str(
        session.get("id") or ""
    ).strip()

    if (
        not stripe_session_id
        or not payment.provider_session_id
        or stripe_session_id
        != payment.provider_session_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe Checkout Session mismatch.",
        )

    # --------------------------------------------------------
    # Amount reconciliation
    # --------------------------------------------------------

    amount_total = session.get("amount_total")

    if amount_total is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe Checkout Session amount missing.",
        )

    expected_cents = usd_to_cents(
        float(payment.amount or 0)
    )

    if int(amount_total) != expected_cents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe payment amount mismatch.",
        )

    stripe_currency = str(
        session.get("currency") or ""
    ).upper()

    expected_currency = str(
        payment.currency or "USD"
    ).upper()

    if stripe_currency != expected_currency:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe payment currency mismatch.",
        )

    if not event_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe event ID is missing.",
        )

    # --------------------------------------------------------
    # AUTHORITATIVE STATE TRANSITION
    # --------------------------------------------------------

    try:
        mark_payment_verified(
            db,
            payment=payment,
            provider_event_id=event_id,
            provider_payment_intent_id=(
                str(
                    session.get("payment_intent")
                    or ""
                )
                or None
            ),
            provider_session_id=stripe_session_id,
            metadata={
                "stripe_event_type": event_type,
                "stripe_payment_status": payment_status,
                "stripe_amount_total": int(
                    amount_total
                ),
                "stripe_currency": (
                    stripe_currency
                ),
            },
        )

        activate_subscription_from_verified_payment(
            db,
            payment=payment,
            subscription=subscription,
            actor=f"stripe:{event_id}",
        )

        db.commit()

        db.refresh(payment)
        db.refresh(subscription)

    except Exception:
        db.rollback()
        raise

    return {
        "received": True,
        "handled": True,
        "payment_id": payment.id,
        "payment_status": payment.status,
        "subscription_id": subscription.id,
        "subscription_status": subscription.status,
    }
