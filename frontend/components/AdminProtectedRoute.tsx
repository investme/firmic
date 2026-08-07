import {
  ReactNode,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/router";

import { API_URL } from "../services/config";
import {
  clearAdminSession,
  getAdminToken,
  getAdminUser,
} from "../services/adminSession";

type Props = {
  children: ReactNode;
};

export default function AdminProtectedRoute({
  children,
}: Props) {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [authorized, setAuthorized] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyAdmin() {
      const token = getAdminToken();
      const cachedUser = getAdminUser();

      const cachedRole =
        String(
          cachedUser?.role || ""
        ).toLowerCase();

      if (!token || cachedRole !== "admin") {
        clearAdminSession();

        if (!cancelled) {
          setAuthorized(false);
          setCheckingAuth(false);
          void router.replace("/admin-login");
        }

        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/auth/me`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Admin session expired."
          );
        }

        const user = await response.json();

        if (
          String(
            user?.role || ""
          ).toLowerCase() !== "admin"
        ) {
          throw new Error(
            "Admin role required."
          );
        }

        if (!cancelled) {
          setAuthorized(true);
          setCheckingAuth(false);
        }
      } catch {
        clearAdminSession();

        if (!cancelled) {
          setAuthorized(false);
          setCheckingAuth(false);
          void router.replace("/admin-login");
        }
      }
    }

    void verifyAdmin();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin mx-auto" />

          <p className="mt-6 text-slate-400 font-medium">
            Verifying Firmic Admin access...
          </p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
