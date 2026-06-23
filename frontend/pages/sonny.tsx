import { useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import { getSonny } from "../services/api";

const agents = [
  ["Receptionist AI", "Active", "18 calls answered", "☎️"],
  ["Sales AI", "Active", "4 leads generated", "📈"],
  ["Support AI", "Active", "12 tickets resolved", "💬"],
  ["Executive Assistant AI", "Active", "3 meetings scheduled", "📅"],
  ["Finance AI", "Active", "16 invoices processed", "💳"],
  ["Legal AI", "Active", "4 documents drafted", "⚖️"],
  ["Marketing AI", "Active", "2 campaigns published", "🎯"],
];

const fallbackActivity = [
  "10:42 · Receptionist AI answered a sales inquiry",
  "10:15 · Sales AI created a CRM lead",
  "09:58 · Mailbox AI scanned a new document",
  "09:30 · Executive Assistant scheduled a meeting",
  "09:12 · Finance AI generated an invoice",
];

export default function SonnyAI() {
  const [sonny, setSonny] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [command, setCommand] = useState("");

  useEffect(() => {
    loadSonny();
  }, []);

  async function loadSonny() {
    try {
      setLoading(true);

      const companyId = localStorage.getItem("company_id");

      if (!companyId) {
        setSonny(null);
        return;
      }

      const data = await getSonny(companyId);
      setSonny(data);
    } catch (err) {
      console.error(err);
      setSonny(null);
    } finally {
      setLoading(false);
    }
  }

  function handleCommand() {
    if (!command.trim()) {
      alert("Type a command for Sonny first.");
      return;
    }

    alert(`Sonny received: ${command}`);
    setCommand("");
  }

  const health = sonny?.health_score || sonny?.health || 96;
  const workflows = sonny?.workflows || sonny?.workflow_count || 28;
  const alerts = sonny?.alerts || sonny?.alert_count || 3;
  const responseTime = sonny?.response_time || "1.2s";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Sonny AI" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              Sonny AI Control Center
            </h1>
            <p className="text-slate-500 mt-1">
              Monitor, command, and coordinate your AI workforce from one place.
            </p>
          </div>

          <button
            onClick={loadSonny}
            className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            Refresh Sonny
          </button>
        </header>

        {loading && (
          <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-500">
            Loading Sonny from backend...
          </div>
        )}

        {!loading && !sonny && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-3xl p-6 shadow-sm text-yellow-700">
            Sonny backend data not found yet. Showing demo operating data.
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="Active AI Agents" value="7" icon="🤖" />
          <Stat title="Tasks Today" value="184" icon="✅" />
          <Stat title="Calls Answered" value="142" icon="☎️" />
          <Stat title="AI Utilization" value="91%" icon="⚡" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Ask Sonny</h2>

              <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <textarea
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  className="w-full bg-transparent outline-none min-h-[120px]"
                  placeholder="Ask Sonny anything about your company..."
                />

                <button
                  onClick={handleCommand}
                  className="mt-4 bg-violet-600 text-white px-6 py-3 rounded-xl font-bold"
                >
                  Send Command
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
                <Prompt
                  text="Summarize today’s company activity"
                  onClick={() => setCommand("Summarize today’s company activity")}
                />
                <Prompt
                  text="Show CRM pipeline health"
                  onClick={() => setCommand("Show CRM pipeline health")}
                />
                <Prompt
                  text="Book a meeting room tomorrow"
                  onClick={() => setCommand("Book a meeting room tomorrow")}
                />
                <Prompt
                  text="Recommend my next AI hire"
                  onClick={() => setCommand("Recommend my next AI hire")}
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">AI Workforce Status</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                {agents.map(([name, status, output, icon]) => (
                  <div
                    key={name}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl">
                        {icon}
                      </div>

                      <div>
                        <p className="font-bold">{name}</p>
                        <p className="text-sm text-slate-500">{output}</p>
                      </div>
                    </div>

                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Sonny Overview</h2>
              <p className="text-violet-100 text-sm mt-2">
                Sonny coordinates your AI workforce across calls, CRM, mailbox,
                meetings, billing, and daily operations.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <Mini title="Health" value={`${health}%`} />
                <Mini title="Response" value={String(responseTime)} />
                <Mini title="Workflows" value={String(workflows)} />
                <Mini title="Alerts" value={String(alerts)} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Live Activity</h2>

              <div className="mt-5 space-y-3">
                {fallbackActivity.map((item) => (
                  <div
                    key={item}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Recommended Actions</h2>

              <div className="mt-5 space-y-3">
                <Action text="Hire HR AI" />
                <Action text="Connect HubSpot" />
                <Action text="Upgrade to Premium Office" />
                <Action text="Enable WhatsApp Business" />
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

function Prompt({ text, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white border border-slate-200 rounded-2xl p-4 font-semibold hover:border-violet-500"
    >
      {text}
    </button>
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

function Action({ text }: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
      <span className="font-semibold">{text}</span>
      <button className="text-violet-700 font-bold">Apply</button>
    </div>
  );
}