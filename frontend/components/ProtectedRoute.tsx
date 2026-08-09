import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useRequireAuth } from "../hooks/useRequireAuth";
import {
  getComplianceRedirect,
} from "../src/utils/complianceAccess";

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

    const redirect = getComplianceRedirect(router);

    if (redirect) {
      void router.replace(redirect);
      return;
    }

    setCheckingAccess(false);
  }, [
    checkingAuth,
    router,
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
