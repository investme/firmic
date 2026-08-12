import Head from "next/head";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { createCompany } from "../services/companyApi";
import {
  clearAuthSession,
  getAuthToken,
  getMe,
  loginUser,
  registerUser,
  type AuthUser,
} from "../services/authApi";
import { saveActiveWorkspace } from "../src/utils/workspaceContext";

type CompanyDraft = {
  name: string;
  industry: string;
  jurisdiction: string;
};

type AccountMode = "signin" | "create";
type CompanyStage = "identity" | "plan";
type PlanCode =
  | "PLAN_STARTER"
  | "PLAN_BUSINESS"
  | "PLAN_ENTERPRISE";

type PlanDefinition = {
  code: PlanCode;
  name: string;
  price: number;
  workforce: string;
  description: string;
  features: string[];
  recommended?: boolean;
};

const DRAFT_KEY = "firmic_company_draft";

const defaultDraft: CompanyDraft = {
  name: "",
  industry: "Technology",
  jurisdiction: "Abu Dhabi",
};

const COMPANY_ACTIVATION_FEE_USD = 79;

const PLANS: PlanDefinition[] = [
  {
    code: "PLAN_STARTER",
    name: "Starter",
    price: 99,
    workforce: "5 AI Workers",
    description:
      "A focused operating team for founders launching their first AI-native company.",
    features: [
      "Sonny AI COO",
      "Hermes Compliance",
      "Core operating workforce",
      "Firmic company workspace",
    ],
  },
  {
    code: "PLAN_BUSINESS",
    name: "Business",
    price: 399,
    workforce: "25 AI Workers",
    description:
      "A complete digital organization for companies preparing to operate and grow.",
    features: [
      "Everything in Starter",
      "25-role AI organization",
      "Expanded operating workflows",
      "Priority launch support",
    ],
    recommended: true,
  },
  {
    code: "PLAN_ENTERPRISE",
    name: "Enterprise",
    price: 999,
    workforce: "Unlimited AI Workforce",
    description:
      "Enterprise-scale AI operations with the capacity to build specialized departments.",
    features: [
      "Everything in Business",
      "Unlimited AI workforce",
      "Enterprise administration",
      "Dedicated operating support",
    ],
  },
];

