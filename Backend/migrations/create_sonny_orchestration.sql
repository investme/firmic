BEGIN;

CREATE TABLE IF NOT EXISTS sonny_agent_registry (
    id VARCHAR PRIMARY KEY,
    agent_code VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    role VARCHAR NOT NULL,
    description TEXT NULL,
    status VARCHAR NOT NULL DEFAULT 'active',
    agent_type VARCHAR NOT NULL DEFAULT 'specialist',
    capabilities JSON NOT NULL DEFAULT '[]'::json,
    allowed_action_codes JSON NOT NULL DEFAULT '[]'::json,
    approval_policy JSON NOT NULL DEFAULT '{}'::json,
    configuration JSON NOT NULL DEFAULT '{}'::json,
    system_managed BOOLEAN NOT NULL DEFAULT TRUE,
    version VARCHAR NOT NULL DEFAULT 'b5.1',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sonny_orchestration_runs (
    id VARCHAR PRIMARY KEY,
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    decision_id VARCHAR NULL REFERENCES sonny_decisions(id) ON DELETE SET NULL,
    workflow_id VARCHAR NULL REFERENCES sonny_workflows(id) ON DELETE SET NULL,
    automation_run_id VARCHAR NULL REFERENCES sonny_automation_runs(id) ON DELETE SET NULL,
    orchestration_type VARCHAR NOT NULL,
    trigger_type VARCHAR NOT NULL DEFAULT 'manual',
    idempotency_key VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'draft',
    approval_required BOOLEAN NOT NULL DEFAULT TRUE,
    approved_by VARCHAR NULL,
    approved_at TIMESTAMP NULL,
    coordinator_agent_code VARCHAR NOT NULL DEFAULT 'sonny',
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    input_payload JSON NOT NULL DEFAULT '{}'::json,
    output_payload JSON NOT NULL DEFAULT '{}'::json,
    orchestration_metadata JSON NOT NULL DEFAULT '{}'::json,
    error_message TEXT NULL,
    created_by VARCHAR NOT NULL DEFAULT 'sonny',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sonny_orchestration_company_idempotency UNIQUE (company_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS sonny_agent_assignments (
    id VARCHAR PRIMARY KEY,
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    agent_id VARCHAR NOT NULL REFERENCES sonny_agent_registry(id) ON DELETE RESTRICT,
    orchestration_run_id VARCHAR NOT NULL REFERENCES sonny_orchestration_runs(id) ON DELETE CASCADE,
    automation_run_id VARCHAR NULL REFERENCES sonny_automation_runs(id) ON DELETE SET NULL,
    automation_action_id VARCHAR NULL REFERENCES sonny_automation_actions(id) ON DELETE SET NULL,
    workflow_id VARCHAR NULL REFERENCES sonny_workflows(id) ON DELETE SET NULL,
    workflow_step_id VARCHAR NULL REFERENCES sonny_workflow_steps(id) ON DELETE SET NULL,
    assignment_code VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    instructions TEXT NOT NULL,
    required_capability VARCHAR NOT NULL,
    idempotency_key VARCHAR NOT NULL,
    priority VARCHAR NOT NULL DEFAULT 'medium',
    status VARCHAR NOT NULL DEFAULT 'pending',
    approval_required BOOLEAN NOT NULL DEFAULT TRUE,
    approved_by VARCHAR NULL,
    approved_at TIMESTAMP NULL,
    assigned_by VARCHAR NOT NULL DEFAULT 'sonny',
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    due_at TIMESTAMP NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    input_payload JSON NOT NULL DEFAULT '{}'::json,
    result_payload JSON NOT NULL DEFAULT '{}'::json,
    error_message TEXT NULL,
    assignment_metadata JSON NOT NULL DEFAULT '{}'::json,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sonny_agent_assignment_company_idempotency UNIQUE (company_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS sonny_agent_messages (
    id VARCHAR PRIMARY KEY,
    assignment_id VARCHAR NOT NULL REFERENCES sonny_agent_assignments(id) ON DELETE CASCADE,
    company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sender_agent_code VARCHAR NOT NULL,
    recipient_agent_code VARCHAR NOT NULL,
    message_type VARCHAR NOT NULL DEFAULT 'status_update',
    idempotency_key VARCHAR NOT NULL,
    subject VARCHAR NULL,
    content TEXT NOT NULL,
    message_data JSON NOT NULL DEFAULT '{}'::json,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sonny_agent_message_assignment_idempotency UNIQUE (assignment_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS ix_sonny_orchestration_company ON sonny_orchestration_runs(company_id);
CREATE INDEX IF NOT EXISTS ix_sonny_orchestration_status ON sonny_orchestration_runs(status);
CREATE INDEX IF NOT EXISTS ix_sonny_assignment_company ON sonny_agent_assignments(company_id);
CREATE INDEX IF NOT EXISTS ix_sonny_assignment_agent ON sonny_agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS ix_sonny_assignment_run ON sonny_agent_assignments(orchestration_run_id);
CREATE INDEX IF NOT EXISTS ix_sonny_assignment_status ON sonny_agent_assignments(status);
CREATE INDEX IF NOT EXISTS ix_sonny_agent_message_assignment ON sonny_agent_messages(assignment_id);

INSERT INTO sonny_agent_registry (
    id, agent_code, name, role, description, status, agent_type,
    capabilities, allowed_action_codes, approval_policy,
    configuration, system_managed, version
)
VALUES
(gen_random_uuid()::text, 'sonny', 'Sonny', 'AI Chief Operating Officer', 'Coordinates controlled company operations.', 'active', 'coordinator', '["orchestration","planning","decision_coordination"]'::json, '[]'::json, '{"default_approval_required":true}'::json, '{}'::json, TRUE, 'b5.1'),
(gen_random_uuid()::text, 'hermes', 'Hermes', 'Compliance and Documents Agent', 'Handles compliance and document assignments.', 'active', 'specialist', '["compliance_review","document_review","missing_document_detection"]'::json, '["request_missing_documents"]'::json, '{"external_request_requires_approval":true}'::json, '{}'::json, TRUE, 'b5.1'),
(gen_random_uuid()::text, 'finance_ai', 'Finance AI', 'Billing and Ledger Agent', 'Handles ledger and billing analysis.', 'active', 'specialist', '["ledger_review","billing_analysis","billing_recommendation"]'::json, '["inspect_usage_ledger","prepare_billing_action"]'::json, '{"billing_mutation_requires_approval":true}'::json, '{}'::json, TRUE, 'b5.1'),
(gen_random_uuid()::text, 'support_ai', 'Support AI', 'Support Operations Agent', 'Handles support queue assignments.', 'active', 'specialist', '["support_queue_review","response_preparation","ticket_triage"]'::json, '["review_support_queue","prepare_support_response"]'::json, '{"external_response_requires_approval":true}'::json, '{}'::json, TRUE, 'b5.1'),
(gen_random_uuid()::text, 'julia', 'Julia', 'Growth Officer', 'Handles growth, CRM, and sales support.', 'active', 'specialist', '["growth_analysis","crm_analysis","sales_support"]'::json, '[]'::json, '{"external_campaign_requires_approval":true}'::json, '{}'::json, TRUE, 'b5.1'),
(gen_random_uuid()::text, 'meeting_ai', 'Meeting AI', 'Meeting Coordinator', 'Handles meeting preparation.', 'active', 'specialist', '["meeting_review","meeting_preparation","booking_coordination"]'::json, '["review_meeting_commitments"]'::json, '{"booking_mutation_requires_approval":true}'::json, '{}'::json, TRUE, 'b5.1'),
(gen_random_uuid()::text, 'receptionist_ai', 'Receptionist AI', 'Reception and Calls Agent', 'Handles reception and call coordination.', 'active', 'specialist', '["call_triage","visitor_coordination","reception_support"]'::json, '[]'::json, '{"external_communication_requires_approval":true}'::json, '{}'::json, TRUE, 'b5.1'),
(gen_random_uuid()::text, 'mailroom_ai', 'Mailroom AI', 'Digital Mailroom Agent', 'Handles business mail review and routing.', 'active', 'specialist', '["mail_review","mail_classification","mail_routing"]'::json, '[]'::json, '{"external_forwarding_requires_approval":true}'::json, '{}'::json, TRUE, 'b5.1')
ON CONFLICT (agent_code) DO NOTHING;

COMMIT;
