import { API_URL } from "./config";

function getHeaders() {
  const token = localStorage.getItem("firmic_token");

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function getSonny(companyId: string) {
  const res = await fetch(
    `${API_URL}/api/sonny/company/${companyId}`,
    {
      headers: getHeaders(),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to load Sonny");
  }

  return res.json();
}

export async function getProgress(companyId: string) {
  const res = await fetch(
    `${API_URL}/api/progress/company/${companyId}`,
    {
      headers: getHeaders(),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to load progress");
  }

  return res.json();
}