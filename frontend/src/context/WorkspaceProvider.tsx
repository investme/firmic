import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/router";

import { getAuthToken, getAuthUser } from "../../services/authApi";
import { getCompanies, getCompany } from "../../services/companyApi";
import {
  clearActiveWorkspace,
  FirmicWorkspace,
  getActiveWorkspaceId,
  saveActiveWorkspace,
} from "../utils/workspaceContext";

type WorkspaceStatus =
  | "idle"
  | "loading"
  | "ready"
  | "selection-required"
  | "no-companies"
  | "error";

type WorkspaceContextValue = {
  workspace: FirmicWorkspace | null;
  companies: FirmicWorkspace[];
  status: WorkspaceStatus;
  error: string;
  refreshWorkspace: () => Promise<void>;
  selectWorkspace: (companyId: string) => Promise<FirmicWorkspace>;
  clearSelection: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined
);

function isTenantSession(): boolean {
  const token = getAuthToken();
  const user = getAuthUser();
  const role = String(user?.role || "owner").toLowerCase();
  return Boolean(token) && role !== "admin";
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [workspace, setWorkspace] = useState<FirmicWorkspace | null>(null);
  const [companies, setCompanies] = useState<FirmicWorkspace[]>([]);
  const [status, setStatus] = useState<WorkspaceStatus>("idle");
  const [error, setError] = useState("");

  const selectWorkspace = useCallback(async (companyId: string) => {
    setStatus("loading");
    setError("");

    try {
      const freshCompany = await getCompany(String(companyId));
      const saved = saveActiveWorkspace(freshCompany);

      if (!saved) throw new Error("The selected company could not be saved.");

      setWorkspace(saved);
      setStatus("ready");
      return saved;
    } catch (reason: any) {
      setError(reason?.message || "Failed to select company.");
      setStatus("error");
      throw reason;
    }
  }, []);

  const refreshWorkspace = useCallback(async () => {
    if (!isTenantSession()) {
      setWorkspace(null);
      setCompanies([]);
      setStatus("idle");
      setError("");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const response = await getCompanies();

      const tenantCompanies: FirmicWorkspace[] = Array.isArray(response)
        ? response.filter(
            (company) =>
              String(company.status || "").toLowerCase() !== "terminated"
          )
        : [];

      setCompanies(tenantCompanies);

      if (tenantCompanies.length === 0) {
        clearActiveWorkspace();
        setWorkspace(null);
        setStatus("no-companies");
        return;
      }

      const selectedId = getActiveWorkspaceId();

      let selected = selectedId
        ? tenantCompanies.find(
            (company) => String(company.id) === String(selectedId)
          )
        : undefined;

      if (!selected && tenantCompanies.length === 1) {
        selected = tenantCompanies[0];
      }

      if (!selected) {
        setWorkspace(null);
        setStatus("selection-required");
        return;
      }

      const freshCompany = await getCompany(String(selected.id));
      const saved = saveActiveWorkspace(freshCompany);

      if (!saved) throw new Error("Workspace could not be persisted.");

      setWorkspace(saved);
      setStatus("ready");
    } catch (reason: any) {
      console.error("Workspace refresh failed:", reason);
      setWorkspace(null);
      setError(reason?.message || "Failed to load workspace.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    refreshWorkspace();
  }, [router.isReady, refreshWorkspace]);

  const clearSelection = useCallback(() => {
    clearActiveWorkspace();
    setWorkspace(null);
    setStatus(companies.length ? "selection-required" : "no-companies");
  }, [companies.length]);

  const value = useMemo(
    () => ({
      workspace,
      companies,
      status,
      error,
      refreshWorkspace,
      selectWorkspace,
      clearSelection,
    }),
    [
      workspace,
      companies,
      status,
      error,
      refreshWorkspace,
      selectWorkspace,
      clearSelection,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider.");
  }

  return context;
}
