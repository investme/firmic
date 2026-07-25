import { FormEvent, useEffect, useMemo, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";
import {
  executeWorkforceJob,
  getCompanyWorkforceJobs,
  getWorkforceRegistry,
  WorkforceAgent,
  WorkforceJob,
} from "../services/workforceApi";
import {
  getCompanyLedger,
  getCompanyLedgerSummary,
} from "../services/ledgerApi";

const CORE_AGENTS = ["Sonny", "Hermes", "Julia"];

type LedgerEntry = {
  id: string;
  service: string;
  status: string;
  total_amount: number;
};

type LedgerSummary = {
  total: number;
  services?: Array<{
    service: string;
    total: number;
    entries: number;
  }>;
};

export default function AIWorkforcePage() {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [registry, setRegistry] = useState<WorkforceAgent[]>([]);
  const [jobs, setJobs] = useState<WorkforceJob[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary | null>(null);
  const [title, setTitle] = useState("");
  const [requestText, setRequestText] = useState("");
  const [preferredAgent, setPreferredAgent] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const sync = () => setWorkspace(getActiveWorkspace());
    sync();

    window.addEventListener(getWorkspaceChangedEventName(), sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(getWorkspaceChangedEventName(), sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    loadWorkforce(true);

    if (!workspace?.id) return;

    const interval = window.setInterval(() => {
      loadWorkforce(false);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [workspace?.id]);

  async function loadWorkforce(showLoading = false) {
    if (!workspace?.id) {
      setRegistry([]);
      setJobs([]);
      setLedgerEntries([]);
      setLedgerSummary(null);
      setLoading(false);
      return;
    }

    try {
      showLoading ? setLoading(true) : setRefreshing(true);
      setError("");

      const [
        registryResult,
        jobsResult,
        ledgerEntriesResult,
        ledgerSummaryResult,
      ] = await Promise.all([
        getWorkforceRegistry(),
        getCompanyWorkforceJobs(workspace.id, 40),
        getCompanyLedger(workspace.id),
        getCompanyLedgerSummary(workspace.id),
      ]);

      setRegistry(
        Array.isArray(registryResult)
          ? registryResult
          : Array.isArray(registryResult?.agents)
          ? registryResult.agents
          : []
      );

      setJobs(
        Array.isArray(jobsResult)
          ? jobsResult
          : Array.isArray(jobsResult?.jobs)
          ? jobsResult.jobs
          : []
      );

      setLedgerEntries(
        Array.isArray(ledgerEntriesResult)
          ? ledgerEntriesResult.filter(
              (entry: LedgerEntry) => entry.status !== "void"
            )
          : []
      );

      setLedgerSummary(ledgerSummaryResult || null);
    } catch (err: any) {
      setError(err?.message || "Failed to load AI workforce.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function submitRequest(event: FormEvent) {
    event.preventDefault();

    if (!workspace?.id) {
      setError("Select a company first.");
      return;
    }

    if (!requestText.trim()) {
      setError("Enter a workforce request.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setNotice("");

      const response = await executeWorkforceJob({
        company_id: workspace.id,
        title: title.trim() || "Founder workforce request",
        request_text: requestText.trim(),
        preferred_agent: preferredAgent || undefined,
        source_type: "dashboard",
      });

      const createdJob = response?.job || response;

      if (createdJob?.id) {
        setJobs((current) => [createdJob, ...current]);
      }

      setNotice(
        `${createdJob?.assigned_agent || "Sonny"} accepted the request.`
      );
      setTitle("");
      setRequestText("");
      setPreferredAgent("");

      await loadWorkforce(false);
    } catch (err: any) {
      setError(err?.message || "Could not create workforce request.");
    } finally {
      setSubmitting(false);
    }
  }

  const coreAgents = useMemo(() => {
    const byName = new Map(
      registry.map((agent) => [agent.name.toLowerCase(), agent])
    );

    return CORE_AGENTS.map((name) => {
      const definition = byName.get(name.toLowerCase());
      const agentJobs = jobs.filter(
        (job) => job.assigned_agent?.toLowerCase() === name.toLowerCase()
      );
      const currentJob = agentJobs.find((job) =>
        ["pending", "accepted", "working"].includes(job.status)
      );

      return {
        name,
        role:
          definition?.role ||
          (name === "Sonny"
            ? "AI Chief Operating Officer"
            : name === "Hermes"
            ? "AI Compliance Officer"
            : "AI Growth Officer"),
        description:
          definition?.description || "Firmic AI workforce agent.",
        status: currentJob?.status || definition?.default_status || "idle",
        progress: currentJob?.progress || 0,
        currentJob,
        completed: agentJobs.filter((job) => job.status === "completed")
          .length,
      };
    });
  }, [jobs, registry]);

  const activeJobs = jobs.filter((job) =>
    ["pending", "accepted", "working"].includes(job.status)
  );
  const completedJobs = jobs.filter((job) => job.status === "completed");
  const failedJobs = jobs.filter((job) => job.status === "failed");

  const activeAIEmployees = ledgerEntries.filter(
    (entry) => entry.service === "ai_workforce"
  ).length;

  const workforcePayroll = Number(
    ledgerSummary?.services?.find(
      (service) => service.service === "ai_workforce"
    )?.total || 0
  );

  const companyOperatingCost = Number(ledgerSummary?.total || 0);

  const timeline = useMemo(
    () =>
      jobs
        .flatMap((job) =>
          (job.timeline || []).map((event) => ({
            ...event,
            jobTitle: job.title,
          }))
        )
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        ),
    [jobs]
  );

  const automationScore =
    jobs.length === 0
      ? 0
      : Math.round((completedJobs.length / Math.max(jobs.length, 1)) * 100);

  const departments = [
    { name: "Executive", active: true },
    { name: "Operations", active: true },
    { name: "Compliance", active: true },
    { name: "Growth", active: true },
    { name: "Finance", active: false },
    { name: "Customer Success", active: false },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">AI Workforce</p>
              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                Run {workspace?.name || "your company"} with an AI executive team.
              </h1>
              <p className="text-slate-500 mt-2 max-w-3xl">
                Delegate work, monitor execution, and expand your company with
                specialized AI employees.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/configure-office?mode=workforce"
                className="bg-violet-600 text-white rounded-xl px-5 py-3 font-bold hover:bg-violet-700 transition"
              >
                Add AI Employees
              </a>

              <a
                href="#delegate-work"
                className="bg-white border border-slate-200 rounded-xl px-5 py-3 font-bold shadow-sm"
              >
                Delegate Work
              </a>

              <button
                type="button"
                onClick={() => loadWorkforce(false)}
                disabled={refreshing}
                className="bg-white border border-slate-200 rounded-xl px-5 py-3 font-bold shadow-sm disabled:opacity-50"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </header>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
              {error}
            </div>
          )}

          {notice && (
            <div className="mt-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4">
              {notice}
            </div>
          )}

          <section className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.85fr] gap-6 mt-8">
            <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-slate-950 text-white rounded-3xl p-6 xl:p-8 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-violet-200 font-bold">
                Workforce Overview
              </p>
              <h2 className="text-3xl font-bold mt-2">
                Your AI company is operational.
              </h2>
              <p className="text-violet-100 mt-3 max-w-2xl">
                Sonny coordinates execution across operations, compliance, and
                growth while tracking every job from request to completion.
              </p>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-7">
                <HeroMetric label="Active AI Employees" value={String(activeAIEmployees)} />
                <HeroMetric label="Live Jobs" value={String(activeJobs.length)} />
                <HeroMetric
                  label="Completed"
                  value={String(completedJobs.length)}
                />
                <HeroMetric
                  label="Automation Score"
                  value={`${automationScore}%`}
                />
              </div>
            </div>

            <section className="bg-slate-950 text-white rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center text-2xl">
                  👔
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-violet-200 font-bold">
                    Sonny AI COO
                  </p>
                  <h2 className="text-xl font-bold">Executive Brief</h2>
                </div>
              </div>

              <p className="text-slate-300 mt-5 leading-7">
                {activeJobs.length > 0
                  ? `${activeJobs.length} workforce job${
                      activeJobs.length === 1 ? " is" : "s are"
                    } currently in progress.`
                  : "Your AI executives are ready for new founder requests."}
              </p>

              <div className="mt-5 space-y-3">
                <BriefRow
                  label="Hermes"
                  value={
                    coreAgents.find((agent) => agent.name === "Hermes")
                      ?.currentJob?.title || "Compliance ready"
                  }
                />
                <BriefRow
                  label="Julia"
                  value={
                    coreAgents.find((agent) => agent.name === "Julia")
                      ?.currentJob?.title || "Growth ready"
                  }
                />
                <BriefRow
                  label="Sonny"
                  value={
                    coreAgents.find((agent) => agent.name === "Sonny")
                      ?.currentJob?.title || "Orchestration ready"
                  }
                />
              </div>

              <div className="mt-5 rounded-2xl bg-white/10 border border-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-violet-200 font-bold">
                  Suggested Action
                </p>
                <p className="text-sm mt-2">
                  Add a Finance AI employee to automate invoice reviews,
                  expense monitoring, and monthly reporting.
                </p>
              </div>
            </section>
          </section>

          <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 mt-6">
            <Stat
              title="AI Employees"
              value={`${activeAIEmployees} / 15`}
              icon="🤖"
            />
            <Stat title="Departments" value="4" icon="🏢" />
            <Stat title="Active Jobs" value={String(activeJobs.length)} icon="⚡" />
            <Stat title="Completed" value={String(completedJobs.length)} icon="✅" />
            <Stat title="Failed" value={String(failedJobs.length)} icon="⚠️" />
            <Stat
              title="AI Workforce Payroll"
              value={`$${workforcePayroll.toFixed(2)}`}
              icon="💼"
            />
            <Stat
              title="Company Operating Cost"
              value={`$${companyOperatingCost.toFixed(2)}`}
              icon="💳"
            />
          </section>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
            <span className="font-bold text-slate-900">Billing clarity:</span>{" "}
            AI Workforce Payroll includes only AI employee charges. Company
            Operating Cost includes the complete PostgreSQL Usage Ledger,
            including headquarters, meetings, setup fees, and AI workforce.
          </div>

          {loading ? (
            <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-8">
              Loading live workforce...
            </div>
          ) : (
            <>
              <section className="mt-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-violet-700 font-bold">
                      AI Executives
                    </p>
                    <h2 className="text-2xl font-bold text-slate-950 mt-1">
                      Your operating leadership team
                    </h2>
                  </div>

                  <span className="bg-green-50 text-green-700 border border-green-100 px-4 py-2 rounded-full text-sm font-bold w-fit">
                    Live orchestration enabled
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
                  {coreAgents.map((agent) => (
                    <AgentCard key={agent.name} agent={agent} />
                  ))}
                </div>
              </section>

              <section className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-violet-700 font-bold">
                      Department Coverage
                    </p>
                    <h2 className="text-xl font-bold text-slate-950 mt-1">
                      Company functions supported by AI
                    </h2>
                  </div>

                  <p className="text-sm text-slate-500">
                    {Math.min(activeAIEmployees, 6)} of 6 core departments covered
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {departments.map((department) => (
                    <div
                      key={department.name}
                      className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-3 w-3 rounded-full ${
                            department.active ? "bg-green-500" : "bg-slate-300"
                          }`}
                        />
                        <span className="font-semibold text-slate-800">
                          {department.name}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-bold rounded-full px-3 py-1 ${
                          department.active
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {department.active ? "Covered" : "Available"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6 mt-8">
                <div className="space-y-6">
                  <section
                    id="delegate-work"
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm scroll-mt-6"
                  >
                    <p className="text-sm font-bold text-violet-700">
                      Delegate Work
                    </p>
                    <h2 className="text-xl font-bold mt-1">
                      Send a request to Sonny
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Leave the agent blank and Sonny will route the work
                      automatically.
                    </p>

                    <form onSubmit={submitRequest} className="mt-5 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Request title">
                          <input
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="Review incorporation documents"
                            className="input"
                          />
                        </Field>

                        <Field label="Preferred agent">
                          <select
                            value={preferredAgent}
                            onChange={(event) =>
                              setPreferredAgent(event.target.value)
                            }
                            className="input bg-white"
                          >
                            <option value="">Let Sonny decide</option>
                            {coreAgents.map((agent) => (
                              <option
                                key={agent.name}
                                value={agent.name.toLowerCase()}
                              >
                                {agent.name} — {agent.role}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>

                      <Field label="Founder request">
                        <textarea
                          value={requestText}
                          onChange={(event) =>
                            setRequestText(event.target.value)
                          }
                          rows={4}
                          placeholder="Describe the work you need completed..."
                          className="input resize-none"
                        />
                      </Field>

                      <button
                        type="submit"
                        disabled={submitting || !workspace?.id}
                        className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-violet-700 transition"
                      >
                        {submitting
                          ? "Sending..."
                          : "Delegate to AI Workforce"}
                      </button>
                    </form>
                  </section>

                  <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-violet-700 font-bold">
                          Execution
                        </p>
                        <h2 className="text-xl font-bold mt-1">Work Queue</h2>
                        <p className="text-sm text-slate-500 mt-1">
                          Live jobs from the workforce orchestrator.
                        </p>
                      </div>
                      <span className="bg-violet-50 text-violet-700 px-3 py-1 rounded-full text-xs font-bold h-fit">
                        Auto-refresh 8s
                      </span>
                    </div>

                    {jobs.length === 0 ? (
                      <Empty text="No workforce jobs yet." />
                    ) : (
                      <div className="space-y-4 mt-5">
                        {jobs.slice(0, 12).map((job) => (
                          <JobCard key={job.id} job={job} />
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit">
                  <p className="text-xs uppercase tracking-[0.18em] text-violet-700 font-bold">
                    Live Operations
                  </p>
                  <h2 className="text-xl font-bold mt-1">
                    Workforce Timeline
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Events from Sonny and the assigned agents.
                  </p>

                  {timeline.length === 0 ? (
                    <Empty text="No workforce activity yet." />
                  ) : (
                    <div className="mt-6 space-y-5">
                      {timeline.slice(0, 20).map((event) => (
                        <div
                          key={`${event.id}-${event.created_at}`}
                          className="relative border-l-2 border-violet-200 pl-5"
                        >
                          <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-violet-600 border-2 border-white" />

                          <div className="flex justify-between gap-3">
                            <p className="font-bold text-slate-950">
                              {event.actor || "AI Workforce"}
                            </p>
                            <p className="text-xs text-slate-400 whitespace-nowrap">
                              {formatTime(event.created_at)}
                            </p>
                          </div>
                          <p className="text-sm text-slate-800 mt-1">
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-sm text-slate-500 mt-1">
                              {event.description}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-2">
                            {event.jobTitle}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}

          <style jsx>{`
            .input {
              margin-top: 0.5rem;
              width: 100%;
              border: 1px solid rgb(226 232 240);
              border-radius: 0.75rem;
              padding: 0.75rem 1rem;
              outline: none;
            }
            .input:focus {
              box-shadow: 0 0 0 2px rgb(221 214 254);
            }
          `}</style>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
      <p className="text-xs text-violet-200">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-right text-slate-100 max-w-[65%] truncate">
        {value}
      </span>
    </div>
  );
}

function AgentCard({ agent }: { agent: any }) {
  const busy = ["pending", "accepted", "working"].includes(agent.status);

  return (
    <article className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex justify-between">
        <div className="h-14 w-14 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl">
          {agent.name === "Sonny"
            ? "🧠"
            : agent.name === "Hermes"
            ? "🛡️"
            : "📈"}
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold h-fit capitalize ${
            busy
              ? "bg-amber-100 text-amber-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {busy ? agent.status : "Ready"}
        </span>
      </div>

      <h2 className="text-xl font-bold mt-5 text-slate-950">{agent.name}</h2>
      <p className="text-sm font-semibold text-violet-700 mt-1">
        {agent.role}
      </p>
      <p className="text-sm text-slate-500 mt-3 min-h-[44px]">
        {agent.description}
      </p>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <Mini
          title="Department"
          value={
            agent.name === "Sonny"
              ? "Executive"
              : agent.name === "Hermes"
              ? "Compliance"
              : "Growth"
          }
        />
        <Mini title="Completed" value={String(agent.completed)} />
      </div>

      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <div className="flex justify-between gap-3">
          <p className="text-sm text-slate-500">Current assignment</p>
          <p className="text-xs font-bold">{agent.progress}%</p>
        </div>
        <p className="font-bold mt-1 truncate text-slate-900">
          {agent.currentJob?.title || "Ready for work"}
        </p>
        <Progress value={agent.progress} />
      </div>

      <a
        href={
          agent.name === "Sonny"
            ? "/sonny"
            : agent.name === "Hermes"
            ? "/hermes"
            : "#delegate-work"
        }
        className="mt-5 block text-center w-full border border-violet-200 text-violet-700 rounded-xl py-3 font-bold hover:bg-violet-50 transition"
      >
        {agent.name === "Julia" ? "Delegate Work" : `Open ${agent.name}`}
      </a>
    </article>
  );
}

function JobCard({ job }: { job: WorkforceJob }) {
  const statusClass =
    job.status === "completed"
      ? "bg-green-50 text-green-700"
      : job.status === "failed"
      ? "bg-red-50 text-red-700"
      : "bg-violet-50 text-violet-700";

  return (
    <article className="border border-slate-200 rounded-2xl p-5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-950">{job.title}</p>
          <p className="text-sm text-slate-500 mt-1">{job.request_text}</p>
        </div>

        <span
          className={`${statusClass} px-3 py-1 rounded-full text-xs font-bold h-fit capitalize`}
        >
          {job.status}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <Mini title="Agent" value={job.assigned_agent || "Sonny"} />
        <Mini title="Role" value={job.assigned_role || "AI Workforce"} />
        <Mini title="Progress" value={`${job.progress || 0}%`} />
        <Mini title="Created" value={formatTime(job.created_at)} />
      </div>

      <Progress value={job.progress || 0} />

      {job.result_summary && (
        <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-green-800">
          {job.result_summary}
        </div>
      )}

      {job.failure_reason && (
        <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-3 text-sm text-red-700">
          {job.failure_reason}
        </div>
      )}
    </article>
  );
}

function Progress({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));

  return (
    <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-violet-600 rounded-full transition-all"
        style={{ width: `${safe}%` }}
      />
    </div>
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
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1 text-slate-950">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-0">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="text-sm font-bold mt-1 break-words">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-slate-500">
      {text}
    </div>
  );
}

function formatTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
