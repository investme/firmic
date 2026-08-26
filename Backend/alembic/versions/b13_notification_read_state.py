"""B13 authoritative notification read-state persistence.

Revision ID: b13_notification_read_state
Revises: b12_5_action_confirmations
"""

from alembic import op
import sqlalchemy as sa


revision = "b13_notification_read_state"
down_revision = "b12_5_action_confirmations"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "notification_read_states",
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
            "activity_log_id",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "read_at",
            sa.DateTime(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            name="fk_notification_read_states_company",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id",
            "actor_id",
            "activity_log_id",
            name="uq_notification_read_state_company_actor_activity",
        ),
    )

    op.create_index(
        "ix_notification_read_states_id",
        "notification_read_states",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_notification_read_states_company_id",
        "notification_read_states",
        ["company_id"],
        unique=False,
    )

    op.create_index(
        "ix_notification_read_states_actor_id",
        "notification_read_states",
        ["actor_id"],
        unique=False,
    )

    op.create_index(
        "ix_notification_read_states_activity_log_id",
        "notification_read_states",
        ["activity_log_id"],
        unique=False,
    )

    op.create_index(
        "ix_notification_read_states_read_at",
        "notification_read_states",
        ["read_at"],
        unique=False,
    )


def downgrade():
    op.drop_index(
        "ix_notification_read_states_read_at",
        table_name="notification_read_states",
    )

    op.drop_index(
        "ix_notification_read_states_activity_log_id",
        table_name="notification_read_states",
    )

    op.drop_index(
        "ix_notification_read_states_actor_id",
        table_name="notification_read_states",
    )

    op.drop_index(
        "ix_notification_read_states_company_id",
        table_name="notification_read_states",
    )

    op.drop_index(
        "ix_notification_read_states_id",
        table_name="notification_read_states",
    )

    op.drop_table("notification_read_states")
