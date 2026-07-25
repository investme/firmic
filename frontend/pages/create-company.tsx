import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createCompany,
  isAuthenticated,
} from "../services/companyApi";
import { saveActiveWorkspace } from "../src/utils/workspaceContext";

type CompanyDraft = {
  name: string;
  industry: string;
  jurisdiction: string;
  plan: string;
};

const DRAFT_KEY = "firmic_company_draft";

const defaultDraft: CompanyDraft = {
  name: "",
  industry: "Technology",
  jurisdiction: "Abu Dhabi",
  plan: "Premium",
};

export default function CreateCompany() {
  const [draft, setDraft] = useState<CompanyDraft>(defaultDraft);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(isAuthenticated());

    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY);

      if (savedDraft) {
        const parsed = JSON.parse(savedDraft) as Partial<CompanyDraft>;

        setDraft({
          ...defaultDraft,
          ...parsed,
        });
      }
    } catch (error) {
      console.warn("Could not restore company draft:", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  function updateDraft<K extends keyof CompanyDraft>(
    key: K,
    value: CompanyDraft[K]
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function saveDraft() {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        ...draft,
        name: draft.name.trim(),
      })
    );
  }

  async function handleSubmit() {
    const companyName = draft.name.trim();

    if (!companyName) {
      alert("Company name is required.");
      return;
    }

    saveDraft();

    if (!isAuthenticated()) {
      window.location.href = "/signup?next=/create-company";
      return;
    }

    try {
      setLoading(true);

      const response = await createCompany({
        name: companyName,
      });

      const companyId = response?.company?.id || response?.id;

      if (!companyId) {
        console.error("CREATE COMPANY RESPONSE:", response);
        throw new Error("The backend returned no company ID.");
      }

      const workspace = saveActiveWorkspace({
        id: String(companyId),
        name: response?.company?.name || companyName,
        industry: draft.industry,
        jurisdiction: draft.jurisdiction,
        plan: draft.plan,
        status: response?.company?.status || "initiated",
        headquarters: null,
      });

      if (!workspace) {
        throw new Error(
          "The company was created, but its workspace could not be activated."
        );
      }

      localStorage.removeItem(DRAFT_KEY);
      window.location.href = "/headquarters?onboarding=1";
    } catch (error) {
      console.error("CREATE COMPANY ERROR:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Failed to create company.";

      alert(message);
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f8] text-[#09233d]">
        <p className="font-bold">Preparing company setup...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Create your company | Firmic</title>
        <meta
          name="description"
          content="Create your Firmic company workspace in Abu Dhabi."
        />
      </Head>

      <div className="min-h-screen bg-[#f4f7f8] text-[#09233d]">
        <header className="border-b border-[#09233d]/10 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
            <Link
              href="/"
              className="text-xl font-black tracking-[0.14em] text-[#09233d]"
            >
              FIRMIC
            </Link>

            <Link
              href="/headquarters"
              className="text-sm font-bold text-[#49677d] transition hover:text-[#0f8f91]"
            >
              Back to headquarters
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-12 lg:py-20">
          <div className="mb-10">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f8f91]">
                Company setup
              </p>
              <p className="text-sm font-bold text-[#698296]">
                Step 2 of 3
              </p>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#dce8eb]">
              <div className="h-full w-2/3 rounded-full bg-[#0f8f91]" />
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <section className="rounded-[2rem] border border-[#09233d]/10 bg-white p-6 shadow-[0_20px_60px_rgba(9,35,61,0.08)] sm:p-9">
              <div>
                <h1 className="text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                  Build your company profile.
                </h1>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-[#587286]">
                  Tell Firmic about the company you are launching. Your details
                  are saved before account creation, so you will not lose your
                  progress.
                </p>
              </div>

              <div className="mt-9 space-y-6">
                <Field label="Company name">
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      updateDraft("name", event.target.value)
                    }
                    placeholder="Example: C50 Labs"
                    autoComplete="organization"
                    className="w-full rounded-2xl border border-[#09233d]/15 bg-[#f8fbfb] px-5 py-4 text-[#09233d] outline-none transition placeholder:text-[#8aa0af] focus:border-[#0f8f91] focus:ring-4 focus:ring-[#0f8f91]/10"
                  />
                </Field>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Industry">
                    <select
                      value={draft.industry}
                      onChange={(event) =>
                        updateDraft("industry", event.target.value)
                      }
                      className="w-full rounded-2xl border border-[#09233d]/15 bg-[#f8fbfb] px-5 py-4 outline-none transition focus:border-[#0f8f91] focus:ring-4 focus:ring-[#0f8f91]/10"
                    >
                      <option>Technology</option>
                      <option>AI</option>
                      <option>Fintech</option>
                      <option>Consulting</option>
                      <option>Real Estate</option>
                      <option>E-commerce</option>
                      <option>Other</option>
                    </select>
                  </Field>

                  <Field label="Plan">
                    <select
                      value={draft.plan}
                      onChange={(event) =>
                        updateDraft("plan", event.target.value)
                      }
                      className="w-full rounded-2xl border border-[#09233d]/15 bg-[#f8fbfb] px-5 py-4 outline-none transition focus:border-[#0f8f91] focus:ring-4 focus:ring-[#0f8f91]/10"
                    >
                      <option>Starter</option>
                      <option>Premium</option>
                      <option>Enterprise</option>
                    </select>
                  </Field>
                </div>

                <Field label="Jurisdiction">
                  <select
                    value={draft.jurisdiction}
                    onChange={(event) =>
                      updateDraft("jurisdiction", event.target.value)
                    }
                    className="w-full rounded-2xl border border-[#09233d]/15 bg-[#f8fbfb] px-5 py-4 outline-none transition focus:border-[#0f8f91] focus:ring-4 focus:ring-[#0f8f91]/10"
                  >
                    <option value="Abu Dhabi">🇦🇪 Abu Dhabi</option>
                    <option value="Dubai">🇦🇪 Dubai</option>
                    <option value="Ras Al Khaimah">
                      🇦🇪 Ras Al Khaimah
                    </option>
                    <option value="UAE Mainland">🇦🇪 UAE Mainland</option>
                    <option value="Qatar">🇶🇦 Qatar</option>
                    <option value="Saudi Arabia" disabled>
                      🇸🇦 Saudi Arabia (Coming Soon)
                    </option>
                    <option value="Bahrain" disabled>
                      🇧🇭 Bahrain (Coming Soon)
                    </option>
                    <option value="Oman" disabled>
                      🇴🇲 Oman (Coming Soon)
                    </option>
                    <option value="Singapore" disabled>
                      🇸🇬 Singapore (Coming Soon)
                    </option>
                    <option value="United Kingdom" disabled>
                      🇬🇧 United Kingdom (Coming Soon)
                    </option>
                    <option value="United States" disabled>
                      🇺🇸 United States (Coming Soon)
                    </option>
                  </select>
                </Field>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !draft.name.trim()}
                  className="w-full rounded-full bg-[#09233d] px-8 py-4 font-black text-white shadow-[0_16px_36px_rgba(9,35,61,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0f8f91] disabled:cursor-not-allowed disabled:bg-[#b8c7cd] disabled:shadow-none"
                >
                  {loading
                    ? "Creating your workspace..."
                    : authenticated
                      ? "Create company workspace"
                      : "Continue to account creation"}
                </button>

                {!authenticated && (
                  <p className="text-center text-sm leading-6 text-[#698296]">
                    Your company information will be saved securely in this
                    browser before you create your account.
                  </p>
                )}
              </div>
            </section>

            <aside className="space-y-5">
              <div className="rounded-[2rem] bg-[#09233d] p-7 text-white shadow-[0_20px_60px_rgba(9,35,61,0.16)]">
                <p className="text-xs font-black uppercase tracking-[0.17em] text-[#76d5d1]">
                  Firmic launch stack
                </p>
                <h2 className="mt-4 text-2xl font-black">
                  One workspace for the company you are building.
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/65">
                  Your headquarters, AI workforce, communications, customers,
                  documents, and operating intelligence connect through Firmic.
                </p>

                <div className="mt-7 grid grid-cols-2 gap-3">
                  <Mini title="Headquarters" value="Ready" />
                  <Mini title="Sonny AI COO" value="Included" />
                  <Mini title="Compliance" value="Connected" />
                  <Mini title="Reports" value="Enabled" />
                </div>
              </div>

              <div className="rounded-[2rem] border border-[#09233d]/10 bg-white p-7">
                <h2 className="text-xl font-black">What happens next</h2>
                <div className="mt-5 space-y-3">
                  <Step text="Your company draft is saved" />
                  <Step
                    text={
                      authenticated
                        ? "Your workspace is created"
                        : "You create or sign in to your account"
                    }
                  />
                  <Step text="Firmic activates the company workspace" />
                  <Step text="You enter the Company Control Center" />
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-[#23455e]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Mini({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/8 p-4">
      <p className="text-xs text-white/55">{title}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}

function Step({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-[#09233d]/8 bg-[#f4f7f8] p-4 text-sm font-bold text-[#31526c]">
      {text}
    </div>
  );
}
