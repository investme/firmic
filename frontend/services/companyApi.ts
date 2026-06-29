import { API_URL } from "./config";

function getAuthHeaders() {
  const token = localStorage.getItem("firmic_token");

  if (!token) {
    throw new Error("Not authenticated. Please log in first.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function createCompany(data: {
  name: string;
}) {
  const res = await fetch(`${API_URL}/api/company/create`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || "Failed to create company");
  }

  return text ? JSON.parse(text) : null;
}

export async function getCompanies() {
  const res = await fetch(`${API_URL}/api/company/list`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to load companies");
  }

  return res.json();
}