import {
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/router";

import { API_URL } from "../services/config";
import type {
  AuthResponse,
} from "../services/authApi";
import {
  hasAdminSession,
  saveAdminSession,
} from "../services/adminSession";

async function loginAdmin(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await fetch(
    `${API_URL}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  const text = await response.text();

  if (!response.ok) {
    let message =
      "Invalid email or password";

    try {
      const body = text
        ? JSON.parse(text)
        : null;

      message =
        body?.detail ||
        body?.message ||
        message;
    } catch {
      // Preserve the default message.
    }

    throw new Error(message);
  }

  const result = text
    ? (JSON.parse(text) as AuthResponse)
    : null;

  if (
    !result?.access_token ||
    !result?.user
  ) {
    throw new Error(
      "Invalid authentication response."
    );
  }

  if (
    String(
      result.user.role || ""
    ).toLowerCase() !== "admin"
  ) {
    throw new Error(
      "This account is not authorized for the Firmic Admin Platform."
    );
  }

  return result;
}

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (hasAdminSession()) {
      void router.replace("/admin");
      return;
    }

    setCheckingSession(false);
  }, [router]);

  async function handleLogin() {
    if (
      !email.trim() ||
      !password
    ) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await loginAdmin({
        email:
          email.trim().toLowerCase(),
        password,
      });

      saveAdminSession(result);

      await router.replace("/admin");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Firmic Admin authentication failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      void handleLogin();
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400 font-medium">
          Checking Firmic Admin session...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white flex items-center justify-center text-2xl font-black shadow-lg">
            F
          </div>

          <p className="text-xs uppercase tracking-[0.24em] font-bold text-violet-300 mt-6">
            Firmic Internal Platform
          </p>

          <h1 className="text-4xl font-black text-white mt-2">
            Admin Access
          </h1>

          <p className="text-slate-400 mt-3">
            Authorized Firmic personnel only.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium mb-5">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold">
                Firmic Admin Email
              </label>

              <input
                type="email"
                className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="name@firmic.io"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-semibold">
                Password
              </label>

              <input
                type="password"
                className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                void handleLogin()
              }
              disabled={
                loading ||
                !email.trim() ||
                !password
              }
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-4 rounded-xl font-bold disabled:bg-slate-300 transition"
            >
              {loading
                ? "Authenticating..."
                : "Enter Firmic Admin Platform"}
            </button>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs leading-5 text-slate-400 text-center">
              Admin access is separate from the Firmic tenant application.
              Closing this browser session requires Admin authentication again.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
