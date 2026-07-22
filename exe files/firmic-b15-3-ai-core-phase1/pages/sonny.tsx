import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import {
  acceptSonnyAssignment,
  approveSonnyAssignment,
  approveSonnyOrchestration,
  completeSonnyAssignment,
  completeSonnyOrchestration,
  getProgress,
  getSonny,
  getSonnyAgents,
  getSonnyAssignments,
  getSonnyOrchestrations,
  SonnyAgent,
  SonnyAssignment,
  SonnyOrchestrationRun,
  startSonnyAssignment,
  startSonnyOrchestration,
} from "../services/sonnyApi";
import { getCompanyTasks } from "../services/taskApi";
import { getCompanyDocuments } from "../services/documentApi";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";
import { readCompanyStorage } from "../src/utils/companyStorage";
import { API_URL } from "../services/config";
import {
  executeSonnyActions,
  SonnyAction,
} from "../src/utils/sonnyActionExecutor";
import { useFirmicAIVoice } from "../src/os/ai/hooks";

type Dashboard = {
  sonny: any;
  progress: any;
  tasks: any[];
  documents: any[];
  agents: SonnyAgent[];
  runs: SonnyOrchestrationRun[];
};

type ChatMessage = {
  id: string;
  role: "user" | "sonny" | "system";
  text: string;
  createdAt: string;
};

type SonnyPlan = {
  action?: string;
  parameters?: Record<string, unknown>;
  confidence?: number;
  reason?: string;
  requires_confirmation?: boolean;
  missing_fields?: string[];
  ready_to_execute?: boolean;
};

type PendingAction = {
  title: string;
  detail: string;
  execute: () => Promise<void>;
} | null;

type ExecutionStage =
  | "idle"
  | "understanding"
  | "planning"
  | "awaiting_confirmation"
  | "executing"
  | "refreshing"
  | "completed"
  | "failed";

type SonnyChatResponse = {
  reply: string;
  company_id?: string;
  memory_saved?: boolean;
  context_version?: string;
  attention_required?: boolean;
  critical_count?: number;
  high_count?: number;
  priorities?: unknown[];
  has_action?: boolean;
  requires_confirmation?: boolean;
  plan?: SonnyPlan | null;
  ready_to_execute?: boolean;
  missing_fields?: string[];
  action_result?: {
    status?: string;
    message?: string;
    data?: Record<string, unknown>;
  } | null;
  speech?: string;
  actions?: SonnyAction[];
};

async function sendSonnyChat(
  companyId: string,
  message: string,
  options?: {
    confirmed?: boolean;
    plan?: SonnyPlan | null;
    signal?: AbortSignal;
  }
): Promise<SonnyChatResponse> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("firmic_token")
      : null;

  const response = await fetch(`${API_URL}/api/sonny/chat`, {
    method: "POST",
    signal: options?.signal,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      company_id: companyId,
      message,
      confirmed: Boolean(options?.confirmed),
      plan: options?.plan || null,
    }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      body?.detail ||
      body?.message ||
      `Sonny request failed with status ${response.status}`;

    throw new Error(
      typeof detail === "string" ? detail : JSON.stringify(detail)
    );
  }

  if (!body?.reply || typeof body.reply !== "string") {
    throw new Error("Sonny returned an invalid response.");
  }

  return body as SonnyChatResponse;
}

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

