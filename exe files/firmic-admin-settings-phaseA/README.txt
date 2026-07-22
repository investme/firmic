FIRMIC PHASE A — ADMIN SETTINGS

REPLACE:

Frontend/pages/admin-settings.tsx

DO NOT REPLACE:
Frontend/services/adminApi.ts
Backend/routes/admin.py

NO DATABASE MIGRATION.

USES:
GET /api/admin/settings

INCLUDED:

- Platform identity
- Environment
- PostgreSQL status
- Base currency
- USD/AED conversion reference
- VAT rate
- One-time hookup fee
- Office default monthly price
- Meeting-room hourly rate
- VoIP/business-number planned price
- Digital Mailroom planned price
- Microsoft 365 planned price
- Tenant registration state
- Tenant isolation state
- Ledger status
- Setup-fee reconciliation state
- Setup-fee tax policy
- Billing statuses
- Office inventory
- Occupancy
- Clear Live vs Planned labels

IMPORTANT:

This version is intentionally read-only.
The values are backend-controlled constants/reference values.
Editing should be added only after creating a persistent
platform_settings table and one controlled database migration.

INSTALL:

1. Replace Frontend/pages/admin-settings.tsx
2. Run:
   rm -rf .next
   npm run dev
3. Open Admin > Admin Settings

VERIFY:

- Hookup fee shows $49
- VAT shows 5%
- USD/AED shows 3.67
- Office inventory matches Admin Dashboard
- Tenant isolation shows Enabled
- Usage Ledger shows Enabled
