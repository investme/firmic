FIRMIC PHASE B.3.1 — SONNY MEMORY INTELLIGENCE DATABASE

THIS IS AN ADDITIVE DATABASE-ONLY INCREMENT.

ADD:

Backend/models/sonny_insight.py
Backend/migrations/create_sonny_insights.sql

DO NOT REPLACE:

Backend/routes/sonny.py
Backend/services/sonny/state.py
Backend/services/sonny/decisions.py
Backend/services/sonny/workflows.py
Backend/services/sonny/planner.py
Backend/services/sonny/dashboard.py
Backend/routes/sonny_chat.py
Backend/main.py
Any Phase A file

DATABASE:

Run:

Backend/migrations/create_sonny_insights.sql

inside pgAdmin Query Tool.

NEW TABLES:

sonny_insights
sonny_insight_evidence

SONNY_INSIGHTS STORES:

- Persistent operational insights
- Insight category and code
- Recurring pattern type
- Severity and confidence
- Trend: improving, worsening, stable, recurring
- Active/resolved/dismissed lifecycle
- Recommended action
- Occurrence count
- First and last detection timestamps
- Source summary
- Actionability
- State version

SONNY_INSIGHT_EVIDENCE STORES:

- Supporting events and records
- Source type and source ID
- Event type
- Evidence description
- Structured evidence data
- Observation timestamp
- Deduplicated evidence fingerprints

DUPLICATE PROTECTION:

One insight per:

company_id + fingerprint

One evidence record per:

insight_id + evidence_fingerprint

NO ROUTES ARE ADDED IN B.3.1.

NEXT INCREMENT:

B.3.2 Pattern Detection Engine

Backend/services/sonny/insights.py

INITIAL PATTERNS WILL INCLUDE:

- Recurring unbilled usage
- Repeated support backlog
- Repeated urgent support
- Repeated compliance gaps
- Repeated pending task backlog
- Founder approval bottlenecks
- Workflow bottlenecks by assigned role
- AI Workforce underutilization
- Improving or worsening company health

INSTALL:

1. Add Backend/models/sonny_insight.py.
2. Run Backend/migrations/create_sonny_insights.sql in pgAdmin.
3. Restart backend.
4. Verify model import.

VERIFY:

python -c "from models.sonny_insight import SonnyInsight, SonnyInsightEvidence; print('SONNY INSIGHT MODELS OK')"

DATABASE VERIFY:

Databases
→ firmic
→ Schemas
→ public
→ Tables

Confirm:

sonny_insights
sonny_insight_evidence

SAFETY:

- No existing table is modified.
- No working route is replaced.
- No automatic action is introduced.
- Insights remain explainable and evidence-backed.
