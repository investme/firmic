FIRMIC COMPLIANCE QUEUE PHASE 1

REPLACE:
Backend/routes/admin.py
Frontend/services/adminApi.ts
Frontend/pages/admin-compliance.tsx

No migration is required.

This adds:
- Live readiness from documents, tasks, workflows, and headquarters
- Required document checklist
- Search, priority, and queue-state filters
- Request Missing Documents -> creates real Task rows
- Mark Reviewed -> creates a real ActivityLog
- Admin Company Inspector link

Restart backend and frontend, then verify:
GET /api/admin/compliance
GET /api/admin/compliance/company/{company_id}
POST /api/admin/compliance/company/{company_id}/request-documents
POST /api/admin/compliance/company/{company_id}/mark-reviewed
