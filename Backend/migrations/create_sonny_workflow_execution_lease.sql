-- ==========================================================
-- B8.1 — Sonny workflow production execution lease
-- ==========================================================
--
-- Workflow status remains the business lifecycle state.
-- These columns provide temporary infrastructure ownership
-- for multi-worker-safe autonomous execution.
--
-- This migration is intentionally nullable so existing
-- workflows remain valid and unclaimed.
-- ==========================================================

ALTER TABLE sonny_workflows
    ADD COLUMN IF NOT EXISTS execution_claimed_by VARCHAR NULL;

ALTER TABLE sonny_workflows
    ADD COLUMN IF NOT EXISTS execution_claimed_at TIMESTAMP NULL;

ALTER TABLE sonny_workflows
    ADD COLUMN IF NOT EXISTS execution_lease_expires_at TIMESTAMP NULL;

ALTER TABLE sonny_workflows
    ADD COLUMN IF NOT EXISTS execution_heartbeat_at TIMESTAMP NULL;


CREATE INDEX IF NOT EXISTS ix_sonny_workflows_execution_claimed_by
    ON sonny_workflows(execution_claimed_by);

CREATE INDEX IF NOT EXISTS ix_sonny_workflows_execution_lease_expires_at
    ON sonny_workflows(execution_lease_expires_at);
