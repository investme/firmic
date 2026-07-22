FIRMIC PHASE B.4.3 — SONNY AUTOMATION API

REPLACE:

Backend/routes/sonny.py

THIS FILE IS BUILT FROM THE VERIFIED B.3.4 ROUTE.

DO NOT REPLACE:

Backend/services/sonny/automation.py
Backend/services/sonny/dashboard.py
Backend/services/sonny/insights.py
Backend/services/sonny/planner.py
Backend/services/sonny/state.py
Backend/services/sonny/decisions.py
Backend/services/sonny/workflows.py
Backend/routes/sonny_chat.py
Backend/main.py
Any Phase A file

NO DATABASE MIGRATION.

NEW ENDPOINTS:

POST /api/sonny/company/{company_id}/automations

GET  /api/sonny/company/{company_id}/automations

GET  /api/sonny/company/{company_id}/automations/{run_id}

POST /api/sonny/company/{company_id}/automations/{run_id}/actions

POST /api/sonny/company/{company_id}/automations/{run_id}/approve

POST /api/sonny/company/{company_id}/automations/{run_id}/start

POST /api/sonny/company/{company_id}/automations/{run_id}/actions/{action_id}/approve

POST /api/sonny/company/{company_id}/automations/{run_id}/actions/{action_id}/start

POST /api/sonny/company/{company_id}/automations/{run_id}/actions/{action_id}/complete

POST /api/sonny/company/{company_id}/automations/{run_id}/actions/{action_id}/fail

POST /api/sonny/company/{company_id}/automations/{run_id}/complete

POST /api/sonny/company/{company_id}/automations/{run_id}/fail

POST /api/sonny/company/{company_id}/automations/{run_id}/cancel

INSTALL:

1. Replace Backend/routes/sonny.py
2. Restart backend:

   cd Backend
   uvicorn main:app --reload

VERIFY IMPORT:

python -c "from routes.sonny import router; print('SONNY AUTOMATION API OK')"

VERIFY ROUTES:

python -c "from main import app; print([r.path for r in app.routes if 'automation' in r.path and '/api/sonny' in r.path])"

RECOMMENDED SWAGGER TEST:

1. Create a run using an approved decision/workflow.

POST /automations

Example body:

{
  "automation_type": "billing_review_control",
  "trigger_type": "manual",
  "decision_id": "APPROVED_DECISION_ID",
  "workflow_id": "WORKFLOW_ID",
  "input_payload": {
    "purpose": "Control-only Swagger test"
  },
  "approval_required": true,
  "run_metadata": {
    "phase": "b4.3"
  }
}

2. Copy run.id.

3. Add action 1:

{
  "action_code": "inspect_usage_ledger",
  "action_order": 1,
  "payload": {
    "scope": "current_company"
  }
}

This action is automatically approved because it is read-only.

4. Add action 2:

{
  "action_code": "prepare_billing_action",
  "action_order": 2,
  "payload": {
    "mode": "recommendation_only"
  }
}

This action requires explicit approval.

5. Approve the run.

6. Approve action 2.

7. Start the run.

8. Start action 1.

9. Complete action 1.

10. Start action 2.

11. Complete action 2.

12. Complete the run.

EXPECTED FINAL STATE:

run.status = completed
all actions.status = completed

IMPORTANT:

B.4.3 only exposes lifecycle control.
No real side effects execute.

NEXT:

B.4.4 Allowlisted Executors.
