import { API_URL } from "./config";

export type SonnyPlan = {
  action?: string;
  parameters?: Record<string, unknown>;
  confidence?: number;
  reason?: string;
  requires_confirmation?: boolean;
  missing_fields?: string[];
  ready_to_execute?: boolean;
};

export type SonnyChatResponse = {
  reply: string;
  company_id?: string;
  memory_saved?: boolean;
  context_version?: string;
  attention_required?: boolean;
  critical_count?: number;
  high_count?: number;
  priorities?: unknown[];
  has_action?: boolean;
  requires_confirmation?: boolean;
  plan?: SonnyPlan | null;
  ready_to_execute?: boolean;
  missing_fields?: string[];
  action_result?: {
    status?: string;
    message?: string;
    data?: Record<string, unknown>;
  } | null;
  speech?: string;
  actions?: unknown[];
};

export async function sendSonnyChat(
  companyId: string,
  message: string,
  options?: {
    confirmed?: boolean;
    plan?: SonnyPlan | null;
    signal?: AbortSignal;
  }
): Promise<SonnyChatResponse> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("firmic_token")
      : null;

  const response = await fetch(`${API_URL}/api/sonny/chat`, {
    method: "POST",
    signal: options?.signal,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      company_id: companyId,
      message,
      confirmed: Boolean(options?.confirmed),
      plan: options?.plan || null,
    }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      body?.detail ||
      body?.message ||
      `Sonny request failed with status ${response.status}`;

    throw new Error(
      typeof detail === "string" ? detail : JSON.stringify(detail)
    );
  }

  if (!body?.reply || typeof body.reply !== "string") {
    throw new Error("Sonny returned an invalid response.");
  }

  return body as SonnyChatResponse;
}
