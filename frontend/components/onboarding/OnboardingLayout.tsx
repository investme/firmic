import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { createCompany } from "../../services/companyApi";
import {
  getSubscriptionPlans,
  previewSubscription,
  type SubscriptionPlan,
  type SubscriptionPreview,
} from "../../services/subscriptionApi";
import { type FirmicPlanCode } from "../../src/config/planUi";
import { getCompanies } from "../../services/companyApi";
import {
  saveActiveWorkspace,
  type FirmicWorkspace,
} from "../../src/utils/workspaceContext";

import CompanyInformation, {
  type CompanyInformationData,
} from "./CompanyInformation";
import PlanSelector from "./PlanSelector";
import ProgressStepper from "./ProgressStepper";
import ProvisioningScreen from "./ProvisioningScreen";

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

type CreatedCompany = {
  id: string;
  name: string;
  status?: string;
  plan?: string;
  jurisdiction?: string;
  industry?: string;
  headquarters?: FirmicWorkspace["headquarters"];
};

const COMPANY_CREATE_STEPS = {
  plan: 1,
  company: 2,
  review: 3,
  provisioning: 4,
  welcome: 5,
  sonny: 6,
} as const;

export default function OnboardingLayout() {
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>(COMPANY_CREATE_STEPS.plan);

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<FirmicPlanCode | null>(null);

  const [company, setCompany] = useState<CompanyInformationData>({
    name: "",
    industry: "Technology",
    country: "United Arab Emirates",
    jurisdiction: "Abu Dhabi",
  });

  const [preview, setPreview] = useState<SubscriptionPreview | null>(null);

  const [createdCompany, setCreatedCompany] = useState<CreatedCompany | null>(
    null,
  );

  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activatingWorkspace, setActivatingWorkspace] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadPlans();
  }, []);

  async function loadPlans() {
    try {
      setLoadingPlans(true);
      setError("");

      const result = await getSubscriptionPlans();

      setPlans(result);

      const business = result.find((plan) => plan.code === "PLAN_BUSINESS");

      if (business) {
        setSelectedPlan("PLAN_BUSINESS");
        return;
      }

      if (result[0]) {
        setSelectedPlan(result[0].code as FirmicPlanCode);
      }
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to load Firmic plans.",
      );
    } finally {
      setLoadingPlans(false);
    }
  }

  function goToCompanyInformation() {
    if (!selectedPlan) {
      setError("Choose a Firmic plan first.");
      return;
    }

    setError("");
    setStep(COMPANY_CREATE_STEPS.company);
  }

  async function goToReview() {
    if (!selectedPlan) {
      setError("Choose a Firmic plan first.");
      return;
    }

    if (!company.name.trim()) {
      setError("Company name is required.");
      return;
    }

    if (!company.industry.trim()) {
      setError("Industry is required.");
      return;
    }

    if (!company.country.trim()) {
      setError("Country is required.");
      return;
    }

    if (!company.jurisdiction.trim()) {
      setError("Jurisdiction is required.");
      return;
    }

    try {
      setLoadingPreview(true);
      setError("");

      const result = await previewSubscription({
        plan_code: selectedPlan,
      });

      setPreview(result);
      setStep(COMPANY_CREATE_STEPS.review);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to prepare subscription preview.",
      );
    } finally {
      setLoadingPreview(false);
    }
  }

  async function submitCompany() {
    if (!selectedPlan) {
      setError("Choose a Firmic plan first.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response = await createCompany({
        name: company.name.trim(),
        plan_code: selectedPlan,
      });

      const returnedCompany = response?.company || response || null;

      const companyId = returnedCompany?.id || response?.company_id || null;

      if (!companyId) {
        throw new Error(
          "Firmic created the company but did not return its workspace ID.",
        );
      }

      setCreatedCompany({
        id: String(companyId),
        name: returnedCompany?.name || company.name.trim(),
        status: returnedCompany?.status,
        plan: response?.subscription?.plan || selectedPlan,
        jurisdiction: returnedCompany?.jurisdiction || company.jurisdiction,
        industry: returnedCompany?.industry || company.industry,
        headquarters: returnedCompany?.headquarters,
      });

      setStep(COMPANY_CREATE_STEPS.provisioning);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to create company.",
      );
    } finally {
      setCreating(false);
    }
  }

  const activateCreatedWorkspace = useCallback(async () => {
    if (!createdCompany) {
      throw new Error("The new company workspace could not be identified.");
    }

    try {
      setActivatingWorkspace(true);
      setError("");

      const companiesResponse = await getCompanies();

      const companies = Array.isArray(companiesResponse)
        ? companiesResponse
        : Array.isArray(companiesResponse?.companies)
          ? companiesResponse.companies
          : [];

      const refreshedCompany =
        companies.find(
          (candidate: any) =>
            String(candidate.id) === String(createdCompany.id),
        ) || createdCompany;

      const workspace: FirmicWorkspace = {
        id: String(refreshedCompany.id),
        name: refreshedCompany.name || createdCompany.name,
        plan:
          refreshedCompany.plan ||
          createdCompany.plan ||
          selectedPlan ||
          "PLAN_STARTER",
        jurisdiction:
          refreshedCompany.jurisdiction ||
          createdCompany.jurisdiction ||
          company.jurisdiction,
        industry:
          refreshedCompany.industry ||
          createdCompany.industry ||
          company.industry,
        headquarters:
          refreshedCompany.headquarters || createdCompany.headquarters,
      };

      const savedWorkspace = saveActiveWorkspace(workspace);

      if (!savedWorkspace) {
        throw new Error(
          "The company was created, but Firmic could not activate its workspace.",
        );
      }
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The company was created, but its workspace could not be activated.",
      );

      throw caughtError;
    } finally {
      setActivatingWorkspace(false);
    }
  }, [company.industry, company.jurisdiction, createdCompany, selectedPlan]);

  const completeProvisioning = useCallback(async () => {
    try {
      await activateCreatedWorkspace();
      setStep(COMPANY_CREATE_STEPS.welcome);
    } catch {
      // The error state is set inside activateCreatedWorkspace.
    }
  }, [activateCreatedWorkspace]);

  function goToSonnyIntroduction() {
    setError("");
    setStep(COMPANY_CREATE_STEPS.sonny);
  }

  async function openCommandCenter() {
    try {
      setError("");

      if (!createdCompany) {
        throw new Error("The company workspace is unavailable.");
      }

      await activateCreatedWorkspace();
      await router.push("/dashboard");
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to open the Command Center.",
      );
    }
  }

  function goBack() {
    setError("");

    setStep((currentStep) => {
      if (currentStep <= COMPANY_CREATE_STEPS.plan) {
        return COMPANY_CREATE_STEPS.plan;
      }

      if (currentStep >= COMPANY_CREATE_STEPS.provisioning) {
        return currentStep;
      }

      return (currentStep - 1) as WizardStep;
    });
  }

  const selectedPlanDetails = useMemo(
    () => plans.find((plan) => plan.code === selectedPlan) || null,
    [plans, selectedPlan],
  );

  const planAILimit = selectedPlanDetails?.max_ai_employees ?? 0;

  const normalWizardStep = Math.min(step, 3);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="text-center">
          <p className="text-sm font-bold text-violet-700">Firmic</p>

          <h1 className="mt-2 text-4xl font-bold text-slate-950">
            Launch your AI-native company.
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-slate-500">
            Choose your plan, create your company, and let Firmic provision your
            operating workspace.
          </p>
        </header>

        {step <= COMPANY_CREATE_STEPS.review && (
          <div className="mt-8">
            <ProgressStepper currentStep={normalWizardStep} />
          </div>
        )}

        {error && (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <main className="mt-10">
          {step === COMPANY_CREATE_STEPS.plan && (
            <PlanSelector
              plans={plans}
              selectedPlan={selectedPlan}
              loading={loadingPlans}
              onSelect={(planCode) => {
                setSelectedPlan(planCode);
                setPreview(null);
                setError("");
              }}
            />
          )}

          {step === COMPANY_CREATE_STEPS.company && (
            <div className="mx-auto max-w-4xl">
              <CompanyInformation
                value={company}
                onChange={(nextCompany) => {
                  setCompany(nextCompany);
                  setPreview(null);
                  setError("");
                }}
              />
            </div>
          )}

          {step === COMPANY_CREATE_STEPS.review &&
            preview &&
            selectedPlanDetails && (
              <ReviewSection
                company={company}
                plan={selectedPlanDetails}
                preview={preview}
                aiLimit={planAILimit}
              />
            )}

          {step === COMPANY_CREATE_STEPS.provisioning && createdCompany && (
            <ProvisioningScreen
              companyName={createdCompany.name}
              onComplete={completeProvisioning}
            />
          )}

          {step === COMPANY_CREATE_STEPS.welcome && createdCompany && (
            <WelcomeSection
              companyName={createdCompany.name}
              selectedPlanName={
                selectedPlanDetails?.name ||
                createdCompany.plan ||
                "Firmic Plan"
              }
              onContinue={goToSonnyIntroduction}
            />
          )}

          {step === COMPANY_CREATE_STEPS.sonny && createdCompany && (
            <SonnyIntroduction
              companyName={createdCompany.name}
              loading={activatingWorkspace}
              onOpenCommandCenter={() => void openCommandCenter()}
            />
          )}
        </main>

        {step <= COMPANY_CREATE_STEPS.review && (
          <footer className="mx-auto mt-8 flex max-w-4xl items-center justify-between gap-4">
            <button
              type="button"
              onClick={goBack}
              disabled={
                step === COMPANY_CREATE_STEPS.plan || creating || loadingPreview
              }
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>

            {step === COMPANY_CREATE_STEPS.plan && (
              <button
                type="button"
                onClick={goToCompanyInformation}
                disabled={!selectedPlan || loadingPlans}
                className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            )}

            {step === COMPANY_CREATE_STEPS.company && (
              <button
                type="button"
                onClick={() => void goToReview()}
                disabled={loadingPreview}
                className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingPreview ? "Preparing..." : "Review Subscription"}
              </button>
            )}

            {step === COMPANY_CREATE_STEPS.review && (
              <button
                type="button"
                onClick={() => void submitCompany()}
                disabled={creating}
                className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Launching Company..." : "Launch My Company"}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}

function ReviewSection({
  company,
  plan,
  preview,
  aiLimit,
}: {
  company: CompanyInformationData;
  plan: SubscriptionPlan;
  preview: SubscriptionPreview;
  aiLimit: number;
}) {
  return (
    <section className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px]">
        <div className="p-6 lg:p-8">
          <p className="text-sm font-bold text-violet-700">
            Review Your Company Launch
          </p>

          <h2 className="mt-2 text-3xl font-bold text-slate-950">
            {company.name}
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Review your company details and Firmic subscription before launching
            your workspace.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Summary label="Company" value={company.name} />
            <Summary label="Industry" value={company.industry} />
            <Summary label="Country" value={company.country} />
            <Summary label="Jurisdiction" value={company.jurisdiction} />
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                  Selected Plan
                </p>

                <h3 className="mt-2 text-2xl font-bold text-slate-950">
                  {plan.name}
                </h3>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  {plan.description}
                </p>
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <p className="text-3xl font-bold text-slate-950">
                  ${Number(plan.monthly_price).toFixed(0)}
                </p>
                <p className="text-sm font-medium text-slate-500">per month</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ReadyItem
                label={
                  aiLimit === 0
                    ? "Unlimited AI employees"
                    : `${aiLimit} AI employees included`
                }
              />

              <ReadyItem label={`${plan.max_users} workspace users`} />

              <ReadyItem label="Sonny AI COO and Orchestrator" />
              <ReadyItem label="Firmic business infrastructure" />
            </div>
          </div>

          {preview.items.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-slate-950">
                Selected Business Services
              </h3>

              <div className="mt-4 space-y-3">
                {preview.items.map((item) => (
                  <div
                    key={item.service_code}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-bold text-slate-950">
                        {item.service_name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Quantity {item.quantity}
                      </p>
                    </div>

                    <p className="font-bold text-slate-900">
                      {item.included_by_plan
                        ? "Included"
                        : `$${item.monthly_price.toFixed(2)}/month`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-violet-200 bg-violet-50 p-6 xl:border-l xl:border-t-0 lg:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
            Pricing Summary
          </p>

          <div className="mt-6 space-y-4">
            <PriceRow label="Plan" value={preview.plan_monthly_price} />

            <PriceRow
              label="Monthly subtotal"
              value={preview.monthly_subtotal}
            />

            <PriceRow label="Tax" value={preview.tax_total} />

            <div className="border-t border-violet-200 pt-4">
              <PriceRow
                label="Monthly total"
                value={preview.monthly_total}
                strong
              />
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-violet-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              One-Time Company Launch Fee
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-950">
              ${preview.launch_activation_fee.toFixed(2)}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Covers workspace initialization, subscription activation, and
              business service provisioning.
            </p>
          </div>

          <div className="mt-6 rounded-2xl bg-violet-600 p-5 text-white">
            <p className="text-sm font-bold text-violet-100">Due Today</p>

            <p className="mt-1 text-4xl font-bold">
              ${preview.due_today.toFixed(2)}
            </p>

            <p className="mt-2 text-sm text-violet-100">
              Monthly subscription plus the one-time company launch fee.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function WelcomeSection({
  companyName,
  selectedPlanName,
  onContinue,
}: {
  companyName: string;
  selectedPlanName: string;
  onContinue: () => void;
}) {
  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-violet-200 bg-white p-8 text-center shadow-sm lg:p-12">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-4xl">
        ✓
      </div>

      <p className="mt-7 text-sm font-bold text-violet-700">Company Ready</p>

      <h2 className="mt-2 text-4xl font-bold text-slate-950">
        Welcome to Firmic.
      </h2>

      <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">
        {companyName} has been launched successfully. Your {selectedPlanName}{" "}
        subscription is active, your business services are assigned, and your
        workspace is ready.
      </p>

      <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
        <ReadyItem label="Company workspace created" />
        <ReadyItem label="Subscription activated" />
        <ReadyItem label="Business services assigned" />
        <ReadyItem label="Launch Center initialized" />
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-10 rounded-xl bg-violet-600 px-7 py-3.5 font-bold text-white transition hover:bg-violet-700"
      >
        Meet Sonny
      </button>
    </section>
  );
}

function SonnyIntroduction({
  companyName,
  loading,
  onOpenCommandCenter,
}: {
  companyName: string;
  loading: boolean;
  onOpenCommandCenter: () => void;
}) {
  return (
    <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-violet-700 to-indigo-700 p-8 text-white lg:p-12">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-5xl shadow-lg">
            👔
          </div>

          <p className="mt-7 text-sm font-bold text-violet-200">Sonny AI COO</p>

          <h2 className="mt-2 text-4xl font-bold">
            Your Orchestrator is ready.
          </h2>

          <p className="mt-5 max-w-xl leading-8 text-violet-100">
            Hello. I’m Sonny, your AI COO and Orchestrator. I’ll coordinate your
            AI workforce, organize company priorities, and help keep{" "}
            {companyName} operating efficiently.
          </p>
        </div>
      </div>

      <div className="p-8 lg:p-10">
        <p className="text-sm font-bold text-violet-700">
          What I’ll orchestrate
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <OrchestrationItem label="Company priorities and workflows" />
          <OrchestrationItem label="AI workforce coordination" />
          <OrchestrationItem label="Cross-department recommendations" />
          <OrchestrationItem label="Executive company briefings" />
        </div>

        <button
          type="button"
          onClick={onOpenCommandCenter}
          disabled={loading}
          className="mt-8 w-full rounded-xl bg-violet-600 px-6 py-3.5 font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Opening Command Center..." : "Open Command Center"}
        </button>
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  );
}

function PriceRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p
        className={
          strong ? "font-bold text-violet-950" : "text-sm text-violet-800"
        }
      >
        {label}
      </p>

      <p
        className={
          strong
            ? "text-xl font-bold text-violet-950"
            : "font-bold text-violet-950"
        }
      >
        ${Number(value || 0).toFixed(2)}
      </p>
    </div>
  );
}

function ReadyItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
        ✓
      </span>

      <p className="font-bold text-emerald-900">{label}</p>
    </div>
  );
}

function OrchestrationItem({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="mt-0.5 text-violet-600">◆</span>

      <p className="font-bold text-slate-800">{label}</p>
    </div>
  );
}
