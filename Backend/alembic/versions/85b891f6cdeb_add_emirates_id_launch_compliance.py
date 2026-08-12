"""add Emirates ID launch compliance

Revision ID: 85b891f6cdeb
Revises: d4e8a1c6f210
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "85b891f6cdeb"
down_revision: Union[str, Sequence[str], None] = "d4e8a1c6f210"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "company_launches",
        sa.Column(
            "emirates_id_required",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    op.add_column(
        "company_launches",
        sa.Column(
            "emirates_id_uploaded",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    op.add_column(
        "company_launches",
        sa.Column(
            "emirates_id_approved",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "company_launches",
        "emirates_id_approved",
    )
    op.drop_column(
        "company_launches",
        "emirates_id_uploaded",
    )
    op.drop_column(
        "company_launches",
        "emirates_id_required",
    )
