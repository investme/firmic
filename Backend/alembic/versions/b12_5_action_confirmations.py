"""B12.5 server-bound Sonny action confirmations.

Revision ID: b12_5_action_confirmations
Revises: b11_3p6_payment_transactions
"""

from alembic import op
import sqlalchemy as sa


revision = "b12_5_action_confirmations"
down_revision = "b11_3p6_payment_transactions"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "sonny_action_confirmations",

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
            "actor_id",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "action",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "action_fingerprint",
            sa.String(),
            nullable=False,
        ),

        sa.Column(
            "plan",
            sa.JSON(),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(),
            nullable=False,
            server_default="pending",
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
        ),

        sa.Column(
            "expires_at",
            sa.DateTime(),
            nullable=False,
        ),

        sa.Column(
            "consumed_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_sonny_action_confirmations_company_id",
        "sonny_action_confirmations",
        ["company_id"],
        unique=False,
    )

    op.create_index(
        "ix_sonny_action_confirmations_actor_id",
        "sonny_action_confirmations",
        ["actor_id"],
        unique=False,
    )

    op.create_index(
        "ix_sonny_action_confirmations_action",
        "sonny_action_confirmations",
        ["action"],
        unique=False,
    )

    op.create_index(
        "ix_sonny_action_confirmations_fingerprint",
        "sonny_action_confirmations",
        ["action_fingerprint"],
        unique=False,
    )

    op.create_index(
        "ix_sonny_action_confirmations_status",
        "sonny_action_confirmations",
        ["status"],
        unique=False,
    )

    op.create_index(
        "ix_sonny_action_confirmations_created_at",
        "sonny_action_confirmations",
        ["created_at"],
        unique=False,
    )

    op.create_index(
        "ix_sonny_action_confirmations_expires_at",
        "sonny_action_confirmations",
        ["expires_at"],
        unique=False,
    )

    op.create_index(
        "ix_sonny_action_confirmations_consumed_at",
        "sonny_action_confirmations",
        ["consumed_at"],
        unique=False,
    )


def downgrade():
    op.drop_index(
        "ix_sonny_action_confirmations_consumed_at",
        table_name="sonny_action_confirmations",
    )

    op.drop_index(
        "ix_sonny_action_confirmations_expires_at",
        table_name="sonny_action_confirmations",
    )

    op.drop_index(
        "ix_sonny_action_confirmations_created_at",
        table_name="sonny_action_confirmations",
    )

    op.drop_index(
        "ix_sonny_action_confirmations_status",
        table_name="sonny_action_confirmations",
    )

    op.drop_index(
        "ix_sonny_action_confirmations_fingerprint",
        table_name="sonny_action_confirmations",
    )

    op.drop_index(
        "ix_sonny_action_confirmations_action",
        table_name="sonny_action_confirmations",
    )

    op.drop_index(
        "ix_sonny_action_confirmations_actor_id",
        table_name="sonny_action_confirmations",
    )

    op.drop_index(
        "ix_sonny_action_confirmations_company_id",
        table_name="sonny_action_confirmations",
    )

    op.drop_table(
        "sonny_action_confirmations"
    )
