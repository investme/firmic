import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import ProtectedRoute from "../components/ProtectedRoute";

import {
  getCompanyDocuments,
} from "../services/documentApi";

import {
  getActiveWorkspace,
  type FirmicWorkspace,
} from "../src/utils/workspaceContext";

import {
  speakHermesReview,
} from "../src/utils/firmicVoice";

type DocumentRecord = {
  id: string;
  name: string;
  type: string;
  status: string;
  uploaded_at?: string;
};

type ComplianceState = {
  status?: string;
  subscription_completed?: boolean;
  admin_approved?: boolean;
  infrastructure_provisioned?: boolean;
  company_access_locked?: boolean;
  next_step?: string;
  updated_at?: string;
};

const REQUIRED_DOCUMENT_KEYS = [
  "passport",
  "proof_of_address",
  "trade_license",
  "incorporation_documents",
  "beneficial_owner",
  "kyc_questionnaire",
];

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeStatus(value?: string) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export default function ComplianceReviewPage() {
  const router = useRouter();

  const [workspace, setWorkspace] =
    useState<FirmicWorkspace | null>(null);

  const [documents, setDocuments] =
    useState<DocumentRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [voiceEnabled, setVoiceEnabled] =
    useState(true);
  const [speaking, setSpeaking] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const currentWorkspace = getActiveWorkspace();

    if (!currentWorkspace?.id) {
      void router.replace(
        "/login?next=/compliance-review",
      );
      return;
    }

    setWorkspace(currentWorkspace);

    const compliance = readJson<ComplianceState>(
      `firmic_compliance_status:${currentWorkspace.id}`,
    );

    if (
      compliance?.admin_approved === true &&
      compliance?.infrastructure_provisioned === true &&
      compliance?.status === "active"
    ) {
      void router.replace("/launch");
      return;
    }

    writeJson(
      `firmic_compliance_status:${currentWorkspace.id}`,
      {
        ...compliance,
        status: "under_review",
        subscription_completed: true,
        admin_approved: false,
        infrastructure_provisioned: false,
        company_access_locked: true,
        next_step: "firmic_admin_review",
        updated_at: new Date().toISOString(),
      },
    );

    void loadDocuments(currentWorkspace.id);
  }, [router]);

  useEffect(() => {
    if (
      !workspace?.name ||
      !voiceEnabled
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      void speakHermesReview(
        workspace.name,
        {
          onStart: () =>
            setSpeaking(true),
          onEnd: () =>
            setSpeaking(false),
        },
      );
    }, 700);

    return () => {
      window.clearTimeout(timer);
      window.speechSynthesis?.cancel();
    };
  }, [voiceEnabled, workspace?.name]);

  async function loadDocuments(companyId: string) {
    try {
      setLoading(true);
      setError("");

      const result =
        await getCompanyDocuments(companyId);

      setDocuments(
        Array.isArray(result) ? result : [],
      );
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load submitted documents.",
      );
    } finally {
      setLoading(false);
    }
  }

  const submittedDocuments = useMemo(
    () =>
      documents.filter((document) =>
        [
          "uploaded",
          "pending",
          "under_review",
          "approved",
          "verified",
          "rejected",
        ].includes(
          normalizeStatus(document.status),
        ),
      ),
    [documents],
  );

  const reviewCount = submittedDocuments.filter(
    (document) =>
      [
        "uploaded",
        "pending",
        "under_review",
      ].includes(
        normalizeStatus(document.status),
      ),
  ).length;

  const approvedCount = submittedDocuments.filter(
    (document) =>
      ["approved", "verified"].includes(
        normalizeStatus(document.status),
      ),
  ).length;

  const rejectedCount = submittedDocuments.filter(
    (document) =>
      normalizeStatus(document.status) ===
      "rejected",
  ).length;

  const companyName =
    workspace?.name || "your company";

  function replayVoice() {
    if (!workspace?.name) {
      return;
    }

    void speakHermesReview(
      workspace.name,
      {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
      },
    );
  }

  function signOut() {
    localStorage.removeItem("firmic_token");
    localStorage.removeItem("firmic_user");
    window.speechSynthesis?.cancel();
    window.location.href = "/login";
  }

  return (
    <ProtectedRoute>
      <Head>
        <title>
          Compliance Review | Firmic
        </title>

        <meta
          name="description"
          content="Track Firmic compliance verification before company platform access is activated."
        />
      </Head>

      <div className="min-h-screen bg-[#f3f7f8] px-5 py-6 text-[#09233d] sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xl font-black tracking-[0.16em]">
              FIRMIC
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  if (voiceEnabled) {
                    window.speechSynthesis?.cancel();
                    setSpeaking(false);
                  }

                  setVoiceEnabled(
                    (current) => !current,
                  );
                }}
                className="rounded-full border border-[#09233d]/10 bg-white px-4 py-2 text-xs font-black text-[#49677d]"
              >
                {voiceEnabled
                  ? "🔊 Voice On"
                  : "🔇 Voice Off"}
              </button>

              <button
                type="button"
                onClick={replayVoice}
                disabled={!voiceEnabled}
                className="rounded-full border border-[#09233d]/10 bg-white px-4 py-2 text-xs font-black text-[#49677d] disabled:opacity-40"
              >
                {speaking
                  ? "Hermes is speaking..."
                  : "Replay Hermes"}
              </button>

              <button
                type="button"
                onClick={signOut}
                className="rounded-full border border-[#09233d]/10 bg-white px-4 py-2 text-xs font-black text-[#49677d]"
              >
                Sign Out
              </button>
            </div>
          </header>

          <main className="mt-7 space-y-7">
            <section className="relative overflow-hidden rounded-[2.3rem] bg-[#09233d] px-6 py-10 text-white shadow-[0_30px_90px_rgba(9,35,61,0.22)] sm:px-10 lg:px-14 lg:py-14">
              <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-500/25 blur-3xl" />

              <div className="relative grid gap-9 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
                <div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-violet-500 text-2xl font-black">
                    H
                  </div>

                  <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                    Hermes · Compliance Review
                  </p>

                  <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                    Your company platform is securely locked.
                  </h1>

                  <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">
                    I have received the compliance package for{" "}
                    <strong className="text-white">
                      {companyName}
                    </strong>
                    . Firmic Compliance is verifying the
                    submitted identity, company, ownership,
                    licensing, and KYC documents.
                  </p>

                  <p className="mt-4 max-w-3xl text-lg leading-8 text-white/65">
                    For security and regulatory assurance,
                    you cannot access the Command Center,
                    headquarters services, communications,
                    business tools, or AI workforce until every
                    applicable document has been accepted.
                  </p>
                </div>

                <aside className="rounded-[2rem] border border-white/12 bg-white/8 p-6 backdrop-blur-xl">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">
                    Expected response
                  </p>

                  <p className="mt-3 text-4xl font-black">
                    Within 24 hours
                  </p>

                  <p className="mt-3 text-sm leading-6 text-white/55">
                    We will email you when the package is
                    approved, rejected, or requires another
                    document.
                  </p>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.13em] text-white/40">
                      Access status
                    </p>

                    <p className="mt-2 font-black text-amber-300">
                      Platform locked
                    </p>
                  </div>
                </aside>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-3">
              <Metric
                label="Awaiting Review"
                value={reviewCount}
                detail="Submitted to Firmic Compliance"
                icon="🔎"
              />

              <Metric
                label="Approved"
                value={approvedCount}
                detail="Verified documents"
                icon="✅"
              />

              <Metric
                label="Action Required"
                value={rejectedCount}
                detail="Documents needing replacement"
                icon="⚠️"
              />
            </section>

            <section className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_350px]">
              <div className="rounded-[2rem] border border-[#09233d]/10 bg-white p-6 shadow-[0_18px_55px_rgba(9,35,61,0.06)] sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
                      Submitted Package
                    </p>

                    <h2 className="mt-3 text-2xl font-black">
                      Document review status
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      workspace?.id &&
                      void loadDocuments(
                        workspace.id,
                      )
                    }
                    className="rounded-xl border border-slate-200 px-5 py-3 font-bold"
                  >
                    Refresh Status
                  </button>
                </div>

                {error && (
                  <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                    {error}
                  </div>
                )}

                {loading ? (
                  <p className="mt-6 text-slate-500">
                    Loading submitted documents...
                  </p>
                ) : submittedDocuments.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-500">
                    No submitted documents were found. Return
                    to Hermes only if you still need to upload
                    the mandatory package.
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {submittedDocuments.map(
                      (document) => (
                        <DocumentStatusRow
                          key={document.id}
                          document={document}
                        />
                      ),
                    )}
                  </div>
                )}
              </div>

              <aside className="space-y-5">
                <section className="rounded-[2rem] border border-[#09233d]/10 bg-white p-6">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
                    Approval notification
                  </p>

                  <h2 className="mt-3 text-xl font-black">
                    Firmic will email you.
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-[#60798b]">
                    After approval, you will receive a secure
                    email containing a link to the Firmic login
                    page. The link will not bypass
                    authentication.
                  </p>
                </section>

                <section className="rounded-[2rem] bg-[#09233d] p-6 text-white">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8de6e2]">
                    After approval
                  </p>

                  <div className="mt-5 space-y-4">
                    {[
                      "Sign in securely",
                      "Sonny welcomes you back",
                      "Firmic provisions your infrastructure",
                      "Command Center unlocks",
                    ].map((item, index) => (
                      <div
                        key={item}
                        className="flex items-center gap-3"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-black text-[#8de6e2]">
                          {String(index + 1).padStart(
                            2,
                            "0",
                          )}
                        </span>

                        <p className="text-sm font-bold text-white/70">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <button
                  type="button"
                  onClick={() =>
                    void router.push(
                      "/documents",
                    )
                  }
                  className="w-full rounded-2xl border border-violet-200 bg-violet-50 px-6 py-4 font-black text-violet-700"
                >
                  View Submitted Documents
                </button>
              </aside>
            </section>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: string;
}) {
  return (
    <article className="rounded-[1.7rem] border border-[#09233d]/10 bg-white p-6 shadow-[0_14px_40px_rgba(9,35,61,0.05)]">
      <div className="text-3xl">{icon}</div>
      <p className="mt-4 text-sm font-bold text-[#698296]">
        {label}
      </p>
      <p className="mt-1 text-3xl font-black">
        {value}
      </p>
      <p className="mt-2 text-sm text-[#8aa0af]">
        {detail}
      </p>
    </article>
  );
}

function DocumentStatusRow({
  document,
}: {
  document: DocumentRecord;
}) {
  const status =
    normalizeStatus(document.status);

  const style =
    ["approved", "verified"].includes(status)
      ? "bg-emerald-100 text-emerald-700"
      : status === "rejected"
        ? "bg-rose-100 text-rose-700"
        : "bg-blue-100 text-blue-700";

  const label =
    ["approved", "verified"].includes(status)
      ? "Approved"
      : status === "rejected"
        ? "Action Required"
        : "Under Review";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-black">
          {document.name}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {document.type}
        </p>
      </div>

      <span
        className={`rounded-full px-3 py-1.5 text-xs font-black ${style}`}
      >
        {label}
      </span>
    </div>
  );
}
