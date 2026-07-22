BEGIN;

CREATE TABLE IF NOT EXISTS sonny_insights (
    id VARCHAR PRIMARY KEY,
    company_id VARCHAR NOT NULL,
    fingerprint VARCHAR NOT NULL,
    insight_code VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    summary TEXT NOT NULL,
    pattern_type VARCHAR NOT NULL,
    severity VARCHAR NOT NULL DEFAULT 'medium',
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.80,
    trend VARCHAR NOT NULL DEFAULT 'stable',
    status VARCHAR NOT NULL DEFAULT 'active',
    recommended_action TEXT NULL,
    source_summary JSON NOT NULL DEFAULT '{}'::json,
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    first_detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_detected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    dismissed_at TIMESTAMP NULL,
    dismissed_by VARCHAR NULL,
    is_actionable BOOLEAN NOT NULL DEFAULT TRUE,
    state_version VARCHAR NOT NULL DEFAULT 'b2.4',
    generated_by VARCHAR NOT NULL DEFAULT 'sonny_memory_intelligence',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sonny_insights_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_sonny_insight_company_fingerprint
        UNIQUE (company_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS ix_sonny_insights_company_id
    ON sonny_insights(company_id);

CREATE INDEX IF NOT EXISTS ix_sonny_insights_fingerprint
    ON sonny_insights(fingerprint);

CREATE INDEX IF NOT EXISTS ix_sonny_insights_code
    ON sonny_insights(insight_code);

CREATE INDEX IF NOT EXISTS ix_sonny_insights_category
    ON sonny_insights(category);

CREATE INDEX IF NOT EXISTS ix_sonny_insights_pattern_type
    ON sonny_insights(pattern_type);

CREATE INDEX IF NOT EXISTS ix_sonny_insights_severity
    ON sonny_insights(severity);

CREATE INDEX IF NOT EXISTS ix_sonny_insights_trend
    ON sonny_insights(trend);

CREATE INDEX IF NOT EXISTS ix_sonny_insights_status
    ON sonny_insights(status);

CREATE INDEX IF NOT EXISTS ix_sonny_insights_is_actionable
    ON sonny_insights(is_actionable);

CREATE INDEX IF NOT EXISTS ix_sonny_insights_first_detected_at
    ON sonny_insights(first_detected_at);

CREATE INDEX IF NOT EXISTS ix_sonny_insights_last_detected_at
    ON sonny_insights(last_detected_at);

CREATE INDEX IF NOT EXISTS ix_sonny_insights_created_at
    ON sonny_insights(created_at);


CREATE TABLE IF NOT EXISTS sonny_insight_evidence (
    id VARCHAR PRIMARY KEY,
    insight_id VARCHAR NOT NULL,
    company_id VARCHAR NOT NULL,
    evidence_fingerprint VARCHAR NOT NULL,
    source_type VARCHAR NOT NULL,
    source_id VARCHAR NULL,
    event_type VARCHAR NULL,
    description TEXT NOT NULL,
    evidence_data JSON NOT NULL DEFAULT '{}'::json,
    observed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sonny_insight_evidence_insight
        FOREIGN KEY (insight_id)
        REFERENCES sonny_insights(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_sonny_insight_evidence_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_sonny_insight_evidence_fingerprint
        UNIQUE (insight_id, evidence_fingerprint)
);

CREATE INDEX IF NOT EXISTS ix_sonny_insight_evidence_insight_id
    ON sonny_insight_evidence(insight_id);

CREATE INDEX IF NOT EXISTS ix_sonny_insight_evidence_company_id
    ON sonny_insight_evidence(company_id);

CREATE INDEX IF NOT EXISTS ix_sonny_insight_evidence_fingerprint
    ON sonny_insight_evidence(evidence_fingerprint);

CREATE INDEX IF NOT EXISTS ix_sonny_insight_evidence_source_type
    ON sonny_insight_evidence(source_type);

CREATE INDEX IF NOT EXISTS ix_sonny_insight_evidence_source_id
    ON sonny_insight_evidence(source_id);

CREATE INDEX IF NOT EXISTS ix_sonny_insight_evidence_event_type
    ON sonny_insight_evidence(event_type);

CREATE INDEX IF NOT EXISTS ix_sonny_insight_evidence_observed_at
    ON sonny_insight_evidence(observed_at);

CREATE INDEX IF NOT EXISTS ix_sonny_insight_evidence_created_at
    ON sonny_insight_evidence(created_at);

COMMIT;
