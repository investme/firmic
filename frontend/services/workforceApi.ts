const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://firmic-production.up.railway.app";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("firmic_token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
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
};

export function getWorkforceRegistry() {
  return request("/api/workforce/registry");
}

export function getCompanyWorkforceJobs(companyId: string, limit = 30) {
  return request(
    `/api/workforce/company/${encodeURIComponent(companyId)}?limit=${limit}`
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
}) {
  return request("/api/workforce/execute", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateWorkforceJob(
  jobId: string,
  data: {
    company_id: string;
    status: string;
    progress?: number;
    result_summary?: string;
    failure_reason?: string;
  }
) {
  return request(
    `/api/workforce/jobs/${encodeURIComponent(jobId)}/progress`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}
