import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { FormEvent, useMemo, useState } from "react";
import { registerUser } from "../services/authApi";

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

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
      setError("Your password must contain at least 8 characters.");
      return;
    }

    try {
      setLoading(true);

      await registerUser({
        full_name: fullName,
        email,
        password: form.password,
      });

      // registerUser saves firmic_token and firmic_user.
      await router.replace(nextRoute);
    } catch (registerError) {
      console.error("SIGNUP ERROR:", registerError);

      if (registerError instanceof TypeError) {
        setError(
          "Firmic could not connect to the backend. Make sure the FastAPI server is running on port 8000."
        );
        return;
      }

      setError(
        registerError instanceof Error
          ? registerError.message
          : "Account creation failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Create your Firmic account</title>
        <meta
          name="description"
          content="Create your Firmic account and continue building your company."
        />
      </Head>

      <div className="min-h-screen bg-[#f4f7f8] text-[#09233d]">
        <header className="border-b border-[#09233d]/10 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
            <Link
              href="/"
              className="text-xl font-black tracking-[0.14em] text-[#09233d]"
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
                Account creation
              </p>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                Create your Firmic account.
              </h1>

              <p className="mt-4 max-w-xl text-lg leading-8 text-[#587286]">
                Your company profile has been saved. Create your account to
                activate your company workspace.
              </p>

              <form onSubmit={handleSubmit} className="mt-9 space-y-6">
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
                    className="mt-2 w-full rounded-2xl border border-[#09233d]/15 bg-[#f8fbfb] px-5 py-4 outline-none transition placeholder:text-[#8aa0af] focus:border-[#0f8f91] focus:ring-4 focus:ring-[#0f8f91]/10"
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
                    className="mt-2 w-full rounded-2xl border border-[#09233d]/15 bg-[#f8fbfb] px-5 py-4 outline-none transition placeholder:text-[#8aa0af] focus:border-[#0f8f91] focus:ring-4 focus:ring-[#0f8f91]/10"
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
                    className="mt-2 w-full rounded-2xl border border-[#09233d]/15 bg-[#f8fbfb] px-5 py-4 outline-none transition placeholder:text-[#8aa0af] focus:border-[#0f8f91] focus:ring-4 focus:ring-[#0f8f91]/10"
                  />
                </label>

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
                  className="w-full rounded-full bg-[#09233d] px-8 py-4 font-black text-white shadow-[0_16px_36px_rgba(9,35,61,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0f8f91] disabled:cursor-not-allowed disabled:bg-[#b8c7cd] disabled:shadow-none"
                >
                  {loading
                    ? "Creating your account..."
                    : "Create account and continue"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-[#698296]">
                Already have an account?{" "}
                <Link
                  href={{
                    pathname: "/login",
                    query: { next: nextRoute },
                  }}
                  className="font-black text-[#0f8f91] hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </section>

            <aside className="bg-[#09233d] p-8 text-white sm:p-10 lg:p-12">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#76d5d1]">
                Step 3 of 3
              </p>

              <h2 className="mt-5 text-3xl font-black tracking-[-0.035em]">
                Your company workspace is almost ready.
              </h2>

              <p className="mt-5 leading-7 text-white/65">
                Firmic will securely create your account, return to your saved
                company profile, and activate the workspace.
              </p>

              <div className="mt-9 space-y-3">
                <SignupStep text="Company profile saved" completed />
                <SignupStep text="Create your account" active />
                <SignupStep text="Activate the company workspace" />
                <SignupStep text="Enter the Company Control Center" />
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}

function SignupStep({
  text,
  completed = false,
  active = false,
}: {
  text: string;
  completed?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 text-sm font-bold ${
        completed
          ? "border-[#76d5d1]/40 bg-[#76d5d1]/15 text-[#b9f5f0]"
          : active
            ? "border-white/30 bg-white/10 text-white"
            : "border-white/10 bg-white/5 text-white/55"
      }`}
    >
      {completed ? "✓ " : active ? "→ " : ""}
      {text}
    </div>
  );
}