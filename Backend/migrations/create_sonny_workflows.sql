BEGIN;

CREATE TABLE IF NOT EXISTS sonny_workflows (
    id VARCHAR PRIMARY KEY,
    company_id VARCHAR NOT NULL,
    decision_id VARCHAR NOT NULL,
    template_code VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT NULL,
    status VARCHAR NOT NULL DEFAULT 'draft',
    progress_percent INTEGER NOT NULL DEFAULT 0,
    current_step_order INTEGER NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    cancelled_by VARCHAR NULL,
    result JSON NULL,
    created_by VARCHAR NOT NULL DEFAULT 'sonny',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sonny_workflows_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_sonny_workflows_decision
        FOREIGN KEY (decision_id)
        REFERENCES sonny_decisions(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_sonny_workflow_decision
        UNIQUE (decision_id)
);

CREATE INDEX IF NOT EXISTS ix_sonny_workflows_company_id
    ON sonny_workflows(company_id);

CREATE INDEX IF NOT EXISTS ix_sonny_workflows_decision_id
    ON sonny_workflows(decision_id);

CREATE INDEX IF NOT EXISTS ix_sonny_workflows_template_code
    ON sonny_workflows(template_code);

CREATE INDEX IF NOT EXISTS ix_sonny_workflows_status
    ON sonny_workflows(status);

CREATE INDEX IF NOT EXISTS ix_sonny_workflows_created_at
    ON sonny_workflows(created_at);


CREATE TABLE IF NOT EXISTS sonny_workflow_steps (
    id VARCHAR PRIMARY KEY,
    workflow_id VARCHAR NOT NULL,
    step_order INTEGER NOT NULL,
    step_code VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT NULL,
    assigned_role VARCHAR NOT NULL DEFAULT 'founder',
    status VARCHAR NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    completed_by VARCHAR NULL,
    output JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sonny_workflow_steps_workflow
        FOREIGN KEY (workflow_id)
        REFERENCES sonny_workflows(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_sonny_workflow_step_order
        UNIQUE (workflow_id, step_order)
);

CREATE INDEX IF NOT EXISTS ix_sonny_workflow_steps_workflow_id
    ON sonny_workflow_steps(workflow_id);

CREATE INDEX IF NOT EXISTS ix_sonny_workflow_steps_order
    ON sonny_workflow_steps(step_order);

CREATE INDEX IF NOT EXISTS ix_sonny_workflow_steps_code
    ON sonny_workflow_steps(step_code);

CREATE INDEX IF NOT EXISTS ix_sonny_workflow_steps_role
    ON sonny_workflow_steps(assigned_role);

CREATE INDEX IF NOT EXISTS ix_sonny_workflow_steps_status
    ON sonny_workflow_steps(status);

CREATE INDEX IF NOT EXISTS ix_sonny_workflow_steps_created_at
    ON sonny_workflow_steps(created_at);

COMMIT;
