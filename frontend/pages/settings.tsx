import { useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";

export default function Settings() {
  const [notice, setNotice] = useState("");

  const companyName =
    typeof window !== "undefined"
      ? localStorage.getItem("company_name") || "Active Company"
      : "Active Company";

  const companyId =
    typeof window !== "undefined"
      ? localStorage.getItem("company_id") || "No company selected"
      : "No company selected";

  const plan =
    typeof window !== "undefined"
      ? localStorage.getItem("company_plan") || "Premium"
      : "Premium";

  function showNotice(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">Settings</p>

              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                Manage workspace settings.
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Configure company profile, security, notifications, billing
                preferences, integrations, and Firmic system settings for{" "}
                {companyName}.
              </p>
            </div>

            <button
              onClick={() => showNotice("Settings saved successfully.")}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition"
            >
              Save Settings
            </button>
          </header>

          {notice && (
            <div className="mt-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 font-bold">
              {notice}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat title="Company" value={companyName} icon="🏢" />
            <Stat title="Plan" value={plan} icon="⭐" />
            <Stat title="Security" value="Enabled" icon="🔐" />
            <Stat title="System" value="Healthy" icon="✅" />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
            <div className="space-y-6">
              <Panel title="Company Settings">
                <Field label="Company Name" value={companyName} />
                <Field label="Company ID" value={companyId} disabled />
                <Field label="Jurisdiction" value="Abu Dhabi" />
                <Field label="Plan" value={plan} />
              </Panel>

              <Panel title="Security & Access">
                <Toggle title="JWT Authentication" value="Enabled" />
                <Toggle title="Protected Routes" value="Enabled" />
                <Toggle title="Tenant Isolation" value="Enabled" />
                <Toggle title="Admin Controls" value="MVP Mode" />
              </Panel>

              <Panel title="Notifications">
                <Toggle title="Sonny operational alerts" value="Enabled" />
                <Toggle title="Hermes compliance alerts" value="Enabled" />
                <Toggle title="Billing reminders" value="Enabled" />
                <Toggle title="Weekly reports" value="Disabled" />
              </Panel>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">Firmic System Status</h2>

                <p className="text-violet-100 text-sm mt-2">
                  Firmic is running with PostgreSQL, JWT authentication, Sonny
                  memory, Hermes compliance, and protected workspace pages.
                </p>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <Mini title="Backend" value="Online" />
                  <Mini title="Database" value="PostgreSQL" />
                  <Mini title="Auth" value="JWT" />
                  <Mini title="Version" value="1.1.0" />
                </div>
              </div>

              <Panel title="Billing Preferences">
                <Toggle title="Auto-pay" value="Enabled" />
                <Toggle title="Invoice emails" value="Enabled" />
                <Toggle title="AED display" value="Enabled" />
                <Toggle title="Usage alerts" value="Enabled" />
              </Panel>

              <Panel title="Data & Integrations">
                <Action text="Open Integrations" href="/integrations" />
                <Action text="Open Billing Center" href="/billing" />
                <Action text="Open Company Control Center" href="/company" />
                <Action text="Open Reports Center" href="/reports" />
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
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm overflow-hidden">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-xl font-bold mt-1 truncate">{value}</p>
    </div>
  );
}

function Panel({ title, children }: any) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-5">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, value, disabled = false }: any) {
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      <input
        defaultValue={value}
        disabled={disabled}
        className="w-full mt-2 border border-slate-200 rounded-xl p-3 outline-none focus:border-violet-500 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
}

function Toggle({ title, value }: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
      <span className="font-semibold">{title}</span>
      <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold">
        {value}
      </span>
    </div>
  );
}

function Mini({ title, value }: any) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 text-center">
      <p className="text-xs text-violet-100">{title}</p>
      <p className="font-bold text-lg">{value}</p>
    </div>
  );
}

function Action({ text, href }: any) {
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