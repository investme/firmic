import { useState } from "react";
import { loginUser } from "../services/authApi";

export default function AdminLogin() {
  const [email, setEmail] = useState("hussein@firmic.io");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    try {
      setLoading(true);
      setError("");

      const result = await loginUser({
        email: email.trim(),
        password,
      });

      if (result.user?.role !== "admin") {
        setError("This account does not have admin access.");
        return;
      }

      window.location.href = "/admin";
    } catch (err: any) {
      setError(err?.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      handleLogin();
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white flex items-center justify-center text-2xl font-bold">
            ◆
          </div>

          <p className="text-xs uppercase tracking-[0.2em] font-bold text-violet-700 mt-5">
            Firmic Internal
          </p>

          <h1 className="text-3xl font-bold mt-2">
            Admin Console
          </h1>

          <p className="text-slate-500 mt-2">
            Authorized Firmic personnel only.
          </p>
        </div>

        <div className="space-y-5 mt-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold">
              Admin Email
            </label>

            <input
              type="email"
              className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="admin@firmic.io"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">
              Admin Password
            </label>

            <input
              type="password"
              className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={
              loading ||
              !email.trim() ||
              !password
            }
            className="w-full bg-violet-600 hover:bg-violet-700 text-white py-4 rounded-xl font-bold disabled:bg-slate-300 transition"
          >
            {loading
              ? "Verifying..."
              : "Login to Admin Console"}
          </button>

          <a
            href="/login"
            className="block text-center text-sm text-slate-500 hover:text-violet-700 font-medium"
          >
            Return to Tenant Login
          </a>
        </div>
      </div>
    </div>
  );
}
