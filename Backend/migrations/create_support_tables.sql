BEGIN;

CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR PRIMARY KEY,
    company_id VARCHAR NOT NULL,
    created_by_user_id VARCHAR NOT NULL,
    assigned_admin_id VARCHAR NULL,
    subject VARCHAR NOT NULL,
    category VARCHAR NOT NULL DEFAULT 'general',
    priority VARCHAR NOT NULL DEFAULT 'normal',
    status VARCHAR NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    CONSTRAINT fk_support_tickets_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_support_tickets_company_id
    ON support_tickets(company_id);

CREATE INDEX IF NOT EXISTS ix_support_tickets_status
    ON support_tickets(status);

CREATE INDEX IF NOT EXISTS ix_support_tickets_priority
    ON support_tickets(priority);

CREATE INDEX IF NOT EXISTS ix_support_tickets_category
    ON support_tickets(category);

CREATE INDEX IF NOT EXISTS ix_support_tickets_assigned_admin_id
    ON support_tickets(assigned_admin_id);

CREATE INDEX IF NOT EXISTS ix_support_tickets_created_at
    ON support_tickets(created_at);


CREATE TABLE IF NOT EXISTS support_messages (
    id VARCHAR PRIMARY KEY,
    ticket_id VARCHAR NOT NULL,
    sender_type VARCHAR NOT NULL,
    sender_id VARCHAR NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_support_messages_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES support_tickets(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_support_messages_ticket_id
    ON support_messages(ticket_id);

CREATE INDEX IF NOT EXISTS ix_support_messages_sender_type
    ON support_messages(sender_type);

CREATE INDEX IF NOT EXISTS ix_support_messages_created_at
    ON support_messages(created_at);

COMMIT;
