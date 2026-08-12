import { API_URL } from "./config";

export type CreateCompanyPayload = {
  name: string;
  plan_code:
    | "PLAN_STARTER"
    | "PLAN_BUSINESS"
    | "PLAN_ENTERPRISE";
  is_uae_resident: boolean;
};

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(localStorage.getItem("firmic_token"));
}

function getAuthHeaders() {
  if (typeof window === "undefined") {
    throw new Error("Authentication is only available in the browser.");
  }

  const token = localStorage.getItem("firmic_token");

  if (!token) {
    throw new Error("Not authenticated. Please log in first.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseResponse(
  response: Response,
  fallbackMessage: string
) {
  const text = await response.text();

  if (!response.ok) {
    let message = text || fallbackMessage;

    try {
      const payload = text ? JSON.parse(text) : null;
      message = payload?.detail || message;
    } catch {
      // Preserve plain response text.
    }

    throw new Error(message);
  }

  return text ? JSON.parse(text) : null;
}

export async function createCompany(data: CreateCompanyPayload) {
  const response = await fetch(`${API_URL}/api/company/create`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return parseResponse(response, "Failed to create company");
}

export async function getCompanies() {
  const response = await fetch(`${API_URL}/api/company/list`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  return parseResponse(response, "Failed to load companies");
}

export async function getCompany(companyId: string) {
  const response = await fetch(`${API_URL}/api/company/${companyId}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  return parseResponse(response, "Failed to load company");
}

export async function terminateCompany(companyId: string) {
  const response = await fetch(
    `${API_URL}/api/company/${companyId}/terminate`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );

  return parseResponse(response, "Failed to terminate company");
}
