"""add KYC questionnaire launch requirement

Revision ID: c7f4a8d92110
Revises: b1a51195fbb6
Create Date: 2026-08-11
"""

from alembic import op
import sqlalchemy as sa


revision = "c7f4a8d92110"
down_revision = "b1a51195fbb6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "company_launches",
        sa.Column(
            "kyc_questionnaire_required",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )

    op.add_column(
        "company_launches",
        sa.Column(
            "kyc_questionnaire_uploaded",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    op.add_column(
        "company_launches",
        sa.Column(
            "kyc_questionnaire_approved",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "company_launches",
        "kyc_questionnaire_approved",
    )

    op.drop_column(
        "company_launches",
        "kyc_questionnaire_uploaded",
    )

    op.drop_column(
        "company_launches",
        "kyc_questionnaire_required",
    )