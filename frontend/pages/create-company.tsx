import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createCompany, isAuthenticated } from "../services/companyApi";
import { saveActiveWorkspace } from "../src/utils/workspaceContext";

type PlanCode =
  | "PLAN_STARTER"
  | "PLAN_BUSINESS"
  | "PLAN_ENTERPRISE";

type LaunchStep = "welcome" | "identity" | "plan" | "creating";

type CompanyDraft = {
  name: string;
  industry: string;
  jurisdiction: string;
  planCode: PlanCode;
};

type PlanOption = {
  code: PlanCode;
  name: "Starter" | "Business" | "Enterprise";
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
  planCode: "PLAN_BUSINESS",
};

const plans: PlanOption[] = [
  {
    code: "PLAN_STARTER",
    name: "Starter",
    price: 149,
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

const progressByStep: Record<LaunchStep, number> = {
  welcome: 0,
  identity: 20,
  plan: 40,
  creating: 50,
};

export default function CreateCompany() {
  const [draft, setDraft] = useState<CompanyDraft>(defaultDraft);
  const [step, setStep] = useState<LaunchStep>("welcome");
  const [hydrated, setHydrated] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creationStage, setCreationStage] = useState(0);

  const selectedPlan = useMemo(
    () =>
      plans.find((plan) => plan.code === draft.planCode) ??
      plans[1],
    [draft.planCode],
  );

  useEffect(() => {
    setAuthenticated(isAuthenticated());

    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY);

      if (savedDraft) {
        const parsed = JSON.parse(savedDraft) as Partial<CompanyDraft> & {
          plan?: string;
        };

        let planCode = defaultDraft.planCode;

        if (
          parsed.planCode === "PLAN_STARTER" ||
          parsed.planCode === "PLAN_BUSINESS" ||
          parsed.planCode === "PLAN_ENTERPRISE"
        ) {
          planCode = parsed.planCode;
        } else if (parsed.plan === "Starter") {
          planCode = "PLAN_STARTER";
        } else if (
          parsed.plan === "Business" ||
          parsed.plan === "Premium"
        ) {
          planCode = "PLAN_BUSINESS";
        } else if (parsed.plan === "Enterprise") {
          planCode = "PLAN_ENTERPRISE";
        }

        const restored: CompanyDraft = {
          ...defaultDraft,
          ...parsed,
          planCode,
        };

        setDraft(restored);

        if (restored.name.trim()) {
          setStep("identity");
        }
      }
    } catch (error) {
      console.warn("Could not restore company draft:", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  function persistDraft(nextDraft: CompanyDraft) {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        ...nextDraft,
        name: nextDraft.name.trimStart(),
      }),
    );
  }

  function updateDraft<K extends keyof CompanyDraft>(
    key: K,
    value: CompanyDraft[K],
  ) {
    setDraft((current) => {
      const updated = {
        ...current,
        [key]: value,
      };

      persistDraft(updated);
      return updated;
    });
  }

  function continueFromIdentity() {
    if (!draft.name.trim()) {
      alert("Enter your company name to continue.");
      return;
    }

    persistDraft({
      ...draft,
      name: draft.name.trim(),
    });

    setStep("plan");
  }

  async function handleCreateCompany() {
    const companyName = draft.name.trim();

    if (!companyName) {
      setStep("identity");
      alert("Enter your company name to continue.");
      return;
    }

    persistDraft({
      ...draft,
      name: companyName,
    });

    if (!isAuthenticated()) {
      window.location.href = "/signup?next=/create-company";
      return;
    }

    try {
      setLoading(true);
      setCreationStage(0);
      setStep("creating");

      await wait(450);
      setCreationStage(1);

      const response = await createCompany({
        name: companyName,
        plan_code: draft.planCode,
      });

      const companyId = response?.company?.id || response?.id;

      if (!companyId) {
        console.error("CREATE COMPANY RESPONSE:", response);
        throw new Error("The backend returned no company ID.");
      }

      setCreationStage(2);

      const workspace = saveActiveWorkspace({
        id: String(companyId),
        name: response?.company?.name || companyName,
        industry: draft.industry,
        jurisdiction: draft.jurisdiction,
        plan: selectedPlan.name,
        status: response?.company?.status || "draft",
        headquarters: null,
      });

      if (!workspace) {
        throw new Error(
          "The company was created, but its workspace could not be prepared.",
        );
      }

      await wait(550);
      setCreationStage(3);

      localStorage.removeItem(DRAFT_KEY);

      await wait(850);
      window.location.href = "/headquarters?onboarding=1";
    } catch (error) {
      console.error("CREATE COMPANY ERROR:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Firmic could not create the company.";

      alert(message);
      setStep("plan");
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f7f8] px-6 text-[#09233d]">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#0f8f91]/20 border-t-[#0f8f91]" />
          <p className="mt-5 font-bold">Preparing the Launch Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Launch your company | Firmic</title>
        <meta
          name="description"
          content="Create and configure your AI-native company with the Firmic Launch Engine."
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

            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 rounded-full border border-[#0f8f91]/15 bg-[#0f8f91]/5 px-4 py-2 text-xs font-black uppercase tracking-[0.13em] text-[#0f7779] sm:flex">
                <span className="h-2 w-2 rounded-full bg-[#0f8f91]" />
                Launch Engine
              </div>

              <Link
                href={authenticated ? "/companies" : "/login"}
                className="text-sm font-bold text-[#587286] transition hover:text-[#0f8f91]"
              >
                {authenticated ? "My companies" : "Sign in"}
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
          <LaunchProgress step={step} />

          <div
            key={step}
            className="mt-8 animate-[firmicEnter_420ms_ease-out]"
          >
            {step === "welcome" && (
              <WelcomeStep onContinue={() => setStep("identity")} />
            )}

            {step === "identity" && (
              <IdentityStep
                draft={draft}
                onChange={updateDraft}
                onBack={() => setStep("welcome")}
                onContinue={continueFromIdentity}
              />
            )}

            {step === "plan" && (
              <PlanStep
                draft={draft}
                selectedPlan={selectedPlan}
                authenticated={authenticated}
                loading={loading}
                onChange={updateDraft}
                onBack={() => setStep("identity")}
                onContinue={handleCreateCompany}
              />
            )}

            {step === "creating" && (
              <CreatingStep
                companyName={draft.name.trim()}
                plan={selectedPlan}
                stage={creationStage}
              />
            )}
          </div>
        </main>

        <style jsx global>{`
          @keyframes firmicEnter {
            from {
              opacity: 0;
              transform: translateY(18px) scale(0.992);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
      </div>
    </>
  );
}

function LaunchProgress({ step }: { step: LaunchStep }) {
  const progress = progressByStep[step];

  const label =
    step === "welcome"
      ? "Ready to begin"
      : step === "identity"
        ? "Creating company identity"
        : step === "plan"
          ? "Building your AI workforce"
          : "Initializing your company";

  return (
    <div className="rounded-[1.6rem] border border-[#09233d]/10 bg-white px-5 py-4 shadow-[0_14px_40px_rgba(9,35,61,0.05)] sm:px-6">
      <div className="flex items-center justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
            Firmic Company Launch
          </p>
          <p className="mt-1 text-sm font-bold text-[#698296]">
            {label}
          </p>
        </div>

        <p className="text-xl font-black">{progress}%</p>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#dce8eb]">
        <div
          className="h-full rounded-full bg-[#0f8f91] transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function WelcomeStep({
  onContinue,
}: {
  onContinue: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2.3rem] bg-[#09233d] px-6 py-10 text-white shadow-[0_30px_90px_rgba(9,35,61,0.22)] sm:px-10 sm:py-14 lg:px-16 lg:py-16">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#20b9b5]/20 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <div className="relative grid gap-12 lg:grid-cols-[minmax(0,1fr)_370px] lg:items-center">
        <div>
          <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#8de6e2]">
            Powered by Sonny AI COO
          </div>

          <h1 className="mt-7 max-w-3xl text-5xl font-black tracking-[-0.06em] sm:text-6xl lg:text-7xl">
            Build an AI-native company.
          </h1>

          <div className="mt-8 max-w-2xl space-y-4 text-lg leading-8 text-white/70">
            <p>Welcome. I&apos;m Sonny.</p>
            <p>
              I&apos;ll guide you through creating your company, choosing
              its operating capacity, reserving headquarters and assembling
              the infrastructure it needs.
            </p>
            <p>
              Your company will be created first. You will configure it,
              review it and activate it before entering the Command Center.
            </p>
          </div>

          <button
            type="button"
            onClick={onContinue}
            className="mt-10 inline-flex min-h-[58px] items-center justify-center rounded-2xl bg-[#20b9b5] px-8 py-4 text-base font-black text-[#09233d] shadow-[0_18px_40px_rgba(32,185,181,0.24)] transition hover:-translate-y-0.5 hover:bg-[#3acbc7]"
          >
            Begin Company Launch
            <span className="ml-3 text-xl">→</span>
          </button>
        </div>

        <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#20b9b5] text-lg font-black text-[#09233d]">
              S
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8de6e2]">
                Your AI COO
              </p>
              <p className="mt-1 text-xl font-black">Sonny</p>
              <p className="text-sm text-white/55">
                Coordinating your company launch
              </p>
            </div>
          </div>

          <div className="mt-7 space-y-3">
            <JourneyItem number="01" label="Create company" active />
            <JourneyItem number="02" label="Choose headquarters" />
            <JourneyItem number="03" label="Configure office" />
            <JourneyItem number="04" label="Build AI workforce" />
            <JourneyItem number="05" label="Add business tools" />
            <JourneyItem number="06" label="Review and activate" />
          </div>
        </div>
      </div>
    </section>
  );
}

function IdentityStep({
  draft,
  onChange,
  onBack,
  onContinue,
}: {
  draft: CompanyDraft;
  onChange: <K extends keyof CompanyDraft>(
    key: K,
    value: CompanyDraft[K],
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_350px]">
      <div className="rounded-[2rem] border border-[#09233d]/10 bg-white p-6 shadow-[0_24px_70px_rgba(9,35,61,0.08)] sm:p-9">
        <StepHeader
          eyebrow="Company Identity"
          title="Give your company an identity."
          description="This creates the foundation that Sonny and the Launch Engine will use throughout the rest of the journey."
        />

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

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Industry"
              description="Used to prepare your operating environment."
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
              description="Where the company will begin operating."
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
                <option value="UAE Mainland">
                  🇦🇪 UAE Mainland
                </option>
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
        </div>

        <NavigationButtons
          backLabel="Back to Sonny"
          continueLabel="Choose AI Workforce"
          continueDisabled={!draft.name.trim()}
          onBack={onBack}
          onContinue={onContinue}
        />
      </div>

      <SonnyPanel
        title="This is the company foundation."
        body="Next, choose the operating capacity of the company. That selection determines its AI workforce and monthly Firmic plan."
        next="Choose operating plan"
      />
    </section>
  );
}

function PlanStep({
  draft,
  selectedPlan,
  authenticated,
  loading,
  onChange,
  onBack,
  onContinue,
}: {
  draft: CompanyDraft;
  selectedPlan: PlanOption;
  authenticated: boolean;
  loading: boolean;
  onChange: <K extends keyof CompanyDraft>(
    key: K,
    value: CompanyDraft[K],
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <section>
      <div className="rounded-[2rem] border border-[#09233d]/10 bg-white p-6 shadow-[0_24px_70px_rgba(9,35,61,0.08)] sm:p-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <StepHeader
            eyebrow="AI Workforce"
            title="Choose your company’s operating capacity."
            description="You are not selecting generic software. You are deciding how large your AI organization will be when the company is activated."
          />

          <div className="shrink-0 rounded-2xl border border-[#0f8f91]/15 bg-[#0f8f91]/5 px-5 py-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f7779]">
              Selected
            </p>
            <p className="mt-1 font-black">
              {selectedPlan.name} · ${selectedPlan.price}/month
            </p>
          </div>
        </div>

        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const selected = draft.planCode === plan.code;

            return (
              <button
                key={plan.code}
                type="button"
                onClick={() => onChange("planCode", plan.code)}
                className={[
                  "relative flex h-full flex-col rounded-[1.8rem] border p-6 text-left transition",
                  selected
                    ? "border-[#0f8f91] bg-[#0f8f91]/5 shadow-[0_18px_50px_rgba(15,143,145,0.14)] ring-4 ring-[#0f8f91]/10"
                    : "border-[#09233d]/10 bg-[#f8fbfb] hover:-translate-y-1 hover:border-[#0f8f91]/40 hover:bg-white",
                ].join(" ")}
              >
                {plan.recommended && (
                  <span className="absolute -top-3 right-5 rounded-full bg-[#09233d] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.13em] text-white">
                    Recommended
                  </span>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-black">{plan.name}</p>
                    <p className="mt-2 text-sm font-black text-[#0f8f91]">
                      {plan.workforce}
                    </p>
                  </div>

                  <span
                    className={[
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                      selected
                        ? "border-[#0f8f91] bg-[#0f8f91]"
                        : "border-[#9bb0bc] bg-white",
                    ].join(" ")}
                  >
                    {selected && (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </span>
                </div>

                <div className="mt-7">
                  <span className="text-4xl font-black tracking-[-0.05em]">
                    ${plan.price}
                  </span>
                  <span className="ml-1 text-sm font-bold text-[#698296]">
                    /month
                  </span>
                </div>

                <p className="mt-5 min-h-[72px] text-sm leading-6 text-[#60798b]">
                  {plan.description}
                </p>

                <div className="mt-6 space-y-3 border-t border-[#09233d]/10 pt-5">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-2.5 text-sm font-bold text-[#405d72]"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0f8f91]/10 text-[11px] font-black text-[#0f8f91]">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-[1.7rem] bg-[#09233d] p-6 text-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8de6e2]">
                Create company
              </p>
              <h3 className="mt-2 text-2xl font-black">
                {draft.name.trim()} · {selectedPlan.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/60">
                The company will be created in draft status. Next, Sonny
                will take you to headquarters, office configuration,
                business tools and final activation checkout.
              </p>
            </div>

            <div className="shrink-0 text-left lg:text-right">
              <p className="text-3xl font-black">
                ${selectedPlan.price}
                <span className="text-sm text-white/55">/month</span>
              </p>
              <p className="mt-1 text-sm font-bold text-[#8de6e2]">
                {selectedPlan.workforce}
              </p>
            </div>
          </div>
        </div>

        <NavigationButtons
          backLabel="Edit company identity"
          continueLabel={
            loading
              ? "Creating Company..."
              : authenticated
                ? "Create Company"
                : "Continue to Account Creation"
          }
          continueDisabled={loading}
          onBack={onBack}
          onContinue={onContinue}
        />

        {!authenticated && (
          <p className="mt-4 text-center text-sm leading-6 text-[#698296]">
            Your company and selected plan remain saved while you create
            or sign in to your Firmic account.
          </p>
        )}
      </div>
    </section>
  );
}

function CreatingStep({
  companyName,
  plan,
  stage,
}: {
  companyName: string;
  plan: PlanOption;
  stage: number;
}) {
  const stages = [
    "Creating company record",
    "Initializing Launch Engine",
    "Preparing company workspace",
    "Company created — opening headquarters",
  ];

  return (
    <section className="relative overflow-hidden rounded-[2.3rem] bg-[#09233d] px-6 py-14 text-white shadow-[0_30px_90px_rgba(9,35,61,0.22)] sm:px-10 lg:px-16 lg:py-20">
      <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[#20b9b5]/20 blur-3xl" />

      <div className="relative mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-[#20b9b5] text-3xl font-black text-[#09233d] shadow-[0_20px_50px_rgba(32,185,181,0.25)]">
          {stage >= 3 ? "✓" : "F"}
        </div>

        <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-[#8de6e2]">
          Firmic Launch Engine
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
          {stage >= 3
            ? `${companyName} has been created.`
            : `Creating ${companyName}.`}
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/65">
          {stage >= 3
            ? "The company now exists in draft status. Sonny is moving you into headquarters configuration before office, business tools and activation checkout."
            : "Sonny is preparing the foundation of your AI-native company. Platform access remains locked until the configuration journey and checkout are complete."}
        </p>

        <div className="mx-auto mt-9 max-w-xl rounded-[1.8rem] border border-white/12 bg-white/8 p-6 text-left backdrop-blur-xl">
          <div className="flex items-center justify-between gap-5 border-b border-white/10 pb-5">
            <div>
              <p className="text-sm font-black">{companyName}</p>
              <p className="mt-1 text-sm text-white/50">
                {plan.name} · {plan.workforce}
              </p>
            </div>

            <p className="font-black text-[#8de6e2]">
              ${plan.price}/month
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {stages.map((label, index) => {
              const complete = stage > index;
              const active = stage === index;

              return (
                <div
                  key={label}
                  className="flex items-center gap-3"
                >
                  <span
                    className={[
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black",
                      complete
                        ? "bg-[#20b9b5] text-[#09233d]"
                        : active
                          ? "border border-[#20b9b5] bg-[#20b9b5]/10 text-[#8de6e2]"
                          : "border border-white/15 bg-white/5 text-white/30",
                    ].join(" ")}
                  >
                    {complete ? "✓" : index + 1}
                  </span>

                  <p
                    className={[
                      "text-sm font-bold",
                      complete || active
                        ? "text-white"
                        : "text-white/35",
                    ].join(" ")}
                  >
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mx-auto mt-8 h-2 max-w-xl overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#20b9b5] transition-all duration-500"
            style={{ width: `${Math.min(100, (stage + 1) * 25)}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function StepHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.17em] text-[#0f8f91]">
        {eyebrow}
      </p>
      <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-[#60798b]">
        {description}
      </p>
    </div>
  );
}

function SonnyPanel({
  title,
  body,
  next,
}: {
  title: string;
  body: string;
  next: string;
}) {
  return (
    <aside className="space-y-5">
      <div className="rounded-[2rem] bg-[#09233d] p-7 text-white shadow-[0_24px_70px_rgba(9,35,61,0.16)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#20b9b5] font-black text-[#09233d]">
          S
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[#8de6e2]">
          Sonny says
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-[-0.03em]">
          {title}
        </h2>
        <p className="mt-4 text-sm leading-7 text-white/65">
          {body}
        </p>
      </div>

      <div className="rounded-[2rem] border border-[#09233d]/10 bg-white p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
          Next transition
        </p>
        <h3 className="mt-3 text-xl font-black">{next}</h3>
        <p className="mt-3 text-sm leading-6 text-[#698296]">
          Each stage remains focused on one company-building decision.
        </p>
      </div>
    </aside>
  );
}

function JourneyItem({
  number,
  label,
  active = false,
}: {
  number: string;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center gap-4 rounded-2xl border px-4 py-3",
        active
          ? "border-[#20b9b5]/40 bg-[#20b9b5]/10"
          : "border-white/10 bg-white/5",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black",
          active
            ? "bg-[#20b9b5] text-[#09233d]"
            : "bg-white/10 text-white/45",
        ].join(" ")}
      >
        {number}
      </span>
      <p
        className={[
          "text-sm font-bold",
          active ? "text-white" : "text-white/50",
        ].join(" ")}
      >
        {label}
      </p>
    </div>
  );
}

function NavigationButtons({
  backLabel,
  continueLabel,
  continueDisabled = false,
  onBack,
  onContinue,
}: {
  backLabel: string;
  continueLabel: string;
  continueDisabled?: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={onBack}
        className="min-h-[54px] rounded-2xl border border-[#09233d]/12 bg-white px-6 py-3 text-sm font-black text-[#587286] transition hover:border-[#0f8f91]/35 hover:text-[#0f8f91]"
      >
        ← {backLabel}
      </button>

      <button
        type="button"
        onClick={onContinue}
        disabled={continueDisabled}
        className="inline-flex min-h-[56px] items-center justify-center rounded-2xl bg-[#09233d] px-7 py-4 text-base font-black text-white shadow-[0_18px_40px_rgba(9,35,61,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0f8f91] disabled:cursor-not-allowed disabled:bg-[#b7c5cb] disabled:shadow-none"
      >
        {continueLabel}
        {!continueLabel.includes("...") && (
          <span className="ml-3 text-xl">→</span>
        )}
      </button>
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

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

const inputClassName =
  "w-full rounded-2xl border border-[#09233d]/15 bg-[#f8fbfb] px-5 py-4 text-[#09233d] outline-none transition placeholder:text-[#8aa0af] focus:border-[#0f8f91] focus:bg-white focus:ring-4 focus:ring-[#0f8f91]/10";
