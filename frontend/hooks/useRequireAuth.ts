import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { getAuthToken, getAuthUser } from "../services/authApi";

export function useRequireAuth() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;

    const token = getAuthToken();
    const user = getAuthUser();

    if (!token || !user) {
      const next = router.asPath && router.asPath !== "/login"
        ? `?next=${encodeURIComponent(router.asPath)}`
        : "";
      void router.replace(`/login${next}`);
      setCheckingAuth(false);
      return;
    }

    if (String(user.role || "").toLowerCase() === "admin") {
      void router.replace("/admin");
      setCheckingAuth(false);
      return;
    }

    setCheckingAuth(false);
  }, [router]);

  return { checkingAuth };
}
