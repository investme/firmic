"""link company AI workforce to canonical Sonny agent registry

Revision ID: firmic_ops_registry_link
Revises: 85b891f6cdeb
Create Date: 2026-08-18
"""

from alembic import op
import sqlalchemy as sa


revision = "firmic_ops_registry_link"
down_revision = "85b891f6cdeb"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "company_ai_agents",
        sa.Column(
            "registry_agent_id",
            sa.String(),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_company_ai_agents_registry_agent",
        "company_ai_agents",
        "sonny_agent_registry",
        ["registry_agent_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.create_index(
        "ix_company_ai_agents_registry_agent_id",
        "company_ai_agents",
        ["registry_agent_id"],
    )


def downgrade():
    op.drop_index(
        "ix_company_ai_agents_registry_agent_id",
        table_name="company_ai_agents",
    )

    op.drop_constraint(
        "fk_company_ai_agents_registry_agent",
        "company_ai_agents",
        type_="foreignkey",
    )

    op.drop_column(
        "company_ai_agents",
        "registry_agent_id",
    )
