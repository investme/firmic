import { useEffect, useState } from "react";
import type { AuthUser } from "../services/authApi";
import { getAuthToken, getAuthUser } from "../services/authApi";

export function useRequireAuth() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getAuthToken();

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setUser(getAuthUser());
    setCheckingAuth(false);
  }, []);

  return {
    checkingAuth,
    user,
  };
}