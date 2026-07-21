import { API_URL } from "./config";

export type SonnyAgent = {
  id?: string;
  agent_code: string;
  name?: string;
  display_name?: string;
  role?: string;
  description?: string;
  status?: string;
  capabilities?: string[];
};

export type SonnyAssignment = {
  id: string;
  assignment_code?: string;
  title?: string;
  instructions?: string;
  required_capability?: string;
  agent_code?: string;
  status?: string;
  priority?: string;
  confidence?: number;
  created_at?: string;
  accepted_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  result_payload?: Record<string, any>;
};

export type SonnyOrchestrationRun = {
  id: string;
  orchestration_type?: string;
  trigger_type?: string;
  status?: string;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
  assignments?: SonnyAssignment[];
  input_payload?: Record<string, any>;
  output_payload?: Record<string, any>;
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
      `Request failed with status ${response.status}`;

    throw new Error(
      typeof detail === "string" ? detail : JSON.stringify(detail)
    );
  }

  return body;
}

export async function getSonny(companyId: string) {
  return parse(
    await fetch(`${API_URL}/api/sonny/company/${companyId}`, {
      headers: headers(),
    })
  );
}

export async function getProgress(companyId: string) {
  return parse(
    await fetch(`${API_URL}/api/progress/company/${companyId}`, {
      headers: headers(),
    })
  );
}

export async function getSonnyAgents(): Promise<SonnyAgent[]> {
  const body = await parse(
    await fetch(`${API_URL}/api/sonny/agents`, {
      headers: headers(),
    })
  );

  return Array.isArray(body)
    ? body
    : Array.isArray(body?.agents)
      ? body.agents
      : [];
}

export async function getSonnyOrchestrations(
  companyId: string,
  limit = 100
): Promise<{
  metrics?: Record<string, number>;
  runs: SonnyOrchestrationRun[];
}> {
  const body = await parse(
    await fetch(
      `${API_URL}/api/sonny/company/${companyId}/orchestrations?limit=${limit}`,
      { headers: headers() }
    )
  );

  if (Array.isArray(body)) return { runs: body };

  return {
    ...body,
    runs: Array.isArray(body?.runs) ? body.runs : [],
  };
}

export async function getSonnyAssignments(
  companyId: string,
  runId: string
): Promise<SonnyAssignment[]> {
  const body = await parse(
    await fetch(
      `${API_URL}/api/sonny/company/${companyId}/orchestrations/${runId}/assignments`,
      { headers: headers() }
    )
  );

  return Array.isArray(body)
    ? body
    : Array.isArray(body?.assignments)
      ? body.assignments
      : [];
}

async function post(path: string, body?: Record<string, any>) {
  return parse(
    await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: headers(true),
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  );
}

export function approveSonnyOrchestration(
  companyId: string,
  runId: string
) {
  return post(
    `/api/sonny/company/${companyId}/orchestrations/${runId}/approve`
  );
}

export function startSonnyOrchestration(
  companyId: string,
  runId: string
) {
  return post(
    `/api/sonny/company/${companyId}/orchestrations/${runId}/start`
  );
}

export function completeSonnyOrchestration(
  companyId: string,
  runId: string,
  outputPayload: Record<string, any> = {}
) {
  return post(
    `/api/sonny/company/${companyId}/orchestrations/${runId}/complete`,
    { output_payload: outputPayload }
  );
}

export function approveSonnyAssignment(
  companyId: string,
  runId: string,
  assignmentId: string
) {
  return post(
    `/api/sonny/company/${companyId}/orchestrations/${runId}/assignments/${assignmentId}/approve`
  );
}

export function acceptSonnyAssignment(
  companyId: string,
  runId: string,
  assignmentId: string
) {
  return post(
    `/api/sonny/company/${companyId}/orchestrations/${runId}/assignments/${assignmentId}/accept`
  );
}

export function startSonnyAssignment(
  companyId: string,
  runId: string,
  assignmentId: string
) {
  return post(
    `/api/sonny/company/${companyId}/orchestrations/${runId}/assignments/${assignmentId}/start`
  );
}

export function completeSonnyAssignment(
  companyId: string,
  runId: string,
  assignmentId: string,
  resultPayload: Record<string, any> = {}
) {
  return post(
    `/api/sonny/company/${companyId}/orchestrations/${runId}/assignments/${assignmentId}/complete`,
    { result_payload: resultPayload }
  );
}
