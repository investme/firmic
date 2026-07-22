FIRMIC PHASE B.2.4 — SONNY DASHBOARD API

ADD:

Backend/services/sonny/dashboard.py

REPLACE:

Backend/routes/sonny.py

THIS ROUTE FILE IS BUILT FROM THE WORKING B.2.3 PLANNER API VERSION.

DO NOT REPLACE:

Backend/services/sonny/state.py
Backend/services/sonny/decisions.py
Backend/services/sonny/workflows.py
Backend/services/sonny/planner.py
Backend/routes/sonny_chat.py
Backend/main.py
Any Phase A file

NO DATABASE MIGRATION.

NEW ENDPOINT:

GET /api/sonny/company/{company_id}/dashboard

QUERY OPTIONS:

rebuild_plan_if_missing=true
activity_limit=15
memory_limit=10

DASHBOARD RESPONSE INCLUDES:

- Company
- Executive brief
- Company health score
- Top priority
- Today's plan
- Pending founder approvals
- Active decisions
- Running and draft workflows
- Current active workflow steps
- Compliance attention
- Billing attention
- Support attention
- Tasks
- Meetings
- AI Workforce
- Headquarters
- Operational progress
- Recent Activity Log records
- Recent Sonny memories

INSTALL:

1. Add Backend/services/sonny/dashboard.py
2. Replace Backend/routes/sonny.py
3. Restart backend:

   cd Backend
   uvicorn main:app --reload

VERIFY IMPORTS:

python -c "from services.sonny.dashboard import build_sonny_dashboard; from routes.sonny import router; print('SONNY DASHBOARD API OK')"

VERIFY ROUTE:

python -c "from main import app; print([r.path for r in app.routes if 'dashboard' in r.path and '/api/sonny' in r.path])"

EXPECTED:

/api/sonny/company/{company_id}/dashboard

SWAGGER TEST:

1. Authorize with Tenant JWT.
2. GET /api/sonny/company/{company_id}/dashboard
3. Confirm HTTP 200.
4. Confirm these top-level keys:

dashboard_version
company
executive_brief
today_plan
approvals
decisions
workflows
attention
operations
recent_activity
recent_memories
generated_from

IMPORTANT:

This is a read-oriented aggregation endpoint.

It does not:
- Execute workflows
- Approve decisions
- Charge tenants
- Activate offices
- Send messages
- Modify compliance
- Hire AI employees

It presents Sonny's executive understanding in one frontend-ready response.

AFTER THIS PASSES:

Phase B.2 is complete.

Next:
- Tenant Sonny Dashboard UI
or
- B.3 Memory Intelligence
