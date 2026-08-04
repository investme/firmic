import { API_URL } from "./config";

export type LaunchStatus =
  | "in_progress"
  | "waiting_on_customer"
  | "waiting_on_partner"
  | "government_processing"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

export type MilestoneStatus =
  | "not_started"
  | "information_required"
  | "in_progress"
  | "submitted_to_partner"
  | "partner_reviewing"
  | "government_processing"
  | "approved"
  | "rejected"
  | "completed"
  | "blocked"
  | "initiated";

export type PartnerRequestStatus =
  | "not_started"
  | "information_required"
  | "submitted_to_partner"
  | "partner_reviewing"
  | "government_processing"
  | "approved"
  | "rejected"
  | "completed";

export type FormationPartner = {
  id: string;
  name: string;
  country: string;
  jurisdiction: string | null;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  languages: string | null;
  services: string | null;
  starting_price_usd: number | null;
  average_completion_days: number | null;
  rating: number | null;
  is_verified: boolean;
  is_active: boolean;
};

export type BankPartner = {
  id: string;
  name: string;
  country: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  supported_company_types: string | null;
  requirements: string | null;
  minimum_balance_usd: number | null;
  average_review_days: number | null;
  supports_remote_onboarding: boolean;
  is_verified: boolean;
  is_active: boolean;
};

export type LaunchMilestone = {
  id: string;
  key: string;
  title: string;
  status: MilestoneStatus;
  position: number;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LaunchApplication = {
  id: string;
  user_id: string;
  company_id: string;
  status: LaunchStatus;
  country: string;
  jurisdiction: string | null;
  business_activity: string | null;
  business_description: string | null;
  formation_status: PartnerRequestStatus;
  banking_status: PartnerRequestStatus;
  office_status: MilestoneStatus;
  workspace_status: MilestoneStatus;
  estimated_completion_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  progress_percent: number;
  formation_partner: FormationPartner | null;
  bank_partner: BankPartner | null;
  milestones: LaunchMilestone[];
};

export type CreateLaunchApplicationPayload = {
  company_id: string;
  country?: string;
  jurisdiction?: string | null;
  business_activity?: string | null;
  business_description?: string | null;
};

export type UpdateLaunchApplicationPayload = {
  country?: string | null;
  jurisdiction?: string | null;
  business_activity?: string | null;
  business_description?: string | null;
  formation_partner_id?: string | null;
  bank_partner_id?: string | null;
  formation_status?: PartnerRequestStatus;
  banking_status?: PartnerRequestStatus;
  office_status?: MilestoneStatus;
  workspace_status?: MilestoneStatus;
  status?: LaunchStatus;
  estimated_completion_at?: string | null;
};

export type UpdateLaunchMilestonePayload = {
  status: MilestoneStatus;
  notes?: string | null;
};

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    throw new Error("Authentication is only available in the browser.");
  }

  const token = localStorage.getItem("firmic_token");

  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    let message = text || fallbackMessage;

    try {
      const payload = text
        ? (JSON.parse(text) as {
            detail?: string;
            message?: string;
          })
        : null;

      message = payload?.detail || payload?.message || message;
    } catch {
      // Preserve the original response text.
    }

    if (response.status === 401) {
      throw new Error(
        "Your session is invalid or has expired. Please sign in again.",
      );
    }

    if (response.status === 403) {
      throw new Error("You do not have permission to perform this action.");
    }

    if (response.status === 404) {
      throw new Error(message || "The requested record was not found.");
    }

    throw new Error(message);
  }

  if (!text) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

function buildQuery(values: Record<string, string | null | undefined>): string {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    const normalized = value?.trim();

    if (normalized) {
      params.set(key, normalized);
    }
  });

  const query = params.toString();

  return query ? `?${query}` : "";
}

export async function createLaunchApplication(
  payload: CreateLaunchApplicationPayload,
): Promise<LaunchApplication> {
  const response = await fetch(`${API_URL}/api/launch-center/applications`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse<LaunchApplication>(
    response,
    "Failed to create the launch application.",
  );
}

export async function getLaunchApplications(): Promise<LaunchApplication[]> {
  const response = await fetch(`${API_URL}/api/launch-center/applications`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  return parseResponse<LaunchApplication[]>(
    response,
    "Failed to load launch applications.",
  );
}

export async function getLaunchApplication(
  applicationId: string,
): Promise<LaunchApplication> {
  const response = await fetch(
    `${API_URL}/api/launch-center/applications/${encodeURIComponent(
      applicationId,
    )}`,
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  return parseResponse<LaunchApplication>(
    response,
    "Failed to load the launch application.",
  );
}

export async function getLaunchApplicationByCompany(
  companyId: string,
): Promise<LaunchApplication> {
  const response = await fetch(
    `${API_URL}/api/launch-center/applications/company/${encodeURIComponent(
      companyId,
    )}`,
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  return parseResponse<LaunchApplication>(
    response,
    "Failed to load the company launch application.",
  );
}

export async function updateLaunchApplication(
  applicationId: string,
  payload: UpdateLaunchApplicationPayload,
): Promise<LaunchApplication> {
  const response = await fetch(
    `${API_URL}/api/launch-center/applications/${encodeURIComponent(
      applicationId,
    )}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );

  return parseResponse<LaunchApplication>(
    response,
    "Failed to update the launch application.",
  );
}

export async function updateLaunchMilestone(
  applicationId: string,
  milestoneId: string,
  payload: UpdateLaunchMilestonePayload,
): Promise<LaunchMilestone> {
  const response = await fetch(
    `${API_URL}/api/launch-center/applications/${encodeURIComponent(
      applicationId,
    )}/milestones/${encodeURIComponent(milestoneId)}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    },
  );

  return parseResponse<LaunchMilestone>(
    response,
    "Failed to update the launch milestone.",
  );
}

export async function getFormationPartners(
  filters: {
    country?: string | null;
    jurisdiction?: string | null;
  } = {},
): Promise<FormationPartner[]> {
  const query = buildQuery({
    country: filters.country,
    jurisdiction: filters.jurisdiction,
  });

  const response = await fetch(
    `${API_URL}/api/launch-center/formation-partners${query}`,
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  return parseResponse<FormationPartner[]>(
    response,
    "Failed to load formation partners.",
  );
}

export async function getBankPartners(
  filters: {
    country?: string | null;
  } = {},
): Promise<BankPartner[]> {
  const query = buildQuery({
    country: filters.country,
  });

  const response = await fetch(
    `${API_URL}/api/launch-center/bank-partners${query}`,
    {
      headers: getAuthHeaders(),
      cache: "no-store",
    },
  );

  return parseResponse<BankPartner[]>(
    response,
    "Failed to load banking partners.",
  );
}

export function isLaunchApplicationNotFound(error: unknown): boolean {
  return (
    error instanceof Error && error.message.toLowerCase().includes("not found")
  );
}
