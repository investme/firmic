FIRMIC PHASE B.5.1 — MULTI-AGENT ORCHESTRATION DATABASE

ADD:
Backend/models/sonny_orchestration.py
Backend/migrations/create_sonny_orchestration.sql

RUN THE SQL MIGRATION IN PGADMIN.

NEW TABLES:
sonny_agent_registry
sonny_orchestration_runs
sonny_agent_assignments
sonny_agent_messages

SEEDED AGENTS:
sonny
hermes
finance_ai
support_ai
julia
meeting_ai
receptionist_ai
mailroom_ai

VERIFY:
python -c "from models.sonny_orchestration import SonnyAgentRegistry, SonnyOrchestrationRun, SonnyAgentAssignment, SonnyAgentMessage; print('SONNY ORCHESTRATION MODELS OK')"

NO ROUTES OR REAL AGENT EXECUTION ARE ADDED IN B.5.1.

NEXT:
B.5.2 Agent Registry and Capability Engine

IMPORTANT:
Actual delegated execution will later use B.4.4 allowlisted executors.
