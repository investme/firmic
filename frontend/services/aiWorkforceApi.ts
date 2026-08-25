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

export async function getCompanyAIAgents(
  companyId: string
) {
  const response = await fetch(
    `${API_URL}/api/ai-workforce/company/${companyId}`,
    {
      headers: authHeaders(),
    }
  );

  return parseResponse(
    response,
    "Failed to load AI workforce"
  );
}

export async function hireAIAgent(payload: {
  company_id: string;
  agent_name?: string;
  agent_code?: string;
}) {
  const response = await fetch(
    `${API_URL}/api/ai-workforce/hire`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }
  );

  return parseResponse(
    response,
    "Failed to hire AI agent"
  );
}

export async function deactivateAIAgent(payload: {
  company_id: string;
  agent_name?: string;
  agent_code?: string;
}) {
  const response = await fetch(
    `${API_URL}/api/ai-workforce/deactivate`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }
  );

  return parseResponse(
    response,
    "Failed to deactivate AI agent"
  );
}
