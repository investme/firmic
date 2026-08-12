"""add company UAE residency

Revision ID: d4e8a1c6f210
Revises: c7f4a8d92110
"""

from alembic import op
import sqlalchemy as sa


revision = "d4e8a1c6f210"
down_revision = "c7f4a8d92110"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "companies",
        sa.Column(
            "is_uae_resident",
            sa.Boolean(),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column(
        "companies",
        "is_uae_resident",
    )
