import { API_URL } from "./config";

function authHeaders() {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("firmic_token")
      : null;

  if (!token) {
    throw new Error("Not authenticated.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseResponse(
  response: Response,
  fallback: string
) {
  const text = await response.text();

  if (!response.ok) {
    let message = text || fallback;

    try {
      const payload = text
        ? JSON.parse(text)
        : null;

      message = payload?.detail || message;
    } catch {
      // Keep plain text.
    }

    throw new Error(message);
  }

  return text ? JSON.parse(text) : null;
}

export async function getCompanyActivity(
  companyId: string
) {
  const response = await fetch(
    `${API_URL}/api/activity/company/${companyId}`,
    {
      headers: authHeaders(),
    }
  );

  return parseResponse(
    response,
    "Failed to load company activity"
  );
}
