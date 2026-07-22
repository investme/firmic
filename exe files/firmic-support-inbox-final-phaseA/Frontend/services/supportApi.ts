import { API_URL } from "./config";

function headers(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("firmic_token")
      : null;

  if (!token) {
    throw new Error("Authentication required.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function request(
  path: string,
  options: RequestInit = {}
) {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      cache: "no-store",
      headers: {
        ...headers(),
        ...(options.headers || {}),
      },
    }
  );

  const text = await response.text();

  if (!response.ok) {
    let message =
      text || "Support request failed";

    try {
      const payload = text
        ? JSON.parse(text)
        : null;

      message =
        payload?.detail ||
        payload?.message ||
        message;
    } catch {
      // Preserve plain-text error.
    }

    throw new Error(message);
  }

  return text ? JSON.parse(text) : null;
}

export function getCompanySupportTickets(
  companyId: string
) {
  return request(
    `/api/support/company/${encodeURIComponent(
      companyId
    )}/tickets`
  );
}

export function createSupportTicket(data: {
  company_id: string;
  subject: string;
  category: string;
  message: string;
}) {
  return request(
    "/api/support/tickets",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export function replyToSupportTicket(
  ticketId: string,
  message: string
) {
  return request(
    `/api/support/tickets/${encodeURIComponent(
      ticketId
    )}/reply`,
    {
      method: "POST",
      body: JSON.stringify({
        message,
      }),
    }
  );
}

export function closeSupportTicket(
  ticketId: string
) {
  return request(
    `/api/support/tickets/${encodeURIComponent(
      ticketId
    )}/close`,
    {
      method: "POST",
    }
  );
}

export function reopenSupportTicket(
  ticketId: string
) {
  return request(
    `/api/support/tickets/${encodeURIComponent(
      ticketId
    )}/reopen`,
    {
      method: "POST",
    }
  );
}
