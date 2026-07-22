FIRMIC — ADMIN USERS SAFE DIRECTORY & DELETION

REPLACE:

Backend/routes/admin.py
Frontend/services/adminApi.ts
Frontend/pages/admin-users.tsx

NO DATABASE MIGRATION.

WHAT CHANGES:

- Admin Users & Roles now returns only users whose role is admin.
- Tenant owners no longer appear in the internal Admin employee panel.
- Adds DELETE /api/admin/users/{user_id}.
- Adds permanent-delete button for departed Firmic employees.

SAFETY RULES:

- Cannot delete the currently logged-in Admin.
- Cannot delete the last remaining Admin.
- Cannot delete tenant accounts through this endpoint.
- Cannot delete an Admin account that owns company records.
- All validation is enforced in the backend, not only the UI.

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
2. Confirm tenant owners no longer appear.
3. Confirm only Hussein Matar / Firmic Admin accounts appear.
4. Confirm your current account says Current User and has no delete button.
5. Create or retain a second test Admin with no companies.
6. Select it and press Permanently Delete Admin.
7. Confirm it disappears after refresh.
8. Confirm tenant login accounts remain untouched.
