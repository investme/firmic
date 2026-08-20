-- ==========================================================
-- B9.2 — Persistent workflow-worker liveness
-- ==========================================================
--
-- Dedicated worker-process heartbeat state.
--
-- This is intentionally separate from Sonny workflow lease
-- heartbeats. A workflow lease answers "who owns this workflow?"
-- while this table answers "is the worker process alive?"
-- ==========================================================

CREATE TABLE IF NOT EXISTS workflow_worker_heartbeats (
    id VARCHAR PRIMARY KEY,
    worker_id VARCHAR NOT NULL UNIQUE,
    company_id VARCHAR NULL,
    status VARCHAR NOT NULL DEFAULT 'starting',

    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    last_dispatch_at TIMESTAMP NULL,
    last_dispatch_status VARCHAR NULL,

    last_error_at TIMESTAMP NULL,
    last_error_message TEXT NULL,

    stopped_at TIMESTAMP NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_workflow_worker_heartbeats_worker_id
    ON workflow_worker_heartbeats(worker_id);

CREATE INDEX IF NOT EXISTS ix_workflow_worker_heartbeats_company_id
    ON workflow_worker_heartbeats(company_id);

CREATE INDEX IF NOT EXISTS ix_workflow_worker_heartbeats_status
    ON workflow_worker_heartbeats(status);

CREATE INDEX IF NOT EXISTS ix_workflow_worker_heartbeats_last_heartbeat_at
    ON workflow_worker_heartbeats(last_heartbeat_at);

CREATE INDEX IF NOT EXISTS ix_workflow_worker_heartbeats_status_heartbeat
    ON workflow_worker_heartbeats(status, last_heartbeat_at);
