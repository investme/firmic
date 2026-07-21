export type FirmicHeadquarters = {
  office_id?: string | number | null;
  office_code: string;
  office_name?: string;
  location: string;
  phone?: string;
  mailbox?: boolean;
  status?: string;
  monthly_price_usd?: number;
};

export type FirmicWorkspace = {
  id: string;
  name: string;
  industry?: string;
  jurisdiction?: string;
  plan?: string;
  headquarters?: FirmicHeadquarters | null;
  status?: string;
};

const WORKSPACE_KEY = "firmic_workspace";
const LEGACY_WORKSPACE_ID_KEY = "firmic_workspace_id";
const WORKSPACE_CHANGED_EVENT = "firmic-workspace-changed";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getCurrentUserId(): string | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem("firmic_user");
  if (!raw) return null;

  try {
    const user = JSON.parse(raw);
    return user?.id !== undefined && user?.id !== null ? String(user.id) : null;
  } catch {
    return null;
  }
}

function getScopedWorkspaceIdKey(userId?: string | null): string | null {
  const resolvedUserId = userId || getCurrentUserId();
  return resolvedUserId ? `firmic_workspace_id_${resolvedUserId}` : null;
}

function normalizeWorkspace(value: unknown): FirmicWorkspace | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const id =
    typeof candidate.id === "string" || typeof candidate.id === "number"
      ? String(candidate.id)
      : "";
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";

  if (!id || !name) return null;

  const headquarters =
    candidate.headquarters && typeof candidate.headquarters === "object"
      ? (candidate.headquarters as FirmicHeadquarters)
      : null;

  return {
    id,
    name,
    industry: typeof candidate.industry === "string" ? candidate.industry : undefined,
    jurisdiction: typeof candidate.jurisdiction === "string" ? candidate.jurisdiction : undefined,
    plan: typeof candidate.plan === "string" ? candidate.plan : undefined,
    headquarters,
    status: typeof candidate.status === "string" ? candidate.status : undefined,
  };
}

function dispatchWorkspaceChanged(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGED_EVENT));
}

function removeLegacyKeys(): void {
  if (!isBrowser()) return;

  [
    "firmic_company",
    "company_id",
    "company_name",
    "company_jurisdiction",
    "company_plan",
    "company_office_code",
    "company_office_location",
    "selected_office",
    "rented_office",
  ].forEach((key) => localStorage.removeItem(key));
}

function migrateLegacyWorkspaceId(): string | null {
  if (!isBrowser()) return null;

  const scopedKey = getScopedWorkspaceIdKey();
  if (!scopedKey) return null;

  const scopedValue = localStorage.getItem(scopedKey);
  if (scopedValue) return scopedValue;

  const legacyValue = localStorage.getItem(LEGACY_WORKSPACE_ID_KEY);
  if (legacyValue) {
    localStorage.setItem(scopedKey, legacyValue);
    localStorage.removeItem(LEGACY_WORKSPACE_ID_KEY);
    return legacyValue;
  }

  return null;
}

export function getActiveWorkspaceId(): string | null {
  if (!isBrowser()) return null;
  return migrateLegacyWorkspaceId();
}

export function getActiveWorkspace(): FirmicWorkspace | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return null;

    const workspace = normalizeWorkspace(JSON.parse(raw));
    if (!workspace) {
      localStorage.removeItem(WORKSPACE_KEY);
      return null;
    }

    const selectedId = getActiveWorkspaceId();
    if (selectedId && selectedId !== workspace.id) {
      localStorage.removeItem(WORKSPACE_KEY);
      return null;
    }

    return workspace;
  } catch (error) {
    console.error("Failed to read workspace:", error);
    localStorage.removeItem(WORKSPACE_KEY);
    return null;
  }
}

export function saveActiveWorkspace(workspace: FirmicWorkspace): FirmicWorkspace | null {
  if (!isBrowser()) return null;

  const scopedKey = getScopedWorkspaceIdKey();
  if (!scopedKey) {
    console.error("Cannot save workspace before an authenticated user exists.");
    return null;
  }

  const normalized = normalizeWorkspace(workspace);
  if (!normalized) return null;

  localStorage.setItem(scopedKey, normalized.id);
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(normalized));

  removeLegacyKeys();
  dispatchWorkspaceChanged();
  return normalized;
}

export function clearWorkspaceSnapshot(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(WORKSPACE_KEY);
  removeLegacyKeys();
  dispatchWorkspaceChanged();
}

export function clearActiveWorkspace(): void {
  if (!isBrowser()) return;

  const scopedKey = getScopedWorkspaceIdKey();
  localStorage.removeItem(WORKSPACE_KEY);

  if (scopedKey) localStorage.removeItem(scopedKey);
  localStorage.removeItem(LEGACY_WORKSPACE_ID_KEY);

  removeLegacyKeys();
  dispatchWorkspaceChanged();
}

export function updateActiveWorkspace(
  updates: Partial<FirmicWorkspace>
): FirmicWorkspace | null {
  const current = getActiveWorkspace();
  if (!current) return null;

  return saveActiveWorkspace({
    ...current,
    ...updates,
    id: current.id,
    name:
      typeof updates.name === "string" && updates.name.trim()
        ? updates.name.trim()
        : current.name,
  });
}

export function setActiveHeadquarters(
  headquarters: FirmicHeadquarters
): FirmicWorkspace | null {
  return updateActiveWorkspace({ headquarters });
}

export function getActiveHeadquarters(): FirmicHeadquarters | null {
  return getActiveWorkspace()?.headquarters || null;
}

export function getWorkspaceChangedEventName(): string {
  return WORKSPACE_CHANGED_EVENT;
}
