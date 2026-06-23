import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import {
  getCompanies,
  getCompanyDocuments,
  getCompanyTasks,
  getSonny,
  getProgress,
  getHermes,
  getOffices,
  updateTaskStatus,
} from "../services/api";

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

      if (!companyId) {
        setLoading(false);
        return;
      }

      localStorage.setItem("company_id", String(companyId));

      const selectedCompany = companies.find(
        (c: any) => String(c.id) === String(companyId)
      );

      setCompany(selectedCompany || null);

      const docs = await getCompanyDocuments(String(companyId));
      setDocuments(docs);

      const companyTasks = await getCompanyTasks(String(companyId));
      setTasks(companyTasks);

      const sonnyData = await getSonny(String(companyId));
      setSonny(sonnyData);

      const progressData = await getProgress(String(companyId));
      setProgress(progressData);

      const hermesData = await getHermes(String(companyId));
      setHermes(hermesData);

      const offices = await getOffices();
      const rentedOffice = offices.find((o: any) => o.status === "rented");
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
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar active="Company" />
        <main className="flex-1 p-8 text-slate-500">
          Loading company control center...
        </main>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar active="Company" />
        <main className="flex-1 p-8 text-red-600">Company not found.</main>
      </div>
    );
  }

  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  ).length;

  const pendingTasks = tasks.length - completedTasks;
  const progressScore = progress?.progress || sonny?.summary?.progress || 0;
  const hermesScore = hermes?.score || hermes?.compliance_score || 40;
  const officeCode = office?.office_code || "Not rented";
  const officeLocation = office?.location || "No office selected";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Company" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              Company Control Center
            </h1>
            <p className="text-slate-500 mt-1">
              Manage company profile, office, documents, Sonny, Hermes, and
              operations.
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/sonny"
              className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold"
            >
              Open Sonny
            </a>

            <a
              href="/hermes"
              className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold"
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
              <h2 className="text-3xl font-bold mt-2">{company.name}</h2>
              <p className="text-slate-500 mt-2">Company ID: {company.id}</p>
              <p className="text-slate-500 mt-1">
                Status: {company.status || "Active"}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Mini title="Office" value={officeCode} />
              <Mini title="Plan" value="Premium" />
              <Mini title="Jurisdiction" value="Dubai" />
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
            <Panel title="Virtual Office">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <h3 className="text-xl font-bold">Office {officeCode}</h3>
                <p className="text-slate-500 mt-1">{officeLocation}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                  <Mini title="Mailbox" value="Active" />
                  <Mini title="VoIP" value="+971 4 XXX 047" />
                  <Mini title="Plan" value="Premium" />
                  <Mini
                    title="Status"
                    value={office ? "Active" : "Not Active"}
                  />
                </div>
              </div>
            </Panel>

            <Panel title="Documents">
              {documents.length === 0 ? (
                <p className="text-slate-500">No documents yet.</p>
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
            <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Company Health</h2>
              <p className="text-violet-100 text-sm mt-2">
                Firmic is monitoring operations, compliance, documents, AI
                activity, and office readiness.
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
              <Action href="/virtual-offices" text="Rent / Change Office" />
              <Action href="/ai-workforce" text="Manage AI Workforce" />
              <Action href="/documents" text="Upload Documents" />
              <Action href="/billing" text="View Billing" />
              <Action href="/reports" text="Generate Report" />
            </Panel>
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
      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center font-semibold"
    >
      <span>{text}</span>
      <span className="text-violet-700">›</span>
    </a>
  );
}