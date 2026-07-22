FIRMIC PHASE A — AI WORKFORCE MONITOR

REPLACE:

Frontend/pages/admin-ai-workforce.tsx
Frontend/services/adminApi.ts

NO BACKEND FILE REPLACEMENT.
NO DATABASE MIGRATION.

THE EXISTING LIVE ENDPOINTS USED:

GET  /api/admin/ai-workforce
POST /api/ai-workforce/deactivate
POST /api/ai-workforce/hire

FEATURES:

- Real PostgreSQL agent directory.
- Grouped by tenant company.
- Search by company, agent, headquarters, status, or ID.
- Company and status filters.
- Total, active, inactive, companies served, and monthly-cost KPIs.
- Selected-agent inspector.
- Company Inspector shortcut.
- Tenant Billing shortcut.
- Pause active agent.
- Reactivate inactive agent.
- Current unbilled AI charge is voided on pause.
- Subscription is restored at stored monthly price on reactivation.
- No invented task, chat, health, productivity, or score statistics.

INSTALL:

1. Replace the two files.
2. From frontend:
   rm -rf .next
   npm run dev

TEST:

1. Open Admin > AI Workforce Admin.
2. Confirm Receptionist AI appears for Soso/Tatok where applicable.
3. Filter Active and Inactive.
4. Select an active agent.
5. Press Pause and confirm.
6. Refresh Tenant Billing and verify the unbilled agent charge is void.
7. Return and Reactivate.
8. Verify the active monthly total updates.
9. Open Company Inspector and Tenant Billing shortcuts.