export default function CreateCompany() {
  const [draft, setDraft] = useState<CompanyDraft>(defaultDraft);
  const [hydrated, setHydrated] = useState(false);

  const [accountUser, setAccountUser] = useState<AuthUser | null>(null);
  const [accountConfirmed, setAccountConfirmed] = useState(false);
  const [accountMode, setAccountMode] = useState<AccountMode>("signin");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [companyStage, setCompanyStage] =
    useState<CompanyStage>("identity");
  const [selectedPlan, setSelectedPlan] =
    useState<PlanCode | null>(null);

  const [isUaeResident, setIsUaeResident] =
    useState<boolean | null>(null);

  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const savedDraft = localStorage.getItem(DRAFT_KEY);

        if (savedDraft && !cancelled) {
          const parsed = JSON.parse(savedDraft) as Partial<CompanyDraft>;
          setDraft({
            ...defaultDraft,
            ...parsed,
          });
        }
      } catch (error) {
        console.warn("Could not restore company draft:", error);
      }

      const token = getAuthToken();

      if (!token) {
        if (!cancelled) {
          setAccountUser(null);
          setAccountConfirmed(false);
          setHydrated(true);
        }
        return;
      }

      try {
        const verifiedUser = (await getMe()) as AuthUser;

        if (!cancelled) {
          setAccountUser(verifiedUser);
          setEmail(verifiedUser.email || "");
          setFullName(verifiedUser.full_name || "");
          setAccountConfirmed(false);
        }
      } catch (error) {
        console.warn("Stored Firmic session is invalid:", error);
        clearAuthSession();

        if (!cancelled) {
          setAccountUser(null);
          setAccountConfirmed(false);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateDraft<K extends keyof CompanyDraft>(
    key: K,
    value: CompanyDraft[K],
  ) {
    setDraft((current) => {
      const updated = {
        ...current,
        [key]: value,
      };

      localStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
      return updated;
    });
  }

  function saveDraft() {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        ...draft,
        name: draft.name.trim(),
      }),
    );
  }

  function useDifferentAccount() {
    saveDraft();
    clearAuthSession();

    setAccountUser(null);
    setAccountConfirmed(false);
    setAccountMode("signin");
    setFullName("");
    setEmail("");
    setPassword("");
    setAccountError("");
    setCompanyError("");
    setCompanyStage("identity");
    setSelectedPlan(null);
  }

  async function verifyCurrentSession() {
    const user = (await getMe()) as AuthUser;
    setAccountUser(user);
    setFullName(user.full_name || "");
    setEmail(user.email || "");
    return user;
  }

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setAccountError("Enter your email address and password.");
      return;
    }

    try {
      setAccountLoading(true);

      const result = await loginUser({
        email: normalizedEmail,
        password,
      });

      if (String(result.user?.role || "").toLowerCase() === "admin") {
        clearAuthSession();
        setAccountError(
          "Administrator accounts must use the separate Firmic Admin Login.",
        );
        return;
      }

      const verifiedUser = await verifyCurrentSession();
      setPassword("");
      setAccountConfirmed(false);

      if (!verifiedUser.full_name) {
        setAccountError(
          "This account has no tenant name. Please contact Firmic support before creating a company.",
        );
      }
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : "Sign in failed.",
      );
    } finally {
      setAccountLoading(false);
    }
  }

  async function handleCreateAccount(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setAccountError("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();

    if (!normalizedName) {
      setAccountError("Enter your full name.");
      return;
    }

    if (!normalizedEmail) {
      setAccountError("Enter your email address.");
      return;
    }

    if (password.length < 8) {
      setAccountError(
        "Your password must contain at least 8 characters.",
      );
      return;
    }

    try {
      setAccountLoading(true);

      await registerUser({
        full_name: normalizedName,
        email: normalizedEmail,
        password,
      });

      await verifyCurrentSession();
      setPassword("");
      setAccountConfirmed(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Account creation failed.";

      const normalizedMessage = message.toLowerCase();

      if (
        normalizedMessage.includes("email already registered") ||
        normalizedMessage.includes("email already exists") ||
        normalizedMessage.includes("account already exists")
      ) {
        setAccountMode("signin");
        setPassword("");
        setAccountError(
          "A Firmic account already exists with this email. Sign in with its password to continue.",
        );
        return;
      }

      setAccountError(message);
    } finally {
      setAccountLoading(false);
    }
  }

  function continueToPlans() {
    setCompanyError("");

    if (!draft.name.trim()) {
      setCompanyError("Enter your company name to continue.");
      return;
    }

    saveDraft();
    setCompanyStage("plan");
  }

  async function handleCreateCompany() {
    setCompanyError("");

    const companyName = draft.name.trim();

    if (!accountUser || !accountConfirmed) {
      setCompanyError(
        "Confirm the Firmic account that will own this company first.",
      );
      return;
    }

    if (!companyName) {
      setCompanyError("Enter your company name to continue.");
      setCompanyStage("identity");
      return;
    }

    if (!selectedPlan) {
      setCompanyError(
        "Choose Starter, Business, or Enterprise before creating the company.",
      );
      return;
    }

    if (isUaeResident === null) {
      setCompanyError(
        "Confirm whether the founder or authorized representative is a UAE resident.",
      );
      return;
    }

    saveDraft();

    try {
      setCompanyLoading(true);

      const verifiedUser = (await getMe()) as AuthUser;

      if (
        String(verifiedUser.id) !== String(accountUser.id) ||
        verifiedUser.email.toLowerCase() !==
          accountUser.email.toLowerCase()
      ) {
        throw new Error(
          "Your authenticated account changed. Confirm your account again.",
        );
      }

      const response = await createCompany({
        name: companyName,
        plan_code: selectedPlan,
        is_uae_resident: isUaeResident,
      });

      const companyId = response?.company?.id || response?.id;

      if (!companyId) {
        console.error("CREATE COMPANY RESPONSE:", response);
        throw new Error("The backend returned no company ID.");
      }

      /*
       * PLAN SOURCE OF TRUTH
       *
       * Keep the canonical plan code selected by the tenant.
       * Do not convert PLAN_BUSINESS -> "Business" and do not
       * allow a later onboarding page to silently fall back to Starter.
       */
      localStorage.setItem(
        `firmic_launch_plan:${String(companyId)}`,
        selectedPlan,
      );

      const workspace = saveActiveWorkspace({
        id: String(companyId),
        name: response?.company?.name || companyName,
        industry: draft.industry,
        jurisdiction: draft.jurisdiction,
        plan: selectedPlan,
        status: response?.company?.status || "draft",
        headquarters: null,
      });

      if (!workspace) {
        throw new Error(
          "The company was created, but its workspace could not be prepared.",
        );
      }

      localStorage.removeItem(DRAFT_KEY);
      window.location.href = "/headquarters?onboarding=1";
    } catch (error) {
      console.error("CREATE COMPANY ERROR:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Firmic could not create the company.";

      setCompanyError(message);

      if (
        message.toLowerCase().includes("authenticated") ||
        message.toLowerCase().includes("token") ||
        message.toLowerCase().includes("access denied")
      ) {
        clearAuthSession();
        setAccountUser(null);
        setAccountConfirmed(false);
        setCompanyStage("identity");
        setSelectedPlan(null);
      }
    } finally {
      setCompanyLoading(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f7f8] px-6 text-[#09233d]">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#0f8f91]/20 border-t-[#0f8f91]" />
          <p className="mt-5 font-bold">
            Verifying your Firmic account...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Create a company | Firmic</title>
        <meta
          name="description"
          content="Verify your Firmic account, choose a company plan, review the one-time activation fee, and begin the Firmic launch process."
        />
      </Head>

      <div className="min-h-screen bg-[#f3f7f8] text-[#09233d]">
        <header className="border-b border-[#09233d]/10 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
            <Link
              href="/"
              className="text-xl font-black tracking-[0.16em]"
            >
              FIRMIC
            </Link>

            <Link
              href="/companies"
              className="text-sm font-bold text-[#587286] transition hover:text-[#0f8f91]"
            >
              My companies
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-16">
          {!accountUser || !accountConfirmed ? (
            <AccountGateway
              accountUser={accountUser}
              accountMode={accountMode}
              accountLoading={accountLoading}
              accountError={accountError}
              fullName={fullName}
              email={email}
              password={password}
              onFullNameChange={setFullName}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onModeChange={(mode) => {
                setAccountMode(mode);
                setAccountError("");
                setPassword("");
              }}
              onSignIn={handleSignIn}
              onCreateAccount={handleCreateAccount}
              onConfirmAccount={() => {
                setAccountError("");
                setAccountConfirmed(true);
                setCompanyStage("identity");
              }}
              onUseDifferentAccount={useDifferentAccount}
            />
          ) : companyStage === "identity" ? (
            <CompanyIdentity
              draft={draft}
              accountUser={accountUser}
              error={companyError}
              onChange={updateDraft}
              onBack={() => setAccountConfirmed(false)}
              onContinue={continueToPlans}
              onUseDifferentAccount={useDifferentAccount}
            />
          ) : (
            <div className="space-y-6">
              <section className="mx-auto max-w-4xl rounded-[2rem] border border-[#09233d]/10 bg-white p-7 shadow-[0_24px_70px_rgba(9,35,61,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.17em] text-[#0f8f91]">
                  Compliance residency
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  Is the founder or authorized representative a UAE resident?
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#60798b]">
                  Emirates ID is mandatory only for UAE residents.
                  Non-UAE residents must still complete all other
                  Firmic compliance requirements.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUaeResident(true);
                      setCompanyError("");
                    }}
                    className={`rounded-2xl border px-5 py-4 text-left font-black transition ${
                      isUaeResident === true
                        ? "border-[#0f8f91] bg-[#eefafa] text-[#09233d]"
                        : "border-[#09233d]/10 bg-white text-[#587286]"
                    }`}
                  >
                    Yes — UAE resident
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUaeResident(false);
                      setCompanyError("");
                    }}
                    className={`rounded-2xl border px-5 py-4 text-left font-black transition ${
                      isUaeResident === false
                        ? "border-[#0f8f91] bg-[#eefafa] text-[#09233d]"
                        : "border-[#09233d]/10 bg-white text-[#587286]"
                    }`}
                  >
                    No — non-UAE resident
                  </button>
                </div>
              </section>

              <PlanSelection
                draft={draft}
                accountUser={accountUser}
                selectedPlan={selectedPlan}
                loading={companyLoading}
                error={companyError}
                onSelect={setSelectedPlan}
                onBack={() => {
                  setCompanyError("");
                  setCompanyStage("identity");
                }}
                onCreate={handleCreateCompany}
              />
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function AccountGateway({
  accountUser,
  accountMode,
  accountLoading,
  accountError,
  fullName,
  email,
  password,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onModeChange,
  onSignIn,
  onCreateAccount,
  onConfirmAccount,
  onUseDifferentAccount,
}: {
  accountUser: AuthUser | null;
  accountMode: AccountMode;
  accountLoading: boolean;
  accountError: string;
  fullName: string;
  email: string;
  password: string;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onModeChange: (mode: AccountMode) => void;
  onSignIn: (event: FormEvent<HTMLFormElement>) => void;
  onCreateAccount: (event: FormEvent<HTMLFormElement>) => void;
  onConfirmAccount: () => void;
  onUseDifferentAccount: () => void;
}) {
  if (accountUser) {
    return (
      <section className="mx-auto max-w-4xl">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-[2rem] border border-[#09233d]/10 bg-white p-7 shadow-[0_24px_70px_rgba(9,35,61,0.08)] sm:p-10">
            <p className="text-xs font-black uppercase tracking-[0.17em] text-[#0f8f91]">
              Step 0 · Account identity
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              Who is creating this company?
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#60798b]">
              Firmic verified the current browser session with the backend.
              Confirm this identity before any company is created.
            </p>

            <div className="mt-8 rounded-3xl border border-[#0f8f91]/20 bg-[#eefafa] p-6">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#0f8f91]">
                Authenticated Firmic account
              </p>

              <p className="mt-3 text-2xl font-black">
                {accountUser.full_name || "Firmic Tenant"}
              </p>

              <p className="mt-1 font-bold text-[#587286]">
                {accountUser.email}
              </p>

              <p className="mt-4 text-sm leading-6 text-[#698296]">
                The new company will belong to this authenticated tenant
                account inside Firmic.
              </p>
            </div>

            {accountError && (
              <ErrorBox message={accountError} />
            )}

            <button
              type="button"
              onClick={onConfirmAccount}
              className="mt-7 inline-flex min-h-[58px] w-full items-center justify-center rounded-2xl bg-[#09233d] px-7 py-4 font-black text-white transition hover:bg-[#0f8f91]"
            >
              Continue as {accountUser.full_name || accountUser.email}
              <span className="ml-3 text-xl">→</span>
            </button>

            <button
              type="button"
              onClick={onUseDifferentAccount}
              className="mt-4 w-full text-sm font-black text-violet-700 hover:underline"
            >
              Use a different Firmic account
            </button>
          </div>

          <AccountAside />
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[2rem] border border-[#09233d]/10 bg-white p-7 shadow-[0_24px_70px_rgba(9,35,61,0.08)] sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.17em] text-[#0f8f91]">
            Step 0 · Account identity
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
            Identify the company owner first.
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-[#60798b]">
            A company cannot be created until its Firmic account is
            securely authenticated.
          </p>

          <div className="mt-8 grid grid-cols-2 rounded-2xl bg-[#edf3f4] p-1.5">
            <button
              type="button"
              onClick={() => onModeChange("signin")}
              className={[
                "rounded-xl px-4 py-3 text-sm font-black transition",
                accountMode === "signin"
                  ? "bg-white text-[#09233d] shadow-sm"
                  : "text-[#698296]",
              ].join(" ")}
            >
              Existing account
            </button>

            <button
              type="button"
              onClick={() => onModeChange("create")}
              className={[
                "rounded-xl px-4 py-3 text-sm font-black transition",
                accountMode === "create"
                  ? "bg-white text-[#09233d] shadow-sm"
                  : "text-[#698296]",
              ].join(" ")}
            >
              New account
            </button>
          </div>

          {accountMode === "signin" ? (
            <form onSubmit={onSignIn} className="mt-7 space-y-5">
              <Field
                label="Email address"
                description="Use the email registered to your Firmic tenant account."
              >
                <input
                  type="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className={inputClassName}
                  required
                />
              </Field>

              <Field label="Password">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  className={inputClassName}
                  required
                />
              </Field>

              {accountError && <ErrorBox message={accountError} />}

              <button
                type="submit"
                disabled={accountLoading}
                className="inline-flex min-h-[58px] w-full items-center justify-center rounded-2xl bg-[#09233d] px-7 py-4 font-black text-white transition hover:bg-[#0f8f91] disabled:bg-[#b7c5cb]"
              >
                {accountLoading ? "Signing in..." : "Sign in securely"}
              </button>
            </form>
          ) : (
            <form onSubmit={onCreateAccount} className="mt-7 space-y-5">
              <Field label="Full name">
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) =>
                    onFullNameChange(event.target.value)
                  }
                  placeholder="Your full name"
                  autoComplete="name"
                  className={inputClassName}
                  required
                />
              </Field>

              <Field label="Email address">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className={inputClassName}
                  required
                />
              </Field>

              <Field
                label="Create password"
                description="Minimum 8 characters."
              >
                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    onPasswordChange(event.target.value)
                  }
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  className={inputClassName}
                  required
                />
              </Field>

              {accountError && <ErrorBox message={accountError} />}

              <button
                type="submit"
                disabled={accountLoading}
                className="inline-flex min-h-[58px] w-full items-center justify-center rounded-2xl bg-[#09233d] px-7 py-4 font-black text-white transition hover:bg-[#0f8f91] disabled:bg-[#b7c5cb]"
              >
                {accountLoading
                  ? "Creating account..."
                  : "Create account securely"}
              </button>

              <p className="text-center text-xs leading-5 text-[#698296]">
                If this email already belongs to a Firmic account, Firmic
                stops here and requires secure sign-in.
              </p>
            </form>
          )}
        </div>

        <AccountAside />
      </div>
    </section>
  );
}

function AccountAside() {
  return (
    <aside className="space-y-5">
      <div className="rounded-[2rem] bg-[#09233d] p-7 text-white shadow-[0_24px_70px_rgba(9,35,61,0.16)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#20b9b5] font-black text-[#09233d]">
          S
        </div>

        <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[#8de6e2]">
          Sonny says
        </p>

        <h2 className="mt-3 text-2xl font-black">
          Identity before company.
        </h2>

        <p className="mt-4 text-sm leading-7 text-white/65">
          I will not create or attach a company until Firmic verifies the
          account that will own it.
        </p>
      </div>

      <div className="rounded-[2rem] border border-[#09233d]/10 bg-white p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
          Secure sequence
        </p>

        <div className="mt-4 space-y-3 text-sm font-bold text-[#587286]">
          <p>00 · Verify account</p>
          <p>01 · Company identity</p>
          <p>02 · Select plan</p>
          <p>03 · Headquarters</p>
        </div>
      </div>
    </aside>
  );
}

function CompanyIdentity({
  draft,
  accountUser,
  error,
  onChange,
  onBack,
  onContinue,
  onUseDifferentAccount,
}: {
  draft: CompanyDraft;
  accountUser: AuthUser;
  error: string;
  onChange: <K extends keyof CompanyDraft>(
    key: K,
    value: CompanyDraft[K],
  ) => void;
  onBack: () => void;
  onContinue: () => void;
  onUseDifferentAccount: () => void;
}) {
  return (
    <section className="w-full">
      <StepHeader
        label="Company setup"
        step="Step 1"
        progress="16%"
        onBack={onBack}
        backLabel="Account"
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-[2rem] border border-[#09233d]/10 bg-white p-6 shadow-[0_24px_70px_rgba(9,35,61,0.08)] sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.17em] text-[#0f8f91]">
            Company Identity
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
            Let&apos;s create your company.
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-[#60798b]">
            The account owner is verified. Now define the company that
            Sonny will help you build.
          </p>

          <div className="mt-8 rounded-2xl border border-[#0f8f91]/20 bg-[#eefafa] p-5">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#0f8f91]">
              Confirmed owner
            </p>
            <p className="mt-2 text-lg font-black">
              {accountUser.full_name || "Firmic Tenant"}
            </p>
            <p className="mt-1 text-sm font-bold text-[#587286]">
              {accountUser.email}
            </p>

            <button
              type="button"
              onClick={onUseDifferentAccount}
              className="mt-4 text-sm font-black text-violet-700 hover:underline"
            >
              Use a different account
            </button>
          </div>

          <div className="mt-9 space-y-6">
            <Field
              label="Company name"
              description="Your company’s legal or operating name."
            >
              <input
                value={draft.name}
                onChange={(event) =>
                  onChange("name", event.target.value)
                }
                placeholder="Example: C50 Labs"
                autoComplete="organization"
                className={inputClassName}
              />
            </Field>

            <Field
              label="Industry"
              description="This helps Sonny prepare the right operating environment."
            >
              <select
                value={draft.industry}
                onChange={(event) =>
                  onChange("industry", event.target.value)
                }
                className={inputClassName}
              >
                <option>Technology</option>
                <option>Artificial Intelligence</option>
                <option>Fintech</option>
                <option>Consulting</option>
                <option>Real Estate</option>
                <option>E-commerce</option>
                <option>Professional Services</option>
                <option>Other</option>
              </select>
            </Field>

            <Field
              label="Jurisdiction"
              description="Choose where your company will begin operating."
            >
              <select
                value={draft.jurisdiction}
                onChange={(event) =>
                  onChange("jurisdiction", event.target.value)
                }
                className={inputClassName}
              >
                <option value="Abu Dhabi">🇦🇪 Abu Dhabi</option>
                <option value="Dubai">🇦🇪 Dubai</option>
                <option value="Ras Al Khaimah">
                  🇦🇪 Ras Al Khaimah
                </option>
                <option value="UAE Mainland">🇦🇪 UAE Mainland</option>
                <option value="Qatar">🇶🇦 Qatar</option>
                <option value="Saudi Arabia" disabled>
                  🇸🇦 Saudi Arabia — Coming Soon
                </option>
                <option value="Bahrain" disabled>
                  🇧🇭 Bahrain — Coming Soon
                </option>
                <option value="Oman" disabled>
                  🇴🇲 Oman — Coming Soon
                </option>
                <option value="Singapore" disabled>
                  🇸🇬 Singapore — Coming Soon
                </option>
                <option value="United Kingdom" disabled>
                  🇬🇧 United Kingdom — Coming Soon
                </option>
                <option value="United States" disabled>
                  🇺🇸 United States — Coming Soon
                </option>
              </select>
            </Field>
          </div>

          {error && <ErrorBox message={error} />}

          <button
            type="button"
            onClick={onContinue}
            disabled={!draft.name.trim()}
            className="mt-9 inline-flex min-h-[58px] w-full items-center justify-center rounded-2xl bg-[#09233d] px-7 py-4 text-base font-black text-white transition hover:bg-[#0f8f91] disabled:bg-[#b7c5cb]"
          >
            Continue to Plan Selection
            <span className="ml-3 text-xl">→</span>
          </button>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[2rem] bg-[#09233d] p-7 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#20b9b5] font-black text-[#09233d]">
              S
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[#8de6e2]">
              Sonny says
            </p>
            <h2 className="mt-3 text-2xl font-black">
              Company first. Capacity next.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/65">
              After defining the company, choose Starter, Business, or
              Enterprise before Firmic creates the company subscription.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function PlanSelection({
  draft,
  accountUser,
  selectedPlan,
  loading,
  error,
  onSelect,
  onBack,
  onCreate,
}: {
  draft: CompanyDraft;
  accountUser: AuthUser;
  selectedPlan: PlanCode | null;
  loading: boolean;
  error: string;
  onSelect: (plan: PlanCode) => void;
  onBack: () => void;
  onCreate: () => void;
}) {
  const selected = PLANS.find((plan) => plan.code === selectedPlan);

  return (
    <section className="w-full">
      <StepHeader
        label="AI workforce"
        step="Step 2"
        progress="32%"
        onBack={onBack}
        backLabel="Company identity"
      />

      <div className="rounded-[2.25rem] bg-[#09233d] p-7 text-white sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8de6e2]">
          Firmic Company Plan
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
          Choose your company&apos;s operating capacity.
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-white/65">
          {draft.name} will be owned by{" "}
          <strong className="text-white">
            {accountUser.full_name || accountUser.email}
          </strong>
          . Choose the plan Firmic should attach to the company when it is
          created.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const active = selectedPlan === plan.code;

          return (
            <button
              key={plan.code}
              type="button"
              onClick={() => onSelect(plan.code)}
              className={[
                "relative flex h-full flex-col rounded-[2rem] border bg-white p-7 text-left shadow-[0_20px_60px_rgba(9,35,61,0.07)] transition",
                active
                  ? "border-[#0f8f91] ring-4 ring-[#0f8f91]/10"
                  : "border-[#09233d]/10 hover:-translate-y-1 hover:border-[#0f8f91]/40",
              ].join(" ")}
            >
              {plan.recommended && (
                <span className="absolute right-5 top-5 rounded-full bg-[#20b9b5] px-3 py-1 text-xs font-black text-[#09233d]">
                  Recommended
                </span>
              )}

              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#0f8f91]">
                {plan.name}
              </p>

              <p className="mt-5 text-4xl font-black">
                ${plan.price}
                <span className="text-base font-bold text-[#698296]">
                  /month
                </span>
              </p>

              <p className="mt-2 text-sm font-black text-[#0f8f91]">
                + ${COMPANY_ACTIVATION_FEE_USD} one-time activation fee
              </p>

              <p className="mt-3 text-lg font-black">
                {plan.workforce}
              </p>

              <p className="mt-4 min-h-[72px] text-sm leading-6 text-[#60798b]">
                {plan.description}
              </p>

              <div className="mt-6 space-y-3 border-t border-[#09233d]/10 pt-5">
                {plan.features.map((feature) => (
                  <p
                    key={feature}
                    className="text-sm font-bold text-[#36546a]"
                  >
                    ✓ {feature}
                  </p>
                ))}
              </div>

              <div
                className={[
                  "mt-7 rounded-2xl px-4 py-3 text-center text-sm font-black",
                  active
                    ? "bg-[#0f8f91] text-white"
                    : "bg-[#edf3f4] text-[#587286]",
                ].join(" ")}
              >
                {active ? "Selected" : `Choose ${plan.name}`}
              </div>
            </button>
          );
        })}
      </div>

      {error && <ErrorBox message={error} />}

      <div className="mt-8 rounded-[2rem] border border-[#09233d]/10 bg-white p-6 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
            Create company
          </p>

          <h2 className="mt-2 text-2xl font-black">
            {draft.name}
            {selected ? ` · ${selected.name}` : ""}
          </h2>

          <p className="mt-2 text-sm text-[#698296]">
            {selected
              ? `$${selected.price}/month + $${COMPANY_ACTIVATION_FEE_USD} one-time activation fee · ${selected.workforce}. The activation fee is charged once and is not part of the recurring monthly subscription. The company will remain in launch status until payment, Hermes compliance, Firmic approval, and provisioning are complete.`
              : "Select a plan before Firmic creates the company."}
          </p>
        </div>

        <button
          type="button"
          onClick={onCreate}
          disabled={loading || !selectedPlan}
          className="mt-5 inline-flex min-h-[56px] min-w-[220px] items-center justify-center rounded-2xl bg-[#09233d] px-6 py-4 font-black text-white transition hover:bg-[#0f8f91] disabled:bg-[#b7c5cb] sm:mt-0"
        >
          {loading ? "Creating Company..." : "Create Company"}
          {!loading && <span className="ml-3 text-xl">→</span>}
        </button>
      </div>
    </section>
  );
}

function StepHeader({
  label,
  step,
  progress,
  onBack,
  backLabel,
}: {
  label: string;
  step: string;
  progress: string;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <>
      <div className="mb-7 flex items-center justify-between gap-5">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-black text-[#587286] transition hover:text-[#0f8f91]"
        >
          ← {backLabel}
        </button>

        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
            {label}
          </p>
          <p className="mt-1 text-sm font-bold text-[#698296]">
            {step}
          </p>
        </div>
      </div>

      <div className="mb-8 h-2 overflow-hidden rounded-full bg-[#dce8eb]">
        <div
          className="h-full rounded-full bg-[#0f8f91]"
          style={{ width: progress }}
        />
      </div>
    </>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700"
    >
      {message}
    </div>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#203f57]">
        {label}
      </span>

      {description && (
        <span className="mt-1 block text-xs leading-5 text-[#7b91a0]">
          {description}
        </span>
      )}

      <span className="mt-3 block">{children}</span>
    </label>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[#09233d]/15 bg-[#f8fbfb] px-5 py-4 text-[#09233d] outline-none transition placeholder:text-[#8aa0af] focus:border-[#0f8f91] focus:bg-white focus:ring-4 focus:ring-[#0f8f91]/10";
