import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  getMe,
  registerUser,
  type AuthUser,
} from "../services/authApi";

type SignupForm = {
  full_name: string;
  email: string;
  password: string;
};

export default function Signup() {
  const router = useRouter();

  const [form, setForm] = useState<SignupForm>({
    full_name: "",
    email: "",
    password: "",
  });

  const [verifiedUser, setVerifiedUser] =
    useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingAccountEmail, setExistingAccountEmail] =
    useState("");

  const nextRoute = useMemo(() => {
    const requestedRoute = router.query.next;

    if (
      typeof requestedRoute === "string" &&
      requestedRoute.startsWith("/") &&
      !requestedRoute.startsWith("//")
    ) {
      return requestedRoute;
    }

    return "/create-company";
  }, [router.query.next]);

  useEffect(() => {
    if (!router.isReady) return;

    const requestedEmail = router.query.email;
    const requestedName = router.query.name;

    setForm((current) => ({
      ...current,
      email:
        typeof requestedEmail === "string"
          ? requestedEmail.trim().toLowerCase()
          : current.email,
      full_name:
        typeof requestedName === "string"
          ? requestedName.trim()
          : current.full_name,
    }));
  }, [router.isReady, router.query.email, router.query.name]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");
    setExistingAccountEmail("");

    const email = form.email.trim().toLowerCase();
    const fullName = form.full_name.trim();

    if (!fullName) {
      setError("Enter your full name.");
      return;
    }

    if (!email) {
      setError("Enter your email address.");
      return;
    }

    if (form.password.length < 8) {
      setError(
        "Your password must contain at least 8 characters.",
      );
      return;
    }

    try {
      setLoading(true);

      await registerUser({
        full_name: fullName,
        email,
        password: form.password,
      });

      const user = (await getMe()) as AuthUser;
      setVerifiedUser(user);
      setForm((current) => ({
        ...current,
        password: "",
      }));
    } catch (registerError) {
      const message =
        registerError instanceof Error
          ? registerError.message
          : "Account creation failed. Please try again.";

      const normalizedMessage = message.trim().toLowerCase();

      if (
        normalizedMessage.includes("email already registered") ||
        normalizedMessage.includes("email already exists") ||
        normalizedMessage.includes("account already exists")
      ) {
        setExistingAccountEmail(email);
        setError("");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (verifiedUser) {
    return (
      <div className="min-h-screen bg-[#f4f7f8] px-5 py-12 text-[#09233d]">
        <div className="mx-auto max-w-lg rounded-[2rem] border border-[#09233d]/10 bg-white p-8 shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
            Account created
          </p>

          <h1 className="mt-4 text-3xl font-black">
            Your Firmic identity is ready.
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
            Continue to company setup →
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Create your Firmic account</title>
        <meta
          name="description"
          content="Create your Firmic tenant account before creating a company."
        />
      </Head>

      <div className="min-h-screen bg-[#f4f7f8] text-[#09233d]">
        <header className="border-b border-[#09233d]/10 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
            <Link
              href="/"
              className="text-xl font-black tracking-[0.14em]"
            >
              FIRMIC
            </Link>

            <Link
              href="/create-company"
              className="text-sm font-bold text-[#49677d] transition hover:text-[#0f8f91]"
            >
              Back to company setup
            </Link>
          </div>
        </header>

        <main className="mx-auto flex max-w-6xl justify-center px-5 py-12 lg:py-20">
          <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#09233d]/10 bg-white shadow-[0_24px_70px_rgba(9,35,61,0.1)] lg:grid-cols-[1fr_0.9fr]">
            <section className="p-7 sm:p-10 lg:p-12">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f8f91]">
                Account identity
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                Create your Firmic account.
              </h1>

              <p className="mt-4 max-w-xl text-lg leading-8 text-[#587286]">
                Create your personal Firmic identity first. Company creation
                begins only after this account is authenticated.
              </p>

              <form
                onSubmit={handleSubmit}
                className="mt-9 space-y-6"
              >
                <label className="block">
                  <span className="text-sm font-black text-[#23455e]">
                    Full name
                  </span>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        full_name: event.target.value,
                      }))
                    }
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                    className="mt-2 w-full rounded-2xl border border-[#09233d]/15 bg-[#f8fbfb] px-5 py-4 outline-none focus:border-[#0f8f91]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-[#23455e]">
                    Email address
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                    className="mt-2 w-full rounded-2xl border border-[#09233d]/15 bg-[#f8fbfb] px-5 py-4 outline-none focus:border-[#0f8f91]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-black text-[#23455e]">
                    Password
                  </span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    className="mt-2 w-full rounded-2xl border border-[#09233d]/15 bg-[#f8fbfb] px-5 py-4 outline-none focus:border-[#0f8f91]"
                  />
                </label>

                {existingAccountEmail && (
                  <div className="rounded-3xl border border-[#0f8f91]/20 bg-[#eefafa] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
                      Account already exists
                    </p>

                    <h2 className="mt-2 text-xl font-black">
                      Sign in to continue.
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#587286]">
                      A Firmic account is already registered with{" "}
                      <span className="font-black">
                        {existingAccountEmail}
                      </span>
                      . Firmic will not create a company until that account
                      is authenticated.
                    </p>

                    <Link
                      href={{
                        pathname: "/login",
                        query: {
                          next: nextRoute,
                          email: existingAccountEmail,
                        },
                      }}
                      className="mt-4 inline-flex rounded-full bg-[#0f8f91] px-6 py-3 text-sm font-black text-white"
                    >
                      Sign in securely
                    </Link>
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#09233d] px-8 py-4 font-black text-white transition hover:bg-[#0f8f91] disabled:bg-[#b8c7cd]"
                >
                  {loading
                    ? "Creating your account..."
                    : "Create account securely"}
                </button>
              </form>
            </section>

            <aside className="bg-[#09233d] p-8 text-white sm:p-10 lg:p-12">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#76d5d1]">
                Firmic identity
              </p>

              <h2 className="mt-5 text-3xl font-black">
                Account first. Company second.
              </h2>

              <p className="mt-5 leading-7 text-white/65">
                Your name and email identify the tenant account. Company
                name, industry and jurisdiction are collected only after
                the account is secured.
              </p>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}
