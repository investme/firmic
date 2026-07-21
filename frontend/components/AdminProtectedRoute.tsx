import { ReactNode, useEffect, useState } from "react";
import { getAuthToken, getAuthUser } from "../services/authApi";

type Props = {
  children: ReactNode;
};

export default function AdminProtectedRoute({ children }: Props) {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    const user = getAuthUser();

    const isAuthorized =
      Boolean(token) && user?.role === "admin";

    if (!isAuthorized) {
      setAuthorized(false);
      setCheckingAuth(false);
      window.location.href = "/admin-login";
      return;
    }

    setAuthorized(true);
    setCheckingAuth(false);
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin mx-auto" />

          <p className="mt-6 text-slate-400 font-medium">
            Verifying admin access...
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
