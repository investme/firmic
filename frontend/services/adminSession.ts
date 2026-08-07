import type { AuthResponse, AuthUser } from "./authApi";

const ADMIN_TOKEN_KEY = "firmic_admin_token";
const ADMIN_USER_KEY = "firmic_admin_user";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function saveAdminSession(data: AuthResponse) {
  if (!isBrowser()) return;

  sessionStorage.setItem(
    ADMIN_TOKEN_KEY,
    data.access_token
  );

  sessionStorage.setItem(
    ADMIN_USER_KEY,
    JSON.stringify(data.user)
  );
}

export function getAdminToken(): string | null {
  if (!isBrowser()) return null;

  return sessionStorage.getItem(
    ADMIN_TOKEN_KEY
  );
}

export function getAdminUser(): AuthUser | null {
  if (!isBrowser()) return null;

  const raw = sessionStorage.getItem(
    ADMIN_USER_KEY
  );

  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  if (!isBrowser()) return;

  sessionStorage.removeItem(
    ADMIN_TOKEN_KEY
  );
  sessionStorage.removeItem(
    ADMIN_USER_KEY
  );
}

export function hasAdminSession(): boolean {
  const token = getAdminToken();
  const user = getAdminUser();

  return Boolean(token) &&
    String(user?.role || "").toLowerCase() ===
      "admin";
}

export function adminLogout() {
  if (!isBrowser()) return;

  clearAdminSession();
  window.location.replace("/admin-login");
}
