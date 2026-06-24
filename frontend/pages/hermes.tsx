import { useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import { getHermes } from "../services/hermesApi";
import { getCompanyDocuments } from "../services/documentApi";
import { getCompanyTasks } from "../services/taskApi";
import { getProgress } from "../services/sonnyApi";

export default function HermesCompliance() {
  const [hermes, setHermes] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadHermes();
  }, []);

  async function loadHermes() {
    try {
      setLoading(true);

      const companyId = localStorage.getItem("company_id");

      if (!companyId) {
        setHermes(null);
        setDocuments([]);
        setTasks([]);
        setProgress(null);
        return;
      }

      const [hermesData, documentData, taskData, progressData] =
        await Promise.all([
          getHermes(companyId),
          getCompanyDocuments(companyId),
          getCompanyTasks(companyId),
          getProgress(companyId),
        ]);

      setHermes(hermesData);
      setDocuments(documentData);
      setTasks(taskData);
      setProgress(progressData);
    } catch (err) {
      console.error(err);
      setHermes(null);
    } finally {
      setLoading(false);
    }
  }

  function showNotice(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  }

  const hasTradeLicense = documents.some((doc) =>
    `${doc.name || ""} ${doc.type || ""}`.toLowerCase().includes("trade")
  );

  const hasKYB = documents.some((doc) =>
    `${doc.name || ""} ${doc.type || ""}`.toLowerCase().includes("kyb")
  );

  const hasContract = documents.some((doc) =>
    `${doc.name || ""} ${doc.type || ""}`.toLowerCase().includes("contract")
  );

  const approvedDocs = documents.filter(
    (doc) => doc.status === "approved"
  ).length;

  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  ).length;

  const pendingTasks = tasks.length - completedTasks;

  const dynamicRequirements = [
    {
      name: "Trade License",
      status: hasTradeLicense ? "Complete" : "Pending",
      owner: "Hermes",
      icon: "📄",
    },
    {
      name: "Office Lease / Virtual Office Agreement",
      status: "Complete",
      owner: "Hermes",
      icon: "🏢",
    },
    {
      name: "Beneficial Owner Declaration",
      status: hasContract ? "Review" : "Pending",
      owner: "Legal AI",
      icon: "👤",
    },
    {
      name: "KYC / KYB Documents",
      status: hasKYB ? "Complete" : "Pending",
      owner: "Hermes",
      icon: "🛡️",
    },
  ];

  const completedRequirements = dynamicRequirements.filter(
    (item) => item.status === "Complete"
  ).length;

  const fallbackScore = Math.round(
    (completedRequirements / dynamicRequirements.length) * 100
  );

  const score =
    hermes?.score ||
    hermes?.compliance_score ||
    fallbackScore;

  const risk =
    score >= 80 ? "Low" : score >= 50 ? "Medium" : "High";

  const status =
    hermes?.status ||
    (score >= 80 ? "Ready" : "Monitoring");

  const dynamicAlerts = [
    !hasTradeLicense ? "Trade license document is missing" : "",
    !hasKYB ? "KYB document package is missing" : "",
    pendingTasks > 0 ? `${pendingTasks} compliance-related tasks still pending` : "",
    score < 70 ? "Compliance score needs improvement before production launch" : "",
  ].filter(Boolean);

  const openAlerts = dynamicAlerts.length;

  function handleAction(action: string) {
    showNotice(`${action} action queued for Hermes.`);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Hermes" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              Hermes Compliance Center
            </h1>
            <p className="text-slate-500 mt-1">
              Monitor company compliance, KYB, documents, risk alerts, and
              regulatory readiness.
            </p>
          </div>

          <button
            onClick={loadHermes}
            className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            Refresh Hermes
          </button>
        </header>

        {notice && (
          <div className="mt-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 font-bold">
            {notice}
          </div>
        )}

        {loading && (
          <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-500">
            Loading Hermes from backend...
          </div>
        )}

        {!loading && !hermes && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-3xl p-6 shadow-sm text-yellow-700">
            Hermes backend data not found yet. Using company documents and
            tasks to estimate compliance.
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="Compliance Score" value={`${score}%`} icon="🛡️" />
          <Stat title="Risk Level" value={risk} icon="⚠️" />
          <Stat title="Status" value={status} icon="✅" />
          <Stat title="Open Alerts" value={String(openAlerts)} icon="🔔" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Compliance Readiness</h2>
                <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold">
                  UAE / Dubai
                </span>
              </div>

              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold">Overall Compliance Progress</p>
                    <p className="text-sm text-slate-500">
                      Hermes is monitoring {documents.length} documents,{" "}
                      {tasks.length} tasks, and company readiness.
                    </p>
                  </div>

                  <p className="font-bold text-violet-700">{score}%</p>
                </div>

                <div className="h-3 bg-slate-200 rounded-full mt-4 overflow-hidden">
                  <div
                    className="h-full bg-violet-600 rounded-full"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Compliance Requirements</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                {dynamicRequirements.map((item) => (
                  <div
                    key={item.name}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl">
                          {item.icon}
                        </div>

                        <div>
                          <p className="font-bold">{item.name}</p>
                          <p className="text-sm text-slate-500">
                            Owner: {item.owner}
                          </p>
                        </div>
                      </div>

                      <Badge status={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Hermes Activity</h2>

              <div className="mt-5 space-y-3">
                {dynamicAlerts.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 font-semibold">
                    No major compliance alerts. Hermes is monitoring normally.
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
            <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Hermes Overview</h2>

              <p className="text-violet-100 text-sm mt-2">
                Hermes protects your company by monitoring compliance gaps,
                document readiness, risk exposure, and regulatory obligations.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <Mini title="KYB" value={hasKYB ? "Ready" : "Missing"} />
                <Mini title="Docs" value={`${approvedDocs}/${documents.length}`} />
                <Mini title="Risk" value={risk} />
                <Mini title="Tasks" value={String(pendingTasks)} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Risk Notes</h2>

              <div className="mt-5 space-y-3">
                {!hasKYB && (
                  <Risk text="Missing KYB document may delay onboarding." />
                )}
                {!hasTradeLicense && (
                  <Risk text="Trade license document is not uploaded yet." />
                )}
                {pendingTasks > 0 && (
                  <Risk text={`${pendingTasks} tasks should be completed to improve readiness.`} />
                )}
                {score >= 80 && (
                  <Risk text="Compliance posture is strong. Continue monitoring." />
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Recommended Actions</h2>

              <div className="mt-5 space-y-3">
                <Action
                  text="Upload KYB Documents"
                  onClick={() => handleAction("Upload KYB Documents")}
                />
                <Action
                  text="Review Beneficial Owner Declaration"
                  onClick={() =>
                    handleAction("Review Beneficial Owner Declaration")
                  }
                />
                <Action
                  text="Generate Compliance Report"
                  onClick={() => handleAction("Generate Compliance Report")}
                />
                <Action
                  text="Schedule Legal AI Review"
                  onClick={() => handleAction("Schedule Legal AI Review")}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ title, value, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Mini({ title, value }: any) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 text-center">
      <p className="text-xs text-violet-100">{title}</p>
      <p className="font-bold text-xl">{value}</p>
    </div>
  );
}

function Badge({ status }: any) {
  const styles =
    status === "Complete"
      ? "bg-green-100 text-green-700"
      : status === "Review"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles}`}>
      {status}
    </span>
  );
}

function Risk({ text }: any) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl p-4 text-sm font-semibold">
      {text}
    </div>
  );
}

function Action({ text, onClick }: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
      <span className="font-semibold">{text}</span>
      <button onClick={onClick} className="text-violet-700 font-bold">
        Apply
      </button>
    </div>
  );
}