import { useState } from "react";
import { loginUser } from "../services/authApi";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      if (String(result.user?.role || "").toLowerCase() === "admin") {
        setError("Use the Admin Login page for administrator access.");
        return;
      }

      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !loading) handleLogin();
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-violet-600 text-white flex items-center justify-center text-2xl">◆</div>
          <h1 className="text-3xl font-bold mt-5">Login to Firmic</h1>
          <p className="text-slate-500 mt-2">Access only the company workspaces owned by this Tenant account.</p>
        </div>

        <div className="space-y-5 mt-8">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">{error}</div>}

          <div>
            <label className="text-sm font-semibold">Email</label>
            <input
              type="email"
              className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Password</label>
            <input
              type="password"
              className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Your password"
              autoComplete="current-password"
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading || !email.trim() || !password}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white py-4 rounded-xl font-bold disabled:bg-slate-300 transition"
          >
            {loading ? "Logging in..." : "Login to Workspace"}
          </button>

          <p className="text-center text-sm text-slate-500">
            New to Firmic? <a href="/register" className="text-violet-700 font-bold">Create account</a>
          </p>

          <a href="/admin-login" className="block text-center text-xs text-slate-400 hover:text-violet-700">
            Firmic Admin Login
          </a>
        </div>
      </div>
    </div>
  );
}
