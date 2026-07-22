FIRMIC PHASE B.4.1 — SONNY CONTROLLED AUTOMATION DATABASE

THIS IS AN ADDITIVE DATABASE-ONLY INCREMENT.

ADD:

Backend/models/sonny_automation.py
Backend/migrations/create_sonny_automation.sql

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

DATABASE:

Run:

Backend/migrations/create_sonny_automation.sql

inside pgAdmin Query Tool.

NEW TABLES:

sonny_automation_runs
sonny_automation_actions

SONNY_AUTOMATION_RUNS STORES:

- Company
- Linked decision and workflow
- Trigger type
- Automation type
- Idempotency key
- Lifecycle status
- Approval state
- Retry state
- Input and output payloads
- Error details
- Audit metadata
- Execution timestamps

SONNY_AUTOMATION_ACTIONS STORES:

- Ordered actions inside one automation run
- Linked workflow step
- Action code
- Service name
- Target type and target ID
- Idempotency key
- Approval state
- Attempt and retry state
- Payload and result
- Error details
- Compensating action marker
- Execution timestamps

DUPLICATE PROTECTION:

One automation run per:

company_id + idempotency_key

One action order per automation run.

One action idempotency key per automation run.

INITIAL STATUS LIFECYCLES:

Automation Run:

draft
→ awaiting_approval
→ approved
→ running
→ completed

or:

draft/awaiting_approval/approved/running
→ cancelled

or:

running
→ failed

Automation Action:

pending
→ awaiting_approval
→ approved
→ running
→ completed

or:

pending/awaiting_approval/approved/running
→ cancelled

or:

running
→ failed

NO ACTIONS EXECUTE IN B.4.1.

NEXT INCREMENT:

B.4.2 Automation Control Service

Backend/services/sonny/automation.py

It will add:

- Allowed action registry
- Create run
- Add actions
- Approve run
- Start run
- Start action
- Complete action
- Fail action
- Cancel run
- Serialization
- Activity Log integration

VERIFY MODEL:

python -c "from models.sonny_automation import SonnyAutomationRun, SonnyAutomationAction; print('SONNY AUTOMATION MODELS OK')"

DATABASE VERIFY:

Databases
→ firmic
→ Schemas
→ public
→ Tables

Confirm:

sonny_automation_runs
sonny_automation_actions

SAFETY:

- No action execution.
- No billing mutation.
- No office activation.
- No support closure.
- No compliance mutation.
- No external messages.
- No AI employee activation.
