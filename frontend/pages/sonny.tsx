import { useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import { getSonny, getProgress } from "../services/sonnyApi";
import { getCompanyTasks, createTask } from "../services/taskApi";
import { getCompanyDocuments } from "../services/documentApi";

const agents = [
  ["Receptionist AI", "Active", "Calls and inquiries", "☎️"],
  ["Sales AI", "Active", "Leads and CRM", "📈"],
  ["Support AI", "Active", "Tickets and customers", "💬"],
  ["Executive Assistant AI", "Active", "Meetings and tasks", "📅"],
  ["Finance AI", "Active", "Invoices and billing", "💳"],
  ["Legal AI", "Active", "Contracts and documents", "⚖️"],
  ["Marketing AI", "Active", "Campaigns and content", "🎯"],
];

export default function SonnyAI() {
  const [sonny, setSonny] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [command, setCommand] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadSonny();
  }, []);

  async function loadSonny() {
    try {
      setLoading(true);

      const companyId = localStorage.getItem("company_id");

      if (!companyId) {
        setSonny(null);
        setTasks([]);
        setDocuments([]);
        return;
      }

      const [sonnyData, progressData, taskData, documentData] =
        await Promise.all([
          getSonny(companyId),
          getProgress(companyId),
          getCompanyTasks(companyId),
          getCompanyDocuments(companyId),
        ]);

      setSonny(sonnyData);
      setProgress(progressData);
      setTasks(taskData);
      setDocuments(documentData);
    } catch (err) {
      console.error(err);
      setSonny(null);
    } finally {
      setLoading(false);
    }
  }

  function showNotice(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  }

  async function handleCommand() {
    if (!command.trim()) {
      alert("Type a command for Sonny first.");
      return;
    }

    const companyId = localStorage.getItem("company_id");

    if (!companyId) {
      alert("Select or create a company first.");
      return;
    }

    const lower = command.toLowerCase();

    if (lower.startsWith("create task")) {
      const title =
        command.replace(/create task:?/i, "").trim() || "Sonny Created Task";

      await createTask({
        company_id: companyId,
        title,
        description: "Created from Sonny AI Control Center",
        status: "pending",
      });

      setCommand("");
      showNotice("Sonny created a new task.");
      await loadSonny();
      return;
    }

    if (lower.includes("summarize")) {
      showNotice(
        `Sonny summary: ${tasks.length} tasks, ${documents.length} documents, ${completedTasks} completed tasks.`
      );
      setCommand("");
      return;
    }

    if (lower.includes("progress")) {
      showNotice(`Company progress is ${progressScore}%.`);
      setCommand("");
      return;
    }

    showNotice(`Sonny received: ${command}`);
    setCommand("");
  }

  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  ).length;

  const pendingTasks = tasks.length - completedTasks;

  const progressScore =
    progress?.progress ||
    sonny?.summary?.progress ||
    (tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0);

  const alerts =
    sonny?.alerts?.length ||
    pendingTasks ||
    0;

  const health =
    sonny?.health_score ||
    sonny?.health ||
    Math.max(50, Math.min(100, progressScore + 20));

  const workflows =
    sonny?.workflows ||
    sonny?.workflow_count ||
    tasks.length + documents.length;

  const responseTime = sonny?.response_time || "1.2s";

  const activity = [
    `Sonny loaded ${tasks.length} company tasks`,
    `Sonny found ${documents.length} company documents`,
    `${completedTasks} tasks completed`,
    `${pendingTasks} tasks pending`,
    `Company progress is ${progressScore}%`,
  ];

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

        {notice && (
          <div className="mt-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 font-bold">
            {notice}
          </div>
        )}

        {loading && (
          <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-500">
            Loading Sonny from backend...
          </div>
        )}

        {!loading && !sonny && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-3xl p-6 shadow-sm text-yellow-700">
            Sonny backend data not found yet. Using company tasks and documents.
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="Active AI Agents" value="7" icon="🤖" />
          <Stat title="Company Tasks" value={String(tasks.length)} icon="✅" />
          <Stat title="Documents" value={String(documents.length)} icon="📄" />
          <Stat title="AI Utilization" value={`${health}%`} icon="⚡" />
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
                  placeholder="Try: Create task: Upload KYB documents"
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
                  onClick={() =>
                    setCommand("Summarize today’s company activity")
                  }
                />
                <Prompt
                  text="Show company progress"
                  onClick={() => setCommand("Show company progress")}
                />
                <Prompt
                  text="Create task: Review compliance documents"
                  onClick={() =>
                    setCommand("Create task: Review compliance documents")
                  }
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
                meetings, billing, documents, tasks, and daily operations.
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
                {activity.map((item) => (
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
                <Action text="Create compliance review task" />
                <Action text="Upload missing documents" />
                <Action text="Generate company health report" />
                <Action text="Connect HubSpot CRM" />
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