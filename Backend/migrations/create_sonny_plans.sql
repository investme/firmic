BEGIN;

CREATE TABLE IF NOT EXISTS sonny_plans (
    id VARCHAR PRIMARY KEY,
    company_id VARCHAR NOT NULL,
    plan_date DATE NOT NULL,
    plan_type VARCHAR NOT NULL DEFAULT 'daily',
    title VARCHAR NOT NULL,
    executive_brief TEXT NOT NULL,
    health_score INTEGER NOT NULL DEFAULT 0,
    status VARCHAR NOT NULL DEFAULT 'active',
    critical_count INTEGER NOT NULL DEFAULT 0,
    high_count INTEGER NOT NULL DEFAULT 0,
    approval_count INTEGER NOT NULL DEFAULT 0,
    running_workflow_count INTEGER NOT NULL DEFAULT 0,
    blocked_workflow_count INTEGER NOT NULL DEFAULT 0,
    state_version VARCHAR NOT NULL DEFAULT 'b1.1',
    source_snapshot JSON NOT NULL DEFAULT '{}'::json,
    generated_by VARCHAR NOT NULL DEFAULT 'sonny',
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sonny_plans_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT uq_sonny_plan_company_date_type UNIQUE (company_id, plan_date, plan_type)
);

CREATE INDEX IF NOT EXISTS ix_sonny_plans_company_id ON sonny_plans(company_id);
CREATE INDEX IF NOT EXISTS ix_sonny_plans_plan_date ON sonny_plans(plan_date);
CREATE INDEX IF NOT EXISTS ix_sonny_plans_plan_type ON sonny_plans(plan_type);
CREATE INDEX IF NOT EXISTS ix_sonny_plans_status ON sonny_plans(status);
CREATE INDEX IF NOT EXISTS ix_sonny_plans_health_score ON sonny_plans(health_score);
CREATE INDEX IF NOT EXISTS ix_sonny_plans_generated_at ON sonny_plans(generated_at);

CREATE TABLE IF NOT EXISTS sonny_plan_items (
    id VARCHAR PRIMARY KEY,
    plan_id VARCHAR NOT NULL,
    company_id VARCHAR NOT NULL,
    fingerprint VARCHAR NOT NULL,
    item_code VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    summary TEXT NOT NULL,
    recommended_action TEXT NULL,
    priority VARCHAR NOT NULL DEFAULT 'medium',
    priority_score INTEGER NOT NULL DEFAULT 50,
    status VARCHAR NOT NULL DEFAULT 'planned',
    assigned_role VARCHAR NULL,
    requires_founder_approval INTEGER NOT NULL DEFAULT 0,
    decision_id VARCHAR NULL,
    workflow_id VARCHAR NULL,
    task_id VARCHAR NULL,
    support_ticket_id VARCHAR NULL,
    scheduled_for TIMESTAMP NULL,
    due_at TIMESTAMP NULL,
    source_type VARCHAR NOT NULL DEFAULT 'sonny_planner',
    source_id VARCHAR NULL,
    evidence JSON NOT NULL DEFAULT '{}'::json,
    sort_order INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sonny_plan_items_plan FOREIGN KEY (plan_id) REFERENCES sonny_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_sonny_plan_items_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT fk_sonny_plan_items_decision FOREIGN KEY (decision_id) REFERENCES sonny_decisions(id) ON DELETE SET NULL,
    CONSTRAINT fk_sonny_plan_items_workflow FOREIGN KEY (workflow_id) REFERENCES sonny_workflows(id) ON DELETE SET NULL,
    CONSTRAINT fk_sonny_plan_items_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    CONSTRAINT fk_sonny_plan_items_support_ticket FOREIGN KEY (support_ticket_id) REFERENCES support_tickets(id) ON DELETE SET NULL,
    CONSTRAINT uq_sonny_plan_item_fingerprint UNIQUE (plan_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_plan_id ON sonny_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_company_id ON sonny_plan_items(company_id);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_fingerprint ON sonny_plan_items(fingerprint);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_code ON sonny_plan_items(item_code);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_category ON sonny_plan_items(category);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_priority ON sonny_plan_items(priority);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_priority_score ON sonny_plan_items(priority_score);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_status ON sonny_plan_items(status);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_assigned_role ON sonny_plan_items(assigned_role);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_decision_id ON sonny_plan_items(decision_id);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_workflow_id ON sonny_plan_items(workflow_id);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_task_id ON sonny_plan_items(task_id);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_support_ticket_id ON sonny_plan_items(support_ticket_id);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_scheduled_for ON sonny_plan_items(scheduled_for);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_due_at ON sonny_plan_items(due_at);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_sort_order ON sonny_plan_items(sort_order);
CREATE INDEX IF NOT EXISTS ix_sonny_plan_items_created_at ON sonny_plan_items(created_at);

COMMIT;
