from __future__ import annotations

import os
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from fastapi import HTTPException, status

from models.payment_transaction import PaymentTransaction
from models.subscription import CompanySubscription


def stripe_secret_key() -> str:
    return os.getenv(
        "STRIPE_SECRET_KEY",
        "",
    ).strip()


def stripe_webhook_secret() -> str:
    return os.getenv(
        "STRIPE_WEBHOOK_SECRET",
        "",
    ).strip()


def checkout_success_url() -> str:
    return os.getenv(
        "FIRMIC_CHECKOUT_SUCCESS_URL",
        "http://localhost:3000/checkout?payment=success",
    ).strip()


def checkout_cancel_url() -> str:
    return os.getenv(
        "FIRMIC_CHECKOUT_CANCEL_URL",
        "http://localhost:3000/checkout?payment=cancelled",
    ).strip()


def require_stripe_secret_key() -> str:
    key = stripe_secret_key()

    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe payment provider is not configured.",
        )

    return key


def require_stripe_webhook_secret() -> str:
    secret = stripe_webhook_secret()

    if not secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe webhook verification is not configured.",
        )

    return secret


def usd_to_cents(amount: float) -> int:
    value = Decimal(str(amount)).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )

    if value < Decimal("0"):
        raise ValueError(
            "Payment amount cannot be negative."
        )

    return int(
        (value * Decimal("100")).to_integral_value(
            rounding=ROUND_HALF_UP,
        )
    )


def build_checkout_session_params(
    *,
    payment: PaymentTransaction,
    subscription: CompanySubscription,
) -> dict[str, Any]:
    """
    Build Stripe Checkout parameters from authoritative
    backend commercial state.

    This function performs NO external Stripe API request.

    Firmic uses Stripe subscription mode:
      - recurring monthly subscription total
      - one-time launch activation fee on initial invoice
    """

    if payment.company_id != subscription.company_id:
        raise ValueError(
            "Payment company does not match subscription."
        )

    if payment.subscription_id != subscription.id:
        raise ValueError(
            "Payment subscription does not match."
        )

    if payment.status != "pending":
        raise ValueError(
            "Only pending payments may create checkout."
        )

    monthly_amount = round(
        float(subscription.monthly_total or 0),
        2,
    )

    launch_fee = round(
        float(subscription.launch_activation_fee or 0),
        2,
    )

    expected_due_today = round(
        monthly_amount + launch_fee,
        2,
    )

    if round(float(payment.amount or 0), 2) != expected_due_today:
        raise ValueError(
            "Payment amount no longer matches "
            "authoritative subscription due today."
        )

    line_items: list[dict[str, Any]] = []

    if monthly_amount > 0:
        line_items.append(
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": "Firmic Subscription",
                    },
                    "unit_amount": usd_to_cents(
                        monthly_amount
                    ),
                    "recurring": {
                        "interval": "month",
                    },
                },
                "quantity": 1,
            }
        )

    if launch_fee > 0:
        line_items.append(
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": (
                            "Firmic Launch Activation Fee"
                        ),
                    },
                    "unit_amount": usd_to_cents(
                        launch_fee
                    ),
                },
                "quantity": 1,
            }
        )

    if not line_items:
        raise ValueError(
            "Checkout requires a positive charge."
        )

    metadata = {
        "firmic_payment_id": payment.id,
        "firmic_company_id": payment.company_id,
        "firmic_subscription_id": (
            payment.subscription_id
        ),
    }

    return {
        "mode": "subscription",
        "payment_method_types": [
            "card",
        ],
        "line_items": line_items,
        "success_url": checkout_success_url(),
        "cancel_url": checkout_cancel_url(),
        "client_reference_id": payment.id,
        "metadata": metadata,
        "subscription_data": {
            "metadata": metadata,
        },
    }


def create_stripe_checkout_session(
    *,
    payment: PaymentTransaction,
    subscription: CompanySubscription,
):
    """
    External provider boundary.

    Calling this function creates a Stripe Checkout Session.
    It does NOT verify payment and does NOT activate Firmic.
    """

    api_key = require_stripe_secret_key()

    try:
        import stripe
    except ImportError as exc:
        raise RuntimeError(
            "Stripe Python SDK is not installed."
        ) from exc

    params = build_checkout_session_params(
        payment=payment,
        subscription=subscription,
    )

    stripe.api_key = api_key

    return stripe.checkout.Session.create(
        **params,
        idempotency_key=payment.idempotency_key,
    )



def verify_stripe_webhook(
    *,
    payload: bytes,
    signature: str,
):
    """
    Verify and decode a Stripe webhook using the raw request
    body and Stripe-Signature header.

    No Firmic payment state may change before this succeeds.
    """

    webhook_secret = require_stripe_webhook_secret()

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe-Signature header.",
        )

    try:
        import stripe
    except ImportError as exc:
        raise RuntimeError(
            "Stripe Python SDK is not installed."
        ) from exc

    try:
        return stripe.Webhook.construct_event(
            payload=payload,
            sig_header=signature,
            secret=webhook_secret,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Stripe webhook signature.",
        ) from exc
