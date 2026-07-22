import { useEffect, useMemo, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import {
  acceptSonnyAssignment,
  approveSonnyAssignment,
  approveSonnyOrchestration,
  getProgress,
  getSonny,
  getSonnyAgents,
  getSonnyOrchestrations,
  SonnyAgent,
  SonnyAssignment,
  SonnyOrchestrationRun,
  startSonnyAssignment,
  startSonnyOrchestration,
} from "../services/sonnyApi";
import { createTask, getCompanyTasks } from "../services/taskApi";
import { getCompanyDocuments } from "../services/documentApi";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";
import { readCompanyStorage } from "../src/utils/companyStorage";

type Dashboard = {
  sonny: any;
  progress: any;
  tasks: any[];
  documents: any[];
  agents: SonnyAgent[];
  runs: SonnyOrchestrationRun[];
};

const emptyDashboard: Dashboard = {
  sonny: null,
  progress: null,
  tasks: [],
  documents: [],
  agents: [],
  runs: [],
};

const array = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? value : [];

function label(value?: string | null) {
  if (!value) return "Unknown";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusStyle(status?: string) {
  if (["completed", "active"].includes(status || "")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (["running", "accepted"].includes(status || "")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (status === "approved") {
    return "bg-violet-50 text-violet-700 border-violet-200";
  }
  if (["awaiting_approval", "pending", "queued"].includes(status || "")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (["failed", "cancelled"].includes(status || "")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function date(value?: string | null) {
  if (!value) return "Not started";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export default function SonnyAI() {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [data, setData] = useState<Dashboard>(emptyDashboard);
  const [integrations, setIntegrations] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");

  useEffect(() => {
    const sync = () => setWorkspace(getActiveWorkspace());
    sync();
    window.addEventListener(getWorkspaceChangedEventName(), sync);
    window.addEventListener("firmic-company-data-changed", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(getWorkspaceChangedEventName(), sync);
      window.removeEventListener("firmic-company-data-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!workspace?.id) {
      setData(emptyDashboard);
      setIntegrations([]);
      setLoading(false);
      return;
    }

    setIntegrations(
      readCompanyStorage<string[]>("integrations", [])
    );
    load();
  }, [workspace?.id]);

  async function load() {
    if (!workspace?.id) return;

    setLoading(true);
    setWarning("");

    const results = await Promise.allSettled([
      getSonny(workspace.id),
      getProgress(workspace.id),
      getCompanyTasks(workspace.id),
      getCompanyDocuments(workspace.id),
      getSonnyAgents(),
      getSonnyOrchestrations(workspace.id),
    ]);

    const failed: string[] = [];

    const pick = <T,>(
      result: PromiseSettledResult<T>,
      fallback: T,
      name: string
    ) => {
      if (result.status === "fulfilled") return result.value;
      failed.push(name);
      return fallback;
    };

    const orchestration = pick(
      results[5],
      { runs: [] as SonnyOrchestrationRun[] },
      "orchestration engine"
    );

    setData({
      sonny: pick(results[0], null, "company state"),
      progress: pick(results[1], null, "progress"),
      tasks: array(pick(results[2], [], "tasks")),
      documents: array(pick(results[3], [], "documents")),
      agents: array(pick(results[4], [], "agent registry")),
      runs: array(orchestration.runs),
    });

    if (failed.length) {
      setWarning(
        `Some services are unavailable: ${failed.join(
          ", "
        )}. Sonny is showing all available intelligence.`
      );
    }

    setLoading(false);
  }

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function perform(
    key: string,
    action: () => Promise<any>,
    message: string
  ) {
    try {
      setWorking(key);
      setWarning("");
      await action();
      flash(message);
      await load();
    } catch (error: any) {
      setWarning(error?.message || "The action could not be completed.");
    } finally {
      setWorking("");
    }
  }

  const completedTasks = data.tasks.filter(
    (task) => task.status === "completed"
  ).length;
  const pendingTasks = data.tasks.length - completedTasks;
  const score =
    data.progress?.progress ??
    data.sonny?.summary?.progress ??
    (data.tasks.length
      ? Math.round((completedTasks / data.tasks.length) * 100)
      : 0);

  const assignments = useMemo(
    () =>
      data.runs.flatMap((run) =>
        array<SonnyAssignment>(run.assignments).map((assignment) => ({
          ...assignment,
          runId: run.id,
        }))
      ),
    [data.runs]
  );

  const activeAgents = data.agents.filter(
    (agent) => !agent.status || agent.status === "active"
  ).length;
  const runningRuns = data.runs.filter(
    (run) => run.status === "running"
  ).length;
  const completedRuns = data.runs.filter(
    (run) => run.status === "completed"
  ).length;
  const activeAssignments = assignments.filter((item) =>
    ["awaiting_approval", "approved", "accepted", "running"].includes(
      item.status || ""
    )
  ).length;
  const pendingApprovals =
    data.runs.filter((run) => run.status === "awaiting_approval").length +
    assignments.filter(
      (item) => item.status === "awaiting_approval"
    ).length;

  const summary = `${workspace?.name || "The company"} is at ${score}% progress. ${activeAgents} agents are active, ${runningRuns} orchestration runs are executing, ${pendingApprovals} approvals are pending, and ${pendingTasks} tasks remain open.`;

  async function send() {
    const clean = command.trim();
    if (!clean || !workspace?.id) return;

    if (clean.toLowerCase().startsWith("create task")) {
      const title =
        clean.replace(/create task:?/i, "").trim() ||
        "Sonny Created Task";

      await perform(
        "command",
        () =>
          createTask({
            company_id: workspace.id,
            title,
            description: "Created by Sonny AI COO",
            status: "pending",
          }),
        "Sonny created the task."
      );
      setCommand("");
      return;
    }

    if (clean.toLowerCase().includes("summarize")) {
      flash(summary);
    } else if (clean.toLowerCase().includes("orchestration")) {
      flash(
        `${runningRuns} runs are active and ${pendingApprovals} items require approval.`
      );
    } else {
      flash(`Sonny received the command: ${clean}`);
    }
    setCommand("");
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar active="Sonny AI COO" />
        <main className="flex-1 p-5 lg:p-8 overflow-hidden">
          <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
            <div>
              <p className="text-sm font-black text-violet-700 uppercase tracking-wider">
                Sonny AI COO
              </p>
              <h1 className="text-3xl lg:text-4xl font-black mt-2">
                Executive Command Center
              </h1>
              <p className="text-slate-500 mt-2 max-w-3xl">
                Live operations, agent execution, and approvals for{" "}
                <strong>{workspace?.name || "the active company"}</strong>.
              </p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="bg-slate-950 text-white px-6 py-3 rounded-2xl font-bold disabled:bg-slate-300"
            >
              {loading ? "Refreshing..." : "Refresh Command Center"}
            </button>
          </header>

          {notice && (
            <div className="mt-6 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 font-semibold">
              {notice}
            </div>
          )}
          {warning && (
            <div className="mt-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 font-semibold">
              {warning}
            </div>
          )}

          {!workspace?.id ? (
            <Card title="Select a company">
              <p className="text-slate-500">
                Sonny requires an active tenant workspace.
              </p>
            </Card>
          ) : (
            <>
              <section className="grid sm:grid-cols-2 xl:grid-cols-6 gap-4 mt-8">
                <Metric title="Company Health" value={`${score}%`} />
                <Metric title="Active Agents" value={activeAgents} />
                <Metric title="Running Runs" value={runningRuns} />
                <Metric title="Active Assignments" value={activeAssignments} />
                <Metric title="Pending Approvals" value={pendingApprovals} />
                <Metric title="Completed Runs" value={completedRuns} />
              </section>

              <section className="grid xl:grid-cols-[1.45fr_0.75fr] gap-6 mt-6">
                <div className="space-y-6 min-w-0">
                  <Card title="Executive Summary">
                    <div className="bg-slate-950 text-white rounded-3xl p-6">
                      <p className="text-lg leading-8">{summary}</p>
                      <div className="grid sm:grid-cols-4 gap-3 mt-6">
                        <Mini title="Tasks" value={data.tasks.length} />
                        <Mini title="Documents" value={data.documents.length} />
                        <Mini title="Integrations" value={integrations.length} />
                        <Mini title="Runs" value={data.runs.length} />
                      </div>
                    </div>
                  </Card>

                  <Card title="Ask Sonny">
                    <textarea
                      value={command}
                      onChange={(event) => setCommand(event.target.value)}
                      className="w-full min-h-[125px] bg-slate-50 border rounded-2xl p-5"
                      placeholder="Try: Summarize company operations"
                    />
                    <div className="flex flex-wrap gap-3 mt-4">
                      <button
                        onClick={send}
                        disabled={working === "command"}
                        className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold disabled:bg-slate-300"
                      >
                        Send Command
                      </button>
                      {[
                        "Summarize company operations",
                        "Show orchestration status",
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => setCommand(prompt)}
                          className="border px-4 py-3 rounded-xl text-sm font-semibold"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </Card>

                  <Card title="Multi-Agent Orchestration">
                    {data.runs.length === 0 ? (
                      <Empty text="No orchestration runs yet. Create the first run through Swagger B.5.4." />
                    ) : (
                      <div className="space-y-4">
                        {data.runs.slice(0, 8).map((run) => (
                          <div
                            key={run.id}
                            className="border rounded-2xl p-5"
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h3 className="font-black">
                                    {label(run.orchestration_type)}
                                  </h3>
                                  <Status value={run.status} />
                                </div>
                                <p className="text-sm text-slate-500 mt-2">
                                  {array(run.assignments).length} assignments ·{" "}
                                  {date(run.created_at)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {run.status === "awaiting_approval" && (
                                  <Button
                                    text="Approve"
                                    busy={working === `run-approve-${run.id}`}
                                    onClick={() =>
                                      perform(
                                        `run-approve-${run.id}`,
                                        () =>
                                          approveSonnyOrchestration(
                                            workspace.id,
                                            run.id
                                          ),
                                        "Orchestration approved."
                                      )
                                    }
                                  />
                                )}
                                {run.status === "approved" && (
                                  <Button
                                    text="Start"
                                    busy={working === `run-start-${run.id}`}
                                    onClick={() =>
                                      perform(
                                        `run-start-${run.id}`,
                                        () =>
                                          startSonnyOrchestration(
                                            workspace.id,
                                            run.id
                                          ),
                                        "Orchestration started."
                                      )
                                    }
                                  />
                                )}
                              </div>
                            </div>

                            {array<SonnyAssignment>(run.assignments).length >
                              0 && (
                              <div className="grid md:grid-cols-2 gap-3 mt-4">
                                {array<SonnyAssignment>(
                                  run.assignments
                                ).map((assignment) => (
                                  <Assignment
                                    key={assignment.id}
                                    assignment={assignment}
                                    runId={run.id}
                                    companyId={workspace.id}
                                    working={working}
                                    perform={perform}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card title="Assignment Queue">
                    {assignments.length === 0 ? (
                      <Empty text="No agent assignments have been created." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px]">
                          <thead>
                            <tr className="text-left text-xs uppercase text-slate-400">
                              <th className="pb-3">Assignment</th>
                              <th className="pb-3">Agent</th>
                              <th className="pb-3">Priority</th>
                              <th className="pb-3">Confidence</th>
                              <th className="pb-3">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assignments.slice(0, 12).map((item) => (
                              <tr key={item.id} className="border-t">
                                <td className="py-4 pr-4 font-bold">
                                  {item.title ||
                                    label(item.assignment_code)}
                                </td>
                                <td className="py-4 pr-4">
                                  {label(item.agent_code)}
                                </td>
                                <td className="py-4 pr-4">
                                  {label(item.priority)}
                                </td>
                                <td className="py-4 pr-4">
                                  {Math.round(
                                    Number(item.confidence || 0) * 100
                                  )}
                                  %
                                </td>
                                <td className="py-4">
                                  <Status value={item.status} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </div>

                <aside className="space-y-6">
                  <Card title="AI Workforce">
                    {data.agents.length === 0 ? (
                      <Empty text="No agents returned by the registry." />
                    ) : (
                      <div className="space-y-3">
                        {data.agents.map((agent) => (
                          <div
                            key={agent.agent_code}
                            className="bg-slate-50 border rounded-2xl p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-black">
                                  {agent.display_name ||
                                    agent.name ||
                                    label(agent.agent_code)}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {agent.role ||
                                    array<string>(agent.capabilities)
                                      .slice(0, 2)
                                      .map(label)
                                      .join(" · ") ||
                                    "Specialist agent"}
                                </p>
                              </div>
                              <Status value={agent.status || "active"} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card title="Sonny Recommendations">
                    <div className="space-y-3">
                      {pendingApprovals > 0 && (
                        <Recommendation
                          title="Review approvals"
                          detail={`${pendingApprovals} items need attention.`}
                        />
                      )}
                      {pendingTasks > 0 && (
                        <Recommendation
                          title="Clear the task queue"
                          detail={`${pendingTasks} company tasks remain open.`}
                        />
                      )}
                      {runningRuns === 0 && (
                        <Recommendation
                          title="Launch an orchestration"
                          detail="No multi-agent run is currently active."
                        />
                      )}
                      {data.documents.length === 0 && (
                        <Recommendation
                          title="Build company context"
                          detail="Upload company documents for stronger AI context."
                        />
                      )}
                    </div>
                  </Card>
                </aside>
              </section>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border rounded-3xl p-5 lg:p-6 shadow-sm mt-6">
      <h2 className="text-xl font-black mb-5">{title}</h2>
      {children}
    </section>
  );
}

function Metric({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-bold text-slate-500 mt-2">{title}</p>
    </div>
  );
}

function Mini({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="bg-white/10 rounded-2xl p-4">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-slate-300 mt-1">{title}</p>
    </div>
  );
}

function Status({ value }: { value?: string }) {
  return (
    <span
      className={`inline-flex border px-2.5 py-1 rounded-full text-[11px] font-black ${statusStyle(
        value
      )}`}
    >
      {label(value)}
    </span>
  );
}

function Button({
  text,
  busy,
  onClick,
}: {
  text: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:bg-slate-300"
    >
      {busy ? "Working..." : text}
    </button>
  );
}

function Assignment({
  assignment,
  runId,
  companyId,
  working,
  perform,
}: {
  assignment: SonnyAssignment;
  runId: string;
  companyId: string;
  working: string;
  perform: (
    key: string,
    action: () => Promise<any>,
    message: string
  ) => Promise<void>;
}) {
  const key = `${runId}-${assignment.id}`;

  return (
    <div className="bg-slate-50 border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">
            {assignment.title || label(assignment.assignment_code)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {label(assignment.agent_code)}
          </p>
        </div>
        <Status value={assignment.status} />
      </div>
      <div className="flex gap-2 mt-4">
        {assignment.status === "awaiting_approval" && (
          <Button
            text="Approve"
            busy={working === `assignment-approve-${key}`}
            onClick={() =>
              perform(
                `assignment-approve-${key}`,
                () =>
                  approveSonnyAssignment(
                    companyId,
                    runId,
                    assignment.id
                  ),
                "Assignment approved."
              )
            }
          />
        )}
        {assignment.status === "approved" && (
          <Button
            text="Accept"
            busy={working === `assignment-accept-${key}`}
            onClick={() =>
              perform(
                `assignment-accept-${key}`,
                () =>
                  acceptSonnyAssignment(
                    companyId,
                    runId,
                    assignment.id
                  ),
                "Assignment accepted."
              )
            }
          />
        )}
        {assignment.status === "accepted" && (
          <Button
            text="Start"
            busy={working === `assignment-start-${key}`}
            onClick={() =>
              perform(
                `assignment-start-${key}`,
                () =>
                  startSonnyAssignment(
                    companyId,
                    runId,
                    assignment.id
                  ),
                "Assignment started."
              )
            }
          />
        )}
      </div>
    </div>
  );
}

function Recommendation({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
      <p className="font-black text-violet-950">{title}</p>
      <p className="text-sm text-violet-700 mt-1">{detail}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-slate-50 border border-dashed rounded-2xl p-6 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
