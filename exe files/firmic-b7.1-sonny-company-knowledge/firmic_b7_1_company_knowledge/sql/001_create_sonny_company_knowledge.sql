CREATE TABLE IF NOT EXISTS sonny_company_knowledge (
    id VARCHAR PRIMARY KEY,
    company_id VARCHAR NOT NULL,
    company_summary TEXT,
    mission TEXT,
    vision TEXT,
    industry VARCHAR,
    products TEXT,
    services TEXT,
    pricing TEXT,
    communication_style TEXT,
    sales_pitch TEXT,
    founder_notes TEXT,
    company_rules TEXT,
    operating_procedures TEXT,
    faq TEXT,
    imported_source_text TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sonny_company_knowledge_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_sonny_company_knowledge_company_id
        UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS ix_sonny_company_knowledge_company_id
    ON sonny_company_knowledge(company_id);
