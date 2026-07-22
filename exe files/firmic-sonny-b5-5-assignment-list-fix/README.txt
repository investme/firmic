FIRMIC B.5.5 — ASSIGNMENT LIST ENDPOINT

PURPOSE

Adds the missing endpoint:

GET /api/sonny/company/{company_id}/orchestrations/{run_id}/assignments

This lets Swagger and the Sonny dashboard retrieve assignment UUIDs,
agent codes, statuses, confidence, and lifecycle data without recreating
assignments or searching old responses.

NO DATABASE MIGRATION.
NO MODEL CHANGES.
NO COMPANY DATA CHANGES.

INSTALL

1. Copy install_b5_5_assignment_list.py into:

~/Desktop/Firmic/Backend

2. Run:

cd ~/Desktop/Firmic/Backend
python install_b5_5_assignment_list.py

Expected:

B.5.5 ASSIGNMENT LIST ENDPOINT INSTALLED
Backup: routes/sonny.py.before-b5-5-assignment-list

3. Verify:

python -c "from routes.sonny import router; print('B5.5 ASSIGNMENT LIST OK')"

4. Restart backend:

uvicorn main:app --reload

TEST

GET /api/sonny/company/{company_id}/orchestrations/{run_id}/assignments

Use:

company_id:
8f852952-22dc-475a-bad2-9f0d1777ae9f

run_id:
88ef2521-eb25-4829-b1a7-6d3071d3fd54

Expected:

HTTP 200

{
  "company_id": "...",
  "run_id": "...",
  "count": 1,
  "assignments": [
    {
      "id": "...",
      "agent_code": "finance_ai",
      "status": "...",
      "confidence": 0.99
    }
  ]
}

Copy assignments[0].id.

Then continue with:

POST .../assignments/{assignment_id}/accept
POST .../assignments/{assignment_id}/start
POST .../assignments/{assignment_id}/complete

ROLLBACK

python rollback_b5_5_assignment_list.py
