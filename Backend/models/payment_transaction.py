import datetime
import uuid

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    JSON,
    String,
    UniqueConstraint,
)

from database import Base


class PaymentTransaction(Base):
    """
    Authoritative backend record of a payment attempt/result.

    This table does not itself activate a subscription.
    Subscription activation must occur only after a payment
    transaction has been authoritatively verified as paid.
    """

    __tablename__ = "payment_transactions"

    __table_args__ = (
        UniqueConstraint(
            "provider",
            "provider_event_id",
            name="uq_payment_transactions_provider_event",
        ),
        UniqueConstraint(
            "idempotency_key",
            name="uq_payment_transactions_idempotency",
        ),
    )

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

    subscription_id = Column(
        String,
        ForeignKey(
            "company_subscriptions.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    provider = Column(
        String,
        nullable=False,
        default="stripe",
        index=True,
    )

    provider_event_id = Column(
        String,
        nullable=True,
        index=True,
    )

    provider_session_id = Column(
        String,
        nullable=True,
        index=True,
    )

    provider_payment_intent_id = Column(
        String,
        nullable=True,
        index=True,
    )

    idempotency_key = Column(
        String,
        nullable=False,
        index=True,
    )

    status = Column(
        String,
        nullable=False,
        default="pending",
        index=True,
    )

    amount = Column(
        Float,
        nullable=False,
        default=0.0,
    )

    currency = Column(
        String,
        nullable=False,
        default="USD",
    )

    payment_metadata = Column(
        JSON,
        nullable=True,
    )

    verified_at = Column(
        DateTime,
        nullable=True,
    )

    failed_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )
