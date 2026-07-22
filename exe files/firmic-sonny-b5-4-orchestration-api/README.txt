FIRMIC PHASE B.5.4 — SONNY MULTI-AGENT ORCHESTRATION API

REPLACE:

Backend/routes/sonny.py

THIS FILE IS BUILT FROM THE VERIFIED B.4.3 AUTOMATION API ROUTE.

REQUIRED EXISTING FILES:

Backend/models/sonny_orchestration.py
Backend/services/sonny/agent_registry.py
Backend/services/sonny/orchestration.py

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

NEW AGENT ENDPOINTS:

GET /api/sonny/agents
GET /api/sonny/agents/capabilities

NEW ORCHESTRATION ENDPOINTS:

POST /api/sonny/company/{company_id}/orchestrations
GET  /api/sonny/company/{company_id}/orchestrations
GET  /api/sonny/company/{company_id}/orchestrations/{run_id}

POST /api/sonny/company/{company_id}/orchestrations/{run_id}/assignments
POST /api/sonny/company/{company_id}/orchestrations/{run_id}/approve
POST /api/sonny/company/{company_id}/orchestrations/{run_id}/start

POST /api/sonny/company/{company_id}/orchestrations/{run_id}/assignments/{assignment_id}/approve
POST /api/sonny/company/{company_id}/orchestrations/{run_id}/assignments/{assignment_id}/accept
POST /api/sonny/company/{company_id}/orchestrations/{run_id}/assignments/{assignment_id}/start
POST /api/sonny/company/{company_id}/orchestrations/{run_id}/assignments/{assignment_id}/complete
POST /api/sonny/company/{company_id}/orchestrations/{run_id}/assignments/{assignment_id}/fail
POST /api/sonny/company/{company_id}/orchestrations/{run_id}/assignments/{assignment_id}/messages

POST /api/sonny/company/{company_id}/orchestrations/{run_id}/complete
POST /api/sonny/company/{company_id}/orchestrations/{run_id}/fail
POST /api/sonny/company/{company_id}/orchestrations/{run_id}/cancel

INSTALL:

1. Replace Backend/routes/sonny.py
2. Restart:

cd ~/Desktop/Firmic/Backend
uvicorn main:app --reload

VERIFY IMPORT:

python -c "from routes.sonny import router; print('SONNY ORCHESTRATION API OK')"

VERIFY ROUTES:

python -c "from main import app; print([r.path for r in app.routes if ('orchestration' in r.path or '/agents' in r.path) and '/api/sonny' in r.path])"

FIRST SWAGGER TEST:

1. GET /api/sonny/agents

Expected count:
8

2. GET /api/sonny/agents/capabilities

Test selection query:
required_capability=ledger_review
action_code=inspect_usage_ledger

Expected selected agent:
finance_ai

3. POST /api/sonny/company/{company_id}/orchestrations

Example:

{
  "orchestration_type": "billing_multi_agent_review",
  "trigger_type": "manual",
  "decision_id": "1d6cf1fe-c5e9-4110-a167-7633e7169f9b",
  "workflow_id": "97e83c1a-cf7c-48e8-be72-1d2ecf638844",
  "automation_run_id": null,
  "approval_required": true,
  "input_payload": {
    "purpose": "B.5.4 Swagger test 1"
  },
  "orchestration_metadata": {
    "phase": "b5.4"
  }
}

4. Copy run.id.

5. POST assignments:

{
  "assignment_code": "inspect_company_ledger",
  "title": "Inspect company usage ledger",
  "instructions": "Review current unbilled ledger entries and return a structured summary.",
  "required_capability": "ledger_review",
  "action_code": "inspect_usage_ledger",
  "preferred_agent_code": "finance_ai",
  "priority": "high",
  "approval_required": false,
  "confidence": 0.99,
  "input_payload": {
    "scope": "current_company"
  }
}

Expected selected agent:
finance_ai

6. Approve orchestration run.

7. Start orchestration run.

8. Accept assignment.

9. Start assignment.

10. Complete assignment:

{
  "result_payload": {
    "message": "Ledger review completed",
    "unbilled_entries_reviewed": 6
  }
}

11. Complete orchestration:

{
  "output_payload": {
    "message": "Multi-agent billing review completed"
  }
}

EXPECTED FINAL STATE:

orchestration status = completed
assignment status = completed
agent = finance_ai
messages include created, accepted, started, completed

NO REAL BUSINESS SIDE EFFECTS EXECUTE.

NEXT:

B.5.5 Dashboard Integration.
