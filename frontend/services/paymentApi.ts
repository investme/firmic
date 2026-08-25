import { API_URL } from "./config";

export type PaymentStatus =
  | "pending"
  | "verified"
  | "failed";

export type PaymentResponse = {
  id: string;
  company_id: string;
  subscription_id: string;

  provider: string;
  provider_session_id: string | null;
  provider_payment_intent_id: string | null;

  status: PaymentStatus | string;

  amount: number;
  currency: string;

  verified_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;

  payment_metadata: Record<string, unknown> | null;
};

export type CheckoutSessionResponse = {
  payment_id: string;
  payment_status: string;
  provider: string;
  provider_session_id: string;
  checkout_url: string;
};

function getAuthHeaders(
  json = false,
): Record<string, string> {
  if (typeof window === "undefined") {
    throw new Error(
      "Payment authentication is only available in the browser.",
    );
  }

  const token = localStorage.getItem("firmic_token");

  if (!token) {
    throw new Error(
      "Your session has expired. Please sign in again.",
    );
  }

  return {
    ...(json
      ? {
          "Content-Type": "application/json",
        }
      : {}),
    Authorization: `Bearer ${token}`,
  };
}

async function parseResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
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
    const detail =
      payload?.detail ||
      payload?.message ||
      fallbackMessage;

    throw new Error(
      typeof detail === "string"
        ? detail
        : JSON.stringify(detail),
    );
  }

  return payload as T;
}

export async function createPayment(
  companyId: string,
  idempotencyKey?: string,
): Promise<PaymentResponse> {
  const response = await fetch(
    `${API_URL}/api/payments`,
    {
      method: "POST",
      cache: "no-store",
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        company_id: companyId,
        ...(idempotencyKey
          ? {
              idempotency_key: idempotencyKey,
            }
          : {}),
      }),
    },
  );

  return parseResponse<PaymentResponse>(
    response,
    "Unable to create payment transaction.",
  );
}

export async function getPayment(
  paymentId: string,
): Promise<PaymentResponse> {
  const response = await fetch(
    `${API_URL}/api/payments/${encodeURIComponent(
      paymentId,
    )}`,
    {
      method: "GET",
      cache: "no-store",
      headers: getAuthHeaders(),
    },
  );

  return parseResponse<PaymentResponse>(
    response,
    "Unable to load payment status.",
  );
}

export async function createCheckoutSession(
  paymentId: string,
): Promise<CheckoutSessionResponse> {
  const response = await fetch(
    `${API_URL}/api/payments/${encodeURIComponent(
      paymentId,
    )}/checkout-session`,
    {
      method: "POST",
      cache: "no-store",
      headers: getAuthHeaders(),
    },
  );

  return parseResponse<CheckoutSessionResponse>(
    response,
    "Unable to start secure Stripe checkout.",
  );
}

export function paymentIsVerified(
  payment: PaymentResponse | null | undefined,
): boolean {
  return Boolean(
    payment &&
      payment.status === "verified" &&
      payment.verified_at,
  );
}
