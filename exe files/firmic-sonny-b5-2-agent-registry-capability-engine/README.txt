FIRMIC PHASE B.5.2 — AGENT REGISTRY AND CAPABILITY ENGINE

ADD ONLY:

Backend/services/sonny/agent_registry.py

DO NOT REPLACE:

Backend/routes/sonny.py
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

B.5.1 ALREADY CREATED:

sonny_agent_registry
sonny_orchestration_runs
sonny_agent_assignments
sonny_agent_messages

FEATURES:

- Synchronizes default Firmic agents
- Lists active agents
- Fetches an agent by code
- Validates agent capabilities
- Validates allowed action codes
- Ranks qualified agents
- Selects the best specialist
- Supports a preferred agent hint
- Produces a capability matrix
- Explains why an agent was selected

PUBLIC FUNCTIONS:

sync_default_agents
list_active_agents
get_agent_by_code
agent_has_capability
agent_allows_action
validate_agent_assignment
find_qualified_agents
select_best_agent
build_capability_matrix
explain_agent_selection
serialize_agent

EXAMPLES:

ledger_review + inspect_usage_ledger
→ finance_ai

billing_recommendation + prepare_billing_action
→ finance_ai

compliance_review
→ hermes

support_queue_review + review_support_queue
→ support_ai

meeting_review + review_meeting_commitments
→ meeting_ai

VERIFY IMPORT:

python -c "from services.sonny.agent_registry import select_best_agent, build_capability_matrix; print('SONNY AGENT REGISTRY ENGINE OK')"

OPTIONAL DATABASE TEST:

python -c "from database import SessionLocal; from services.sonny.agent_registry import sync_default_agents, build_capability_matrix; db=SessionLocal(); sync_default_agents(db); print(build_capability_matrix(db)['agent_count']); db.close()"

EXPECTED AGENT COUNT:

8

NO REAL AGENT EXECUTION IS INTRODUCED.

NEXT:

B.5.3 Delegation and Assignment Engine

That increment will create orchestration runs, delegate assignments,
approve assignments, track acceptance/start/completion/failure,
write agent messages, and audit all lifecycle events.
