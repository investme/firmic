import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Bot,
  FileText,
  Settings,
  Bell,
  Moon,
  Sun,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import SonnyChat from "../components/SonnyChat";
import { getHermes } from "../services/api";

export default function Dashboard() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [dark, setDark] = useState(false);
  const [hermes, setHermes] = useState<any>(null);

  useEffect(() => {
    const savedCompanyId =
      localStorage.getItem("company_id") ||
      "fa490d00-a770-4703-b72c-fa39df766a64";

    setCompanyId(savedCompanyId);

    const loadHermes = async () => {
      try {
        const data = await getHermes(savedCompanyId);
        setHermes(data);
      } catch (error) {
        console.error("Failed to load Hermes:", error);
      }
    };

    loadHermes();
  }, []);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
        <aside className="w-64 border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="mb-8 text-2xl font-bold">Firmic</h1>

          <nav className="space-y-2">
            <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" href="/dashboard" />
            <NavItem icon={<Building2 size={18} />} label="Companies" href="/companies" />
            <NavItem icon={<Bot size={18} />} label="Sonny AI" href="/dashboard" />
            <NavItem icon={<FileText size={18} />} label="Documents" href="/documents" />
            <NavItem icon={<Settings size={18} />} label="Settings" href="/settings" />
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Firmic Dashboard</h2>
              <p className="text-slate-500 dark:text-slate-400">
                Your business operating system is live.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
                <Bell size={18} />
              </button>

              <button
                onClick={() => setDark(!dark)}
                className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900"
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </header>

          <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-4">
            <Metric title="Company Status" value="Initiated" />
            <Metric title="Sonny Actions" value="Running" />
            <Metric
              title="Hermes Compliance"
              value={hermes ? `${hermes.score}%` : "Loading"}
            />
            <Metric
              title="Missing Docs"
              value={hermes ? String(hermes.missing_documents.length) : "..."}
            />
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Company Overview</h3>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      Current company onboarding status.
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Initiated
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Info label="Company ID" value={companyId || "No company"} />
                  <Info label="Formation Stage" value="Initial setup" />
                  <Info label="Jurisdiction" value="Pending selection" />
                  <Info label="Assigned AI" value="Sonny + Hermes" />
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 text-xl font-semibold">Action Center</h3>

                <div className="space-y-3">
                  <Action icon={<CheckCircle2 size={18} />} title="Company profile created" status="Done" />
                  <Action icon={<AlertCircle size={18} />} title="Choose formation package" status="Pending" />
                  <Action icon={<AlertCircle size={18} />} title="Upload incorporation documents" status="Pending" />
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 text-xl font-semibold">Hermes Compliance Overview</h3>

                {hermes ? (
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Compliance Score
                      </p>
                      <p className="mt-1 text-4xl font-bold">{hermes.score}%</p>
                    </div>

                    <div>
                      <p className="mb-2 font-semibold">Missing Documents</p>
                      {hermes.missing_documents.length === 0 ? (
                        <p className="text-slate-500 dark:text-slate-400">
                          No missing documents.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {hermes.missing_documents.map((doc: string, index: number) => (
                            <div
                              key={index}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                            >
                              {doc}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 font-semibold">Recommendations</p>
                      {hermes.recommendations.length === 0 ? (
                        <p className="text-slate-500 dark:text-slate-400">
                          No recommendations.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {hermes.recommendations.map((rec: string, index: number) => (
                            <div
                              key={index}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
                            >
                              {rec}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400">
                    Loading Hermes...
                  </p>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <h3 className="mb-4 text-xl font-semibold">Sonny AI</h3>
                {companyId ? (
                  <SonnyChat company_id={companyId} />
                ) : (
                  <p className="text-slate-500">Create a company first.</p>
                )}
              </Card>

              <Card>
                <h3 className="text-xl font-semibold">Hermes Agent</h3>
                {hermes ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-3xl font-bold">{hermes.score}%</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Compliance health score.
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Hermes is monitoring company documents, onboarding tasks,
                      and compliance readiness.
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-slate-500">Loading Hermes...</p>
                )}
              </Card>

              <Card>
                <h3 className="text-xl font-semibold">System Health</h3>
                <p className="mt-4 text-3xl font-bold">92%</p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                  Platform running normally.
                </p>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <h3 className="mt-2 text-2xl font-bold">{value}</h3>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 break-all font-semibold">{value}</p>
    </div>
  );
}

function Action({
  icon,
  title,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium">{title}</span>
      </div>

      <span className="text-sm text-slate-500 dark:text-slate-400">
        {status}
      </span>
    </div>
  );
}