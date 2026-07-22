import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import { getCompanies } from "../services/companyApi";
import { getCompanyDocuments } from "../services/documentApi";
import { getCompanyTasks, updateTaskStatus } from "../services/taskApi";
import { getSonny, getProgress } from "../services/sonnyApi";
import { getHermes } from "../services/hermesApi";
import { getOffices } from "../services/officeApi";
import ProtectedRoute from "../components/ProtectedRoute";
import { getActiveCompany, saveActiveCompany } from "../src/utils/companyContext";

export default function CompanyControlCenter() {
  const router = useRouter();
  const { id } = router.query;

  const [company, setCompany] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [sonny, setSonny] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [hermes, setHermes] = useState<any>(null);
  const [office, setOffice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadWorkspace() {
    try {
      setLoading(true);

      const companies = await getCompanies();

      const companyId =
        id || localStorage.getItem("company_id") || companies?.[0]?.id;

      if (!companyId) return;

      localStorage.setItem("company_id", String(companyId));

      const selectedCompany = companies.find(
        (c: any) => String(c.id) === String(companyId)
      );

      setCompany(selectedCompany || null);

      if (selectedCompany) {
        localStorage.setItem("company_name", selectedCompany.name);

        const existing = localStorage.getItem("firmic_company");
        const parsed = existing ? JSON.parse(existing) : {};

        localStorage.setItem(
          "firmic_company",
          JSON.stringify({
            ...parsed,
            id: String(companyId),
            name: selectedCompany.name,
          })
        );
      }

const results = await Promise.allSettled([
  getCompanyDocuments(String(companyId)),
  getCompanyTasks(String(companyId)),
  getSonny(String(companyId)),
  getProgress(String(companyId)),
  getHermes(String(companyId)),
  getOffices(),
]);

const docs =
  results[0].status === "fulfilled"
    ? results[0].value
    : [];

const companyTasks =
  results[1].status === "fulfilled"
    ? results[1].value
    : [];

const sonnyData =
  results[2].status === "fulfilled"
    ? results[2].value
    : null;

const progressData =
  results[3].status === "fulfilled"
    ? results[3].value
    : null;

const hermesData =
  results[4].status === "fulfilled"
    ? results[4].value
    : null;

const offices =
  results[5].status === "fulfilled"
    ? results[5].value
    : [];

setDocuments(Array.isArray(docs) ? docs : []);
setTasks(Array.isArray(companyTasks) ? companyTasks : []);
setSonny(sonnyData);
setProgress(progressData);
setHermes(hermesData);

const rentedOffice = Array.isArray(offices)
  ? offices.find((o: any) => o.status === "rented")
  : null;

setOffice(rentedOffice || null);
    } catch (err) {
      console.error("Failed to load company control center:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!router.isReady) return;
    loadWorkspace();
  }, [router.isReady, id]);

  async function completeTask(taskId: string) {
    await updateTaskStatus(taskId, "completed");
    await loadWorkspace();
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-50 flex">
          <FirmicSidebar active="Company" />
          <main className="flex-1 p-8 text-slate-500">
            Loading company workspace...
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (!company) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-50 flex">
          <FirmicSidebar active="Company" />
          <main className="flex-1 p-8 text-red-600">Company not found.</main>
        </div>
      </ProtectedRoute>
    );
  }

  const savedCompany = getActiveCompany() || {};
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("firmic_company") || "{}")
      : {};

  const companyName = company?.name || savedCompany?.name || "Company";
  const jurisdiction =
    savedCompany?.jurisdiction ||
    localStorage.getItem("company_jurisdiction") ||
    "Abu Dhabi";
  const plan = savedCompany?.plan || localStorage.getItem("company_plan") || "Premium";

  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const pendingTasks = tasks.length - completedTasks;

  const progressScore = progress?.progress || sonny?.summary?.progress || 0;
  const hermesScore = hermes?.score || hermes?.compliance_score || 40;

const officeCode = office?.office_code || savedCompany?.office_code || "A047";

const officeLocation =
  office?.location ||
  savedCompany?.office_location ||
  "Hub71, Abu Dhabi, United Arab Emirates";

const hasOffice = Boolean(office || savedCompany?.office_code || officeCode);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar active="Company" />

        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Company Control Center
              </p>

              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                {companyName}
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Manage company profile, headquarters, documents, tasks, Sonny,
                Hermes, AI workforce, and operating readiness.
              </p>
            </div>

            <div className="flex gap-3">
              <a
                href="/sonny"
                className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-violet-700 transition"
              >
                Open Sonny
              </a>

              <a
                href="/hermes"
                className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold hover:bg-slate-50 transition"
              >
                Open Hermes
              </a>
            </div>
          </header>

          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-8">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div>
                <p className="text-sm text-violet-700 font-bold">
                  Company Profile
                </p>

                <h2 className="text-3xl font-bold mt-2">{companyName}</h2>

                <p className="text-slate-500 mt-2">Company ID: {company.id}</p>
                <p className="text-slate-500 mt-1">
                  Status: {company.status || "Active"}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Mini title="Headquarters" value={officeCode} />
                <Mini title="Plan" value={plan} />
                <Mini title="Jurisdiction" value={jurisdiction} />
                <Mini title="Formation" value="Initial" />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat title="Progress" value={`${progressScore}%`} icon="📈" />
            <Stat title="Hermes Score" value={`${hermesScore}%`} icon="🛡️" />
            <Stat title="Documents" value={String(documents.length)} icon="📄" />
            <Stat title="Open Tasks" value={String(pendingTasks)} icon="✅" />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
            <div className="space-y-6">
              <Panel title="Registered Headquarters">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <h3 className="text-xl font-bold">
                    {hasOffice ? `Headquarters ${officeCode}` : "No headquarters activated"}
                  </h3>

                  <p className="text-slate-500 mt-1">{officeLocation}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    <Mini title="Digital Mailroom" value={hasOffice ? "Active" : "Pending"} />
                    <Mini title="Business Calls" value={hasOffice ? "+971 2 XXX 047" : "Pending"} />
                    <Mini title="Plan" value={plan} />
                    <Mini title="Status" value={hasOffice ? "Active" : "Not Active"} />
                  </div>

                  {!hasOffice && (
                    <a
                      href="/virtual-offices"
                      className="mt-5 inline-block bg-violet-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-violet-700 transition"
                    >
                      Open Office Marketplace
                    </a>
                  )}
                </div>
              </Panel>

              <Panel title="Document Vault">
                {documents.length === 0 ? (
                  <div className="text-slate-500">
                    No documents uploaded yet.
                    <div className="mt-4">
                      <a
                        href="/documents"
                        className="inline-block bg-violet-600 text-white px-5 py-3 rounded-xl font-bold"
                      >
                        Open Document Vault
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4"
                      >
                        <p className="font-bold">{doc.name}</p>
                        <p className="text-sm text-slate-500">Type: {doc.type}</p>
                        <p className="text-sm text-slate-500">
                          Status: {doc.status}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Tasks">
                {tasks.length === 0 ? (
                  <p className="text-slate-500">No tasks yet.</p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between gap-4"
                      >
                        <div>
                          <p className="font-bold">{task.title}</p>
                          <p className="text-sm text-slate-500">
                            {task.description}
                          </p>
                          <p className="text-sm text-slate-500">
                            Status: {task.status}
                          </p>
                        </div>

                        {task.status !== "completed" ? (
                          <button
                            onClick={() => completeTask(task.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold h-fit"
                          >
                            Complete
                          </button>
                        ) : (
                          <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold h-fit">
                            Done
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">Company Health</h2>

                <p className="text-violet-100 text-sm mt-2">
                  Firmic is monitoring operations, compliance, documents, AI
                  activity, and headquarters readiness for {companyName}.
                </p>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <DarkMini title="Progress" value={`${progressScore}%`} />
                  <DarkMini title="Hermes" value={`${hermesScore}%`} />
                  <DarkMini title="Tasks" value={String(tasks.length)} />
                  <DarkMini title="Docs" value={String(documents.length)} />
                </div>
              </div>

              <Panel title="Sonny Summary">
                <p className="text-sm text-slate-500">
                  Documents: {sonny?.summary?.documents ?? documents.length}
                </p>
                <p className="text-sm text-slate-500">
                  Tasks: {sonny?.summary?.tasks ?? tasks.length}
                </p>
                <p className="text-sm text-slate-500">
                  Pending Tasks: {sonny?.summary?.pending_tasks ?? pendingTasks}
                </p>
                <p className="text-sm text-slate-500">
                  Completed Tasks:{" "}
                  {sonny?.summary?.completed_tasks ?? completedTasks}
                </p>
              </Panel>

              <Panel title="Quick Actions">
                <Action href="/virtual-offices" text="Activate Headquarters" />
                <Action href="/ai-workforce" text="Manage AI Workforce" />
                <Action href="/documents" text="Open Document Vault" />
                <Action href="/billing" text="Open Billing Center" />
                <Action href="/reports" text="Generate Report" />
              </Panel>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
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
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold text-sm mt-1">{value}</p>
    </div>
  );
}

function DarkMini({ title, value }: any) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 text-center">
      <p className="text-xs text-violet-100">{title}</p>
      <p className="font-bold text-xl">{value}</p>
    </div>
  );
}

function Panel({ title, children }: any) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-5">{title}</h2>
      {children}
    </section>
  );
}

function Action({ href, text }: any) {
  return (
    <a
      href={href}
      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center font-semibold hover:bg-white transition"
    >
      <span>{text}</span>
      <span className="text-violet-700">›</span>
    </a>
  );
}