import type { NextRouter } from "next/router";
import { getActiveWorkspace } from "./workspaceContext";

export type FirmicComplianceAccessState =
  | "full_access"
  | "payment_required"
  | "documents_required"
  | "under_review"
  | "action_required"
  | "approved_pending_provisioning";

export type FirmicComplianceStatus = {
  status?: string;
  subscription_completed?: boolean;
  admin_approved?: boolean;
  infrastructure_provisioned?: boolean;
  company_access_locked?: boolean;
  next_step?: string | null;
  updated_at?: string;
};

const COMPLIANCE_ALLOWED_PATHS = new Set([
  "/documents",
  "/compliance-review",
  "/hermes",
  "/awaiting-compliance",
]);

export function getComplianceStatusKey(companyId: string) {
  return `firmic_compliance_status:${companyId}`;
}

export function readComplianceStatus(): FirmicComplianceStatus | null {
  if (typeof window === "undefined") {
    return null;
  }

  const workspace = getActiveWorkspace();

  if (!workspace?.id) {
    return null;
  }

  try {
    const raw = localStorage.getItem(
      getComplianceStatusKey(String(workspace.id)),
    );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as FirmicComplianceStatus;
  } catch {
    return null;
  }
}

export function resolveComplianceAccessState():
  FirmicComplianceAccessState {
  const status = readComplianceStatus();

  /*
   * No compliance lock exists yet.
   * This covers already-active tenants and pre-checkout pages.
   */
  if (!status) {
    return "full_access";
  }

  if (
    status.admin_approved === true &&
    status.infrastructure_provisioned === true &&
    status.company_access_locked !== true
  ) {
    return "full_access";
  }

  if (status.subscription_completed !== true) {
    return "payment_required";
  }

  const normalized = String(status.status || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "rejected" ||
    normalized === "action_required" ||
    normalized === "document_required"
  ) {
    return "action_required";
  }

  if (
    status.admin_approved === true &&
    status.infrastructure_provisioned !== true
  ) {
    return "approved_pending_provisioning";
  }

  if (
    normalized === "under_review" ||
    normalized === "submitted" ||
    normalized === "pending_review" ||
    normalized === "review_pending"
  ) {
    return "under_review";
  }

  return "documents_required";
}

export function isComplianceOnlyMode() {
  return resolveComplianceAccessState() !== "full_access";
}

export function isPathAllowedDuringCompliance(
  pathname: string,
) {
  const cleanPath = String(pathname || "")
    .split("?")[0]
    .replace(/\/+$/, "") || "/";

  return COMPLIANCE_ALLOWED_PATHS.has(cleanPath);
}

export function getComplianceRedirect(
  router: Pick<NextRouter, "pathname">,
) {
  if (!isComplianceOnlyMode()) {
    return null;
  }

  if (isPathAllowedDuringCompliance(router.pathname)) {
    return null;
  }

  return "/awaiting-compliance";
}
