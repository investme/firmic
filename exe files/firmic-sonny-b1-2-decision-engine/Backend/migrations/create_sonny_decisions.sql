BEGIN;

CREATE TABLE IF NOT EXISTS sonny_decisions (
    id VARCHAR PRIMARY KEY,
    company_id VARCHAR NOT NULL,
    fingerprint VARCHAR NOT NULL,
    decision_code VARCHAR NOT NULL,
    decision_type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    summary TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    expected_outcome TEXT NULL,
    priority VARCHAR NOT NULL DEFAULT 'medium',
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.80,
    risk_level VARCHAR NOT NULL DEFAULT 'medium',
    status VARCHAR NOT NULL DEFAULT 'proposed',
    approval_required BOOLEAN NOT NULL DEFAULT TRUE,
    approved_by VARCHAR NULL,
    approved_at TIMESTAMP NULL,
    rejected_by VARCHAR NULL,
    rejected_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    cancelled_by VARCHAR NULL,
    cancelled_at TIMESTAMP NULL,
    execution_status VARCHAR NOT NULL DEFAULT 'not_started',
    executed_at TIMESTAMP NULL,
    execution_result JSON NULL,
    state_version VARCHAR NOT NULL DEFAULT 'b1.1',
    evidence JSON NOT NULL DEFAULT '{}'::json,
    source VARCHAR NOT NULL DEFAULT 'sonny_state_engine',
    created_by VARCHAR NOT NULL DEFAULT 'sonny',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,

    CONSTRAINT fk_sonny_decisions_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_sonny_decision_company_fingerprint
        UNIQUE (company_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS ix_sonny_decisions_company_id
    ON sonny_decisions(company_id);

CREATE INDEX IF NOT EXISTS ix_sonny_decisions_fingerprint
    ON sonny_decisions(fingerprint);

CREATE INDEX IF NOT EXISTS ix_sonny_decisions_code
    ON sonny_decisions(decision_code);

CREATE INDEX IF NOT EXISTS ix_sonny_decisions_type
    ON sonny_decisions(decision_type);

CREATE INDEX IF NOT EXISTS ix_sonny_decisions_priority
    ON sonny_decisions(priority);

CREATE INDEX IF NOT EXISTS ix_sonny_decisions_status
    ON sonny_decisions(status);

CREATE INDEX IF NOT EXISTS ix_sonny_decisions_execution_status
    ON sonny_decisions(execution_status);

CREATE INDEX IF NOT EXISTS ix_sonny_decisions_created_at
    ON sonny_decisions(created_at);

COMMIT;
