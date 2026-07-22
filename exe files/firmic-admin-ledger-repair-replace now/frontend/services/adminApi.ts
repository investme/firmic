import { API_URL } from "./config";

function headers() {
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

async function parse(
  response: Response,
  fallback: string
) {
  const text = await response.text();

  if (!response.ok) {
    let message = text || fallback;

    try {
      const payload = text ? JSON.parse(text) : null;
      message = payload?.detail || message;
    } catch {
      // Preserve plain text response.
    }

    throw new Error(message);
  }

  return text ? JSON.parse(text) : null;
}

async function request(
  path: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      ...headers(),
      ...(options.headers || {}),
    },
  });

  return parse(response, "Admin request failed");
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
  return request(
    `/api/admin/companies/${companyId}/terminate`,
    { method: "POST" }
  );
}

export function restoreAdminCompany(companyId: string) {
  return request(
    `/api/admin/companies/${companyId}/restore`,
    { method: "POST" }
  );
}

export function deleteAdminCompany(companyId: string) {
  return request(
    `/api/admin/companies/${companyId}`,
    { method: "DELETE" }
  );
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
  return request(
    `/api/admin/billing/company/${companyId}/mark-billed`,
    { method: "POST" }
  );
}

export function markAdminCompanyPaid(companyId: string) {
  return request(
    `/api/admin/billing/company/${companyId}/mark-paid`,
    { method: "POST" }
  );
}

export function backfillAdminHookupFees() {
  return request(
    "/api/admin/billing/backfill-hookup-fees",
    { method: "POST" }
  );
}
