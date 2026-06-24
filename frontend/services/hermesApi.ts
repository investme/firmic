import { API_URL } from "./config";

export async function getHermes(companyId: string) {
  const res = await fetch(
    `${API_URL}/api/hermes/company/${companyId}`
  );

  if (!res.ok) {
    throw new Error("Failed to load Hermes");
  }

  return res.json();
}