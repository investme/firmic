FIRMIC PHASE A — ADMIN USERS & ROLES

REPLACE:

Frontend/pages/admin-users.tsx

DO NOT REPLACE:

Frontend/services/adminApi.ts
Backend/routes/admin.py

NO DATABASE MIGRATION.

USES:

GET /api/admin/users

LIVE DATA SHOWN:

- User ID
- Full name
- Email
- Role
- Registration date
- Number of companies owned
- Admin versus tenant account totals
- Users with company records

FEATURES:

- Search
- Role filter
- Company-ownership filter
- Selected-user inspector
- Real tenant/admin separation
- No fictional invitations, suspensions, permission groups, or activity state

IMPORTANT:

The current users table contains:
id, full_name, email, password_hash, role, created_at

It does not contain:
account_status
is_suspended
invitation_status
last_login
permission_group

Therefore suspend, invite, and role-edit buttons are intentionally excluded.
Those require one controlled database migration and audit logging.

INSTALL:

1. Replace Frontend/pages/admin-users.tsx
2. Run:
   rm -rf .next
   npm run dev
3. Open Admin > Admin Users & Roles

VERIFY:

- Actual registered users appear
- Admin accounts show Administrator
- Tenant accounts show Tenant Owner
- Company ownership counts match Admin Companies
- Search and filters work
