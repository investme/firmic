import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  clearAuthSession,
  getMe,
  loginUser,
  type AuthUser,
} from "../services/authApi";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifiedUser, setVerifiedUser] =
    useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nextRoute = useMemo(() => {
    const requested = router.query.next;

    return typeof requested === "string" &&
      requested.startsWith("/") &&
      !requested.startsWith("//")
      ? requested
      : "/dashboard";
  }, [router.query.next]);

  useEffect(() => {
    if (!router.isReady) return;

    const requestedEmail = router.query.email;

    if (typeof requestedEmail === "string") {
      setEmail(requestedEmail.trim().toLowerCase());
    }
  }, [router.isReady, router.query.email]);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setVerifiedUser(null);

      const result = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      if (String(result.user?.role || "").toLowerCase() === "admin") {
        clearAuthSession();
        setError(
          "Use the Admin Login page for administrator access.",
        );
        return;
      }

      const user = (await getMe()) as AuthUser;
      setVerifiedUser(user);
      setPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (verifiedUser) {
    return (
      <div className="min-h-screen bg-[#f3f7f8] px-6 py-12 text-[#09233d]">
        <div className="mx-auto max-w-lg rounded-[2rem] border border-[#09233d]/10 bg-white p-8 shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
            Identity verified
          </p>

          <h1 className="mt-4 text-3xl font-black">
            Signed in successfully.
          </h1>

          <div className="mt-6 rounded-2xl border border-[#0f8f91]/20 bg-[#eefafa] p-5">
            <p className="text-lg font-black">
              {verifiedUser.full_name || "Firmic Tenant"}
            </p>
            <p className="mt-1 font-bold text-[#587286]">
              {verifiedUser.email}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href = nextRoute;
            }}
            className="mt-6 w-full rounded-2xl bg-[#09233d] px-6 py-4 font-black text-white hover:bg-[#0f8f91]"
          >
            Continue to Firmic →
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Sign in | Firmic</title>
      </Head>

      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-violet-600 text-white flex items-center justify-center text-2xl">
              ◆
            </div>
            <h1 className="text-3xl font-bold mt-5">
              Sign in to Firmic
            </h1>
            <p className="text-slate-500 mt-2">
              Authenticate your tenant account. Firmic will show the
              verified account holder&apos;s name and email before continuing.
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
                Email address
              </label>
              <input
                type="email"
                className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
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
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !loading) {
                    void handleLogin();
                  }
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => void handleLogin()}
              disabled={loading || !email.trim() || !password}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-4 rounded-xl font-bold disabled:bg-slate-300 transition"
            >
              {loading ? "Verifying account..." : "Sign in securely"}
            </button>

            <p className="text-center text-sm text-slate-500">
              New to Firmic?{" "}
              <Link
                href={{
                  pathname: "/signup",
                  query: { next: nextRoute },
                }}
                className="text-violet-700 font-bold"
              >
                Create account
              </Link>
            </p>

            <Link
              href="/admin-login"
              className="block text-center text-xs text-slate-400 hover:text-violet-700"
            >
              Firmic Admin Login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
