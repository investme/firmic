import { API_URL } from "./config";

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
    throw new Error(text || fallbackMessage);
  }

  return text ? JSON.parse(text) : null;
}

export async function getOffices() {
  const response = await fetch(`${API_URL}/api/offices`);

  return parseResponse(response, "Failed to load offices");
}

export async function rentOffice(data: {
  office_code: string;
  company_id: string;
}) {
  const response = await fetch(`${API_URL}/api/offices/rent`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return parseResponse(response, "Failed to rent office");
}

export async function releaseOffice(companyId: string) {
  const response = await fetch(`${API_URL}/api/offices/release`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ company_id: companyId }),
  });

  return parseResponse(response, "Failed to release headquarters");
}
