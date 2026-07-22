FIRMIC PHASE B.2.2 — SONNY PLANNER ENGINE

THIS IS AN ADDITIVE SERVICE-ONLY INCREMENT.

ADD:

Backend/services/sonny/planner.py

DO NOT REPLACE:

Backend/routes/sonny.py
Backend/services/sonny/state.py
Backend/services/sonny/decisions.py
Backend/services/sonny/workflows.py
Backend/routes/sonny_chat.py
Backend/main.py
Any Phase A file

NO DATABASE MIGRATION:

B.2.1 already created:

sonny_plans
sonny_plan_items

WHAT THE ENGINE DOES:

- Builds one daily executive plan per company and date.
- Reads the live Company State Engine.
- Reads active Sonny decisions.
- Reads active Sonny workflows.
- Includes pending tasks.
- Includes open and urgent support tickets.
- Includes meeting commitments.
- Includes AI Workforce opportunities.
- Calculates priority scores.
- Groups items into:
  critical
  approval
  workflow
  scheduled
  opportunity
  maintenance
- Creates an executive brief.
- Updates the same daily plan instead of creating duplicates.
- Adds new plan items.
- Updates existing plan items.
- Cancels stale items that are no longer supported by live state.
- Preserves completed items.
- Writes Activity Log events.

ACTIVITY EVENTS:

sonny_plan_created
sonny_plan_refreshed

PUBLIC SERVICE FUNCTIONS:

build_daily_plan(db, company, actor_id=None, plan_date=None)

get_daily_plan(db, company_id=..., plan_date=None)

get_plan_history(db, company_id=..., limit=30)

serialize_plan(plan)

VERIFY IMPORT:

python -c "from services.sonny.planner import build_daily_plan, serialize_plan; print('SONNY PLANNER ENGINE OK')"

NO ROUTES YET:

B.2.3 will safely extend Backend/routes/sonny.py with:

GET  /api/sonny/company/{company_id}/plan
POST /api/sonny/company/{company_id}/plan/rebuild
GET  /api/sonny/company/{company_id}/plan/history

WHY THIS IS SEPARATE:

The Planner Engine can now be verified independently before any working
Sonny route is modified.

NEXT:

After the import passes, continue with B.2.3 Planner API.
