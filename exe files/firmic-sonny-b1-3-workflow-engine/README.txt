FIRMIC PHASE B.1.3 — SONNY WORKFLOW ENGINE

PURPOSE

Turn approved Sonny decisions into controlled, persistent workflows.

ADD:

Backend/models/sonny_workflow.py
Backend/services/sonny/workflows.py
Backend/migrations/create_sonny_workflows.sql

REPLACE:

Backend/routes/sonny.py

DO NOT REPLACE:

Backend/services/sonny/state.py
Backend/services/sonny/decisions.py
Backend/routes/sonny_chat.py
Backend/main.py
Any Phase A files

DATABASE:

Run:

Backend/migrations/create_sonny_workflows.sql

in pgAdmin Query Tool.

NEW TABLES:

sonny_workflows
sonny_workflow_steps

NO MAIN.PY CHANGE:

The current main.py already includes routes.sonny under /api/sonny.

NEW ENDPOINTS:

POST /api/sonny/company/{company_id}/decisions/{decision_id}/workflow
GET  /api/sonny/company/{company_id}/workflows
GET  /api/sonny/company/{company_id}/workflows/{workflow_id}
POST /api/sonny/company/{company_id}/workflows/{workflow_id}/start
POST /api/sonny/company/{company_id}/workflows/{workflow_id}/steps/{step_id}/complete
POST /api/sonny/company/{company_id}/workflows/{workflow_id}/cancel

WORKFLOW LIFECYCLE:

draft
→ running
→ completed

or:

draft/running
→ cancelled

STEP LIFECYCLE:

pending
→ in_progress
→ completed

CONTROLLED BEHAVIOR:

- Only approved decisions can create workflows.
- One workflow per decision.
- Starting a workflow activates the first step.
- Only the active in-progress step can be completed.
- Completing a step activates the next step.
- Completing the final step completes the workflow.
- Completing the workflow also sets the linked decision to completed.
- Cancelling a workflow cancels the linked decision execution.
- All lifecycle actions create Activity Log records.

WORKFLOW TEMPLATES INCLUDED:

activate_headquarters
complete_compliance_documents
review_pending_tasks
resolve_urgent_support
review_open_support
review_unbilled_usage
evaluate_ai_workforce
monitor_meeting_commitments

SAFETY:

This phase does not execute external or financial side effects.

It does not:
- Rent an office
- Charge or bill a tenant
- Send external email
- Activate an AI employee
- Modify compliance records
- Close support tickets automatically

It creates and tracks the approved operational process.
Actual side-effect execution belongs in the later Automation Engine.

INSTALL:

1. Run SQL migration in pgAdmin.
2. Add the model.
3. Add the workflow service.
4. Replace routes/sonny.py.
5. Restart backend.

VERIFY IMPORT:

python -c "from models.sonny_workflow import SonnyWorkflow, SonnyWorkflowStep; from services.sonny.workflows import create_workflow_from_decision; print('SONNY WORKFLOWS OK')"

VERIFY ROUTES:

python -c "from main import app; print([r.path for r in app.routes if 'workflow' in r.path and '/api/sonny' in r.path])"

TEST USING THE APPROVED BILLING DECISION:

1. Copy the approved decision ID.
2. POST:
   /api/sonny/company/{company_id}/decisions/{decision_id}/workflow

3. Copy workflow.id.
4. POST:
   /api/sonny/company/{company_id}/workflows/{workflow_id}/start

5. Copy the first in_progress step ID.
6. POST:
   /api/sonny/company/{company_id}/workflows/{workflow_id}/steps/{step_id}/complete

Request body example:

{
  "output": {
    "note": "Usage Ledger reviewed in Swagger."
  }
}

7. Repeat for each newly active step.
8. On the last step, confirm:
   workflow.status = completed
   workflow.progress_percent = 100

9. GET the linked decision and confirm:
   status = completed
   execution_status = completed
   execution_result.workflow_id = the workflow ID

ACTIVITY EVENTS:

sonny_workflow_created
sonny_workflow_started
sonny_workflow_step_completed
sonny_workflow_completed
sonny_workflow_cancelled

ROLLBACK:

Restore the prior Backend/routes/sonny.py.

Delete:
Backend/models/sonny_workflow.py
Backend/services/sonny/workflows.py

The two new database tables can remain unused or be removed manually.
