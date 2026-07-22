FIRMIC COMPLIANCE DELIVERY — PHASE 2

REPLACE THESE FILES:

Backend/routes/admin.py
Backend/routes/document.py

Frontend/services/adminApi.ts
Frontend/services/documentApi.ts

Frontend/pages/admin-compliance.tsx
Frontend/pages/documents.tsx
Frontend/pages/messages.tsx

NO DATABASE MIGRATION REQUIRED.

PERSISTENT FLOW:

1. Admin presses Request Missing Documents.
2. Existing Task rows are created:
   Upload Trade License
   Upload Passport Copy
   Upload Incorporation Certificate
   Upload Proof of Address
3. Existing ActivityLog receives compliance_documents_requested.
4. Tenant Communication Center reads that ActivityLog and shows Action Needed.
5. Tenant Document Vault reads the request Tasks and shows Requested Documents.
6. Tenant submits a document reference.
7. Document row is created with status uploaded.
8. Matching request Task is marked completed.
9. ActivityLog receives compliance_document_uploaded.
10. Admin Compliance Queue shows Uploaded with a Verify button.
11. Admin presses Verify.
12. Document status becomes approved.
13. ActivityLog receives compliance_document_verified.
14. Tenant Communication Center receives the verification update.
15. Compliance readiness recalculates automatically.

IMPORTANT MVP FILE NOTE:
The current Document model only stores file_path and has no binary file storage service.
This batch records the selected filename as file_path.
Do not claim that binary files are securely stored yet.
Connect S3, Azure Blob Storage, Google Cloud Storage, or another document store after MVP.

RESTART:

Backend:
  cd Backend
  uvicorn main:app --reload

Frontend:
  cd frontend
  rm -rf .next
  npm run dev

FASTAPI ENDPOINTS TO VERIFY:

GET  /api/document/company/{company_id}/compliance-requests
POST /api/document/create
POST /api/admin/compliance/documents/{document_id}/verify

TEST:

A. ADMIN
- Open Compliance Queue.
- Select Soso.
- Press Request Missing Documents.

B. TENANT
- Log in as Soso owner.
- Open Communication Center.
- Confirm Hermes Action Needed message.
- Open Document Vault.
- Confirm four Requested Documents.
- Select a filename and submit Trade License.

C. ADMIN
- Return to Compliance Queue.
- Confirm Trade License is Uploaded.
- Press Verify.
- Confirm Trade License becomes Verified.

D. TENANT
- Refresh Communication Center.
- Confirm verification update appears.
- Refresh Document Vault.
- Confirm Trade License is Verified.
