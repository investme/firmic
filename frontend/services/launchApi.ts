import { API_URL } from "./config";

export type LaunchStatus =
  | "draft"
  | "pending_compliance"
  | "under_review"
  | "provisioning"
  | "active"
  | "suspended";

export type OfficeStatus =
  | "not_selected"
  | "reserved"
  | "awaiting_compliance"
  | "provisioning"
  | "active"
  | "suspended";

export type LaunchRequirementStatus =
  "not_required" | "required" | "uploaded" | "approved";

export type LaunchRequirement = {
  key: string;
  label: string;
  category: string;

  required: boolean;
  uploaded: boolean;
  approved: boolean;

  status: LaunchRequirementStatus;

  blocking: boolean;

  action_label?: string | null;
  action_href?: string | null;
};

export type LaunchSummary = {
  company_id: string;

  status: LaunchStatus;
  office_status: OfficeStatus;

  progress_percent: number;

  completed_requirements: number;
  total_requirements: number;

  next_step?: string | null;
  next_action_label?: string | null;
  next_action_href?: string | null;

  compliance_ready: boolean;
  provisioning_ready: boolean;
  launch_ready: boolean;

  requirements: LaunchRequirement[];

  rejection_reason?: string | null;
  suspension_reason?: string | null;

  activated_at?: string | null;
  suspended_at?: string | null;

  created_at: string;
  updated_at: string;
};

export type LaunchRecord = {
  id: string;
  company_id: string;

  status: LaunchStatus;
  office_status: OfficeStatus;

  company_profile_completed: boolean;
  subscription_completed: boolean;
  office_reserved: boolean;

  trade_license_required: boolean;
  trade_license_uploaded: boolean;
  trade_license_approved: boolean;

  certificate_of_incorporation_required: boolean;
  certificate_of_incorporation_uploaded: boolean;
  certificate_of_incorporation_approved: boolean;

  beneficial_owner_declaration_required: boolean;
  beneficial_owner_declaration_uploaded: boolean;
  beneficial_owner_declaration_approved: boolean;

  passport_required: boolean;
  passport_uploaded: boolean;
  passport_approved: boolean;

  proof_of_address_required: boolean;
  proof_of_address_uploaded: boolean;
  proof_of_address_approved: boolean;

  compliance_submitted: boolean;
  admin_approved: boolean;

  admin_approved_by?: string | null;
  admin_approved_at?: string | null;
  rejection_reason?: string | null;

  headquarters_provisioned: boolean;
  mailbox_provisioned: boolean;
  voip_provisioned: boolean;
  ai_workforce_provisioned: boolean;
  workspace_provisioned: boolean;
  infrastructure_provisioned: boolean;

  activated_at?: string | null;
  suspended_at?: string | null;
  suspension_reason?: string | null;

  created_at: string;
  updated_at: string;
};

type RequirementUpdate = {
  uploaded?: boolean;
  approved?: boolean;
};

type ProvisioningUpdate = {
  headquarters_provisioned?: boolean;
  mailbox_provisioned?: boolean;
  voip_provisioned?: boolean;
  ai_workforce_provisioned?: boolean;
  workspace_provisioned?: boolean;
};

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") {
    return {
      "Content-Type": "application/json",
    };
  }

  const token = localStorage.getItem("firmic_token");

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  if (!response.ok) {
    let message = text || "Launch Engine request failed.";

    try {
      const payload = text ? JSON.parse(text) : null;

      message = payload?.detail || payload?.message || message;
    } catch {
      // Keep the plain response text.
    }

    throw new Error(message);
  }

  return (text ? JSON.parse(text) : null) as T;
}

function requireCompanyId(companyId: string): string {
  const normalized = String(companyId || "").trim();

  if (!normalized) {
    throw new Error("Company ID is required.");
  }

  return encodeURIComponent(normalized);
}

export async function initializeCompanyLaunch(
  companyId: string,
): Promise<LaunchSummary> {
  const encodedId = requireCompanyId(companyId);

  return request<LaunchSummary>(`/api/launch/company/${encodedId}/initialize`, {
    method: "POST",
  });
}

export async function getCompanyLaunch(
  companyId: string,
): Promise<LaunchSummary> {
  const encodedId = requireCompanyId(companyId);

  return request<LaunchSummary>(`/api/launch/company/${encodedId}`);
}

export async function getCompanyLaunchRecord(
  companyId: string,
): Promise<LaunchRecord> {
  const encodedId = requireCompanyId(companyId);

  return request<LaunchRecord>(`/api/launch/company/${encodedId}/record`);
}

export async function updateLaunchRequirement(
  companyId: string,
  requirementKey: string,
  update: RequirementUpdate,
): Promise<LaunchSummary> {
  const encodedId = requireCompanyId(companyId);
  const encodedRequirement = encodeURIComponent(
    String(requirementKey || "").trim(),
  );

  if (!encodedRequirement) {
    throw new Error("Requirement key is required.");
  }

  return request<LaunchSummary>(
    `/api/launch/company/${encodedId}/requirements/${encodedRequirement}`,
    {
      method: "PATCH",
      body: JSON.stringify(update),
    },
  );
}

export async function updateLaunchOfficeStatus(
  companyId: string,
  officeStatus: OfficeStatus,
): Promise<LaunchSummary> {
  const encodedId = requireCompanyId(companyId);

  return request<LaunchSummary>(
    `/api/launch/company/${encodedId}/office-status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        office_status: officeStatus,
      }),
    },
  );
}

export async function reviewCompanyLaunch(
  companyId: string,
  payload: {
    approved: boolean;
    reviewer_id?: string;
    rejection_reason?: string;
  },
): Promise<LaunchSummary> {
  const encodedId = requireCompanyId(companyId);

  return request<LaunchSummary>(
    `/api/launch/company/${encodedId}/admin-review`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateCompanyProvisioning(
  companyId: string,
  update: ProvisioningUpdate,
): Promise<LaunchSummary> {
  const encodedId = requireCompanyId(companyId);

  return request<LaunchSummary>(
    `/api/launch/company/${encodedId}/provisioning`,
    {
      method: "PATCH",
      body: JSON.stringify(update),
    },
  );
}

export async function updateCompanyLaunchStatus(
  companyId: string,
  status: LaunchStatus,
  reason?: string,
): Promise<LaunchSummary> {
  const encodedId = requireCompanyId(companyId);

  return request<LaunchSummary>(`/api/launch/company/${encodedId}/status`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      reason: reason || null,
    }),
  });
}

export async function suspendCompanyLaunch(
  companyId: string,
  reason: string,
): Promise<LaunchSummary> {
  const encodedId = requireCompanyId(companyId);

  return request<LaunchSummary>(`/api/launch/company/${encodedId}/suspend`, {
    method: "POST",
    body: JSON.stringify({
      status: "suspended",
      reason,
    }),
  });
}

export async function restoreCompanyLaunch(
  companyId: string,
): Promise<LaunchSummary> {
  const encodedId = requireCompanyId(companyId);

  return request<LaunchSummary>(`/api/launch/company/${encodedId}/restore`, {
    method: "POST",
  });
}
