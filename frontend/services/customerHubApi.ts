import { API_URL } from "./config";

export type CustomerHealth =
  | "excellent"
  | "healthy"
  | "attention"
  | "at_risk"
  | "critical";

export type CustomerStatus =
  | "prospect"
  | "active"
  | "inactive"
  | "archived";

export type OpportunityStage =
  | "lead"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type CustomerContact = {
  id: string;
  customer_id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  is_primary: boolean;
};

export type CustomerOpportunity = {
  id: string;
  customer_id: string;
  title: string;
  value: number;
  probability: number;
  stage: OpportunityStage;
  expected_close?: string | null;
  owner?: string | null;
  notes?: string | null;
};

export type CustomerTicket = {
  id: string;
  customer_id: string;
  title: string;
  description?: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "waiting" | "resolved" | "closed";
  assigned_to?: string | null;
};

export type Customer = {
  id: string;
  company_id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  owner?: string | null;
  status: CustomerStatus;
  relationship_score: number;
  health: CustomerHealth;
  tags: string[];
  notes?: string | null;
  metrics: {
    contacts: number;
    opportunities: number;
    pipeline_value: number;
    open_tickets: number;
  };
  contacts?: CustomerContact[];
  opportunities?: CustomerOpportunity[];
  support_tickets?: CustomerTicket[];
  communications?: unknown[];
  activity?: unknown[];
};

function headers(json = false): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("firmic_token")
      : null;

  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parse(response: Response) {
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      body?.detail ||
      body?.message ||
      `Customer Hub request failed with status ${response.status}`;

    throw new Error(
      typeof detail === "string" ? detail : JSON.stringify(detail)
    );
  }

  return body;
}

export async function getCompanyCustomers(
  companyId: string,
  options?: {
    search?: string;
    status?: CustomerStatus;
  }
): Promise<Customer[]> {
  const params = new URLSearchParams();

  if (options?.search) params.set("search", options.search);
  if (options?.status) params.set("status", options.status);

  const query = params.toString() ? `?${params.toString()}` : "";

  const body = await parse(
    await fetch(
      `${API_URL}/api/customer-hub/company/${encodeURIComponent(
        companyId
      )}${query}`,
      {
        headers: headers(),
        cache: "no-store",
      }
    )
  );

  return Array.isArray(body?.customers) ? body.customers : [];
}

export async function getCustomerHubSummary(companyId: string) {
  return parse(
    await fetch(
      `${API_URL}/api/customer-hub/company/${encodeURIComponent(
        companyId
      )}/summary`,
      {
        headers: headers(),
        cache: "no-store",
      }
    )
  );
}

export async function getCustomer(
  customerId: string
): Promise<Customer> {
  return parse(
    await fetch(
      `${API_URL}/api/customer-hub/${encodeURIComponent(customerId)}`,
      {
        headers: headers(),
        cache: "no-store",
      }
    )
  );
}

export async function createCustomer(data: {
  company_id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  owner?: string;
  status?: CustomerStatus;
  relationship_score?: number;
  health?: CustomerHealth;
  tags?: string[];
  notes?: string;
}) {
  return parse(
    await fetch(`${API_URL}/api/customer-hub`, {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify(data),
    })
  );
}

export async function updateCustomer(
  customerId: string,
  data: Partial<Omit<Customer, "id" | "company_id" | "metrics">>
) {
  return parse(
    await fetch(
      `${API_URL}/api/customer-hub/${encodeURIComponent(customerId)}`,
      {
        method: "PUT",
        headers: headers(true),
        body: JSON.stringify(data),
      }
    )
  );
}

export async function deleteCustomer(customerId: string) {
  return parse(
    await fetch(
      `${API_URL}/api/customer-hub/${encodeURIComponent(customerId)}`,
      {
        method: "DELETE",
        headers: headers(),
      }
    )
  );
}

export async function createCustomerContact(
  customerId: string,
  data: {
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    position?: string;
    is_primary?: boolean;
  }
) {
  return parse(
    await fetch(
      `${API_URL}/api/customer-hub/${encodeURIComponent(
        customerId
      )}/contacts`,
      {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify(data),
      }
    )
  );
}

