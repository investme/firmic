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

export async function getCompanyMeetingBookings(
  companyId: string
) {
  const response = await fetch(
    `${API_URL}/api/meeting-bookings/company/${companyId}`,
    {
      headers: authHeaders(),
    }
  );

  return parseResponse(
    response,
    "Failed to load meeting bookings"
  );
}

export async function createMeetingBooking(payload: {
  company_id: string;
  room_id: number;
  room_name: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number;
  hourly_price_usd: number;
}) {
  const response = await fetch(
    `${API_URL}/api/meeting-bookings`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }
  );

  return parseResponse(
    response,
    "Failed to create meeting booking"
  );
}

export async function cancelMeetingBooking(
  bookingId: string,
  companyId: string
) {
  const response = await fetch(
    `${API_URL}/api/meeting-bookings/${bookingId}/cancel`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        company_id: companyId,
      }),
    }
  );

  return parseResponse(
    response,
    "Failed to cancel meeting booking"
  );
}
