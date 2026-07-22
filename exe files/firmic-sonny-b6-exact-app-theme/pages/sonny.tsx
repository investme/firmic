import { useEffect, useMemo, useRef, useState } from "react";
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

type ChatMessage = {
  id: string;
  role: "user" | "sonny" | "system";
  text: string;
  createdAt: string;
};

type PendingAction = {
  title: string;
  detail: string;
  execute: () => Promise<void>;
} | null;

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
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [data, setData] = useState<Dashboard>(emptyDashboard);
  const [integrations, setIntegrations] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

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

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
      window.speechSynthesis?.cancel?.();
    };
  }, []);

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

  function speak(text: string) {
    if (!voiceEnabled || typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((voice) =>
        /English.*(United Kingdom|United States)/i.test(voice.name)
      ) || voices.find((voice) => voice.lang?.startsWith("en"));

    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  }

  function reply(text: string, spoken = text) {
    addMessage("sonny", text);
    speak(spoken);
  }

  function startListening() {
    const Recognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!Recognition) {
      setWarning(
        "Voice recognition is not supported in this browser. Use Chrome or Edge."
      );
      return;
    }

    recognitionRef.current?.stop?.();

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setWarning("Sonny could not hear the command. Please try again.");
    };
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index++) {
        transcript += event.results[index][0].transcript;
      }
      setCommand(transcript.trim());

      const latest = event.results[event.results.length - 1];
      if (latest?.isFinal) {
        setListening(false);
        window.setTimeout(() => processCommand(transcript.trim()), 100);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
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

  function askConfirmation(
    title: string,
    detail: string,
    execute: () => Promise<void>
  ) {
    setPendingAction({ title, detail, execute });
    reply(`${detail} Please confirm before I proceed.`);
  }

  async function processCommand(raw?: string) {
    const clean = (raw ?? command).trim();
    if (!clean || !workspace?.id) return;

    addMessage("user", clean);
    setCommand("");

    const lower = clean.toLowerCase();

    if (
      lower === "confirm" ||
      lower === "yes confirm" ||
      lower === "proceed"
    ) {
      if (!pendingAction) {
        reply("There is no pending action to confirm.");
        return;
      }
      const action = pendingAction;
      setPendingAction(null);
      await action.execute();
      return;
    }

    if (lower === "cancel" || lower === "cancel action") {
      setPendingAction(null);
      reply("The pending action has been cancelled.");
      return;
    }

    if (lower.includes("summarize") || lower.includes("brief me")) {
      reply(summary);
      return;
    }

    if (lower.includes("what happened") || lower.includes("today")) {
      reply(
        `${completedAssignments} assignments have completed. ${runningRuns} orchestration runs are active. ${pendingApprovals} approvals need attention. ${pendingTasks} tasks remain open.`
      );
      return;
    }

    if (lower.includes("show agents") || lower.includes("agent status")) {
      const names = data.agents
        .map((agent) => agent.name || label(agent.agent_code))
        .join(", ");
      reply(`${activeAgents} agents are online: ${names}.`);
      return;
    }

    if (
      lower.includes("orchestration status") ||
      lower.includes("show orchestrations")
    ) {
      reply(
        `There are ${data.runs.length} orchestration runs. ${runningRuns} are running, ${completedRuns} are completed, and ${pendingApprovals} approvals are pending.`
      );
      return;
    }

    if (lower.startsWith("create task")) {
      const title =
        clean.replace(/create task:?/i, "").trim() ||
        "Sonny Created Task";

      askConfirmation(
        "Create task",
        `I am ready to create the task “${title}”`,
        async () =>
          perform(
            "voice-create-task",
            () =>
              createTask({
                company_id: workspace.id,
                title,
                description: "Created by Sonny AI COO",
                status: "pending",
              }),
            `The task “${title}” has been created.`
          )
      );
      return;
    }

    const runAwaiting = data.runs.find(
      (run) => run.status === "awaiting_approval"
    );

    if (lower.includes("approve orchestration") && runAwaiting) {
      askConfirmation(
        "Approve orchestration",
        `I am ready to approve ${label(
          runAwaiting.orchestration_type
        )}`,
        async () =>
          perform(
            `voice-approve-run-${runAwaiting.id}`,
            () =>
              approveSonnyOrchestration(workspace.id, runAwaiting.id),
            "The orchestration has been approved."
          )
      );
      return;
    }

    const approvedRun = data.runs.find(
      (run) => run.status === "approved"
    );

    if (lower.includes("start orchestration") && approvedRun) {
      askConfirmation(
        "Start orchestration",
        `I am ready to start ${label(approvedRun.orchestration_type)}`,
        async () =>
          perform(
            `voice-start-run-${approvedRun.id}`,
            () =>
              startSonnyOrchestration(workspace.id, approvedRun.id),
            "The orchestration is now running."
          )
      );
      return;
    }

    const assignmentAwaiting = assignments.find(
      (item) => item.status === "awaiting_approval"
    );

    if (lower.includes("approve assignment") && assignmentAwaiting) {
      askConfirmation(
        "Approve assignment",
        `I am ready to approve ${
          assignmentAwaiting.title ||
          label(assignmentAwaiting.assignment_code)
        }`,
        async () =>
          perform(
            `voice-approve-assignment-${assignmentAwaiting.id}`,
            () =>
              approveSonnyAssignment(
                workspace.id,
                assignmentAwaiting.runId,
                assignmentAwaiting.id
              ),
            "The assignment has been approved."
          )
      );
      return;
    }

    const approvedAssignment = assignments.find(
      (item) => item.status === "approved"
    );

    if (lower.includes("accept assignment") && approvedAssignment) {
      askConfirmation(
        "Accept assignment",
        `I am ready to let ${label(
          approvedAssignment.agent_code
        )} accept the assignment`,
        async () =>
          perform(
            `voice-accept-assignment-${approvedAssignment.id}`,
            () =>
              acceptSonnyAssignment(
                workspace.id,
                approvedAssignment.runId,
                approvedAssignment.id
              ),
            `${label(
              approvedAssignment.agent_code
            )} accepted the assignment.`
          )
      );
      return;
    }

    const acceptedAssignment = assignments.find(
      (item) => item.status === "accepted"
    );

    if (lower.includes("start assignment") && acceptedAssignment) {
      askConfirmation(
        "Start assignment",
        `I am ready to start ${
          acceptedAssignment.title ||
          label(acceptedAssignment.assignment_code)
        }`,
        async () =>
          perform(
            `voice-start-assignment-${acceptedAssignment.id}`,
            () =>
              startSonnyAssignment(
                workspace.id,
                acceptedAssignment.runId,
                acceptedAssignment.id
              ),
            `${label(
              acceptedAssignment.agent_code
            )} started the assignment.`
          )
      );
      return;
    }

    const runningAssignment = assignments.find(
      (item) => item.status === "running"
    );

    if (lower.includes("complete assignment") && runningAssignment) {
      askConfirmation(
        "Complete assignment",
        `I am ready to complete ${
          runningAssignment.title ||
          label(runningAssignment.assignment_code)
        }`,
        async () =>
          perform(
            `voice-complete-assignment-${runningAssignment.id}`,
            () =>
              completeSonnyAssignment(
                workspace.id,
                runningAssignment.runId,
                runningAssignment.id,
                {
                  completed_by: "sonny_voice",
                  command: clean,
                }
              ),
            "The assignment has been completed."
          )
      );
      return;
    }

    const runningRun = data.runs.find(
      (run) =>
        run.status === "running" &&
        array<SonnyAssignment>(run.assignments).every(
          (item) => item.status === "completed"
        )
    );

    if (lower.includes("complete orchestration") && runningRun) {
      askConfirmation(
        "Complete orchestration",
        `All assignments are complete. I am ready to close ${label(
          runningRun.orchestration_type
        )}`,
        async () =>
          perform(
            `voice-complete-run-${runningRun.id}`,
            () =>
              completeSonnyOrchestration(workspace.id, runningRun.id, {
                completed_by: "sonny_voice",
              }),
            "The orchestration has been completed."
          )
      );
      return;
    }

    if (lower.includes("clear conversation")) {
      setMessages([]);
      reply("Conversation history cleared.");
      return;
    }

    reply(
      "I understood the request, but it does not match a safe operational command yet. Try: summarize operations, show agents, create task, approve orchestration, start orchestration, accept assignment, start assignment, or complete assignment."
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-950 flex">
        <FirmicSidebar active="Sonny AI COO" />

        <main className="flex-1 min-w-0 p-6 xl:p-8 overflow-hidden">
          <div className="w-full">
            <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-violet-100/70 blur-3xl" />
              <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-900/40">
                      ◆
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                        Sonny AI COO
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">
                        Orchestration core online
                      </p>
                    </div>
                  </div>

                  <h1 className="text-3xl font-black mt-6 text-slate-950">
                    Lead the company from one conversation.
                  </h1>

                  <p className="text-slate-500 mt-3 max-w-3xl leading-7">
                    Sonny reads company state, speaks executive briefs, manages
                    approvals, directs orchestration runs, and leads the active
                    workspace for{" "}
                    <strong className="text-slate-950">
                      {workspace?.name || "the selected company"}
                    </strong>.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setVoiceEnabled((value) => !value)}
                    className="border border-slate-200 bg-white px-4 py-3 rounded-2xl text-sm font-bold hover:bg-slate-50"
                  >
                    {voiceEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
                  </button>
                  <button
                    onClick={load}
                    disabled={loading}
                    className="bg-violet-600 text-white hover:bg-violet-700 px-5 py-3 rounded-xl font-bold disabled:opacity-50"
                  >
                    {loading ? "Reading company..." : "Refresh intelligence"}
                  </button>
                </div>
              </div>
            </header>

            {warning && (
              <div className="mt-5 border border-amber-200 bg-amber-50 text-amber-800 rounded-2xl p-4">
                {warning}
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
                <section className="grid sm:grid-cols-2 xl:grid-cols-6 gap-3 mt-5">
                  <Metric title="Company Health" value={`${score}%`} />
                  <Metric title="Agents Online" value={activeAgents} />
                  <Metric title="Running Runs" value={runningRuns} />
                  <Metric title="Active Work" value={activeAssignments} />
                  <Metric title="Approvals" value={pendingApprovals} />
                  <Metric title="Completed" value={completedAssignments} />
                </section>

                <section className="grid 2xl:grid-cols-[1.15fr_0.85fr] gap-5 mt-5">
                  <div className="space-y-5 min-w-0">
                    <Panel
                      title="Conversation with Sonny"
                      subtitle="Type or speak. Operational actions require confirmation."
                    >
                      <div className="h-[430px] overflow-y-auto pr-2 space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.role === "user"
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                message.role === "user"
                                  ? "bg-violet-600 text-white"
                                  : message.role === "system"
                                    ? "bg-amber-50 border border-amber-200 text-amber-800"
                                    : "bg-slate-50 border border-slate-200 text-slate-700"
                              }`}
                            >
                              <p className="leading-6">{message.text}</p>
                              <p className="text-[10px] opacity-50 mt-2">
                                {date(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>

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
                          className="w-full min-h-[90px] resize-none bg-transparent text-slate-950 placeholder:text-slate-400 outline-none p-2"
                          placeholder="Ask Sonny to summarize, create a task, or manage an orchestration..."
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

                          <div className="flex gap-2">
                            <button
                              onClick={startListening}
                              className={`h-12 w-12 rounded-xl font-bold transition ${
                                listening
                                  ? "bg-rose-500 animate-pulse"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                              }`}
                              title="Speak to Sonny"
                            >
                              {listening ? "■" : "🎙"}
                            </button>
                            <button
                              onClick={() => processCommand()}
                              disabled={working !== ""}
                              className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50"
                            >
                              {working ? "Sonny is leading..." : "Send"}
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
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
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
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-bold text-slate-400 mt-2">{title}</p>
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
