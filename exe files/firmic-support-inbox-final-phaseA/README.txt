FIRMIC — FINAL PHASE A SUPPORT INBOX

THIS IS THE FINAL ADMIN PLATFORM MODULE.

BACKEND FILES:

NEW:
Backend/models/support_ticket.py
Backend/routes/support.py
Backend/migrations/create_support_tables.sql

REPLACE:
Backend/main.py
Backend/routes/admin.py

FRONTEND FILES:

NEW:
Frontend/pages/support.tsx
Frontend/services/supportApi.ts

REPLACE:
Frontend/pages/admin-support.tsx
Frontend/services/adminApi.ts
Frontend/components/FirmicSidebar.tsx


DATABASE INSTALLATION:

Open pgAdmin Query Tool for the Firmic PostgreSQL database.

Run:

Backend/migrations/create_support_tables.sql

The script is idempotent:
CREATE TABLE IF NOT EXISTS
CREATE INDEX IF NOT EXISTS


BACKEND ENDPOINTS:

TENANT:
POST /api/support/tickets
GET  /api/support/company/{company_id}/tickets
POST /api/support/tickets/{ticket_id}/reply
POST /api/support/tickets/{ticket_id}/close
POST /api/support/tickets/{ticket_id}/reopen

ADMIN:
GET   /api/admin/support
POST  /api/admin/support/tickets/{ticket_id}/reply
PATCH /api/admin/support/tickets/{ticket_id}


FEATURES:

TENANT SUPPORT CENTER:
- Create ticket
- Category selection
- Search and status filter
- Company-isolated ticket list
- Conversation history
- Tenant reply
- Close and reopen

ADMIN SUPPORT INBOX:
- Total, open, pending, urgent, resolved KPIs
- Search
- Status filter
- Priority filter
- Category filter
- Tenant/company context
- Conversation inspector
- Admin reply
- Assign Admin employee
- Change priority
- Change status
- Resolve / close / reopen
- Company Inspector link

SECURITY:
- Tenant access is enforced by company.user_id in backend.
- Tenants cannot read another company's tickets.
- Admin endpoints require Admin authentication.
- Only real Admin users can be assigned.
- Closed tickets cannot receive replies until reopened.

AUDIT EVENTS:
support_ticket_created
support_tenant_replied
support_admin_replied
support_ticket_updated
support_ticket_closed
support_ticket_reopened

RESTART:

Backend:
cd Backend
uvicorn main:app --reload

Frontend:
cd frontend
rm -rf .next
npm run dev


FULL TEST:

1. Run SQL migration.
2. Restart backend and frontend.
3. Tenant login as Soso.
4. Open Support Center from sidebar.
5. Create:
   Subject: Billing question
   Category: Billing
   Message: Please explain my current invoice.
6. Log out.
7. Admin login.
8. Open Support Inbox.
9. Confirm Soso ticket appears.
10. Assign it to an Admin.
11. Set priority High.
12. Reply to Soso.
13. Set Waiting on Tenant.
14. Log back into Soso.
15. Confirm reply is visible.
16. Reply from Tenant.
17. Return to Admin and Resolve.
18. Confirm all KPI counts update.

PHASE A COMPLETION:

Compliance Queue       COMPLETE
AI Workforce Monitor   COMPLETE
Admin Reports          COMPLETE
Admin Settings         COMPLETE
Admin Users & Roles    COMPLETE
Support Inbox          COMPLETE
