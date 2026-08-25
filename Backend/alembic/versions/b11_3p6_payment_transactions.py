"""add authoritative payment transactions

Revision ID: b11_3p6_payment_transactions
Revises: firmic_ops_company_agent_fk
Create Date: 2026-08-22
"""

from alembic import op
import sqlalchemy as sa


revision = "b11_3p6_payment_transactions"
down_revision = "firmic_ops_company_agent_fk"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "payment_transactions",
        sa.Column(
            "id",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "company_id",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "subscription_id",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "provider",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "provider_event_id",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "provider_session_id",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "provider_payment_intent_id",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "idempotency_key",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "amount",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "currency",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "payment_metadata",
            sa.JSON(),
            nullable=True,
        ),
        sa.Column(
            "verified_at",
            sa.DateTime(),
            nullable=True,
        ),
        sa.Column(
            "failed_at",
            sa.DateTime(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            name="fk_payment_transactions_company",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["subscription_id"],
            ["company_subscriptions.id"],
            name="fk_payment_transactions_subscription",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "provider",
            "provider_event_id",
            name="uq_payment_transactions_provider_event",
        ),
        sa.UniqueConstraint(
            "idempotency_key",
            name="uq_payment_transactions_idempotency",
        ),
    )

    op.create_index(
        "ix_payment_transactions_id",
        "payment_transactions",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_payment_transactions_company_id",
        "payment_transactions",
        ["company_id"],
        unique=False,
    )

    op.create_index(
        "ix_payment_transactions_subscription_id",
        "payment_transactions",
        ["subscription_id"],
        unique=False,
    )

    op.create_index(
        "ix_payment_transactions_provider",
        "payment_transactions",
        ["provider"],
        unique=False,
    )

    op.create_index(
        "ix_payment_transactions_provider_event_id",
        "payment_transactions",
        ["provider_event_id"],
        unique=False,
    )

    op.create_index(
        "ix_payment_transactions_provider_session_id",
        "payment_transactions",
        ["provider_session_id"],
        unique=False,
    )

    op.create_index(
        "ix_payment_transactions_provider_payment_intent_id",
        "payment_transactions",
        ["provider_payment_intent_id"],
        unique=False,
    )

    op.create_index(
        "ix_payment_transactions_idempotency_key",
        "payment_transactions",
        ["idempotency_key"],
        unique=False,
    )

    op.create_index(
        "ix_payment_transactions_status",
        "payment_transactions",
        ["status"],
        unique=False,
    )


def downgrade():
    op.drop_index(
        "ix_payment_transactions_status",
        table_name="payment_transactions",
    )

    op.drop_index(
        "ix_payment_transactions_idempotency_key",
        table_name="payment_transactions",
    )

    op.drop_index(
        "ix_payment_transactions_provider_payment_intent_id",
        table_name="payment_transactions",
    )

    op.drop_index(
        "ix_payment_transactions_provider_session_id",
        table_name="payment_transactions",
    )

    op.drop_index(
        "ix_payment_transactions_provider_event_id",
        table_name="payment_transactions",
    )

    op.drop_index(
        "ix_payment_transactions_provider",
        table_name="payment_transactions",
    )

    op.drop_index(
        "ix_payment_transactions_subscription_id",
        table_name="payment_transactions",
    )

    op.drop_index(
        "ix_payment_transactions_company_id",
        table_name="payment_transactions",
    )

    op.drop_index(
        "ix_payment_transactions_id",
        table_name="payment_transactions",
    )

    op.drop_table("payment_transactions")