function statusTone(status?: string) {
  if (["completed", "active"].includes(status || "")) {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-600";
  }
  if (["running", "accepted"].includes(status || "")) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (status === "approved") {
    return "border-violet-400/25 bg-violet-400/10 text-violet-700";
  }
  if (["awaiting_approval", "pending", "queued"].includes(status || "")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["failed", "cancelled"].includes(status || "")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function nowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function SonnyAI() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [data, setData] = useState<Dashboard>(emptyDashboard);
  const [integrations, setIntegrations] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [pendingPlan, setPendingPlan] = useState<SonnyPlan | null>(null);
  const [executionStage, setExecutionStage] =
    useState<ExecutionStage>("idle");
  const [streamingMessageId, setStreamingMessageId] =
    useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const streamTimerRef = useRef<number | null>(null);

  const {
    listening,
    speaking,
    speak,
    startListening,
    stopListening,
    stopVoice,
  } = useFirmicAIVoice({
    enabled: voiceEnabled,
    onTranscript: setCommand,
    onFinalTranscript: (transcript) => processCommand(transcript),
    onWarning: setWarning,
    onBeforeListening: () => {
      requestAbortRef.current?.abort();
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
      setStreamingMessageId(null);
    },
  });

  useEffect(() => {
    return () => {
      requestAbortRef.current?.abort();
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
      }
    };
  }, []);

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

    setIntegrations(readCompanyStorage<string[]>("integrations", []));

    const stored = localStorage.getItem(
      `firmic_sonny_conversation_${workspace.id}`
    );

    if (stored) {
      try {
        setMessages(array<ChatMessage>(JSON.parse(stored)));
      } catch {
        setMessages([]);
      }
    } else {
      setMessages([
        {
          id: nowId(),
          role: "sonny",
          text: `I am online for ${workspace.name}. I can read the company, summarize operations, create tasks, and manage orchestration runs and assignments.`,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    load();
  }, [workspace?.id]);

  useEffect(() => {
    if (!workspace?.id) return;
    localStorage.setItem(
      `firmic_sonny_conversation_${workspace.id}`,
      JSON.stringify(messages.slice(-80))
    );
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, workspace?.id]);


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

    const baseRuns = array<SonnyOrchestrationRun>(orchestration.runs);

    const hydratedRuns = await Promise.all(
      baseRuns.map(async (run) => {
        try {
          const assignments = await getSonnyAssignments(
            workspace.id,
            run.id
          );
          return { ...run, assignments };
        } catch {
          return { ...run, assignments: array(run.assignments) };
        }
      })
    );

    setData({
      sonny: pick(results[0], null, "company state"),
      progress: pick(results[1], null, "progress"),
      tasks: array(pick(results[2], [], "tasks")),
      documents: array(pick(results[3], [], "documents")),
      agents: array(pick(results[4], [], "agent registry")),
      runs: hydratedRuns,
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

  function addMessage(role: ChatMessage["role"], text: string) {
    setMessages((current) => [
      ...current,
      {
        id: nowId(),
        role,
        text,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function stopVoiceAndStreaming() {
    stopVoice();

    if (streamTimerRef.current) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    setStreamingMessageId(null);
  }

  function streamReply(text: string, spoken = text) {
    stopVoiceAndStreaming();

    const id = nowId();
    const createdAt = new Date().toISOString();
    setStreamingMessageId(id);
    setMessages((current) => [
      ...current,
      {
        id,
        role: "sonny",
        text: "",
        createdAt,
      },
    ]);

    const chunks = text.match(/\S+\s*/g) || [text];
    let index = 0;

    streamTimerRef.current = window.setInterval(() => {
      index += 1;
      const partial = chunks.slice(0, index).join("");

      setMessages((current) =>
        current.map((message) =>
          message.id === id
            ? { ...message, text: partial }
            : message
        )
      );

      if (index >= chunks.length) {
        if (streamTimerRef.current) {
          window.clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
        }
        setStreamingMessageId(null);
        speak(spoken);
      }
    }, 28);
  }

  function reply(text: string, spoken = text) {
    streamReply(text, spoken);
  }

  async function perform(
    key: string,
    action: () => Promise<any>,
    success: string
  ) {
    try {
      setWorking(key);
      setWarning("");
      await action();
      reply(success);
      await load();
    } catch (error: any) {
      const message =
        error?.message || "The action could not be completed.";
      setWarning(message);
      reply(`I could not complete that action. ${message}`);
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
          runStatus: run.status,
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
  const completedAssignments = assignments.filter(
    (item) => item.status === "completed"
  ).length;
  const pendingApprovals =
    data.runs.filter((run) => run.status === "awaiting_approval").length +
    assignments.filter(
      (item) => item.status === "awaiting_approval"
    ).length;

  const summary = `${workspace?.name || "The company"} is at ${score}% progress. ${activeAgents} agents are online. ${runningRuns} orchestration runs are active, ${completedRuns} are completed, ${pendingApprovals} approvals are pending, ${completedAssignments} assignments are completed, and ${pendingTasks} tasks remain open.`;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const executiveStatus = listening
    ? "Listening"
    : speaking
      ? "Speaking"
      : working
        ? "Processing"
        : "Online";

  const executiveStatusTone = listening
    ? "bg-rose-500"
    : speaking
      ? "bg-violet-500"
      : working
        ? "bg-amber-400"
        : "bg-emerald-500";

  function askConfirmation(
    title: string,
    detail: string,
    execute: () => Promise<void>
  ) {
    setPendingAction({ title, detail, execute });
    reply(`${detail} Please confirm before I proceed.`);
  }

  function formatPlanDetail(plan: SonnyPlan): string {
    const parameters = plan.parameters || {};
    const action = String(plan.action || "");

    if (action === "schedule_meeting") {
      return [
        String(parameters.title || "Business Meeting"),
        `${String(parameters.booking_date || "")} at ${String(
          parameters.booking_time || ""
        )}`,
        String(parameters.room_name || ""),
        `${String(parameters.duration_hours || 1)} hour(s)`,
      ]
        .filter(Boolean)
        .join(" · ");
    }

    if (action === "cancel_meeting") {
      return String(
        parameters.meeting_title ||
          parameters.room_name ||
          "Cancel the selected meeting"
      );
    }

    if (action === "create_task") {
      return String(parameters.title || "Create company task");
    }

    if (action === "assign_task") {
      return `${String(
        parameters.task_title || "Selected task"
      )} → ${String(parameters.assignee || "assignee")}`;
    }

    return String(plan.reason || "Executive action ready");
  }

  async function executePendingPlan() {
    if (!pendingPlan || !workspace?.id || working) return;

    stopVoiceAndStreaming();
    setExecutionStage("executing");
    setWorking("executive-action");
    setWarning("");
    setNotice("Executing approved executive action...");

    const controller = new AbortController();
    requestAbortRef.current = controller;

    try {
      const response = await sendSonnyChat(
        workspace.id,
        "Confirm executive action",
        {
          confirmed: true,
          plan: pendingPlan,
          signal: controller.signal,
        }
      );

      setExecutionStage("refreshing");
      setNotice("Action completed. Refreshing company intelligence...");
      setPendingPlan(null);

      await load();

      setExecutionStage("completed");
      setNotice("Executive action completed successfully.");
      reply(response.reply);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        setExecutionStage("idle");
        setNotice("Execution interrupted.");
        return;
      }

      const message =
        error?.message || "The executive action could not be completed.";
      setExecutionStage("failed");
      setWarning(message);
      setNotice("");
      reply(`I could not complete the action. ${message}`);
    } finally {
      requestAbortRef.current = null;
      setWorking("");
    }
  }

  function cancelPendingPlan() {
    setPendingPlan(null);
    setExecutionStage("idle");
    setNotice("");
    reply("The pending executive action has been cancelled.");
  }

  async function processCommand(raw?: string) {
    const clean = (raw ?? command).trim();
    if (!clean || !workspace?.id || working) return;

    addMessage("user", clean);
    setCommand("");
    setWarning("");

    const lower = clean.toLowerCase();

    if (
      lower === "confirm" ||
      lower === "yes confirm" ||
      lower === "proceed"
    ) {
      if (pendingPlan) {
        await executePendingPlan();
        return;
      }

      if (pendingAction) {
        const action = pendingAction;
        setPendingAction(null);
        await action.execute();
        return;
      }

      reply("There is no pending action to confirm.");
      return;
    }

    if (lower === "cancel" || lower === "cancel action") {
      if (pendingPlan) {
        cancelPendingPlan();
      } else {
        setPendingAction(null);
        reply("The pending action has been cancelled.");
      }
      return;
    }

    if (lower === "clear conversation") {
      setMessages([]);
      stopVoice();
      return;
    }

    try {
      setExecutionStage("understanding");
      setWorking("sonny-chat");
      setNotice("Understanding your request...");

      const controller = new AbortController();
      requestAbortRef.current = controller;

      window.setTimeout(() => {
        setExecutionStage((current) =>
          current === "understanding" ? "planning" : current
        );
        setNotice((current) =>
          current === "Understanding your request..."
            ? "Building an executive plan..."
            : current
        );
      }, 350);

      const response = await sendSonnyChat(workspace.id, clean, {
        signal: controller.signal,
      });

      if (response.actions?.length) {
        setPendingPlan(null);
        setExecutionStage("executing");
        setNotice("Executing Sonny navigation...");

        // Give the acknowledgement time to appear before route changes.
        reply(response.reply, response.speech || response.reply);
        await new Promise((resolve) => window.setTimeout(resolve, 260));

        await executeSonnyActions(response.actions, {
          router,
          frontendActions: {
            refresh: load,
            start_listening: startListening,
            stop_speaking: stopVoiceAndStreaming,
            scroll_to_bottom: () =>
              chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          },
        });

        setExecutionStage("completed");
        setNotice("");
        return;
      }

      if (
        response.has_action &&
        response.requires_confirmation &&
        response.plan?.action
      ) {
        setPendingPlan(response.plan);
        setExecutionStage("awaiting_confirmation");

        const confidence = Math.round(
          Number(response.plan.confidence || 0) * 100
        );

        setNotice(
          `${label(response.plan.action)} prepared${
            confidence ? ` · ${confidence}% confidence` : ""
          }. Awaiting your confirmation.`
        );
      } else {
        setPendingPlan(null);
        setExecutionStage("completed");
        setNotice("");
      }

      reply(response.reply);
      await load();
    } catch (error: any) {
      if (error?.name === "AbortError") {
        setExecutionStage("idle");
        setNotice("Request interrupted.");
        return;
      }

      const message =
        error?.message || "Sonny could not complete the request.";
      setWarning(message);
      reply(`I could not complete that request. ${message}`);
    } finally {
      requestAbortRef.current = null;
      setWorking("");
    }
  }

  const executionSteps = [
    { key: "understanding", label: "Understand" },
    { key: "planning", label: "Plan" },
    { key: "awaiting_confirmation", label: "Approve" },
    { key: "executing", label: "Execute" },
    { key: "refreshing", label: "Sync" },
    { key: "completed", label: "Done" },
  ] as const;

  const activeExecutionIndex = executionSteps.findIndex(
    (step) => step.key === executionStage
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-950 flex">
        <FirmicSidebar active="Sonny AI COO" />

        <main className="flex-1 min-w-0 p-4 sm:p-6 xl:p-8 overflow-x-hidden">
          <div className="w-full">
            <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 lg:p-7 shadow-sm">
              <div className="absolute -top-28 -right-20 h-80 w-80 rounded-full bg-violet-100/70 blur-3xl" />
              <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-fuchsia-50 blur-3xl" />

              <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-7">
                <div className="min-w-0">
                  <div className="flex items-center gap-4">
                    <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-200">
                      <span className="text-white text-xl">◆</span>
                      <span
                        className={`absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-white ${executiveStatusTone}`}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                        Sonny · AI Chief Operating Officer
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`h-2 w-2 rounded-full ${executiveStatusTone} ${
                            listening || speaking || working ? "animate-pulse" : ""
                          }`}
                        />
                        <p className="text-xs font-bold text-slate-500">
                          {executiveStatus}
                        </p>
                      </div>
                    </div>
                  </div>

                  <h1 className="text-3xl lg:text-4xl font-black mt-6 text-slate-950 tracking-tight">
                    {greeting}. Operational Review Completed.
                  </h1>

                  <p className="text-slate-500 mt-3 max-w-3xl leading-7">
                    I have reviewed{" "}
                    <strong className="text-slate-950">
                      {workspace?.name || "the selected company"}
                    </strong>
                    . Company health is{" "}
                    <strong className="text-violet-700">{score}%</strong>, with{" "}
                    <strong className="text-slate-950">{pendingTasks}</strong>{" "}
                    open tasks and{" "}
                    <strong className="text-slate-950">
                      {pendingApprovals}
                    </strong>{" "}
                    approvals requiring attention.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setVoiceEnabled((value) => !value)}
                    className="border border-slate-200 bg-white px-4 py-3 rounded-2xl text-sm font-bold hover:bg-slate-50 transition"
                  >
                    {voiceEnabled ? "Voice enabled" : "Voice muted"}
                  </button>

                  <button
                    onClick={load}
                    disabled={loading}
                    className="bg-violet-600 text-white hover:bg-violet-700 px-5 py-3 rounded-2xl font-bold disabled:opacity-50 transition shadow-sm"
                  >
                    {loading ? "Reviewing company..." : "Refresh intelligence"}
                  </button>
                </div>
              </div>
            </header>

            {warning && (
              <div className="mt-5 border border-amber-200 bg-amber-50 text-amber-800 rounded-2xl p-4">
                {warning}
              </div>
            )}

            {notice && (
              <div className="mt-5 border border-violet-200 bg-violet-50 text-violet-800 rounded-2xl p-4 font-semibold">
                {notice}
              </div>
            )}

            {executionStage !== "idle" && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Live execution progress
                  </p>
                  {(working || speaking || streamingMessageId) && (
                    <button
                      onClick={() => {
                        requestAbortRef.current?.abort();
                        stopVoiceAndStreaming();
                        stopListening();
                        setExecutionStage("idle");
                        setWorking("");
                        setNotice("Operation interrupted.");
                      }}
                      className="text-xs font-black text-rose-600 hover:text-rose-700"
                    >
                      Interrupt
                    </button>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {executionSteps.map((step, index) => {
                    const complete =
                      executionStage === "completed" ||
                      (activeExecutionIndex >= 0 &&
                        index < activeExecutionIndex);
                    const active = step.key === executionStage;

                    return (
                      <div key={step.key} className="min-w-0">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            complete
                              ? "bg-emerald-500"
                              : active
                                ? "bg-violet-500 animate-pulse"
                                : "bg-slate-200"
                          }`}
                        />
                        <p
                          className={`mt-2 truncate text-[10px] font-black uppercase tracking-wide ${
                            active
                              ? "text-violet-700"
                              : complete
                                ? "text-emerald-700"
                                : "text-slate-400"
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!workspace?.id ? (
              <Panel title="Select a company">
                <p className="text-slate-400">
                  Sonny requires an active tenant workspace.
                </p>
              </Panel>
            ) : (
              <>
                <section className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 mt-5">
                  <Metric
                    title="Company Health"
                    value={`${score}%`}
                    detail={score >= 80 ? "Operating strongly" : "Needs attention"}
                  />
                  <Metric
                    title="Open Tasks"
                    value={pendingTasks}
                    detail={`${completedTasks} completed`}
                  />
                  <Metric
                    title="Pending Approvals"
                    value={pendingApprovals}
                    detail="Founder decision required"
                  />
                  <Metric
                    title="AI Workforce"
                    value={activeAgents}
                    detail="Agents connected"
                  />
                  <Metric
                    title="Active Operations"
                    value={runningRuns + activeAssignments}
                    detail={`${completedAssignments} assignments completed`}
                  />
                </section>

                <section className="grid 2xl:grid-cols-[1.15fr_0.85fr] gap-5 mt-5">
                  <div className="space-y-5 min-w-0">
                    <Panel
                      title="Executive Conversation"
                      subtitle="Speak naturally. Sonny will review, reason, plan, and request confirmation before sensitive actions."
                    >
                      <div className="h-[430px] overflow-y-auto pr-2 space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex gap-3 ${
                              message.role === "user"
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            {message.role !== "user" && (
                              <div className="mt-1 h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                                S
                              </div>
                            )}

                            <div
                              className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${
                                message.role === "user"
                                  ? "bg-violet-600 text-white rounded-br-md"
                                  : message.role === "system"
                                    ? "bg-amber-50 border border-amber-200 text-amber-800"
                                    : "bg-white border border-slate-200 text-slate-700 rounded-bl-md"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1.5">
                                <p className="text-[11px] font-black uppercase tracking-wider opacity-60">
                                  {message.role === "user"
                                    ? "Founder"
                                    : message.role === "system"
                                      ? "System"
                                      : "Sonny"}
                                </p>
                              </div>
                              <p className="leading-6 whitespace-pre-wrap">
                                {message.text}
                                {streamingMessageId === message.id && (
                                  <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-full bg-violet-500 align-middle" />
                                )}
                              </p>
                              <p className="text-[10px] opacity-45 mt-2">
                                {date(message.createdAt)}
                              </p>
                            </div>

                            {message.role === "user" && (
                              <div className="mt-1 h-9 w-9 shrink-0 rounded-xl border border-slate-200 bg-white text-slate-700 flex items-center justify-center text-xs font-black">
                                H
                              </div>
                            )}
                          </div>
                        ))}

                        {working === "sonny-chat" && (
                          <div className="flex gap-3 justify-start">
                            <div className="mt-1 h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                              S
                            </div>
                            <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">
                                {executionStage === "planning"
                                  ? "Building executive plan"
                                  : "Reviewing company intelligence"}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" />
                                <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:120ms]" />
                                <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:240ms]" />
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {pendingPlan && (
                        <div className="mt-4 overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm">
                          <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
                                  Executive approval required
                                </p>
                                <h3 className="mt-2 text-xl font-black text-slate-950">
                                  {label(pendingPlan.action || "Executive action")}
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                  {formatPlanDetail(pendingPlan)}
                                </p>
                              </div>
                              <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-black text-violet-700">
                                {Math.round(
                                  Number(pendingPlan.confidence || 0) * 100
                                )}
                                % confidence
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 p-5">
                            <button
                              onClick={executePendingPlan}
                              disabled={working !== ""}
                              className="flex-1 rounded-2xl bg-violet-600 px-5 py-3 font-black text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                            >
                              {working === "executive-action"
                                ? "Executing..."
                                : "Confirm and execute"}
                            </button>
                            <button
                              onClick={cancelPendingPlan}
                              disabled={working !== ""}
                              className="rounded-2xl border border-slate-200 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {pendingAction && (
                        <div className="mt-4 border border-amber-200 bg-amber-50 rounded-2xl p-4">
                          <p className="font-black text-amber-800">
                            Confirmation required
                          </p>
                          <p className="text-sm text-amber-700 mt-1">
                            {pendingAction.detail}
                          </p>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={async () => {
                                const action = pendingAction;
                                setPendingAction(null);
                                await action.execute();
                              }}
                              className="bg-amber-300 text-slate-950 px-4 py-2 rounded-xl font-black"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => {
                                setPendingAction(null);
                                reply("The pending action has been cancelled.");
                              }}
                              className="border border-slate-200 px-4 py-2 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <textarea
                          value={command}
                          onChange={(event) => setCommand(event.target.value)}
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              !event.shiftKey
                            ) {
                              event.preventDefault();
                              processCommand();
                            }
                          }}
                          className="w-full min-h-[92px] resize-none bg-transparent text-slate-950 placeholder:text-slate-400 outline-none p-2 text-[15px] leading-6"
                          placeholder="Ask Sonny for a brief, risks, priorities, tasks, billing, compliance, or next steps..."
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
                          <div className="flex flex-wrap gap-2">
                            <Quick
                              text="Brief me"
                              onClick={() => processCommand("Brief me")}
                            />
                            <Quick
                              text="Show agents"
                              onClick={() => processCommand("Show agents")}
                            />
                            <Quick
                              text="Orchestration status"
                              onClick={() =>
                                processCommand("Show orchestration status")
                              }
                            />
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={startListening}
                              disabled={working !== ""}
                              className={`group relative h-14 min-w-[150px] rounded-2xl px-4 font-bold transition disabled:opacity-50 ${
                                listening
                                  ? "bg-rose-500 text-white shadow-lg shadow-rose-100"
                                  : speaking
                                    ? "bg-violet-100 text-violet-700"
                                    : "border border-slate-200 bg-white text-slate-900 hover:border-violet-200 hover:bg-violet-50"
                              }`}
                              title="Speak to Sonny"
                            >
                              <span className="flex items-center justify-center gap-3">
                                <span
                                  className={`relative flex h-9 w-9 items-center justify-center rounded-xl ${
                                    listening
                                      ? "bg-white/20"
                                      : speaking
                                        ? "bg-violet-200"
                                        : "bg-slate-100 group-hover:bg-white"
                                  }`}
                                >
                                  {listening ? "■" : "🎙"}
                                  {listening && (
                                    <span className="absolute inset-0 rounded-xl border border-white/50 animate-ping" />
                                  )}
                                </span>
                                <span className="text-left leading-tight">
                                  <span className="block text-sm">
                                    {listening
                                      ? "Listening..."
                                      : speaking
                                        ? "Sonny speaking"
                                        : "Speak to Sonny"}
                                  </span>
                                  <span className="block text-[10px] font-medium opacity-60 mt-0.5">
                                    {listening
                                      ? "Speak naturally"
                                      : "Voice command"}
                                  </span>
                                </span>
                              </span>
                            </button>

                            <button
                              onClick={() => processCommand()}
                              disabled={working !== "" || !command.trim()}
                              className="h-14 bg-violet-600 hover:bg-violet-700 text-white px-7 rounded-2xl font-bold disabled:opacity-50 transition shadow-sm"
                            >
                              {working ? "Thinking..." : "Send"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </Panel>

                    <Panel
                      title="Multi-Agent Orchestration"
                      subtitle="Sonny coordinates every operational run."
                    >
                      {data.runs.length === 0 ? (
                        <Empty text="No orchestration runs exist yet." />
                      ) : (
                        <div className="space-y-4">
                          {data.runs.slice(0, 8).map((run) => (
                            <RunCard
                              key={run.id}
                              run={run}
                              companyId={workspace.id}
                              working={working}
                              perform={perform}
                              askConfirmation={askConfirmation}
                            />
                          ))}
                        </div>
                      )}
                    </Panel>
                  </div>

                  <aside className="space-y-5 min-w-0">
                    <Panel
                      title="Executive Brief"
                      subtitle="Current operating picture"
                    >
                      <div className="rounded-2xl bg-violet-50 border border-violet-100 p-5">
                        <p className="text-lg leading-8 text-slate-800">
                          {summary}
                        </p>
                        <button
                          onClick={() => speak(summary)}
                          className="mt-4 border border-slate-200 bg-white px-4 py-2 rounded-xl text-sm font-bold"
                        >
                          Read brief aloud
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <SmallMetric title="Tasks" value={data.tasks.length} />
                        <SmallMetric
                          title="Documents"
                          value={data.documents.length}
                        />
                        <SmallMetric
                          title="Integrations"
                          value={integrations.length}
                        />
                        <SmallMetric title="Runs" value={data.runs.length} />
                      </div>
                    </Panel>

                    <Panel
                      title="AI Workforce"
                      subtitle={`${activeAgents} agents connected`}
                    >
                      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        {data.agents.map((agent) => (
                          <div
                            key={agent.agent_code}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-violet-200 hover:bg-violet-50/40"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-black truncate text-slate-950">
                                  {agent.name ||
                                    agent.display_name ||
                                    label(agent.agent_code)}
                                </p>
                                <p className="text-xs text-slate-400 mt-1 truncate">
                                  {agent.role ||
                                    agent.description ||
                                    "Specialist agent"}
                                </p>
                              </div>
                              <Status value={agent.status || "active"} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Panel>

                    <Panel title="Sonny Priorities">
                      <div className="space-y-3">
                        {pendingApprovals > 0 && (
                          <Priority
                            title="Review approvals"
                            detail={`${pendingApprovals} items require a decision.`}
                          />
                        )}
                        {pendingTasks > 0 && (
                          <Priority
                            title="Clear the task queue"
                            detail={`${pendingTasks} tasks remain open.`}
                          />
                        )}
                        {runningRuns > 0 && (
                          <Priority
                            title="Monitor execution"
                            detail={`${runningRuns} orchestration runs are active.`}
                          />
                        )}
                        {data.documents.length === 0 && (
                          <Priority
                            title="Improve company context"
                            detail="Upload documents for stronger operational intelligence."
                          />
                        )}
                      </div>
                    </Panel>
                  </aside>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function RunCard({
  run,
  companyId,
  working,
  perform,
  askConfirmation,
}: {
  run: SonnyOrchestrationRun;
  companyId: string;
  working: string;
  perform: (
    key: string,
    action: () => Promise<any>,
    message: string
  ) => Promise<void>;
  askConfirmation: (
    title: string,
    detail: string,
    execute: () => Promise<void>
  ) => void;
}) {
  const assignments = array<SonnyAssignment>(run.assignments);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-black text-lg text-slate-950">
              {label(run.orchestration_type)}
            </h3>
            <Status value={run.status} />
          </div>
          <p className="text-sm text-slate-400 mt-2">
            {assignments.length} assignments · Created {date(run.created_at)}
          </p>
        </div>

        <div className="flex gap-2">
          {run.status === "awaiting_approval" && (
            <Action
              text="Approve"
              busy={working === `run-approve-${run.id}`}
              onClick={() =>
                askConfirmation(
                  "Approve orchestration",
                  `Approve ${label(run.orchestration_type)}`,
                  async () =>
                    perform(
                      `run-approve-${run.id}`,
                      () =>
                        approveSonnyOrchestration(companyId, run.id),
                      "The orchestration has been approved."
                    )
                )
              }
            />
          )}
          {run.status === "approved" && (
            <Action
              text="Start"
              busy={working === `run-start-${run.id}`}
              onClick={() =>
                askConfirmation(
                  "Start orchestration",
                  `Start ${label(run.orchestration_type)}`,
                  async () =>
                    perform(
                      `run-start-${run.id}`,
                      () => startSonnyOrchestration(companyId, run.id),
                      "The orchestration is now running."
                    )
                )
              }
            />
          )}
          {run.status === "running" &&
            assignments.length > 0 &&
            assignments.every((item) => item.status === "completed") && (
              <Action
                text="Complete Run"
                busy={working === `run-complete-${run.id}`}
                onClick={() =>
                  askConfirmation(
                    "Complete orchestration",
                    `Close ${label(run.orchestration_type)}`,
                    async () =>
                      perform(
                        `run-complete-${run.id}`,
                        () =>
                          completeSonnyOrchestration(companyId, run.id, {
                            completed_from: "sonny_dashboard",
                          }),
                        "The orchestration has been completed."
                      )
                  )
                }
              />
            )}
        </div>
      </div>

      {assignments.length > 0 && (
        <div className="mt-5 space-y-3">
          {assignments.map((assignment, index) => (
            <div key={assignment.id} className="relative pl-8">
              {index < assignments.length - 1 && (
                <div className="absolute left-[11px] top-8 bottom-[-18px] w-px bg-slate-200" />
              )}
              <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full bg-violet-100 border border-violet-200 text-violet-700 flex items-center justify-center text-[10px]">
                {index + 1}
              </div>
              <AssignmentRow
                assignment={assignment}
                companyId={companyId}
                runId={run.id}
                working={working}
                perform={perform}
                askConfirmation={askConfirmation}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentRow({
  assignment,
  companyId,
  runId,
  working,
  perform,
  askConfirmation,
}: {
  assignment: SonnyAssignment;
  companyId: string;
  runId: string;
  working: string;
  perform: (
    key: string,
    action: () => Promise<any>,
    message: string
  ) => Promise<void>;
  askConfirmation: (
    title: string,
    detail: string,
    execute: () => Promise<void>
  ) => void;
}) {
  const name =
    assignment.title || label(assignment.assignment_code);
  const key = `${runId}-${assignment.id}`;

  const actionForStatus = () => {
    if (assignment.status === "awaiting_approval") {
      return {
        text: "Approve",
        action: () =>
          approveSonnyAssignment(companyId, runId, assignment.id),
        success: "The assignment has been approved.",
      };
    }
    if (assignment.status === "approved") {
      return {
        text: "Accept",
        action: () =>
          acceptSonnyAssignment(companyId, runId, assignment.id),
        success: `${label(
          assignment.agent_code
        )} accepted the assignment.`,
      };
    }
    if (assignment.status === "accepted") {
      return {
        text: "Start",
        action: () =>
          startSonnyAssignment(companyId, runId, assignment.id),
        success: `${label(
          assignment.agent_code
        )} started the assignment.`,
      };
    }
    if (assignment.status === "running") {
      return {
        text: "Complete",
        action: () =>
          completeSonnyAssignment(companyId, runId, assignment.id, {
            completed_from: "sonny_dashboard",
          }),
        success: "The assignment has been completed.",
      };
    }
    return null;
  };

  const next = actionForStatus();

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="font-black text-slate-950">{name}</p>
          <p className="text-xs text-slate-400 mt-1">
            {label(assignment.agent_code)} ·{" "}
            {label(assignment.required_capability)} ·{" "}
            {Math.round(Number(assignment.confidence || 0) * 100)}% confidence
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Status value={assignment.status} />
          {next && (
            <Action
              text={next.text}
              busy={working === `assignment-${next.text}-${key}`}
              onClick={() =>
                askConfirmation(
                  `${next.text} assignment`,
                  `${next.text} ${name}`,
                  async () =>
                    perform(
                      `assignment-${next.text}-${key}`,
                      next.action,
                      next.success
                    )
                )
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 lg:p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Metric({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          {title}
        </p>
        <span className="h-2.5 w-2.5 rounded-full bg-violet-400 ring-4 ring-violet-50" />
      </div>
      <p className="text-3xl font-black text-slate-950 mt-4 tracking-tight">
        {value}
      </p>
      {detail && (
        <p className="text-xs font-medium text-slate-400 mt-2">{detail}</p>
      )}
    </div>
  );
}

function SmallMetric({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xl font-black text-slate-950">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{title}</p>
    </div>
  );
}

function Status({ value }: { value?: string }) {
  return (
    <span
      className={`inline-flex border px-2.5 py-1 rounded-full text-[11px] font-black ${statusTone(
        value
      )}`}
    >
      {label(value)}
    </span>
  );
}

function Action({
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
      className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
    >
      {busy ? "Working..." : text}
    </button>
  );
}

function Quick({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="border border-slate-200 bg-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50"
    >
      {text}
    </button>
  );
}

function Priority({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
      <p className="font-black text-violet-800">{title}</p>
      <p className="text-sm text-slate-400 mt-1">{detail}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
