BEGIN;

CREATE TABLE IF NOT EXISTS firmic_intelligence_memories (
    id VARCHAR PRIMARY KEY,
    company_id VARCHAR NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,
    agent_scope VARCHAR NOT NULL DEFAULT 'shared',
    memory_type VARCHAR NOT NULL DEFAULT 'fact',
    memory_key VARCHAR NULL,
    title VARCHAR NOT NULL,
    content TEXT NOT NULL,
    source_agent VARCHAR NOT NULL DEFAULT 'system',
    source_type VARCHAR NOT NULL DEFAULT 'observation',
    source_id VARCHAR NULL,
    provenance JSON NOT NULL DEFAULT '{}'::json,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.60,
    utility_score DOUBLE PRECISION NOT NULL DEFAULT 0.50,
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    status VARCHAR NOT NULL DEFAULT 'candidate',
    last_confirmed_at TIMESTAMP NULL,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_firmic_intelligence_memory_key
        UNIQUE (company_id, agent_scope, memory_key)
);

CREATE INDEX IF NOT EXISTS ix_firmic_intelligence_memories_company
    ON firmic_intelligence_memories(company_id);

CREATE INDEX IF NOT EXISTS ix_firmic_intelligence_memories_scope
    ON firmic_intelligence_memories(agent_scope);

CREATE INDEX IF NOT EXISTS ix_firmic_intelligence_memories_status
    ON firmic_intelligence_memories(status);

CREATE TABLE IF NOT EXISTS firmic_intelligence_learning_events (
    id VARCHAR PRIMARY KEY,
    company_id VARCHAR NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,
    agent VARCHAR NOT NULL DEFAULT 'system',
    event_type VARCHAR NOT NULL,
    subject_type VARCHAR NULL,
    subject_id VARCHAR NULL,
    action VARCHAR NULL,
    outcome VARCHAR NULL,
    outcome_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    evidence JSON NOT NULL DEFAULT '{}'::json,
    related_memory_id VARCHAR NULL
        REFERENCES firmic_intelligence_memories(id)
        ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_firmic_learning_events_company
    ON firmic_intelligence_learning_events(company_id);

CREATE INDEX IF NOT EXISTS ix_firmic_learning_events_agent
    ON firmic_intelligence_learning_events(agent);

CREATE INDEX IF NOT EXISTS ix_firmic_learning_events_type
    ON firmic_intelligence_learning_events(event_type);

CREATE TABLE IF NOT EXISTS firmic_intelligence_handoffs (
    id VARCHAR PRIMARY KEY,
    company_id VARCHAR NOT NULL
        REFERENCES companies(id)
        ON DELETE CASCADE,
    handoff_key VARCHAR NOT NULL,
    from_agent VARCHAR NOT NULL,
    to_agent VARCHAR NOT NULL,
    handoff_type VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'pending',
    summary TEXT NOT NULL,
    payload JSON NOT NULL DEFAULT '{}'::json,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    CONSTRAINT uq_firmic_intelligence_handoff_key
        UNIQUE (company_id, handoff_key)
);

CREATE INDEX IF NOT EXISTS ix_firmic_handoffs_company
    ON firmic_intelligence_handoffs(company_id);

CREATE INDEX IF NOT EXISTS ix_firmic_handoffs_status
    ON firmic_intelligence_handoffs(status);

COMMIT;
