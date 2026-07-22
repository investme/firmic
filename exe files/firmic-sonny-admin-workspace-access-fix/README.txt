FIRMIC — SONNY ADMIN TENANT WORKSPACE ACCESS FIX

WHY THIS FIX IS NEEDED

The authenticated user is an admin while the active workspace is the Soso tenant company.

The old Sonny helper required:
Company.user_id == authenticated user id

That blocks Firmic administrators when they enter a tenant workspace.

THIS PATCH CHANGES SONNY ACCESS TO:

- allow the owning tenant user; OR
- allow a Firmic user whose database role is "admin"

It still blocks unrelated non-admin users.
It still blocks terminated companies.
It does not modify company ownership.
It does not modify JWTs.
It does not modify the database.

INSTALL

1. Copy install_sonny_admin_access.py into:

~/Desktop/Firmic/Backend

2. Run:

cd ~/Desktop/Firmic/Backend
python install_sonny_admin_access.py

EXPECTED:

SONNY ADMIN WORKSPACE ACCESS FIX INSTALLED
Backup: routes/sonny.py.before-admin-access-fix

3. Verify:

python -c "from routes.sonny import router; print('SONNY ADMIN ACCESS OK')"

4. Restart:

uvicorn main:app --reload

SWAGGER RETEST

POST /api/sonny/company/{company_id}/orchestrations

Use the exact Soso company id.

Body:

{
  "orchestration_type": "billing_multi_agent_review",
  "trigger_type": "manual",
  "decision_id": null,
  "workflow_id": null,
  "automation_run_id": null,
  "approval_required": true,
  "input_payload": {
    "purpose": "B.5.4 admin workspace test"
  },
  "orchestration_metadata": {
    "phase": "b5.4",
    "access_mode": "admin_tenant_workspace"
  }
}

EXPECTED:

HTTP 200
status = awaiting_approval

Then refresh:
http://localhost:3000/sonny

ROLLBACK

python rollback_sonny_admin_access.py
