const API_URL = "http://127.0.0.1:8000";

export async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return res.json();
}

export async function apiPost(path: string, body: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`POST ${path} failed`);
  return res.json();
}

export const getOffices = () => apiGet("/api/offices");

export const getAgents = () => apiGet("/api/agents");

export const getAddons = () => apiGet("/api/addons");

export const rentOffice = (officeCode: string) =>
  apiPost("/api/offices/rent", {
    office_code: officeCode,
  });

export const createSubscription = (payload: any) =>
  apiPost("/api/subscriptions", payload);

export const getDashboard = () => apiGet("/api/dashboard");