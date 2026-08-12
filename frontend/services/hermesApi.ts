import { API_URL } from "./config";

function getHeaders() {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("firmic_token")
      : null;

  return {
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

async function parseResponse(
  response: Response,
) {
  const text = await response.text();

  let payload: any = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        detail: text,
      };
    }
  }

  if (!response.ok) {
    throw new Error(
      payload?.detail ||
        payload?.message ||
        `Hermes request failed (${response.status}).`,
    );
  }

  return payload;
}

export async function getHermes(
  companyId: string,
) {
  const response = await fetch(
    `${API_URL}/api/hermes/company/${companyId}`,
    {
      headers: getHeaders(),
    },
  );

  return parseResponse(response);
}

export async function chatHermes(
  companyId: string,
  message: string,
) {
  const response = await fetch(
    `${API_URL}/api/hermes-agent/chat`,
    {
      method: "POST",
      headers: {
        ...getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company_id: companyId,
        message,
      }),
    },
  );

  return parseResponse(response);
}
