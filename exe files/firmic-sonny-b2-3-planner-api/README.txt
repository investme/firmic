FIRMIC PHASE B.2.3 — SONNY PLANNER API

REPLACE:

Backend/routes/sonny.py

DO NOT REPLACE:

Backend/services/sonny/planner.py
Backend/services/sonny/state.py
Backend/services/sonny/decisions.py
Backend/services/sonny/workflows.py
Backend/routes/sonny_chat.py
Backend/main.py
Any Phase A file

NO DATABASE MIGRATION.

NEW ENDPOINTS:

GET  /api/sonny/company/{company_id}/plan
POST /api/sonny/company/{company_id}/plan/rebuild
GET  /api/sonny/company/{company_id}/plan/history

BEHAVIOR:

GET /plan
- Returns today's existing daily plan.
- By default, automatically creates the plan if none exists.
- Use rebuild_if_missing=false to require an existing plan.

POST /plan/rebuild
- Rebuilds today's plan from the latest company state.
- Updates the same plan instead of duplicating it.
- Refreshes plan items.
- Cancels stale items.
- Preserves completed items.
- Records sonny_plan_created or sonny_plan_refreshed activity.

GET /plan/history
- Returns recent daily/weekly plan records.
- Default limit: 30
- Maximum limit: 365

SECURITY:

- Requires Tenant JWT.
- Enforces Company.user_id == JWT subject.
- Excludes terminated companies.
- Tenants cannot access another company's plan.

INSTALL:

1. Replace Backend/routes/sonny.py.
2. Restart backend:

   cd Backend
   uvicorn main:app --reload

VERIFY IMPORT:

python -c "from routes.sonny import router; print('SONNY PLANNER API OK')"

VERIFY ROUTES:

python -c "from main import app; print([r.path for r in app.routes if '/plan' in r.path and '/api/sonny' in r.path])"

EXPECTED:

/api/sonny/company/{company_id}/plan
/api/sonny/company/{company_id}/plan/rebuild
/api/sonny/company/{company_id}/plan/history

SWAGGER TEST:

1. Authorize with Tenant JWT.
2. GET /api/sonny/company/{company_id}/plan
3. Confirm HTTP 200.
4. Confirm response includes:
   executive_brief
   health_score
   critical_count
   high_count
   approval_count
   running_workflow_count
   groups
   items

5. POST /api/sonny/company/{company_id}/plan/rebuild
6. Confirm:
   message = Sonny daily plan rebuilt.

7. GET /plan/history
8. Confirm today's plan appears once.

DUPLICATE PROTECTION:

There remains only one daily plan for:

company_id + plan_date + plan_type

Repeated rebuilds update that plan.