export async function createCustomerOpportunity(
  customerId: string,
  data: {
    title: string;
    value?: number;
    probability?: number;
    stage?: OpportunityStage;
    expected_close?: string;
    owner?: string;
    notes?: string;
  }
) {
  return parse(
    await fetch(
      `${API_URL}/api/customer-hub/${encodeURIComponent(
        customerId
      )}/opportunities`,
      {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify(data),
      }
    )
  );
}

export async function updateCustomerOpportunity(
  opportunityId: string,
  data: Partial<{
    title: string;
    value: number;
    probability: number;
    stage: OpportunityStage;
    expected_close: string | null;
    owner: string | null;
    notes: string | null;
  }>
) {
  return parse(
    await fetch(
      `${API_URL}/api/customer-hub/opportunities/${encodeURIComponent(
        opportunityId
      )}`,
      {
        method: "PUT",
        headers: headers(true),
        body: JSON.stringify(data),
      }
    )
  );
}

export async function createCustomerTicket(
  customerId: string,
  data: {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high" | "urgent";
    status?: "open" | "waiting" | "resolved" | "closed";
    assigned_to?: string;
  }
) {
  return parse(
    await fetch(
      `${API_URL}/api/customer-hub/${encodeURIComponent(
        customerId
      )}/tickets`,
      {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify(data),
      }
    )
  );
}

export type SonnyCustomerSummary = {
  action: "summarize_customer";
  title: string;
  reply: string;
  customer: {
    id: string;
    name: string;
    status: string;
    health: string;
    relationship_score: number;
  };
  metrics: {
    contacts: number;
    active_opportunities: number;
    pipeline_value: number;
    weighted_forecast: number;
    open_tickets: number;
    recent_communications: number;
  };
  risks: string[];
  recommended_next_action: string;
  recent_activity: Array<Record<string, unknown>>;
  recent_communications: Array<Record<string, unknown>>;
  confidence: number;
  source: string;
};

export async function summarizeCustomerWithSonny(
  customerId: string,
  options?: { signal?: AbortSignal }
): Promise<SonnyCustomerSummary> {
  return parse(
    await fetch(
      `${API_URL}/api/customer-hub/${encodeURIComponent(
        customerId
      )}/sonny/summary`,
      {
        headers: headers(),
        cache: "no-store",
        signal: options?.signal,
      }
    )
  );
}


export type CustomerSonnyAction =
  | "summary"
  | "next_action"
  | "follow_up"
  | "proposal";

export type CustomerSonnyActionResponse = SonnyCustomerSummary & {
  action: string;
  subject?: string;
  email_body?: string;
  execution_steps?: string[];
  proposal?: {
    objective?: string;
    scope?: string[];
    next_step?: string;
    missing_information?: string[];
  };
};

export async function executeCustomerSonnyAction(
  customerId: string,
  action: CustomerSonnyAction,
  options?: { signal?: AbortSignal }
): Promise<CustomerSonnyActionResponse> {
  return parse(
    await fetch(
      `${API_URL}/api/customer-hub/${encodeURIComponent(
        customerId
      )}/sonny/action`,
      {
        method: "POST",
        headers: headers(true),
        cache: "no-store",
        signal: options?.signal,
        body: JSON.stringify({ action }),
      }
    )
  );
}


export type CustomerSonnyExecution =
  | "save_email_draft"
  | "create_follow_up_task"
  | "record_recommendation";

export type CustomerSonnyExecutionResponse = {
  ok: boolean;
  execution: CustomerSonnyExecution;
  reply: string;
  record?: Record<string, unknown>;
};

export async function executeCustomerSonnyResult(
  customerId: string,
  execution: CustomerSonnyExecution,
  sourceAction: CustomerSonnyAction
): Promise<CustomerSonnyExecutionResponse> {
  return parse(
    await fetch(
      `${API_URL}/api/customer-hub/${encodeURIComponent(
        customerId
      )}/sonny/execute`,
      {
        method: "POST",
        headers: headers(true),
        cache: "no-store",
        body: JSON.stringify({
          execution,
          source_action: sourceAction,
        }),
      }
    )
  );
}
