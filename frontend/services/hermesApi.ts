import { API_URL } from "./config";

function getHeaders() {
  const token = localStorage.getItem("firmic_token");

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function getHermes(companyId: string) {
  const res = await fetch(
    `${API_URL}/api/hermes/company/${companyId}`,
    {
      headers: getHeaders(),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to load Hermes");
  }

  return res.json();
}