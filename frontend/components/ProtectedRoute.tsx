import { ReactNode, useEffect } from "react";
import { useRouter } from "next/router";

import { useRequireAuth } from "../hooks/useRequireAuth";
import { useWorkspace } from "../src/context/WorkspaceProvider";

type Props = { children: ReactNode };

const WORKSPACE_OPTIONAL_PATHS = new Set([
  "/companies",
  "/create-company",
]);

export default function ProtectedRoute({ children }: Props) {
  const router = useRouter();
  const { checkingAuth } = useRequireAuth();
  const { status, error } = useWorkspace();

  useEffect(() => {
    if (checkingAuth || !router.isReady) return;

    if (status === "no-companies" && router.pathname !== "/create-company") {
      router.replace("/create-company");
      return;
    }

    if (
      status === "selection-required" &&
      !WORKSPACE_OPTIONAL_PATHS.has(router.pathname)
    ) {
      router.replace("/companies");
    }
  }, [checkingAuth, router, status]);

  if (checkingAuth || status === "idle" || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-violet-600 border-t-transparent animate-spin mx-auto" />
          <p className="mt-6 text-slate-500 font-medium">
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-lg w-full bg-white border border-red-200 rounded-3xl p-6 shadow-sm">
          <h1 className="text-xl font-bold text-red-700">
            Workspace could not load
          </h1>
          <p className="text-slate-600 mt-3">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 w-full bg-violet-600 text-white py-3 rounded-xl font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (
    status === "selection-required" &&
    !WORKSPACE_OPTIONAL_PATHS.has(router.pathname)
  ) {
    return null;
  }

  if (status === "no-companies" && router.pathname !== "/create-company") {
    return null;
  }

  return <>{children}</>;
}
