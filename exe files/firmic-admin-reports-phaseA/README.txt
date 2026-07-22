FIRMIC PHASE A — ADMIN REPORTS

REPLACE:

Frontend/pages/admin-analytics.tsx

NO BACKEND REPLACEMENT.
NO DATABASE MIGRATION.
NO adminApi.ts REPLACEMENT.

USES:
GET /api/admin/analytics

REPORTS INCLUDED:

- Ledger total
- Paid revenue
- Outstanding revenue
- Ledger entry count
- Tenant companies
- Active companies
- Rented offices
- Available offices
- Office occupancy
- Active AI employees
- Office revenue
- AI workforce revenue
- Meeting Center revenue
- Firmic setup-fee revenue
- Largest revenue service
- Paid and outstanding share
- Honest MVP reporting scope

IMPORTANT:
No fake trends, churn, growth, or forecasts are shown.
Historical charts require persisted historical invoice periods.

INSTALL:

1. Replace Frontend/pages/admin-analytics.tsx
2. Run:
   rm -rf .next
   npm run dev

TEST:

1. Open Admin > Admin Reports.
2. Confirm totals match Admin Billing.
3. Confirm Firmic Setup Fees are visible.
4. Confirm occupancy uses rented + available inventory.
5. Pause/reactivate an AI employee and confirm AI revenue changes.
6. Book/cancel a meeting and confirm Meeting Center revenue changes.
