FIRMIC PHASE B.4.2 — SONNY AUTOMATION CONTROL SERVICE

THIS IS AN ADDITIVE SERVICE-ONLY INCREMENT.

ADD:

Backend/services/sonny/automation.py

DO NOT REPLACE:

Backend/routes/sonny.py
Backend/services/sonny/state.py
Backend/services/sonny/decisions.py
Backend/services/sonny/workflows.py
Backend/services/sonny/planner.py
Backend/services/sonny/dashboard.py
Backend/services/sonny/insights.py
Backend/routes/sonny_chat.py
Backend/main.py
Any Phase A file

NO DATABASE MIGRATION.

B.4.1 ALREADY CREATED:

sonny_automation_runs
sonny_automation_actions

SAFE CONTROL FEATURES:

- Allowlisted action registry
- Run idempotency
- Action idempotency
- Linked decision validation
- Linked workflow validation
- Run approval
- Action approval
- Ordered action execution
- Retry counters
- Completion/failure/cancellation
- Full serialization
- Activity Log integration

ALLOWLISTED ACTIONS:

inspect_usage_ledger
prepare_billing_action
request_missing_documents
review_support_queue
prepare_support_response
review_pending_tasks
prepare_task_updates
review_meeting_commitments
evaluate_ai_workforce
prepare_ai_activation

IMPORTANT:

This service still does not execute real side effects.

It does not:
- Change ledger statuses
- Create invoices
- Send email
- Send support messages
- Modify compliance
- Activate offices
- Activate AI employees
- Close tickets
- Complete tasks

It only controls and records the automation lifecycle.

PUBLIC FUNCTIONS:

create_automation_run
add_automation_action
approve_run
approve_action
start_run
start_action
complete_action
fail_action
complete_run
fail_run
cancel_run
get_company_run
get_run_action
serialize_run
serialize_action

ACTIVITY EVENTS:

sonny_automation_created
sonny_automation_action_added
sonny_automation_approved
sonny_automation_action_approved
sonny_automation_started
sonny_automation_action_started
sonny_automation_action_completed
sonny_automation_action_failed
sonny_automation_completed
sonny_automation_failed
sonny_automation_cancelled

VERIFY IMPORT:

python -c "from services.sonny.automation import create_automation_run, serialize_run; print('SONNY AUTOMATION SERVICE OK')"

NEXT:

B.4.3 Automation API

Planned endpoints:

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
