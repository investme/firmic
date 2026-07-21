import { API_URL } from "./config";
import { clearWorkspaceSnapshot } from "../src/utils/workspaceContext";

export type AuthRole = "owner" | "tenant" | "user" | "admin";

export type AuthUser = {
  id: string | number;
  email: string;
  full_name?: string;
  role?: AuthRole | string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function saveAuthSession(data: AuthResponse) {
  if (!isBrowser()) return;
  localStorage.setItem("firmic_token", data.access_token);
  localStorage.setItem("firmic_user", JSON.stringify(data.user));
}

export function getAuthToken() {
  if (!isBrowser()) return null;
  return localStorage.getItem("firmic_token");
}

export function getAuthUser(): AuthUser | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem("firmic_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getAuthUserId(): string | null {
  const user = getAuthUser();
  return user?.id !== undefined && user?.id !== null ? String(user.id) : null;
}

export function getUserRole(): string | null {
  return getAuthUser()?.role || null;
}

export function isAdmin(): boolean {
  return String(getUserRole() || "").toLowerCase() === "admin";
}

export function isTenant(): boolean {
  return !isAdmin();
}

export function logout(redirectTo = "/login") {
  if (!isBrowser()) return;
  localStorage.removeItem("firmic_token");
  localStorage.removeItem("firmic_user");
  clearWorkspaceSnapshot();
  window.location.href = redirectTo;
}

async function parseResponse(response: Response, fallback: string) {
  const text = await response.text();

  if (!response.ok) {
    let message = text || fallback;
    try {
      const payload = text ? JSON.parse(text) : null;
      message = payload?.detail || message;
    } catch {}
    throw new Error(message);
  }

  const result = text ? JSON.parse(text) : null;

  if (!result?.access_token || !result?.user) {
    throw new Error("Invalid authentication response.");
  }

  return result as AuthResponse;
}

export async function registerUser(data: {
  email: string;
  full_name: string;
  password: string;
}) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await parseResponse(response, "Failed to register");
  saveAuthSession(result);
  return result;
}

export async function loginUser(data: {
  email: string;
  password: string;
}) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await parseResponse(response, "Failed to login");
  saveAuthSession(result);
  return result;
}

export async function getMe() {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Failed to load current user");
  return response.json();
}
