const API_URL = "http://127.0.0.1:8000";

export async function createCompany(data: {
  name: string;
  user_id: string;
}) {
  const res = await fetch(`${API_URL}/api/company/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const text = await res.text();
  console.log("RAW BACKEND RESPONSE:", text);

  if (!res.ok) {
    throw new Error(text || "Failed to create company");
  }

  return text ? JSON.parse(text) : null;
}

export async function getCompanies() {
  const res = await fetch(`${API_URL}/api/company/list`);

  if (!res.ok) {
    throw new Error("Failed to load companies");
  }

  return res.json();
}