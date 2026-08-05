import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/router";

import { useRequireAuth } from "../hooks/useRequireAuth";
import { useWorkspace } from "../src/context/WorkspaceProvider";

import {
  getActiveWorkspace,
} from "../src/utils/workspaceContext";

type Props = {
  children: ReactNode;
};

type ComplianceState = {
  status?: string;
  subscription_completed?: boolean;
  admin_approved?: boolean;
  infrastructure_provisioned?: boolean;
  company_access_locked?: boolean;
  next_step?: string;
  updated_at?: string;
};

/**
 * These routes are required to create, configure, pay for,
 * and complete compliance for a company.
 *
 * They must remain accessible while the operational platform
 * is locked.
 */
const COMPLIANCE_EXEMPT_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/register",
  "/companies",
  "/create-company",
  "/headquarters",
  "/configure-office",
  "/checkout",
  "/launch",
  "/documents",
  "/compliance-review",
]);

const WORKSPACE_OPTIONAL_PATHS = new Set([
  "/companies",
  "/create-company",
]);

function readComplianceState(
  companyId: string,
): ComplianceState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(
      `firmic_compliance_status:${companyId}`,
    );

    return raw
      ? (JSON.parse(raw) as ComplianceState)
      : null;
  } catch {
    return null;
  }
}

function isOperationalAccessAllowed(
  state: ComplianceState | null,
) {
  return (
    state?.subscription_completed === true &&
    state?.admin_approved === true &&
    state?.infrastructure_provisioned === true &&
    String(state?.status || "").toLowerCase() ===
      "active" &&
    state?.company_access_locked !== true
  );
}

function shouldEnforceComplianceLock(
  state: ComplianceState | null,
) {
  if (!state) {
    return false;
  }

  const normalizedStatus = String(
    state.status || "",
  ).toLowerCase();

  return (
    state.company_access_locked === true ||
    [
      "payment_confirmed",
      "documents_required",
      "under_review",
      "pending_compliance",
      "approved",
      "provisioning",
    ].includes(normalizedStatus) ||
    state.subscription_completed === true
  );
}

export default function ProtectedRoute({
  children,
}: Props) {
  const router = useRouter();
  const { checkingAuth } = useRequireAuth();
  const { status, error } = useWorkspace();

  const [checkingCompliance, setCheckingCompliance] =
    useState(true);

  const [complianceRedirecting, setComplianceRedirecting] =
    useState(false);

  const pathname = router.pathname;

  const routeIsComplianceExempt = useMemo(
    () => COMPLIANCE_EXEMPT_PATHS.has(pathname),
    [pathname],
  );

  useEffect(() => {
    if (checkingAuth || !router.isReady) {
      return;
    }

    if (
      status === "no-companies" &&
      router.pathname !== "/create-company"
    ) {
      void router.replace("/create-company");
      return;
    }

    if (
      status === "selection-required" &&
      !WORKSPACE_OPTIONAL_PATHS.has(
        router.pathname,
      )
    ) {
      void router.replace("/companies");
    }
  }, [
    checkingAuth,
    router,
    router.isReady,
    router.pathname,
    status,
  ]);

  useEffect(() => {
    if (
      checkingAuth ||
      !router.isReady ||
      status === "idle" ||
      status === "loading"
    ) {
      return;
    }

    let cancelled = false;

    async function enforceComplianceGate() {
      try {
        setCheckingCompliance(true);

        const workspace = getActiveWorkspace();

        if (!workspace?.id) {
          return;
        }

        const complianceState =
          readComplianceState(
            String(workspace.id),
          );

        const lockApplies =
          shouldEnforceComplianceLock(
            complianceState,
          );

        const accessAllowed =
          isOperationalAccessAllowed(
            complianceState,
          );

        if (
          lockApplies &&
          !accessAllowed &&
          !routeIsComplianceExempt
        ) {
          if (!cancelled) {
            setComplianceRedirecting(true);

            await router.replace(
              "/compliance-review",
            );
          }

          return;
        }

        /**
         * Prevent approved/active companies from remaining
         * trapped on the compliance review page.
         */
        if (
          accessAllowed &&
          pathname === "/compliance-review"
        ) {
          if (!cancelled) {
            await router.replace("/launch");
          }
        }
      } finally {
        if (!cancelled) {
          setCheckingCompliance(false);
        }
      }
    }

    void enforceComplianceGate();

    const handleComplianceChange = () => {
      void enforceComplianceGate();
    };

    window.addEventListener(
      "storage",
      handleComplianceChange,
    );

    window.addEventListener(
      "firmic-compliance-changed",
      handleComplianceChange,
    );

    return () => {
      cancelled = true;

      window.removeEventListener(
        "storage",
        handleComplianceChange,
      );

      window.removeEventListener(
        "firmic-compliance-changed",
        handleComplianceChange,
      );
    };
  }, [
    checkingAuth,
    pathname,
    routeIsComplianceExempt,
    router,
    router.isReady,
    status,
  ]);

  if (
    checkingAuth ||
    status === "idle" ||
    status === "loading" ||
    checkingCompliance ||
    complianceRedirecting
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />

          <p className="mt-6 font-medium text-slate-500">
            {complianceRedirecting
              ? "Opening secure compliance review..."
              : "Loading your workspace..."}
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-red-700">
            Workspace could not load
          </h1>

          <p className="mt-3 text-slate-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-5 w-full rounded-xl bg-violet-600 py-3 font-bold text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (
    status === "selection-required" &&
    !WORKSPACE_OPTIONAL_PATHS.has(pathname)
  ) {
    return null;
  }

  if (
    status === "no-companies" &&
    pathname !== "/create-company"
  ) {
    return null;
  }

  return <>{children}</>;
}
