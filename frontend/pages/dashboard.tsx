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

export default function Dashboard() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setCompanyId(localStorage.getItem("company_id"));
  }, []);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white flex">
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5">
          <h1 className="text-2xl font-bold mb-8">Firmic</h1>

          <nav className="space-y-2">
            <NavItem icon={<LayoutDashboard size={18} />} label="Dashboard" href="/dashboard" />
            <NavItem icon={<Building2 size={18} />} label="Companies" href="/companies" />
            <NavItem icon={<Bot size={18} />} label="Sonny AI" href="/dashboard" />
            <NavItem icon={<FileText size={18} />} label="Documents" href="/documents" />
            <NavItem icon={<Settings size={18} />} label="Settings" href="/settings" />
          </nav>
        </aside>

        <main className="flex-1 p-8">
          <header className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold">Firmic Dashboard</h2>
              <p className="text-slate-500 dark:text-slate-400">
                Your business operating system is live.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <Bell size={18} />
              </button>

              <button
                onClick={() => setDark(!dark)}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
            <Metric title="Company Status" value="Initiated" />
            <Metric title="Sonny Actions" value="Running" />
            <Metric title="Compliance" value="Clean" />
            <Metric title="Documents" value="0" />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Company Overview</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      Current company onboarding status.
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Initiated
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Info label="Company ID" value={companyId || "No company"} />
                  <Info label="Formation Stage" value="Initial setup" />
                  <Info label="Jurisdiction" value="Pending selection" />
                  <Info label="Assigned AI" value="Sonny" />
                </div>
              </Card>

              <Card>
                <h3 className="text-xl font-semibold mb-4">Action Center</h3>

                <div className="space-y-3">
                  <Action icon={<CheckCircle2 size={18} />} title="Company profile created" status="Done" />
                  <Action icon={<AlertCircle size={18} />} title="Choose formation package" status="Pending" />
                  <Action icon={<AlertCircle size={18} />} title="Upload incorporation documents" status="Pending" />
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <h3 className="text-xl font-semibold mb-4">Sonny AI</h3>
                {companyId ? (
                  <SonnyChat company_id={companyId} />
                ) : (
                  <p className="text-slate-500">Create a company first.</p>
                )}
              </Card>

              <Card>
                <h3 className="text-xl font-semibold">System Health</h3>
                <p className="text-3xl font-bold mt-4">92%</p>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
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
      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-sm font-medium transition"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <h3 className="text-2xl font-bold mt-2">{value}</h3>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="font-semibold mt-1 break-all">{value}</p>
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
    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
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