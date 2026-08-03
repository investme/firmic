"""enforce unique launch milestones

Revision ID: 927599baf739
Revises: 2a90648977fe

"""

from typing import Sequence, Union

from alembic import op


revision: str = "927599baf739"
down_revision: Union[str, Sequence[str], None] = "2a90648977fe"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "uq_launch_milestones_application_key",
        "launch_milestones",
        ["launch_application_id", "key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "uq_launch_milestones_application_key",
        table_name="launch_milestones",
    )