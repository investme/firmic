import { API_URL } from "./config";

function getHeaders() {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("firmic_token")
      : null;

  if (!token) {
    throw new Error("Admin authentication required.");
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
      message = payload?.detail || message;
    } catch {
      // Preserve plain-text error responses.
    }

    throw new Error(message);
  }

  return text ? JSON.parse(text) : null;
}

export function getAdminDashboard() {
  return request("/api/admin/dashboard");
}

export function getAdminCompanies() {
  return request("/api/admin/companies");
}

export function getAdminOffices() {
  return request("/api/admin/offices");
}

export function getAdminCompany(companyId: string) {
  return request(`/api/admin/companies/${companyId}`);
}

export function terminateAdminCompany(companyId: string) {
  return request(`/api/admin/companies/${companyId}/terminate`, {
    method: "POST",
  });
}

export function restoreAdminCompany(companyId: string) {
  return request(`/api/admin/companies/${companyId}/restore`, {
    method: "POST",
  });
}

export function deleteAdminCompany(companyId: string) {
  return request(`/api/admin/companies/${companyId}`, {
    method: "DELETE",
  });
}

export function getAdminModuleSummary(moduleName: string) {
  return request(`/api/admin/summary/${moduleName}`);
}

export function getAdminBilling() {
  return request("/api/admin/billing");
}

export function getAdminCompanyBilling(companyId: string) {
  return request(`/api/admin/billing/company/${companyId}`);
}

export function markAdminCompanyBilled(companyId: string) {
  return request(`/api/admin/billing/company/${companyId}/mark-billed`, {
    method: "POST",
  });
}

export function markAdminCompanyPaid(companyId: string) {
  return request(`/api/admin/billing/company/${companyId}/mark-paid`, {
    method: "POST",
  });
}

export function backfillAdminHookupFees() {
  return request("/api/admin/billing/backfill-hookup-fees", {
    method: "POST",
  });
}

export function getAdminAIWorkforce() {
  return request("/api/admin/ai-workforce");
}

export function getAdminUsers() {
  return request("/api/admin/users");
}

export function getAdminSettings() {
  return request("/api/admin/settings");
}

export function getAdminAnalytics() {
  return request("/api/admin/analytics");
}

export function getAdminSupport() {
  return request("/api/admin/support");
}

export function getAdminCompliance() {
  return request("/api/admin/compliance");
}

export function getAdminCompanyCompliance(companyId: string) {
  return request(`/api/admin/compliance/company/${companyId}`);
}

export function requestAdminComplianceDocuments(companyId: string) {
  return request(`/api/admin/compliance/company/${companyId}/request-documents`, {
    method: "POST",
  });
}

export function markAdminComplianceReviewed(companyId: string) {
  return request(`/api/admin/compliance/company/${companyId}/mark-reviewed`, {
    method: "POST",
  });
}

