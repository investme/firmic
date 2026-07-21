import { useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import { getHermes } from "../services/hermesApi";
import { getCompanyDocuments } from "../services/documentApi";
import { getCompanyTasks, createTask } from "../services/taskApi";
import { getProgress } from "../services/sonnyApi";
import ProtectedRoute from "../components/ProtectedRoute";
import { getActiveWorkspace } from "../src/utils/workspaceContext";

export default function HermesCompliance() {
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
        getProgress(String(companyId)),
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

  const hasKYB = documents.some((document) => {
    const searchableText = `${document.name || ""} ${
      document.type || ""
    }`.toLowerCase();

    return (
      searchableText.includes("kyb") ||
      searchableText.includes("know your business")
    );
  });

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
      status: hasKYB ? "Complete" : "Pending",
      owner: "Hermes",
      icon: "🛡️",
      action: "Upload KYB Documents",
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
    progress?.progress ??
    progress?.score ??
    0;

  const dynamicAlerts = [
    !hasTradeLicense
      ? "Trade license document is missing."
      : "",
    !hasKYB
      ? "KYB document package is missing."
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
    if (action === "Upload KYB Documents") {
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

            <button
              type="button"
              onClick={loadHermes}
              disabled={loading}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition disabled:bg-slate-300"
            >
              {loading ? "Refreshing..." : "Refresh Hermes"}
            </button>
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

                      {item.status !== "Complete" && (
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
                    title="KYB"
                    value={hasKYB ? "Ready" : "Missing"}
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
                    <Risk text="Missing KYB documents may delay onboarding." />
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
                  <Action
                    text="Upload KYB Documents"
                    loading={
                      actionLoading === "Upload KYB Documents"
                    }
                    onClick={() =>
                      handleAction("Upload KYB Documents")
                    }
                  />

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