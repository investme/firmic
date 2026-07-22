FIRMIC PHASE B.3.2 — SONNY PATTERN DETECTION ENGINE

THIS IS AN ADDITIVE SERVICE-ONLY INCREMENT.

ADD:

Backend/services/sonny/insights.py

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

NO DATABASE MIGRATION.

B.3.1 ALREADY CREATED:

sonny_insights
sonny_insight_evidence

INITIAL DETECTION PATTERNS:

- Recurring unbilled usage
- Persistent support backlog
- Urgent support risk
- Repeated compliance gaps
- Pending task backlog
- Founder approval bottlenecks
- Workflow bottlenecks by assigned role
- AI Workforce underutilization
- Improving or worsening company health

ENGINE BEHAVIOR:

- Builds evidence-backed insight candidates.
- Creates new insights.
- Refreshes matching active insights.
- Increases occurrence_count.
- Adds only new evidence.
- Resolves active insights when the pattern disappears.
- Preserves dismissed insights.
- Records Activity Log lifecycle events.
- Uses deterministic explainable business logic.
- Does not require an external LLM.

ACTIVITY EVENTS:

sonny_insight_created
sonny_insight_refreshed
sonny_insight_resolved
sonny_insight_dismissed

PUBLIC FUNCTIONS:

generate_company_insights(db, company)

list_company_insights(
    db,
    company_id=...,
    status=None,
    category=None,
    severity=None,
    limit=100
)

get_company_insight(
    db,
    company_id=...,
    insight_id=...
)

dismiss_insight(
    db,
    insight=...,
    actor_id=...
)

serialize_insight(insight)

VERIFY IMPORT:

python -c "from services.sonny.insights import generate_company_insights, serialize_insight; print('SONNY INSIGHT ENGINE OK')"

NO ROUTES YET.

NEXT INCREMENT:

B.3.3 Insight API

Planned endpoints:

POST /api/sonny/company/{company_id}/insights/generate

GET  /api/sonny/company/{company_id}/insights

GET  /api/sonny/company/{company_id}/insights/{insight_id}

POST /api/sonny/company/{company_id}/insights/{insight_id}/dismiss

SAFETY:

- Read and analysis only.
- No billing action.
- No support action.
- No office activation.
- No compliance mutation.
- No AI employee activation.
- No workflow execution.
