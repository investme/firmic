"""subscription engine

Revision ID: b1a51195fbb6
Revises: 927599baf739
Create Date: 2026-08-03 19:52:00.499849

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b1a51195fbb6'
down_revision: Union[str, Sequence[str], None] = '927599baf739'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:

    # =====================================================
    # PLANS
    # =====================================================

    op.create_table(
        "plans",

        sa.Column(
            "id",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "code",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "name",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "monthly_price",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "yearly_price",
            sa.Float(),
            nullable=True,
        ),

        sa.Column(
            "max_ai_employees",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "max_users",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),

        sa.Column(
            "active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
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

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_plans_code",
        "plans",
        ["code"],
        unique=True,
    )



    # =====================================================
    # SERVICE CATALOG
    # =====================================================

    op.create_table(

        "service_catalog",

        sa.Column(
            "id",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "code",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "category",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "name",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "monthly_price",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "yearly_price",
            sa.Float(),
            nullable=True,
        ),

        sa.Column(
            "setup_fee",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "starter_available",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),

        sa.Column(
            "business_available",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),

        sa.Column(
            "enterprise_available",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),

        sa.Column(
            "active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),

        sa.Column(
            "metadata_json",
            sa.JSON(),
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

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_service_catalog_code",
        "service_catalog",
        ["code"],
        unique=True,
    )

    op.create_index(
        "ix_service_catalog_category",
        "service_catalog",
        ["category"],
    )
        # =====================================================
    # COMPANY SUBSCRIPTIONS
    # =====================================================

    op.create_table(
        "company_subscriptions",

        sa.Column("id", sa.String(), nullable=False),

        sa.Column(
            "company_id",
            sa.String(),
            sa.ForeignKey("companies.id"),
            nullable=False,
        ),

        sa.Column(
            "plan_id",
            sa.String(),
            sa.ForeignKey("plans.id"),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(),
            nullable=False,
            server_default="trial",
        ),

        sa.Column(
            "billing_cycle",
            sa.String(),
            nullable=False,
            server_default="monthly",
        ),

        sa.Column(
            "currency",
            sa.String(),
            nullable=False,
            server_default="USD",
        ),

        sa.Column(
            "monthly_subtotal",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "discount_total",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "tax_total",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "monthly_total",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "launch_activation_fee",
            sa.Float(),
            nullable=False,
            server_default="79",
        ),

        sa.Column(
            "next_invoice_date",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "trial_ends_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "started_at",
            sa.DateTime(),
            nullable=False,
        ),

        sa.Column(
            "cancel_at_period_end",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),

        sa.Column(
            "cancelled_at",
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

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_company_subscriptions_company_id",
        "company_subscriptions",
        ["company_id"],
        unique=True,
    )

    op.create_index(
        "ix_company_subscriptions_plan_id",
        "company_subscriptions",
        ["plan_id"],
    )

    op.create_index(
        "ix_company_subscriptions_status",
        "company_subscriptions",
        ["status"],
    )



    # =====================================================
    # SUBSCRIPTION ITEMS
    # =====================================================

    op.create_table(

        "subscription_items",

        sa.Column("id", sa.String(), nullable=False),

        sa.Column(
            "subscription_id",
            sa.String(),
            sa.ForeignKey("company_subscriptions.id"),
            nullable=False,
        ),

        sa.Column(
            "service_id",
            sa.String(),
            sa.ForeignKey("service_catalog.id"),
            nullable=False,
        ),

        sa.Column(
            "quantity",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),

        sa.Column(
            "unit_price",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "monthly_price",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),

        sa.Column(
            "status",
            sa.String(),
            nullable=False,
            server_default="pending",
        ),

        sa.Column(
            "billing_behavior",
            sa.String(),
            nullable=False,
            server_default="recurring",
        ),

        sa.Column(
            "provisioned",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),

        sa.Column(
            "activated_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "cancelled_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "metadata_json",
            sa.JSON(),
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

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_subscription_items_subscription_id",
        "subscription_items",
        ["subscription_id"],
    )

    op.create_index(
        "ix_subscription_items_service_id",
        "subscription_items",
        ["service_id"],
    )

    op.create_index(
        "ix_subscription_items_status",
        "subscription_items",
        ["status"],
    )
        # =====================================================
    # SUBSCRIPTION EVENTS
    # =====================================================

    op.create_table(
        "subscription_events",

        sa.Column("id", sa.String(), nullable=False),

        sa.Column(
            "subscription_id",
            sa.String(),
            sa.ForeignKey("company_subscriptions.id"),
            nullable=False,
        ),

        sa.Column(
            "event_type",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "actor",
            sa.String(),
            nullable=True,
        ),

        sa.Column(
            "title",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "old_value",
            sa.JSON(),
            nullable=True,
        ),

        sa.Column(
            "new_value",
            sa.JSON(),
            nullable=True,
        ),

        sa.Column(
            "metadata_json",
            sa.JSON(),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_subscription_events_subscription_id",
        "subscription_events",
        ["subscription_id"],
    )

    op.create_index(
        "ix_subscription_events_event_type",
        "subscription_events",
        ["event_type"],
    )

    op.create_index(
        "ix_subscription_events_created_at",
        "subscription_events",
        ["created_at"],
    )
def downgrade() -> None:

    op.drop_index(
        "ix_subscription_events_created_at",
        table_name="subscription_events",
    )

    op.drop_index(
        "ix_subscription_events_event_type",
        table_name="subscription_events",
    )

    op.drop_index(
        "ix_subscription_events_subscription_id",
        table_name="subscription_events",
    )

    op.drop_table("subscription_events")

    op.drop_index(
        "ix_subscription_items_status",
        table_name="subscription_items",
    )

    op.drop_index(
        "ix_subscription_items_service_id",
        table_name="subscription_items",
    )

    op.drop_index(
        "ix_subscription_items_subscription_id",
        table_name="subscription_items",
    )

    op.drop_table("subscription_items")

    op.drop_index(
        "ix_company_subscriptions_status",
        table_name="company_subscriptions",
    )

    op.drop_index(
        "ix_company_subscriptions_plan_id",
        table_name="company_subscriptions",
    )

    op.drop_index(
        "ix_company_subscriptions_company_id",
        table_name="company_subscriptions",
    )

    op.drop_table("company_subscriptions")

    op.drop_index(
        "ix_service_catalog_category",
        table_name="service_catalog",
    )

    op.drop_index(
        "ix_service_catalog_code",
        table_name="service_catalog",
    )

    op.drop_table("service_catalog")

    op.drop_index(
        "ix_plans_code",
        table_name="plans",
    )

    op.drop_table("plans")