FIRMIC PHASE B.5.3 — DELEGATION AND ASSIGNMENT ENGINE

ADD ONLY:

Backend/services/sonny/orchestration.py

DO NOT REPLACE:

Backend/routes/sonny.py
Backend/services/sonny/agent_registry.py
Backend/services/sonny/automation.py
Backend/services/sonny/dashboard.py
Backend/services/sonny/insights.py
Backend/services/sonny/planner.py
Backend/services/sonny/state.py
Backend/services/sonny/decisions.py
Backend/services/sonny/workflows.py
Backend/main.py
Any Phase A file

NO DATABASE MIGRATION.

B.5.1 ALREADY CREATED:

sonny_agent_registry
sonny_orchestration_runs
sonny_agent_assignments
sonny_agent_messages

FEATURES:

- Create idempotent orchestration runs
- Validate linked decisions, workflows, and automation runs
- Automatically select the best qualified agent
- Support explicit or preferred agent selection
- Create idempotent assignments
- Validate required capabilities
- Validate allowed action codes
- Approve orchestration runs
- Approve protected assignments
- Start orchestration runs
- Accept assignments
- Start assignments
- Complete or fail assignments
- Complete, fail, or cancel orchestration runs
- Create agent-to-agent messages
- Record full Activity Log events
- Serialize runs, assignments, agents, and messages

LIFECYCLE:

Orchestration Run:

awaiting_approval
→ approved
→ running
→ completed

Assignment:

awaiting_approval
→ approved
→ accepted
→ running
→ completed

NO REAL SIDE EFFECTS ARE EXECUTED.

PUBLIC FUNCTIONS:

create_orchestration_run
create_assignment
approve_orchestration_run
approve_assignment
start_orchestration_run
accept_assignment
start_assignment
complete_assignment
fail_assignment
complete_orchestration_run
fail_orchestration_run
cancel_orchestration_run
add_agent_message
get_company_orchestration_run
get_assignment
serialize_orchestration_run
serialize_assignment
serialize_message

VERIFY IMPORT:

python -c "from services.sonny.orchestration import create_orchestration_run, create_assignment, serialize_orchestration_run; print('SONNY ORCHESTRATION ENGINE OK')"

NEXT:

B.5.4 Orchestration API

PLANNED ENDPOINTS:

GET  /api/sonny/agents
GET  /api/sonny/agents/capabilities

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

POST /api/sonny/company/{company_id}/orchestrations/{run_id}/complete
POST /api/sonny/company/{company_id}/orchestrations/{run_id}/fail
POST /api/sonny/company/{company_id}/orchestrations/{run_id}/cancel
