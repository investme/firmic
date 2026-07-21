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

const CORE_AGENTS = ["Sonny", "Hermes", "Julia"];

export default function AIWorkforcePage() {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [registry, setRegistry] = useState<WorkforceAgent[]>([]);
  const [jobs, setJobs] = useState<WorkforceJob[]>([]);
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
      setLoading(false);
      return;
    }

    try {
      showLoading ? setLoading(true) : setRefreshing(true);
      setError("");

      const [registryResult, jobsResult] = await Promise.all([
        getWorkforceRegistry(),
        getCompanyWorkforceJobs(workspace.id, 40),
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                AI Workforce Command
              </p>
              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                Run {workspace?.name || "your company"} with an AI team.
              </h1>
              <p className="text-slate-500 mt-2 max-w-3xl">
                Sonny receives founder requests, selects the right agent, and tracks execution.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadWorkforce(false)}
              disabled={refreshing}
              className="bg-white border border-slate-200 rounded-xl px-5 py-3 font-bold shadow-sm disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
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

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat title="Core AI Agents" value="3" icon="🤖" />
            <Stat title="Active Jobs" value={String(activeJobs.length)} icon="⚡" />
            <Stat title="Completed" value={String(completedJobs.length)} icon="✅" />
            <Stat title="Failed" value={String(failedJobs.length)} icon="⚠️" />
          </section>

          {loading ? (
            <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-8">
              Loading live workforce...
            </div>
          ) : (
            <>
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-8">
                {coreAgents.map((agent) => (
                  <AgentCard key={agent.name} agent={agent} />
                ))}
              </section>

              <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6 mt-8">
                <div className="space-y-6">
                  <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <p className="text-sm font-bold text-violet-700">
                      Delegate Work
                    </p>
                    <h2 className="text-xl font-bold mt-1">
                      Send a request to Sonny
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Leave the agent blank and Sonny will route it automatically.
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
                        className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50"
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
                        <h2 className="text-xl font-bold">Work Queue</h2>
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
                  <h2 className="text-xl font-bold">Live Activity</h2>
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
                          className="border-l-2 border-violet-200 pl-4"
                        >
                          <div className="flex justify-between gap-3">
                            <p className="font-bold">
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
          className={`px-3 py-1 rounded-full text-xs font-bold h-fit ${
            busy
              ? "bg-amber-100 text-amber-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {busy ? agent.status : "idle"}
        </span>
      </div>

      <h2 className="text-xl font-bold mt-5">{agent.name}</h2>
      <p className="text-sm font-semibold text-violet-700 mt-1">
        {agent.role}
      </p>
      <p className="text-sm text-slate-500 mt-3 min-h-[44px]">
        {agent.description}
      </p>

      <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <div className="flex justify-between gap-3">
          <p className="text-sm text-slate-500">Current assignment</p>
          <p className="text-xs font-bold">{agent.progress}%</p>
        </div>
        <p className="font-bold mt-1 truncate">
          {agent.currentJob?.title || "Ready for work"}
        </p>
        <Progress value={agent.progress} />
      </div>

      <p className="text-xs text-slate-400 mt-4">
        {agent.completed} completed job{agent.completed === 1 ? "" : "s"}
      </p>
    </article>
  );
}

function JobCard({ job }: { job: WorkforceJob }) {
  return (
    <article className="border border-slate-200 rounded-2xl p-5">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div>
          <p className="font-bold">{job.title}</p>
          <p className="text-sm text-slate-500 mt-1">
            {job.request_text}
          </p>
        </div>
        <span className="bg-violet-50 text-violet-700 px-3 py-1 rounded-full text-xs font-bold h-fit">
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

function Stat({ title, value, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Mini({ title, value }: any) {
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
