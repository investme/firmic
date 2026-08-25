from __future__ import annotations

import datetime
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.payment_transaction import PaymentTransaction
from models.subscription import CompanySubscription
from services.subscription_service import activate_subscription


PAYMENT_STATUS_PENDING = "pending"
PAYMENT_STATUS_VERIFIED = "verified"
PAYMENT_STATUS_FAILED = "failed"


def utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()


def get_payment_by_id(
    db: Session,
    payment_id: str,
) -> PaymentTransaction:
    payment = (
        db.query(PaymentTransaction)
        .filter(
            PaymentTransaction.id == str(payment_id)
        )
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment transaction not found.",
        )

    return payment


def get_payment_by_idempotency_key(
    db: Session,
    idempotency_key: str,
) -> PaymentTransaction | None:
    return (
        db.query(PaymentTransaction)
        .filter(
            PaymentTransaction.idempotency_key
            == str(idempotency_key)
        )
        .first()
    )


def create_payment_transaction(
    db: Session,
    *,
    company_id: str,
    subscription: CompanySubscription,
    amount: float,
    currency: str = "USD",
    provider: str = "stripe",
    idempotency_key: str | None = None,
    provider_session_id: str | None = None,
    metadata: dict | None = None,
) -> PaymentTransaction:
    """
    Create the authoritative backend record for a payment attempt.

    This function DOES NOT activate a subscription.
    """

    normalized_company_id = str(company_id)
    normalized_provider = (
        str(provider or "stripe").strip().lower()
    )
    normalized_currency = (
        str(currency or "USD").strip().upper()
    )

    if subscription.company_id != normalized_company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Subscription does not belong to this company."
            ),
        )

    normalized_amount = round(float(amount or 0), 2)

    if normalized_amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount cannot be negative.",
        )

    key = (
        str(idempotency_key).strip()
        if idempotency_key
        else f"payment:{subscription.id}:{uuid.uuid4()}"
    )

    existing = get_payment_by_idempotency_key(
        db,
        key,
    )

    if existing:
        return existing

    payment = PaymentTransaction(
        id=str(uuid.uuid4()),
        company_id=normalized_company_id,
        subscription_id=subscription.id,
        provider=normalized_provider,
        provider_session_id=(
            str(provider_session_id)
            if provider_session_id
            else None
        ),
        idempotency_key=key,
        status=PAYMENT_STATUS_PENDING,
        amount=normalized_amount,
        currency=normalized_currency,
        payment_metadata=metadata or {},
        created_at=utcnow(),
        updated_at=utcnow(),
    )

    db.add(payment)
    db.flush()

    return payment


def mark_payment_verified(
    db: Session,
    *,
    payment: PaymentTransaction,
    provider_event_id: str,
    provider_payment_intent_id: str | None = None,
    provider_session_id: str | None = None,
    metadata: dict | None = None,
) -> PaymentTransaction:
    """
    Mark a payment as authoritatively verified.

    Idempotent:
    repeated delivery of the same verified event does not
    create a second payment transaction.

    IMPORTANT:
    This function still DOES NOT activate the subscription.
    """

    event_id = str(provider_event_id or "").strip()

    if not event_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verified payment requires provider event ID.",
        )

    duplicate = (
        db.query(PaymentTransaction)
        .filter(
            PaymentTransaction.provider
            == payment.provider,
            PaymentTransaction.provider_event_id
            == event_id,
            PaymentTransaction.id
            != payment.id,
        )
        .first()
    )

    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Provider payment event has already been "
                "processed."
            ),
        )

    if payment.status == PAYMENT_STATUS_VERIFIED:
        if payment.provider_event_id == event_id:
            return payment

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Payment is already verified by a different "
                "provider event."
            ),
        )

    payment.provider_event_id = event_id

    if provider_payment_intent_id:
        payment.provider_payment_intent_id = str(
            provider_payment_intent_id
        )

    if provider_session_id:
        payment.provider_session_id = str(
            provider_session_id
        )

    payment.status = PAYMENT_STATUS_VERIFIED
    payment.verified_at = utcnow()
    payment.failed_at = None

    payment.payment_metadata = {
        **(payment.payment_metadata or {}),
        **(metadata or {}),
    }

    payment.updated_at = utcnow()

    db.flush()

    return payment


def mark_payment_failed(
    db: Session,
    *,
    payment: PaymentTransaction,
    provider_event_id: str | None = None,
    metadata: dict | None = None,
) -> PaymentTransaction:
    """
    Mark an unresolved payment attempt as failed.

    A verified payment may never be downgraded to failed.
    """

    if payment.status == PAYMENT_STATUS_VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Verified payment cannot be marked failed.",
        )

    if provider_event_id:
        payment.provider_event_id = str(
            provider_event_id
        )

    payment.status = PAYMENT_STATUS_FAILED
    payment.failed_at = utcnow()

    payment.payment_metadata = {
        **(payment.payment_metadata or {}),
        **(metadata or {}),
    }

    payment.updated_at = utcnow()

    db.flush()

    return payment


def payment_is_verified(
    payment: PaymentTransaction | None,
) -> bool:
    return bool(
        payment
        and payment.status == PAYMENT_STATUS_VERIFIED
        and payment.verified_at is not None
        and payment.provider_event_id
    )



def activate_subscription_from_verified_payment(
    db: Session,
    *,
    payment: PaymentTransaction,
    subscription: CompanySubscription,
    actor: str | None = None,
) -> CompanySubscription:
    """
    Authoritative commercial activation boundary.

    Only a verified payment transaction may activate its exact
    matching company subscription.
    """

    if not payment_is_verified(payment):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Subscription activation requires a verified "
                "payment transaction."
            ),
        )

    if payment.subscription_id != subscription.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Payment transaction does not belong to this "
                "subscription."
            ),
        )

    if payment.company_id != subscription.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Payment transaction company does not match "
                "the subscription company."
            ),
        )

    # Idempotent successful replay.
    if subscription.status == "active":
        return subscription

    activate_subscription(
        db,
        subscription=subscription,
        actor=(
            actor
            or f"payment:{payment.provider}:{payment.id}"
        ),
    )

    db.flush()

    return subscription
