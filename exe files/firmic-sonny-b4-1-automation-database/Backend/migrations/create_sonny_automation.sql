BEGIN;

CREATE TABLE IF NOT EXISTS sonny_automation_runs (
    id VARCHAR PRIMARY KEY,
    company_id VARCHAR NOT NULL,
    decision_id VARCHAR NULL,
    workflow_id VARCHAR NULL,
    trigger_type VARCHAR NOT NULL DEFAULT 'manual',
    automation_type VARCHAR NOT NULL,
    idempotency_key VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'draft',
    approval_required BOOLEAN NOT NULL DEFAULT TRUE,
    approved_by VARCHAR NULL,
    approved_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    created_by VARCHAR NOT NULL DEFAULT 'sonny',
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    error_message TEXT NULL,
    input_payload JSON NOT NULL DEFAULT '{}'::json,
    output_payload JSON NOT NULL DEFAULT '{}'::json,
    run_metadata JSON NOT NULL DEFAULT '{}'::json,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sonny_automation_runs_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_sonny_automation_runs_decision
        FOREIGN KEY (decision_id)
        REFERENCES sonny_decisions(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_sonny_automation_runs_workflow
        FOREIGN KEY (workflow_id)
        REFERENCES sonny_workflows(id)
        ON DELETE SET NULL,

    CONSTRAINT uq_sonny_automation_company_idempotency
        UNIQUE (company_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_runs_company_id
    ON sonny_automation_runs(company_id);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_runs_decision_id
    ON sonny_automation_runs(decision_id);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_runs_workflow_id
    ON sonny_automation_runs(workflow_id);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_runs_trigger_type
    ON sonny_automation_runs(trigger_type);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_runs_automation_type
    ON sonny_automation_runs(automation_type);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_runs_idempotency_key
    ON sonny_automation_runs(idempotency_key);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_runs_status
    ON sonny_automation_runs(status);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_runs_approval_required
    ON sonny_automation_runs(approval_required);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_runs_started_at
    ON sonny_automation_runs(started_at);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_runs_completed_at
    ON sonny_automation_runs(completed_at);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_runs_created_at
    ON sonny_automation_runs(created_at);


CREATE TABLE IF NOT EXISTS sonny_automation_actions (
    id VARCHAR PRIMARY KEY,
    automation_run_id VARCHAR NOT NULL,
    company_id VARCHAR NOT NULL,
    workflow_step_id VARCHAR NULL,
    action_order INTEGER NOT NULL,
    action_code VARCHAR NOT NULL,
    service_name VARCHAR NOT NULL,
    target_type VARCHAR NULL,
    target_id VARCHAR NULL,
    idempotency_key VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'pending',
    approval_required BOOLEAN NOT NULL DEFAULT TRUE,
    approved_by VARCHAR NULL,
    approved_at TIMESTAMP NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    error_message TEXT NULL,
    payload JSON NOT NULL DEFAULT '{}'::json,
    result JSON NOT NULL DEFAULT '{}'::json,
    action_metadata JSON NOT NULL DEFAULT '{}'::json,
    is_compensating_action BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sonny_automation_actions_run
        FOREIGN KEY (automation_run_id)
        REFERENCES sonny_automation_runs(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_sonny_automation_actions_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_sonny_automation_actions_workflow_step
        FOREIGN KEY (workflow_step_id)
        REFERENCES sonny_workflow_steps(id)
        ON DELETE SET NULL,

    CONSTRAINT uq_sonny_automation_action_order
        UNIQUE (automation_run_id, action_order),

    CONSTRAINT uq_sonny_automation_action_idempotency
        UNIQUE (automation_run_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_run_id
    ON sonny_automation_actions(automation_run_id);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_company_id
    ON sonny_automation_actions(company_id);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_workflow_step_id
    ON sonny_automation_actions(workflow_step_id);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_action_order
    ON sonny_automation_actions(action_order);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_action_code
    ON sonny_automation_actions(action_code);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_service_name
    ON sonny_automation_actions(service_name);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_target_type
    ON sonny_automation_actions(target_type);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_target_id
    ON sonny_automation_actions(target_id);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_idempotency_key
    ON sonny_automation_actions(idempotency_key);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_status
    ON sonny_automation_actions(status);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_approval_required
    ON sonny_automation_actions(approval_required);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_started_at
    ON sonny_automation_actions(started_at);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_completed_at
    ON sonny_automation_actions(completed_at);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_is_compensating
    ON sonny_automation_actions(is_compensating_action);

CREATE INDEX IF NOT EXISTS ix_sonny_automation_actions_created_at
    ON sonny_automation_actions(created_at);

COMMIT;
