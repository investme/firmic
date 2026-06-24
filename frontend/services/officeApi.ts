import { API_URL } from "./config";

export async function getOffices() {
  const res = await fetch(`${API_URL}/api/offices`);

  if (!res.ok) {
    throw new Error("Failed to load offices");
  }

  return res.json();
}

export async function rentOffice(data: {
  office_id: number;
  office_code: string;
  company_id: string;
}) {
  const res = await fetch(`${API_URL}/api/offices/rent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || "Failed to rent office");
  }

  return text ? JSON.parse(text) : null;
}