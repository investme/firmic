import { API_URL } from "./config";

export type AuthUser = {
  id: string | number;
  email: string;
  full_name?: string;
  role?: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export function saveAuthSession(data: AuthResponse) {
  localStorage.setItem("firmic_token", data.access_token);
  localStorage.setItem("firmic_user", JSON.stringify(data.user));
}

export function getAuthToken() {
  return localStorage.getItem("firmic_token");
}

export function getAuthUser(): AuthUser | null {
  const raw = localStorage.getItem("firmic_user");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("firmic_token");
  localStorage.removeItem("firmic_user");
  localStorage.removeItem("company_id");
  window.location.href = "/login";
}

export async function registerUser(data: {
  email: string;
  full_name: string;
  password: string;
}) {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || "Failed to register");
  }

  const result = text ? JSON.parse(text) : null;
  saveAuthSession(result);

  return result;
}

export async function loginUser(data: {
  email: string;
  password: string;
}) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || "Failed to login");
  }

  const result = text ? JSON.parse(text) : null;
  saveAuthSession(result);

  return result;
}

export async function getMe() {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to load current user");
  }

  return res.json();
}