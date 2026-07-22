FIRMIC PHASE B.1.1 — SONNY COMPANY STATE ENGINE

ADD:
Backend/services/sonny/state.py

REPLACE:
Backend/routes/sonny.py
Backend/routes/sonny_chat.py

OPTIONAL:
Create Backend/services/sonny/__init__.py only if it does not already exist.

DO NOT REPLACE:
Backend/main.py
Backend/models/*
Backend/routes/admin.py
Backend/routes/support.py
Any Phase A frontend file

NO DATABASE MIGRATION.

NEW ENDPOINTS:
GET /api/sonny/company/{company_id}/state
GET /api/sonny/company/{company_id}/context

PRESERVED ENDPOINTS:
GET  /api/sonny/company/{company_id}
POST /api/sonny/chat

The unified state contains company, headquarters, documents, compliance signals,
tasks, workflows, AI workforce, meetings, billing, support, activity, memory,
progress, alerts, and recommendations.

INSTALL:
1. Add/replace the files above.
2. Restart backend:
   cd Backend
   uvicorn main:app --reload

VERIFY IMPORT:
python -c "from services.sonny.state import build_company_state; print('SONNY STATE OK')"

VERIFY ROUTES:
python -c "from main import app; print([r.path for r in app.routes if '/api/sonny' in r.path])"

Expected:
/api/sonny/company/{company_id}
/api/sonny/company/{company_id}/state
/api/sonny/company/{company_id}/context
/api/sonny/chat

SWAGGER TEST:
Authorize with a Tenant JWT and call:
GET /api/sonny/company/{company_id}/state

Use a company owned by that logged-in tenant.

EXPECTED TOP-LEVEL KEYS:
state_version
company
documents
tasks
workflows
ai_workforce
meetings
billing
support
activity
memory
progress
intelligence

This build is deliberately read-only and does not call an external AI model.
The next controlled build is B.1.2 Sonny Memory Upgrade.
