import { API_URL } from "./config";

export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  monthly_price: number;
  yearly_price?: number | null;
  max_ai_employees: number;
  max_users: number;
  active: boolean;
};

export type SubscriptionService = {
  id: string;
  code: string;
  category: string;
  name: string;
  description?: string | null;
  monthly_price: number;
  yearly_price?: number | null;
  setup_fee: number;
  starter_available: boolean;
  business_available: boolean;
  enterprise_available: boolean;
  active: boolean;
  metadata_json: Record<string, unknown>;
};

export type SubscriptionItem = {
  id: string;
  subscription_id: string;
  service_id: string;
  quantity: number;
  unit_price: number;
  monthly_price: number;
  status: string;
  billing_behavior: string;
  provisioned: boolean;
  activated_at?: string | null;
  cancelled_at?: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  service: SubscriptionService;
};

export type SubscriptionEvent = {
  id: string;
  subscription_id: string;
  event_type: string;
  actor?: string | null;
  title: string;
  description?: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
};

export type CompanySubscription = {
  id: string;
  company_id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  currency: string;
  monthly_subtotal: number;
  discount_total: number;
  tax_total: number;
  monthly_total: number;
  launch_activation_fee: number;
  next_invoice_date?: string | null;
  trial_ends_at?: string | null;
  started_at: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
  plan: SubscriptionPlan;
  items: SubscriptionItem[];
  events: SubscriptionEvent[];
};

export type SubscriptionPreviewItem = {
  service_code: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  monthly_price: number;
  included_by_plan: boolean;
};

export type SubscriptionPreview = {
  plan_code: string;
  plan_name: string;
  plan_monthly_price: number;
  launch_activation_fee: number;
  items: SubscriptionPreviewItem[];
  monthly_subtotal: number;
  tax_total: number;
  monthly_total: number;
  due_today: number;
};

function getToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("firmic_token") || "";
}

function getHeaders(): HeadersInit {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "detail" in body
        ? String((body as { detail?: unknown }).detail)
        : `Subscription request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return body as T;
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const response = await fetch(`${API_URL}/api/subscriptions/plans`, {
    headers: getHeaders(),
    cache: "no-store",
  });

  return parseResponse<SubscriptionPlan[]>(response);
}

export async function getSubscriptionServices(
  options: {
    category?: string;
    planCode?: string;
  } = {},
): Promise<SubscriptionService[]> {
  const params = new URLSearchParams();

  if (options.category) {
    params.set("category", options.category);
  }

  if (options.planCode) {
    params.set("plan_code", options.planCode);
  }

  const query = params.toString();

  const response = await fetch(
    `${API_URL}/api/subscriptions/services${query ? `?${query}` : ""}`,
    {
      headers: getHeaders(),
      cache: "no-store",
    },
  );

  return parseResponse<SubscriptionService[]>(response);
}

export async function getCompanySubscription(
  companyId: string,
): Promise<CompanySubscription> {
  const response = await fetch(
    `${API_URL}/api/subscriptions/company/${encodeURIComponent(companyId)}`,
    {
      headers: getHeaders(),
      cache: "no-store",
    },
  );

  return parseResponse<CompanySubscription>(response);
}

export async function createCompanySubscription(input: {
  company_id: string;
  plan_code: string;
  billing_cycle?: "monthly" | "yearly";
}): Promise<CompanySubscription> {
  const response = await fetch(`${API_URL}/api/subscriptions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      ...input,
      billing_cycle: input.billing_cycle || "monthly",
    }),
  });

  return parseResponse<CompanySubscription>(response);
}

export async function activateCompanySubscription(
  companyId: string,
): Promise<CompanySubscription> {
  const response = await fetch(`${API_URL}/api/subscriptions/activate`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      company_id: companyId,
    }),
  });

  return parseResponse<CompanySubscription>(response);
}

export async function changeCompanyPlan(
  companyId: string,
  planCode: string,
): Promise<CompanySubscription> {
  const response = await fetch(
    `${API_URL}/api/subscriptions/company/${encodeURIComponent(
      companyId,
    )}/plan`,
    {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        plan_code: planCode,
      }),
    },
  );

  return parseResponse<CompanySubscription>(response);
}

export async function addCompanySubscriptionService(
  companyId: string,
  input: {
    service_code: string;
    quantity?: number;
    metadata?: Record<string, unknown>;
  },
): Promise<CompanySubscription> {
  const response = await fetch(
    `${API_URL}/api/subscriptions/company/${encodeURIComponent(
      companyId,
    )}/services`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        service_code: input.service_code,
        quantity: input.quantity || 1,
        metadata: input.metadata || {},
      }),
    },
  );

  return parseResponse<CompanySubscription>(response);
}

export async function removeCompanySubscriptionService(
  companyId: string,
  itemId: string,
): Promise<CompanySubscription> {
  const response = await fetch(
    `${API_URL}/api/subscriptions/company/${encodeURIComponent(
      companyId,
    )}/services/${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
      headers: getHeaders(),
    },
  );

  return parseResponse<CompanySubscription>(response);
}

export async function previewSubscription(input: {
  plan_code: string;
  service_codes?: string[];
}): Promise<SubscriptionPreview> {
  const response = await fetch(`${API_URL}/api/subscriptions/preview`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      plan_code: input.plan_code,
      service_codes: input.service_codes || [],
    }),
  });

  return parseResponse<SubscriptionPreview>(response);
}
