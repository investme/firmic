import { API_URL } from "./config";

export type SubscriptionService = {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
  category: string;
  monthly_price?: number;
};

export type SubscriptionItem = {
  id: string;
  subscription_id?: string;
  service_id?: string;
  quantity: number;
  unit_price: number;
  monthly_price: number;
  status: string;
  billing_behavior?: string | null;
  provisioned?: boolean;
  metadata_json?: {
    included_by_plan?: boolean;
    [key: string]: unknown;
  } | null;
  service: SubscriptionService;
  created_at?: string | null;
  updated_at?: string | null;
  activated_at?: string | null;
  cancelled_at?: string | null;
};

export type CompanySubscription = {
  id: string;
  company_id: string;
  status: string;
  billing_cycle: string;
  currency?: string;
  monthly_subtotal: number;
  discount_total: number;
  tax_total: number;
  monthly_total: number;
  launch_activation_fee: number;
  next_invoice_date?: string | null;
  trial_ends_at?: string | null;
  started_at?: string | null;
  cancel_at_period_end?: boolean;
  plan: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    monthly_price: number;
    max_ai_employees: number;
    max_users?: number;
  };
  items: SubscriptionItem[];
  events?: any[];
};

export type FirmicSubscription = CompanySubscription;

function getAuthHeaders() {
  if (typeof window === "undefined") {
    throw new Error(
      "Authentication is only available in the browser.",
    );
  }

  const token = localStorage.getItem("firmic_token");

  if (!token) {
    throw new Error(
      "Not authenticated. Please log in first.",
    );
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function subscriptionRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  if (!response.ok) {
    let message =
      text || "Subscription request failed.";

    try {
      const payload = text ? JSON.parse(text) : null;

      message =
        payload?.detail ||
        payload?.message ||
        message;
    } catch {
      // Keep raw backend response.
    }

    throw new Error(message);
  }

  return (text ? JSON.parse(text) : null) as T;
}

export async function createCompanySubscription(payload: {
  company_id: string;
  plan_code: string;
  billing_cycle?: "monthly" | "yearly";
}) {
  return subscriptionRequest<FirmicSubscription>(
    "/api/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({
        company_id: payload.company_id,
        plan_code: payload.plan_code,
        billing_cycle:
          payload.billing_cycle || "monthly",
      }),
    },
  );
}

export async function activateCompanySubscription(
  companyId: string,
) {
  return subscriptionRequest<FirmicSubscription>(
    "/api/subscriptions/activate",
    {
      method: "POST",
      body: JSON.stringify({
        company_id: companyId,
      }),
    },
  );
}

export async function getCompanySubscription(
  companyId: string,
) {
  return subscriptionRequest<FirmicSubscription>(
    `/api/subscriptions/company/${encodeURIComponent(
      companyId,
    )}`,
  );
}

export async function changeCompanySubscriptionPlan(
  companyId: string,
  planCode: string,
) {
  return subscriptionRequest<FirmicSubscription>(
    `/api/subscriptions/company/${encodeURIComponent(
      companyId,
    )}/plan`,
    {
      method: "PATCH",
      body: JSON.stringify({
        plan_code: planCode,
      }),
    },
  );
}

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

export async function getSubscriptionPlans() {
  return subscriptionRequest<SubscriptionPlan[]>(
    "/api/subscriptions/plans",
  );
}

export async function previewSubscription(payload: {
  plan_code: string;
  service_codes?: string[];
}) {
  return subscriptionRequest<SubscriptionPreview>(
    "/api/subscriptions/preview",
    {
      method: "POST",
      body: JSON.stringify({
        plan_code: payload.plan_code,
        service_codes: payload.service_codes || [],
      }),
    },
  );
}
