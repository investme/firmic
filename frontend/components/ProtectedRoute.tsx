import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { getHermes } from "../services/hermesApi";
import {
  getComplianceRedirect,
  getComplianceStatusKey,
  isPathAllowedDuringCompliance,
} from "../src/utils/complianceAccess";
import { getActiveWorkspace } from "../src/utils/workspaceContext";

type Props = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  const router = useRouter();
  const { checkingAuth } = useRequireAuth();
  const [checkingAccess, setCheckingAccess] =
    useState(true);

  useEffect(() => {
    if (checkingAuth || !router.isReady) {
      return;
    }

    let cancelled = false;

    async function checkAccess() {
      setCheckingAccess(true);

      const workspace = getActiveWorkspace();

      /*
       * Public/authenticated pages without an active company
       * workspace do not need a company compliance lookup.
       */
      if (!workspace?.id) {
        if (!cancelled) {
          setCheckingAccess(false);
        }
        return;
      }

      try {
        /*
         * Hermes exposes the authoritative Launch Engine +
         * company activation state. Never let stale browser
         * compliance state override an activated backend.
         */
        const hermes = await getHermes(
          String(workspace.id),
        );

        if (cancelled) {
          return;
        }

        if (hermes?.platform_active === true) {
          localStorage.setItem(
            getComplianceStatusKey(
              String(workspace.id),
            ),
            JSON.stringify({
              status: "active",
              subscription_completed: true,
              admin_approved: true,
              infrastructure_provisioned: true,
              company_access_locked: false,
              next_step: null,
              updated_at: new Date().toISOString(),
            }),
          );

          setCheckingAccess(false);
          return;
        }

        /*
         * If Hermes confirms the company is not active, preserve
         * the existing compliance routing rules. This keeps
         * Documents, Hermes, compliance review and the waiting
         * screen available while operational pages stay locked.
         */
        const redirect = getComplianceRedirect(
          router,
        );

        if (redirect) {
          void router.replace(redirect);
          return;
        }

        setCheckingAccess(false);
      } catch (error) {
        /*
         * Fail closed for operational routes if the authoritative
         * access check cannot be completed. Compliance-safe pages
         * remain reachable so the tenant is never trapped.
         */
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to synchronize authoritative company access:",
          error,
        );

        if (
          isPathAllowedDuringCompliance(
            router.pathname,
          )
        ) {
          setCheckingAccess(false);
          return;
        }

        const redirect = getComplianceRedirect(
          router,
        );

        if (redirect) {
          void router.replace(redirect);
          return;
        }

        setCheckingAccess(false);
      }
    }

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [
    checkingAuth,
    router.isReady,
    router.pathname,
  ]);

  if (checkingAuth || checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-violet-600 border-t-transparent animate-spin mx-auto" />

          <p className="mt-6 text-slate-500 font-medium">
            {checkingAuth
              ? "Authenticating..."
              : "Checking company access..."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
