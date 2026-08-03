"""add launch center foundation

Revision ID: 2a90648977fe
Revises: b8_workforce_orchestrator
Create Date: 2026-08-03 10:31:42.627906

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Revision identifiers, used by Alembic.
revision: str = "2a90648977fe"
down_revision: Union[str, Sequence[str], None] = (
    "b8_workforce_orchestrator"
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the Launch Center foundation tables."""

    # =========================================================
    # Formation partners
    # =========================================================

    op.create_table(
        "formation_partners",
        sa.Column(
            "id",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "name",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "country",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "jurisdiction",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "website",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "logo_url",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "contact_email",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "contact_phone",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "languages",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "services",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "starting_price_usd",
            sa.Float(),
            nullable=True,
        ),
        sa.Column(
            "average_completion_days",
            sa.Float(),
            nullable=True,
        ),
        sa.Column(
            "rating",
            sa.Float(),
            nullable=True,
        ),
        sa.Column(
            "is_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_formation_partners_id",
        "formation_partners",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_formation_partners_name",
        "formation_partners",
        ["name"],
        unique=True,
    )

    op.create_index(
        "ix_formation_partners_country",
        "formation_partners",
        ["country"],
        unique=False,
    )

    op.create_index(
        "ix_formation_partners_jurisdiction",
        "formation_partners",
        ["jurisdiction"],
        unique=False,
    )

    op.create_index(
        "ix_formation_partners_is_active",
        "formation_partners",
        ["is_active"],
        unique=False,
    )

    # =========================================================
    # Bank partners
    # =========================================================

    op.create_table(
        "bank_partners",
        sa.Column(
            "id",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "name",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "country",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "website",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "logo_url",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "contact_email",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "supported_company_types",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "requirements",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "minimum_balance_usd",
            sa.Float(),
            nullable=True,
        ),
        sa.Column(
            "average_review_days",
            sa.Float(),
            nullable=True,
        ),
        sa.Column(
            "supports_remote_onboarding",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_bank_partners_id",
        "bank_partners",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_bank_partners_name",
        "bank_partners",
        ["name"],
        unique=True,
    )

    op.create_index(
        "ix_bank_partners_country",
        "bank_partners",
        ["country"],
        unique=False,
    )

    op.create_index(
        "ix_bank_partners_is_active",
        "bank_partners",
        ["is_active"],
        unique=False,
    )

    # =========================================================
    # Launch applications
    # =========================================================

    op.create_table(
        "launch_applications",
        sa.Column(
            "id",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "company_id",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(),
            nullable=False,
            server_default="in_progress",
        ),
        sa.Column(
            "country",
            sa.String(),
            nullable=False,
            server_default="United Arab Emirates",
        ),
        sa.Column(
            "jurisdiction",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "business_activity",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "business_description",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "formation_partner_id",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "bank_partner_id",
            sa.String(),
            nullable=True,
        ),
        sa.Column(
            "formation_status",
            sa.String(),
            nullable=False,
            server_default="not_started",
        ),
        sa.Column(
            "banking_status",
            sa.String(),
            nullable=False,
            server_default="not_started",
        ),
        sa.Column(
            "office_status",
            sa.String(),
            nullable=False,
            server_default="not_started",
        ),
        sa.Column(
            "workspace_status",
            sa.String(),
            nullable=False,
            server_default="initiated",
        ),
        sa.Column(
            "estimated_completion_at",
            sa.DateTime(),
            nullable=True,
        ),
        sa.Column(
            "completed_at",
            sa.DateTime(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["formation_partner_id"],
            ["formation_partners.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["bank_partner_id"],
            ["bank_partners.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_launch_applications_id",
        "launch_applications",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_launch_applications_user_id",
        "launch_applications",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        "ix_launch_applications_company_id",
        "launch_applications",
        ["company_id"],
        unique=True,
    )

    op.create_index(
        "ix_launch_applications_status",
        "launch_applications",
        ["status"],
        unique=False,
    )

    op.create_index(
        "ix_launch_applications_jurisdiction",
        "launch_applications",
        ["jurisdiction"],
        unique=False,
    )

    op.create_index(
        "ix_launch_applications_formation_partner_id",
        "launch_applications",
        ["formation_partner_id"],
        unique=False,
    )

    op.create_index(
        "ix_launch_applications_bank_partner_id",
        "launch_applications",
        ["bank_partner_id"],
        unique=False,
    )

    op.create_index(
        "ix_launch_applications_formation_status",
        "launch_applications",
        ["formation_status"],
        unique=False,
    )

    op.create_index(
        "ix_launch_applications_banking_status",
        "launch_applications",
        ["banking_status"],
        unique=False,
    )

    op.create_index(
        "ix_launch_applications_office_status",
        "launch_applications",
        ["office_status"],
        unique=False,
    )

    op.create_index(
        "ix_launch_applications_workspace_status",
        "launch_applications",
        ["workspace_status"],
        unique=False,
    )

    # =========================================================
    # Launch milestones
    # =========================================================

    op.create_table(
        "launch_milestones",
        sa.Column(
            "id",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "launch_application_id",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "key",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "title",
            sa.String(),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(),
            nullable=False,
            server_default="not_started",
        ),
        sa.Column(
            "position",
            sa.Float(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "started_at",
            sa.DateTime(),
            nullable=True,
        ),
        sa.Column(
            "completed_at",
            sa.DateTime(),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["launch_application_id"],
            ["launch_applications.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_launch_milestones_id",
        "launch_milestones",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_launch_milestones_launch_application_id",
        "launch_milestones",
        ["launch_application_id"],
        unique=False,
    )

    op.create_index(
        "ix_launch_milestones_key",
        "launch_milestones",
        ["key"],
        unique=False,
    )

    op.create_index(
        "ix_launch_milestones_status",
        "launch_milestones",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    """Remove the Launch Center foundation tables."""

    op.drop_index(
        "ix_launch_milestones_status",
        table_name="launch_milestones",
    )
    op.drop_index(
        "ix_launch_milestones_key",
        table_name="launch_milestones",
    )
    op.drop_index(
        "ix_launch_milestones_launch_application_id",
        table_name="launch_milestones",
    )
    op.drop_index(
        "ix_launch_milestones_id",
        table_name="launch_milestones",
    )
    op.drop_table("launch_milestones")

    op.drop_index(
        "ix_launch_applications_workspace_status",
        table_name="launch_applications",
    )
    op.drop_index(
        "ix_launch_applications_office_status",
        table_name="launch_applications",
    )
    op.drop_index(
        "ix_launch_applications_banking_status",
        table_name="launch_applications",
    )
    op.drop_index(
        "ix_launch_applications_formation_status",
        table_name="launch_applications",
    )
    op.drop_index(
        "ix_launch_applications_bank_partner_id",
        table_name="launch_applications",
    )
    op.drop_index(
        "ix_launch_applications_formation_partner_id",
        table_name="launch_applications",
    )
    op.drop_index(
        "ix_launch_applications_jurisdiction",
        table_name="launch_applications",
    )
    op.drop_index(
        "ix_launch_applications_status",
        table_name="launch_applications",
    )
    op.drop_index(
        "ix_launch_applications_company_id",
        table_name="launch_applications",
    )
    op.drop_index(
        "ix_launch_applications_user_id",
        table_name="launch_applications",
    )
    op.drop_index(
        "ix_launch_applications_id",
        table_name="launch_applications",
    )
    op.drop_table("launch_applications")

    op.drop_index(
        "ix_bank_partners_is_active",
        table_name="bank_partners",
    )
    op.drop_index(
        "ix_bank_partners_country",
        table_name="bank_partners",
    )
    op.drop_index(
        "ix_bank_partners_name",
        table_name="bank_partners",
    )
    op.drop_index(
        "ix_bank_partners_id",
        table_name="bank_partners",
    )
    op.drop_table("bank_partners")

    op.drop_index(
        "ix_formation_partners_is_active",
        table_name="formation_partners",
    )
    op.drop_index(
        "ix_formation_partners_jurisdiction",
        table_name="formation_partners",
    )
    op.drop_index(
        "ix_formation_partners_country",
        table_name="formation_partners",
    )
    op.drop_index(
        "ix_formation_partners_name",
        table_name="formation_partners",
    )
    op.drop_index(
        "ix_formation_partners_id",
        table_name="formation_partners",
    )
    op.drop_table("formation_partners")