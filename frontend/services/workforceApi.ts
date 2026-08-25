const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://firmic-production.up.railway.app";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("firmic_token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = body?.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : body?.message ||
            `Workforce request failed with status ${response.status}`
    );
  }

  return body;
}

export type WorkforceAgent = {
  key: string;
  name: string;
  role: string;
  description?: string;
  capabilities?: string[];
  route_keywords?: string[];
  default_status?: string;
  mvp_enabled?: boolean;
};

export type WorkforceAgentMessage = {
  id: string;
  assignment_id: string;
  company_id: string;
  sender_agent_code: string;
  recipient_agent_code: string;
  message_type: string;
  subject?: string | null;
  content: string;
  message_data?: Record<string, unknown>;
  created_at?: string | null;
};

export type WorkforceTimelineEvent = {
  id: string;
  job_id?: string;
  event_type?: string;
  actor: string;
  title: string;
  description?: string | null;
  status?: string | null;
  progress?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};


export type WorkforceExecutionHealth = {
  generated_at?: string;
  scope?: {
    company_id?: string;
    global?: boolean;
  };
  health?: {
    status?: string;
    healthy?: boolean;
    reasons?: string[];
    worker_process_liveness_known?: boolean;
  };
  workflows?: {
    total?: number;
    draft?: number;
    running?: number;
    waiting?: number;
    completed?: number;
    cancelled?: number;
  };
  leases?: {
    active?: number;
    expired?: number;
    non_runnable_with_owner?: number;
    active_items?: unknown[];
    expired_items?: unknown[];
    non_runnable_items?: unknown[];
  };
  failures?: {
    failed_runs?: number;
    failed_assignments?: number;
    failed_jobs?: number;
    exhausted_runs?: number;
    exhausted_assignments?: number;
  };
  worker?: {
    alive?: number;
    available?: boolean;
    liveness?: string;
    reason?: string;
    stale?: number;
    stopped?: number;
    unknown?: number;
    workers?: unknown[];
  };
};

export type WorkforceJob = {
  id: string;
  company_id: string;
  title: string;
  request_text: string;
  assigned_agent: string;
  assigned_role: string;
  status:
    | "pending"
    | "accepted"
    | "working"
    | "completed"
    | "failed"
    | "cancelled";
  progress: number;
  result_summary?: string | null;
  failure_reason?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  timeline?: WorkforceTimelineEvent[];
  agent_messages?: WorkforceAgentMessage[];
};

export function getWorkforceRegistry() {
  return request("/api/workforce/registry");
}

export function getCompanyWorkforceJobs(companyId: string, limit = 30) {
  return request(
    `/api/workforce/company/${encodeURIComponent(companyId)}?limit=${limit}`
  );
}


export function getCompanyWorkforceHealth(
  companyId: string
) {
  return request(
    `/api/workforce/company/${encodeURIComponent(companyId)}/health`
  );
}

export function getWorkforceJob(jobId: string) {
  return request(`/api/workforce/jobs/${encodeURIComponent(jobId)}`);
}

export function executeWorkforceJob(data: {
  company_id: string;
  request_text: string;
  title?: string;
  preferred_agent?: string;
  source_type?: string;
  source_id?: string;
  metadata?: Record<string, unknown>;
  fanout?: boolean;
}) {
  return request("/api/workforce/execute", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
