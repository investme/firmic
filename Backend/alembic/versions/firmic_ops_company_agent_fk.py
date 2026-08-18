"""enforce company ownership for AI workforce

Revision ID: firmic_ops_company_agent_fk
Revises: firmic_ops_registry_link
Create Date: 2026-08-18
"""

from alembic import op


revision = "firmic_ops_company_agent_fk"
down_revision = "firmic_ops_registry_link"
branch_labels = None
depends_on = None


def upgrade():
    op.create_foreign_key(
        "fk_company_ai_agents_company",
        "company_ai_agents",
        "companies",
        ["company_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade():
    op.drop_constraint(
        "fk_company_ai_agents_company",
        "company_ai_agents",
        type_="foreignkey",
    )
