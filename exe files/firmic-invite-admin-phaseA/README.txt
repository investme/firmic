FIRMIC PHASE A — INVITE ADMIN EMPLOYEE

REPLACE:

Backend/routes/admin.py
Frontend/services/adminApi.ts
Frontend/pages/admin-users.tsx

NO DATABASE MIGRATION.

NEW ENDPOINT:

POST /api/admin/users/invite

REQUEST:

{
  "full_name": "Sarah Johnson",
  "email": "sarah@firmic.io"
}

BACKEND BEHAVIOR:

- Requires authenticated Firmic Admin.
- Normalizes email and full name.
- Rejects duplicate email addresses.
- Generates a 14-character strong temporary password.
- Hashes the password with the existing bcrypt auth function.
- Forces role = admin in the backend.
- Creates the User record.
- Creates ActivityLog event:
  admin_employee_invited
- Returns the temporary password once.
- Does not store plaintext passwords.

FRONTEND BEHAVIOR:

- Adds + Invite Admin button.
- Opens Invite Admin modal.
- Collects full name and work email.
- Displays the generated temporary password once.
- Provides Copy Password button.
- Refreshes and selects the newly created Admin automatically.
- Existing permanent-delete protections remain unchanged.

AUDIT NOTE:

ActivityLog.company_id is non-null in the current schema.
Platform-level Admin HR events use:

company_id = "firmic-platform"

This avoids a migration while keeping a durable audit trail.

RESTART:

Backend:
  cd Backend
  uvicorn main:app --reload

Frontend:
  cd frontend
  rm -rf .next
  npm run dev

TEST:

1. Open Admin > Admin Users & Roles.
2. Press + Invite Admin.
3. Enter a unique name and email.
4. Press Invite Employee.
5. Copy the temporary password.
6. Confirm the new Admin appears immediately.
7. Log out.
8. Sign in through Admin Login using the new email/password.
9. Confirm the account reaches the Admin Console.
10. Attempt the same email again and confirm duplicate protection.
11. Confirm the original Admin cannot delete their own account.
