FIRMIC PHASE B.3.3 — SONNY INSIGHT API

REPLACE:

Backend/routes/sonny.py

THIS FILE IS BUILT FROM THE VERIFIED B.2.4 DASHBOARD ROUTE.

DO NOT REPLACE:

Backend/services/sonny/insights.py
Backend/services/sonny/dashboard.py
Backend/services/sonny/planner.py
Backend/services/sonny/state.py
Backend/services/sonny/decisions.py
Backend/services/sonny/workflows.py
Backend/routes/sonny_chat.py
Backend/main.py
Any Phase A file

NO DATABASE MIGRATION.

NEW ENDPOINTS:

POST /api/sonny/company/{company_id}/insights/generate

GET  /api/sonny/company/{company_id}/insights

GET  /api/sonny/company/{company_id}/insights/{insight_id}

POST /api/sonny/company/{company_id}/insights/{insight_id}/dismiss

SECURITY:

- Requires Tenant JWT.
- Enforces Company.user_id == JWT subject.
- Excludes terminated companies.
- Prevents cross-tenant insight access.

POST /insights/generate:

- Analyzes live and historical company data.
- Creates new insights.
- Refreshes matching insights.
- Adds deduplicated evidence.
- Resolves stale insights.
- Returns the active insight list.

GET /insights FILTERS:

status
category
severity
limit

GET /insights/{insight_id}:

Returns one insight with all evidence records.

POST /dismiss:

Marks an insight dismissed.
Records:
sonny_insight_dismissed

INSTALL:

1. Replace Backend/routes/sonny.py.
2. Restart backend:

   cd Backend
   uvicorn main:app --reload

VERIFY IMPORT:

python -c "from routes.sonny import router; print('SONNY INSIGHT API OK')"

VERIFY ROUTES:

python -c "from main import app; print([r.path for r in app.routes if 'insight' in r.path and '/api/sonny' in r.path])"

EXPECTED:

/api/sonny/company/{company_id}/insights/generate
/api/sonny/company/{company_id}/insights
/api/sonny/company/{company_id}/insights/{insight_id}
/api/sonny/company/{company_id}/insights/{insight_id}/dismiss

SWAGGER TEST:

1. Authorize with Tenant JWT.

2. POST:
   /api/sonny/company/{company_id}/insights/generate

3. Confirm HTTP 200 and:
   generation_summary
   insights

4. GET:
   /api/sonny/company/{company_id}/insights

5. Confirm metrics and insight records.

6. Copy an insight ID.

7. GET:
   /api/sonny/company/{company_id}/insights/{insight_id}

8. Confirm evidence is included.

9. POST:
   /api/sonny/company/{company_id}/insights/{insight_id}/dismiss

10. Confirm:
    status = dismissed

NEXT:

B.3.4 Dashboard Integration

That increment will add:

memory_intelligence
active_insights
critical/high insight metrics
top recurring pattern
insight recommendations

to the existing Sonny Dashboard response.
