"""add workforce orchestrator tables

Revision ID: b8_workforce_orchestrator
Revises:
Create Date: 2026-07-18
"""

from alembic import op
import sqlalchemy as sa


revision = "b8_workforce_orchestrator"
down_revision = "dbfd632bc985"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "workforce_jobs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("company_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("request_text", sa.Text(), nullable=False),
        sa.Column("assigned_agent", sa.String(length=80), nullable=False),
        sa.Column("assigned_role", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("source_type", sa.String(length=80), nullable=False),
        sa.Column("source_id", sa.String(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("failed_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_workforce_jobs_company_id",
        "workforce_jobs",
        ["company_id"],
    )
    op.create_index(
        "ix_workforce_jobs_assigned_agent",
        "workforce_jobs",
        ["assigned_agent"],
    )
    op.create_index(
        "ix_workforce_jobs_status",
        "workforce_jobs",
        ["status"],
    )

    op.create_table(
        "workforce_timeline_events",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("company_id", sa.String(), nullable=False),
        sa.Column("job_id", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("actor", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=True),
        sa.Column("progress", sa.Integer(), nullable=True),
        sa.Column("event_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["company_id"],
            ["companies.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["job_id"],
            ["workforce_jobs.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_workforce_timeline_events_company_id",
        "workforce_timeline_events",
        ["company_id"],
    )
    op.create_index(
        "ix_workforce_timeline_events_job_id",
        "workforce_timeline_events",
        ["job_id"],
    )
    op.create_index(
        "ix_workforce_timeline_events_created_at",
        "workforce_timeline_events",
        ["created_at"],
    )


def downgrade():
    op.drop_index(
        "ix_workforce_timeline_events_created_at",
        table_name="workforce_timeline_events",
    )
    op.drop_index(
        "ix_workforce_timeline_events_job_id",
        table_name="workforce_timeline_events",
    )
    op.drop_index(
        "ix_workforce_timeline_events_company_id",
        table_name="workforce_timeline_events",
    )
    op.drop_table("workforce_timeline_events")

    op.drop_index(
        "ix_workforce_jobs_status",
        table_name="workforce_jobs",
    )
    op.drop_index(
        "ix_workforce_jobs_assigned_agent",
        table_name="workforce_jobs",
    )
    op.drop_index(
        "ix_workforce_jobs_company_id",
        table_name="workforce_jobs",
    )
    op.drop_table("workforce_jobs")
