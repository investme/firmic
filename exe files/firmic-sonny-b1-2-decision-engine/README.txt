FIRMIC PHASE B.1.2 — SONNY DECISION ENGINE

ADD:

Backend/models/sonny_decision.py
Backend/services/sonny/decisions.py
Backend/migrations/create_sonny_decisions.sql

REPLACE:

Backend/routes/sonny.py

DO NOT REPLACE:

Backend/services/sonny/state.py
Backend/routes/sonny_chat.py
Backend/main.py
Any Phase A file

DATABASE:

Run Backend/migrations/create_sonny_decisions.sql in pgAdmin Query Tool.

NO MAIN.PY CHANGE:

Backend/main.py already registers routes.sonny under /api/sonny.
The replacement route file automatically exposes the decision endpoints.

NEW ENDPOINTS:

POST /api/sonny/company/{company_id}/decisions/generate
GET  /api/sonny/company/{company_id}/decisions
GET  /api/sonny/company/{company_id}/decisions/{decision_id}
POST /api/sonny/company/{company_id}/decisions/{decision_id}/approve
POST /api/sonny/company/{company_id}/decisions/{decision_id}/reject
POST /api/sonny/company/{company_id}/decisions/{decision_id}/cancel

DECISION SOURCES:

- Headquarters
- Compliance documents
- Pending tasks
- Urgent/open support
- Unbilled usage
- AI workforce
- Meeting commitments

SAFETY:

- Company ownership is enforced by Company.user_id == JWT subject.
- Terminated companies are excluded.
- Sonny proposes and stores decisions.
- Sonny does not execute business actions in B.1.2.
- Approve/reject/cancel actions are audited.
- Duplicate active decisions are prevented using a stable fingerprint.
- Decisions that are no longer supported by current state automatically expire.

ACTIVITY EVENTS:

sonny_decision_proposed
sonny_decision_approved
sonny_decision_rejected
sonny_decision_cancelled
sonny_decision_expired

INSTALL:

1. Run SQL migration in pgAdmin.
2. Add model and service files.
3. Replace routes/sonny.py.
4. Restart backend:

   cd Backend
   uvicorn main:app --reload

VERIFY IMPORT:

python -c "from models.sonny_decision import SonnyDecision; from services.sonny.decisions import generate_company_decisions; print('SONNY DECISIONS OK')"

VERIFY ROUTES:

python -c "from main import app; print([r.path for r in app.routes if 'decisions' in r.path])"

SWAGGER TEST:

1. Authorize with Tenant JWT.
2. POST decisions/generate using the owned company ID.
3. Confirm decisions are returned.
4. POST decisions/generate again.
5. Confirm created = 0 and active decisions are not duplicated.
6. Copy a proposed decision ID.
7. Approve it.
8. GET the decision and confirm status = approved.
9. Reject or cancel a different proposed decision.
10. Confirm Activity Log contains the lifecycle events.

IMPORTANT:

The engine is deterministic and explainable.
It does not yet call an external LLM.
The next layer can use these persistent decisions for planning,
workflows, permissions, and controlled execution.
