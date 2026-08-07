import { API_URL } from "./config";
import { getAdminToken } from "./adminSession";

function getHeaders(): Record<string, string> {
  const token = getAdminToken();

  if (!token) {
    throw new Error(
      "Admin authentication required."
    );
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function request(
  path: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  if (!response.ok) {
    let message = text || "Admin request failed";

    try {
      const payload = text ? JSON.parse(text) : null;

      message =
        payload?.detail ||
        payload?.message ||
        message;
    } catch {
      // Preserve plain-text backend errors.
    }

    throw new Error(message);
  }

  return text ? JSON.parse(text) : null;
}

/* =========================================================
   Dashboard
========================================================= */

export function getAdminDashboard() {
  return request("/api/admin/dashboard");
}

/* =========================================================
   Companies
========================================================= */

export function getAdminCompanies() {
  return request("/api/admin/companies");
}

export function getAdminCompany(
  companyId: string
) {
  return request(
    `/api/admin/companies/${encodeURIComponent(companyId)}`
  );
}

export function terminateAdminCompany(
  companyId: string
) {
  return request(
    `/api/admin/companies/${encodeURIComponent(companyId)}/terminate`,
    {
      method: "POST",
    }
  );
}

export function restoreAdminCompany(
  companyId: string
) {
  return request(
    `/api/admin/companies/${encodeURIComponent(companyId)}/restore`,
    {
      method: "POST",
    }
  );
}

export function deleteAdminCompany(
  companyId: string
) {
  return request(
    `/api/admin/companies/${encodeURIComponent(companyId)}`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   Office Inventory
========================================================= */

export function getAdminOffices() {
  return request("/api/admin/offices");
}

/* =========================================================
   Billing
========================================================= */

export function getAdminBilling() {
  return request("/api/admin/billing");
}

export function getAdminCompanyBilling(
  companyId: string
) {
  return request(
    `/api/admin/billing/company/${encodeURIComponent(companyId)}`
  );
}

export function markAdminCompanyBilled(
  companyId: string
) {
  return request(
    `/api/admin/billing/company/${encodeURIComponent(companyId)}/mark-billed`,
    {
      method: "POST",
    }
  );
}

export function markAdminCompanyPaid(
  companyId: string
) {
  return request(
    `/api/admin/billing/company/${encodeURIComponent(companyId)}/mark-paid`,
    {
      method: "POST",
    }
  );
}

export function backfillAdminActivationFees() {
  return request(
    "/api/admin/billing/backfill-activation-fees",
    {
      method: "POST",
    }
  );
}

// Temporary compatibility alias for older callers.
export const backfillAdminHookupFees =
  backfillAdminActivationFees;

/* =========================================================
   Compliance / Hermes
========================================================= */

export function getAdminCompliance() {
  return request("/api/admin/compliance");
}

export function getAdminCompanyCompliance(
  companyId: string
) {
  return request(
    `/api/admin/compliance/company/${encodeURIComponent(companyId)}`
  );
}

export function requestAdminComplianceDocuments(
  companyId: string
) {
  return request(
    `/api/admin/compliance/company/${encodeURIComponent(companyId)}/request-documents`,
    {
      method: "POST",
    }
  );
}

export function markAdminComplianceReviewed(
  companyId: string
) {
  return request(
    `/api/admin/compliance/company/${encodeURIComponent(companyId)}/mark-reviewed`,
    {
      method: "POST",
    }
  );
}

export function verifyAdminComplianceDocument(
  documentId: string
) {
  return request(
    `/api/admin/compliance/documents/${encodeURIComponent(documentId)}/verify`,
    {
      method: "POST",
    }
  );
}

/* =========================================================
   AI Workforce
========================================================= */

export function getAdminAIWorkforce() {
  return request("/api/admin/ai-workforce");
}

export function deactivateAdminAIAgent(data: {
  company_id: string;
  agent_name: string;
}) {
  return request(
    "/api/ai-workforce/deactivate",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export function reactivateAdminAIAgent(data: {
  company_id: string;
  agent_name: string;
  monthly_price_usd: number;
}) {
  return request(
    "/api/ai-workforce/hire",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

/* =========================================================
   Reports / Analytics
========================================================= */

export function getAdminAnalytics() {
  return request("/api/admin/analytics");
}

/* =========================================================
   Users & Roles
========================================================= */

export function getAdminUsers() {
  return request("/api/admin/users");
}

export function inviteAdminUser(data: {
  full_name: string;
  email: string;
}) {
  return request(
    "/api/admin/users/invite",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export function deleteAdminUser(
  userId: string | number
) {
  return request(
    `/api/admin/users/${encodeURIComponent(String(userId))}`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   Settings
========================================================= */

export function getAdminSettings() {
  return request("/api/admin/settings");
}

/* =========================================================
   Support
========================================================= */

export function getAdminSupport() {
  return request("/api/admin/support");
}

export function replyAdminSupportTicket(
  ticketId: string,
  message: string
) {
  return request(
    `/api/admin/support/tickets/${encodeURIComponent(
      ticketId
    )}/reply`,
    {
      method: "POST",
      body: JSON.stringify({
        message,
      }),
    }
  );
}

export function updateAdminSupportTicket(
  ticketId: string,
  data: {
    status?: string;
    priority?: string;
    assigned_admin_id?: string | null;
  }
) {
  return request(
    `/api/admin/support/tickets/${encodeURIComponent(
      ticketId
    )}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

/* =========================================================
   Legacy summary endpoint
   Keep temporarily for older Admin pages.
========================================================= */

export function getAdminModuleSummary(
  moduleName: string
) {
  return request(
    `/api/admin/summary/${encodeURIComponent(moduleName)}`
  );
}
