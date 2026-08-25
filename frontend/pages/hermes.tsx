import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import FirmicSidebar from "../components/FirmicSidebar";
import { chatHermes, getHermes } from "../services/hermesApi";
import { getCompanyDocuments } from "../services/documentApi";
import { getCompanyTasks, createTask } from "../services/taskApi";
import { getCompanyLaunch } from "../services/launchApi";
import ProtectedRoute from "../components/ProtectedRoute";
import { getActiveWorkspace } from "../src/utils/workspaceContext";
import {
  speakHermesBriefing,
  speakHermesResponse,
} from "../src/utils/firmicVoice";

type HermesConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function HermesCompliance() {
  const router = useRouter();
  const didAutoSpeakRef = useRef(false);

  const [hermes, setHermes] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);

  const [companyName, setCompanyName] = useState("Active Company");
  const [jurisdiction, setJurisdiction] = useState("Abu Dhabi");
  const [headquarters, setHeadquarters] = useState("Not Activated");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [speaking, setSpeaking] = useState(false);

  const [agentMessage, setAgentMessage] = useState("");
  const [agentWorking, setAgentWorking] = useState(false);
  const [conversation, setConversation] =
    useState<HermesConversationMessage[]>([]);

  useEffect(() => {
    loadHermes();
  }, []);

  async function loadHermes() {
    try {
      setLoading(true);
      setWarning("");

      const workspace = getActiveWorkspace();

      const companyId =
        workspace?.id || localStorage.getItem("company_id");

      setCompanyName(
        workspace?.name ||
          localStorage.getItem("company_name") ||
          "Active Company"
      );

      setJurisdiction(
        workspace?.jurisdiction ||
          localStorage.getItem("company_jurisdiction") ||
          "Abu Dhabi"
      );

      setHeadquarters(
        workspace?.headquarters?.office_code || "Not Activated"
      );

      if (!companyId) {
        setHermes(null);
        setDocuments([]);
        setTasks([]);
        setProgress(null);

        setWarning(
          "Select or create a company before opening Hermes Compliance."
        );

        return;
      }

      const results = await Promise.allSettled([
        getHermes(String(companyId)),
        getCompanyDocuments(String(companyId)),
        getCompanyTasks(String(companyId)),
        getCompanyLaunch(String(companyId)),
      ]);

      const hermesResult = results[0];
      const documentsResult = results[1];
      const tasksResult = results[2];
      const progressResult = results[3];

      setHermes(
        hermesResult.status === "fulfilled"
          ? hermesResult.value
          : null
      );

      setDocuments(
        documentsResult.status === "fulfilled" &&
          Array.isArray(documentsResult.value)
          ? documentsResult.value
          : []
      );

      setTasks(
        tasksResult.status === "fulfilled" &&
          Array.isArray(tasksResult.value)
          ? tasksResult.value
          : []
      );

      setProgress(
        progressResult.status === "fulfilled"
          ? progressResult.value
          : null
      );

      const failedServices: string[] = [];

      if (hermesResult.status === "rejected") {
        failedServices.push("Hermes backend");
        console.error(
          "Failed to load Hermes:",
          hermesResult.reason
        );
      }

      if (documentsResult.status === "rejected") {
        failedServices.push("documents");
        console.error(
          "Failed to load compliance documents:",
          documentsResult.reason
        );
      }

      if (tasksResult.status === "rejected") {
        failedServices.push("tasks");
        console.error(
          "Failed to load compliance tasks:",
          tasksResult.reason
        );
      }

      if (progressResult.status === "rejected") {
        failedServices.push("company progress");
        console.error(
          "Failed to load company progress:",
          progressResult.reason
        );
      }

      if (failedServices.length > 0) {
        setWarning(
          `Some live compliance data is temporarily unavailable: ${failedServices.join(
            ", "
          )}. Hermes is using the available company context.`
        );
      }
    } catch (err) {
      console.error(
        "Failed to load Hermes Compliance Center:",
        err
      );

      setHermes(null);
      setDocuments([]);
      setTasks([]);
      setProgress(null);

      setWarning(
        "Hermes could not load live backend data. Local compliance context is still available."
      );
    } finally {
      setLoading(false);
    }
  }

  function showNotice(message: string) {
    setNotice(message);

    setTimeout(() => {
      setNotice("");
    }, 3000);
  }

  const hasTradeLicense = documents.some((document) => {
    const searchableText = `${document.name || ""} ${
      document.type || ""
    }`.toLowerCase();

    return (
      searchableText.includes("trade license") ||
      searchableText.includes("trade licence") ||
      searchableText.includes("license")
    );
  });

  const kycDocuments = documents.filter((document) => {
    const searchableText = `${document.name || ""} ${
      document.type || ""
    }`.toLowerCase();

    return (
      searchableText.includes("kyc") ||
      searchableText.includes("kyb") ||
      searchableText.includes("kyc_questionnaire") ||
      searchableText.includes("know your customer") ||
      searchableText.includes("know your business")
    );
  });

  const kycStatuses = kycDocuments.map((document) =>
    String(document.status || "")
      .trim()
      .toLowerCase(),
  );

  const hasKYB = kycDocuments.length > 0;

  const kycApproved = kycStatuses.some((status) =>
    ["approved", "verified"].includes(status),
  );

  const kycRejected = kycStatuses.some((status) =>
    ["rejected", "declined", "action_required"].includes(
      status,
    ),
  );

  const kycAwaitingVerification =
    hasKYB &&
    !kycApproved &&
    !kycRejected &&
    kycStatuses.some((status) =>
      [
        "uploaded",
        "under_review",
        "pending",
        "awaiting_review",
        "submitted",
      ].includes(status),
    );

  const kycRequirementStatus = kycApproved
    ? "Complete"
    : kycRejected
      ? "Action Required"
      : kycAwaitingVerification
        ? "Awaiting Verification"
        : "Missing";

  const hasOwnerDeclaration = documents.some((document) => {
    const searchableText = `${document.name || ""} ${
      document.type || ""
    }`.toLowerCase();

    return (
      searchableText.includes("beneficial owner") ||
      searchableText.includes("ubo") ||
      searchableText.includes("ownership declaration")
    );
  });

  const hasOfficeAgreement = documents.some((document) => {
    const searchableText = `${document.name || ""} ${
      document.type || ""
    }`.toLowerCase();

    return (
      searchableText.includes("office agreement") ||
      searchableText.includes("virtual office") ||
      searchableText.includes("headquarters agreement")
    );
  });

  const headquartersActive =
    headquarters !== "Not Activated";

  const approvedDocuments = documents.filter(
    (document) =>
      String(document.status || "").toLowerCase() === "approved"
  ).length;

  const completedTasks = tasks.filter(
    (task) =>
      String(task.status || "").toLowerCase() === "completed"
  ).length;

  const pendingTasks = tasks.filter(
    (task) =>
      String(task.status || "").toLowerCase() !== "completed"
  ).length;

  const dynamicRequirements = [
    {
      name: "Trade License",
      status: hasTradeLicense ? "Complete" : "Pending",
      owner: "Hermes",
      icon: "📄",
      action: "Upload Trade License",
    },
    {
      name: "Headquarters / Virtual Office Agreement",
      status:
        hasOfficeAgreement || headquartersActive
          ? "Complete"
          : "Pending",
      owner: "Hermes",
      icon: "🏢",
      action: "Activate Headquarters",
    },
    {
      name: "Beneficial Owner Declaration",
      status: hasOwnerDeclaration ? "Complete" : "Review",
      owner: "Legal AI",
      icon: "👤",
      action: "Review Beneficial Owner Declaration",
    },
    {
      name: "KYC / KYB Documents",
      status: kycRequirementStatus,
      owner: "Hermes",
      icon: "🛡️",
      action:
        kycRequirementStatus === "Action Required"
          ? "Replace KYC / KYB Documents"
          : "Upload KYC / KYB Documents",
    },
  ];

  const completedRequirements = dynamicRequirements.filter(
    (item) => item.status === "Complete"
  ).length;

  const fallbackScore = Math.round(
    (completedRequirements / dynamicRequirements.length) * 100
  );

  const rawScore =
    hermes?.score ??
    hermes?.compliance_score ??
    fallbackScore;

  const score = Math.max(
    0,
    Math.min(100, Number(rawScore) || 0)
  );

  const risk =
    score >= 80
      ? "Low"
      : score >= 50
      ? "Medium"
      : "High";

  const status =
    hermes?.status ||
    (score >= 80
      ? "Ready"
      : score >= 50
      ? "Improving"
      : "Monitoring");

  const companyProgress =
    Number(progress?.progress_percent ?? 0);

  const dynamicAlerts = [
    !hasTradeLicense
      ? "Trade license document is missing."
      : "",
    !hasKYB
      ? "KYC / KYB document package is missing."
      : kycRejected
        ? "KYC / KYB submission requires replacement or correction."
        : "",
    !hasOwnerDeclaration
      ? "Beneficial owner declaration requires review."
      : "",
    !headquartersActive
      ? "Registered headquarters has not been activated."
      : "",
    pendingTasks > 0
      ? `${pendingTasks} compliance-related tasks are still pending.`
      : "",
    score < 70
      ? "Compliance score should improve before production launch."
      : "",
  ].filter(Boolean);

  const openAlerts = dynamicAlerts.length;

  function speakLiveBriefing() {
    void speakHermesBriefing(
      {
        companyName,
        score,
        risk,
        documentCount: documents.length,
        pendingTasks,
        openAlerts,
        status: String(status || ""),
      },
      {
        onStart: () => {
          setSpeaking(true);
          setNotice("Hermes is speaking.");
        },
        onEnd: () => {
          setSpeaking(false);
        },
        onError: () => {
          setSpeaking(false);
          setWarning(
            "Hermes voice could not start. Use Replay Hermes to try again.",
          );
        },
      },
    );
  }

  /*
   * The Awaiting Compliance page routes here with ?speak=1.
   * Wait until live company data has loaded, then speak once
   * for that navigation. Refreshing Hermes data does not replay.
   */
  useEffect(() => {
    if (
      !router.isReady ||
      router.query.speak !== "1" ||
      loading ||
      didAutoSpeakRef.current
    ) {
      return;
    }

    didAutoSpeakRef.current = true;

    const timer = window.setTimeout(() => {
      speakLiveBriefing();
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    router.isReady,
    router.query.speak,
    loading,
    companyName,
    score,
    risk,
    documents.length,
    pendingTasks,
    openAlerts,
    status,
  ]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel?.();
    };
  }, []);

  async function askHermes(
    explicitMessage?: string,
  ) {
    const message = (
      explicitMessage || agentMessage
    ).trim();

    if (!message || agentWorking) {
      return;
    }

    const workspace = getActiveWorkspace();
    const companyId =
      workspace?.id ||
      localStorage.getItem("company_id");

    if (!companyId) {
      setWarning("Select or create a company first.");
      return;
    }

    const userMessage: HermesConversationMessage = {
      role: "user",
      content: message,
    };

    setConversation((current) => [
      ...current,
      userMessage,
    ]);
    setAgentMessage("");
    setAgentWorking(true);
    setWarning("");

    try {
      const result = await chatHermes(
        String(companyId),
        message,
      );

      const reply =
        String(result?.reply || "").trim() ||
        "I could not produce a compliance response.";

      setConversation((current) => [
        ...current,
        {
          role: "assistant",
          content: reply,
        },
      ]);

      if (result?.mode === "fallback") {
        setWarning(
          result?.warning ||
            "Hermes AI generation is unavailable, so a deterministic compliance response was used.",
        );
      }

      const speech =
        String(result?.speech || reply).trim();

      void speakHermesResponse(speech, {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });

      await loadHermes();
    } catch (error: any) {
      setWarning(
        error?.message ||
          "Hermes could not process the compliance request.",
      );
    } finally {
      setAgentWorking(false);
    }
  }

  async function createComplianceTask(
    title: string,
    description: string
  ) {
    const workspace = getActiveWorkspace();

    const companyId =
      workspace?.id || localStorage.getItem("company_id");

    if (!companyId) {
      setWarning("Select or create a company first.");
      return;
    }

    try {
      setActionLoading(title);
      setWarning("");

      await createTask({
        company_id: String(companyId),
        title,
        description,
        status: "pending",
      });

      showNotice(
        `${title} was added to the company task queue.`
      );

      await loadHermes();
    } catch (err: any) {
      console.error("HERMES ACTION ERROR:", err);

      setWarning(
        err?.message ||
          "Hermes could not create the compliance task."
      );
    } finally {
      setActionLoading("");
    }
  }

  function handleAction(action: string) {
    if (
      action === "Upload KYB Documents" ||
      action === "Upload KYC / KYB Documents" ||
      action === "Replace KYC / KYB Documents"
    ) {
      window.location.href = "/documents";
      return;
    }

    if (action === "Upload Trade License") {
      window.location.href = "/documents";
      return;
    }

    if (action === "Activate Headquarters") {
      window.location.href = "/virtual-offices";
      return;
    }

    if (action === "Generate Compliance Report") {
      window.location.href = "/reports";
      return;
    }

    if (action === "Review Beneficial Owner Declaration") {
      createComplianceTask(
        "Review Beneficial Owner Declaration",
        "Hermes requested a review of the company beneficial owner declaration."
      );

      return;
    }

    if (action === "Schedule Legal AI Review") {
      createComplianceTask(
        "Schedule Legal AI Review",
        "Hermes requested a Legal AI review of the company compliance package."
      );

      return;
    }

    showNotice(`${action} was queued for Hermes.`);
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Hermes Compliance
              </p>

              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                Compliance intelligence for {companyName}.
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Hermes monitors KYB, company documents, ownership
                declarations, registered headquarters, compliance tasks,
                risk alerts, and {jurisdiction} regulatory readiness.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={speakLiveBriefing}
                disabled={loading || speaking}
                className="border border-violet-200 bg-white text-violet-700 px-6 py-3 rounded-xl font-bold hover:bg-violet-50 transition disabled:bg-slate-100 disabled:text-slate-400"
              >
                {speaking
                  ? "Hermes Speaking..."
                  : "🔊 Replay Hermes"}
              </button>

              <button
                type="button"
                onClick={loadHermes}
                disabled={loading}
                className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition disabled:bg-slate-300"
              >
                {loading ? "Refreshing..." : "Refresh Hermes"}
              </button>
            </div>
          </header>

          {notice && (
            <div className="mt-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 font-bold">
              {notice}
            </div>
          )}

          {warning && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-2xl p-4 font-semibold">
              {warning}
            </div>
          )}

          {loading && (
            <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-500">
              Preparing Hermes compliance intelligence...
            </div>
          )}

          {!loading && !hermes && !warning && (
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-3xl p-6 shadow-sm text-yellow-700">
              Hermes is building compliance intelligence using company
              documents, tasks, KYB readiness, headquarters, and
              regulatory requirements.
            </div>
          )}

          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <ContextMini
                title="Company"
                value={companyName}
              />

              <ContextMini
                title="Jurisdiction"
                value={jurisdiction}
              />

              <ContextMini
                title="Headquarters"
                value={headquarters}
              />

              <ContextMini
                title="Company Progress"
                value={`${companyProgress}%`}
              />
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat
              title="Compliance Score"
              value={`${score}%`}
              icon="🛡️"
            />

            <Stat
              title="Risk Level"
              value={risk}
              icon="⚠️"
            />

            <Stat
              title="Status"
              value={status}
              icon="✅"
            />

            <Stat
              title="Open Alerts"
              value={String(openAlerts)}
              icon="🔔"
            />
          </section>

          <section className="mt-8 overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm">
            <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-6">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <p className="text-sm font-bold text-violet-700">
                    Hermes Agent Core
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-950">
                    Ask Hermes about this company&apos;s compliance.
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    Hermes reasons from the live company record, submitted documents,
                    document states, compliance tasks, jurisdiction and recent Hermes memory.
                    Uploaded documents are treated as submitted for verification — never as missing.
                  </p>
                </div>

                <span className="w-fit rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white">
                  Live company context
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "What is holding up approval?",
                  "Do I need to upload anything else?",
                  "What is the status of my KYC?",
                  "What should I do next?",
                ].map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void askHermes(question)}
                    disabled={agentWorking}
                    className="rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {conversation.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  Hermes is ready. Ask a compliance question and she will answer from the current Firmic company state rather than reading a fixed script.
                </div>
              ) : (
                <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                  {conversation.map((item, index) => (
                    <div
                      key={`${item.role}-${index}`}
                      className={
                        item.role === "assistant"
                          ? "mr-8 rounded-2xl border border-violet-100 bg-violet-50 p-4"
                          : "ml-8 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      }
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                        {item.role === "assistant"
                          ? "Hermes"
                          : "You"}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {item.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                  value={agentMessage}
                  onChange={(event) =>
                    setAgentMessage(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      void askHermes();
                    }
                  }}
                  placeholder="Ask Hermes about documents, KYC, approval, risk, or next steps..."
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-5 py-4 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />

                <button
                  type="button"
                  onClick={() => void askHermes()}
                  disabled={
                    agentWorking ||
                    !agentMessage.trim()
                  }
                  className="rounded-2xl bg-violet-600 px-6 py-4 font-bold text-white transition hover:bg-violet-700 disabled:bg-slate-300"
                >
                  {agentWorking
                    ? "Hermes is reasoning..."
                    : "Ask Hermes"}
                </button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      Compliance Readiness
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                      Live compliance readiness for {companyName}.
                    </p>
                  </div>

                  <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold w-fit">
                    {jurisdiction} / UAE
                  </span>
                </div>

                <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-bold">
                        Overall Compliance Progress
                      </p>

                      <p className="text-sm text-slate-500 mt-1">
                        Hermes is monitoring {documents.length} documents,{" "}
                        {tasks.length} tasks, and company readiness.
                      </p>
                    </div>

                    <p className="font-bold text-violet-700 text-xl">
                      {score}%
                    </p>
                  </div>

                  <div className="h-3 bg-slate-200 rounded-full mt-4 overflow-hidden">
                    <div
                      className="h-full bg-violet-600 rounded-full transition-all"
                      style={{
                        width: `${score}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Compliance Requirements
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  {dynamicRequirements.map((item) => (
                    <div
                      key={item.name}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl shrink-0">
                            {item.icon}
                          </div>

                          <div>
                            <p className="font-bold">
                              {item.name}
                            </p>

                            <p className="text-sm text-slate-500">
                              Owner: {item.owner}
                            </p>
                          </div>
                        </div>

                        <Badge status={item.status} />
                      </div>

                      {[
                        "Missing",
                        "Pending",
                        "Review",
                        "Action Required",
                      ].includes(item.status) && (
                        <button
                          type="button"
                          onClick={() =>
                            handleAction(item.action)
                          }
                          disabled={
                            actionLoading === item.action
                          }
                          className="mt-4 w-full border border-violet-200 text-violet-700 rounded-xl py-2 font-bold text-sm hover:bg-violet-50 transition disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          {actionLoading === item.action
                            ? "Working..."
                            : item.action}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Hermes Activity
                </h2>

                <div className="mt-5 space-y-3">
                  {dynamicAlerts.length === 0 ? (
                    <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 font-semibold">
                      No major compliance alerts. Hermes is monitoring
                      normally.
                    </div>
                  ) : (
                    dynamicAlerts.map((item) => (
                      <div
                        key={item}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-semibold"
                      >
                        {item}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Hermes Overview
                </h2>

                <p className="text-violet-100 text-sm mt-2">
                  Hermes protects {companyName} by monitoring compliance
                  gaps, document readiness, ownership records, risk
                  exposure, and regulatory obligations.
                </p>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <Mini
                    title="KYC / KYB"
                    value={
                      kycApproved
                        ? "Approved"
                        : kycRejected
                          ? "Action Required"
                          : kycAwaitingVerification
                            ? "Awaiting Review"
                            : "Missing"
                    }
                  />

                  <Mini
                    title="Docs"
                    value={`${approvedDocuments}/${documents.length}`}
                  />

                  <Mini title="Risk" value={risk} />

                  <Mini
                    title="Tasks"
                    value={String(pendingTasks)}
                  />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Risk Notes
                </h2>

                <div className="mt-5 space-y-3">
                  {!hasKYB && (
                    <Risk text="Missing KYC / KYB documents may delay onboarding." />
                  )}

                  {kycAwaitingVerification && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
                      KYC / KYB documents are submitted and awaiting Hermes / Firmic Admin verification. No replacement is required unless review requests one.
                    </div>
                  )}

                  {kycRejected && (
                    <Risk text="KYC / KYB review requires a corrected or replacement submission." />
                  )}

                  {!hasTradeLicense && (
                    <Risk text="Trade license document has not been uploaded." />
                  )}

                  {!hasOwnerDeclaration && (
                    <Risk text="Beneficial owner declaration requires review." />
                  )}

                  {!headquartersActive && (
                    <Risk text="Registered headquarters has not been activated." />
                  )}

                  {pendingTasks > 0 && (
                    <Risk
                      text={`${pendingTasks} tasks should be completed to improve compliance readiness.`}
                    />
                  )}

                  {score >= 80 && (
                    <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 text-sm font-semibold">
                      Compliance posture is strong. Continue monitoring.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Recommended Actions
                </h2>

                <div className="mt-5 space-y-3">
                  {!kycApproved &&
                    !kycAwaitingVerification && (
                      <Action
                        text={
                          kycRejected
                            ? "Replace KYC / KYB Documents"
                            : "Upload KYC / KYB Documents"
                        }
                        loading={
                          actionLoading ===
                          (kycRejected
                            ? "Replace KYC / KYB Documents"
                            : "Upload KYC / KYB Documents")
                        }
                        onClick={() =>
                          handleAction(
                            kycRejected
                              ? "Replace KYC / KYB Documents"
                              : "Upload KYC / KYB Documents",
                          )
                        }
                      />
                    )}

                  {kycAwaitingVerification && (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                      <p className="font-bold text-blue-900">
                        KYC / KYB verification is already in progress.
                      </p>
                      <p className="mt-1 text-sm text-blue-700">
                        Hermes will surface an action only if Firmic Compliance requests a correction.
                      </p>
                    </div>
                  )}

                  <Action
                    text="Review Beneficial Owner Declaration"
                    loading={
                      actionLoading ===
                      "Review Beneficial Owner Declaration"
                    }
                    onClick={() =>
                      handleAction(
                        "Review Beneficial Owner Declaration"
                      )
                    }
                  />

                  <Action
                    text="Generate Compliance Report"
                    loading={false}
                    onClick={() =>
                      handleAction(
                        "Generate Compliance Report"
                      )
                    }
                  />

                  <Action
                    text="Schedule Legal AI Review"
                    loading={
                      actionLoading ===
                      "Schedule Legal AI Review"
                    }
                    onClick={() =>
                      handleAction("Schedule Legal AI Review")
                    }
                  />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Stat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>

      <p className="text-sm text-slate-500 mt-3">
        {title}
      </p>

      <p className="text-2xl font-bold mt-1">
        {value}
      </p>
    </div>
  );
}

function ContextMini({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center min-w-0">
      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p
        className="font-bold text-lg mt-1 truncate"
        title={value}
      >
        {value}
      </p>
    </div>
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
    <div className="bg-white/10 rounded-2xl p-4 text-center">
      <p className="text-xs text-violet-100">
        {title}
      </p>

      <p className="font-bold text-xl">
        {value}
      </p>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const styles =
    status === "Complete"
      ? "bg-green-100 text-green-700"
      : status === "Awaiting Verification"
        ? "bg-blue-100 text-blue-700"
        : status === "Review"
          ? "bg-yellow-100 text-yellow-700"
          : "bg-red-100 text-red-700";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${styles}`}
    >
      {status}
    </span>
  );
}

function Risk({ text }: { text: string }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl p-4 text-sm font-semibold">
      {text}
    </div>
  );
}

function Action({
  text,
  onClick,
  loading,
}: {
  text: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center gap-4">
      <span className="font-semibold">
        {text}
      </span>

      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="text-violet-700 font-bold disabled:text-slate-400"
      >
        {loading ? "Working..." : "Apply"}
      </button>
    </div>
  );
}