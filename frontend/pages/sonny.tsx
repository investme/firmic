import {
  useEffect,
  useMemo,
  useState } from "react";
import { useRouter } from "next/router";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import {
  acceptSonnyAssignment,
  approveSonnyAssignment,
  approveSonnyOrchestration,
  completeSonnyAssignment,
  completeSonnyOrchestration,
  getSonny,
  getSonnyState,
  getSonnyAgents,
  getSonnyAssignments,
  getSonnyOrchestrations,
  SonnyAgent,
  SonnyAssignment,
  SonnyOrchestrationRun,
  startSonnyAssignment,
  startSonnyOrchestration,
  getSonnyDecisions,
  getSonnyAutomations,
  type SonnyDecision,
  type SonnyAutomationRun,
  approveSonnyDecision,
  rejectSonnyDecision,
  cancelSonnyDecision,
  approveSonnyAutomation,
  cancelSonnyAutomation,
  approveSonnyAutomationAction,
  type SonnyAutomationAction,
  cancelSonnyOrchestration,
} from "../services/sonnyApi";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";
import { readCompanyStorage } from "../src/utils/companyStorage";
import { getConfirmedOrder } from "../src/utils/orderStorage";
import {
  sendSonnyChat,
  SonnyChatResponse,
  SonnyPlan,
} from "../services/sonnyChat";
import {
  executeSonnyActions,
  SonnyAction,
} from "../src/utils/sonnyActionExecutor";
import { useFirmicAIVoice } from "../src/os/ai/hooks";
import { useAIConversation } from "../src/os/ai/chat";
import {
  DEFAULT_AI_EXECUTION_STEPS,
  useAIExecution,
} from "../src/os/ai/execution";
import {
  AIOnlinePill,
  ExecutiveExecutionProgress,
  useLiveRelativeTime,
} from "../src/os/ui";

type Dashboard = {
  sonny: any;
  state: any;
  tasks: any[];
  documents: any[];
  agents: SonnyAgent[];
  runs: SonnyOrchestrationRun[];
  decisions: SonnyDecision[];
  automations: SonnyAutomationRun[];
};


const emptyDashboard: Dashboard = {
  sonny: null,
  state: null,
  tasks: [],
  documents: [],
  agents: [],
  runs: [],
  decisions: [],
  automations: [],
};

const array = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? value : [];

function paidOrderAgents(companyId: string): SonnyAgent[] {
  const order = getConfirmedOrder(String(companyId));
  if (!order || order.paymentStatus !== "paid") return [];

  return order.items
    .filter((item) => item.category === "ai" && item.billing === "monthly")
    .map((item, index) => ({
      id: `order-ai-${index}`,
      agent_code: `ORDER_AI_${index + 1}`,
      name: item.name,
      display_name: item.name,
      role: "AI Employee",
      description: "Active AI employee from the confirmed Firmic order.",
      status: "active",
      capabilities: [],
    }));
}

function mergeCompanyAgents(backendAgents: SonnyAgent[], orderAgents: SonnyAgent[]) {
  const merged = new Map<string, SonnyAgent>();

  for (const agent of [...backendAgents, ...orderAgents]) {
    const key = String(agent.display_name || agent.name || agent.agent_code || "")
      .trim()
      .toLowerCase();
    if (!key) continue;
    merged.set(key, { ...merged.get(key), ...agent, status: agent.status || "active" });
  }

  return Array.from(merged.values());
}

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

const SONNY_TIME_ZONE = "Asia/Beirut";

function getBeirutDateParts(dateValue = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SONNY_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(dateValue);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";

  return {
    weekday: value("weekday"),
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    dayPeriod: value("dayPeriod"),
  };
}

function getSonnyDateTimeAnswer(input: string): string | null {
  const lower = input.toLowerCase().replace(/[?.,!]/g, " ").replace(/\s+/g, " ").trim();
  const now = getBeirutDateParts();

  const weekdayCheck = lower.match(
    /(?:is|isn't|is not)\s+(?:it|today)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/
  );

  if (weekdayCheck) {
    const askedDay = weekdayCheck[1];
    const isNegativeQuestion = lower.includes("isn't") || lower.includes("is not");
    const matches = now.weekday.toLowerCase() === askedDay;
    const answer = isNegativeQuestion ? !matches : matches;

    if (answer) {
      return `Yes. Today is ${now.weekday}, ${now.month} ${now.day}, ${now.year}, in Beirut.`;
    }

    return `No. Today is ${now.weekday}, ${now.month} ${now.day}, ${now.year}, in Beirut.`;
  }

  const asksTime =
    lower.includes("what time is it") ||
    lower.includes("current time") ||
    lower === "time" ||
    lower.includes("time now");

  if (asksTime) {
    return `The current time in Beirut is ${now.hour}:${now.minute} ${now.dayPeriod}.`;
  }

  const asksDate =
    lower.includes("what is the date") ||
    lower.includes("what's the date") ||
    lower.includes("todays date") ||
    lower.includes("today's date") ||
    lower.includes("what date is it");

  if (asksDate) {
    return `Today is ${now.weekday}, ${now.month} ${now.day}, ${now.year}, in Beirut.`;
  }

  const asksDay =
    lower.includes("what day is it") ||
    lower.includes("what day is today") ||
    lower.includes("what day is it today") ||
    lower === "what day";

  if (asksDay) {
    return `Today is ${now.weekday}.`;
  }

  const asksMonth =
    lower.includes("what month is it") || lower.includes("current month");
  if (asksMonth) {
    return `The current month is ${now.month}.`;
  }

  const asksYear =
    lower.includes("what year is it") || lower.includes("current year");
  if (asksYear) {
    return `The current year is ${now.year}.`;
  }

  return null;
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



function renderSonnyInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (
      part.startsWith("**") &&
      part.endsWith("**") &&
      part.length > 4
    ) {
      return (
        <strong key={index} className="font-black text-slate-950">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function SonnyMessageContent({ text }: { text: string }) {
  const lines = String(text || "").split("\n");

  return (
    <div className="space-y-2 leading-6">
      {lines.map((rawLine, index) => {
        const line = rawLine
          .replace(/^\s*#{1,6}\s+/, "")
          .trimEnd();

        if (!line.trim()) {
          return <div key={index} className="h-1" />;
        }

        return (
          <p key={index} className="whitespace-pre-wrap">
            {renderSonnyInline(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function SonnyAI() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [data, setData] = useState<Dashboard>(emptyDashboard);
  const [integrations, setIntegrations] = useState<string[]>([]);
  const [command, setCommand] = useState("");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewedAt, setReviewedAt] = useState<Date | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const {
    listening,
    speaking,
    speak,
    startListening: startVoiceListening,
    stopListening,
    stopVoice,
  } = useFirmicAIVoice({
    enabled: voiceEnabled,
    onTranscript: setCommand,
    onFinalTranscript: (transcript) => processCommand(transcript),
    onWarning: setWarning,
    onBeforeListening: () => {
      requestAbortRef.current?.abort();
    },
  });

  const {
    messages,
    streamingMessageId,
    chatEndRef,
    addMessage,
    reply,
    stopStreaming,
    clearConversation,
  } = useAIConversation({
    storageKey: workspace?.id
      ? `firmic_sonny_conversation_${workspace.id}`
      : null,
    initialMessages: workspace?.id
      ? [
          {
            id: `sonny-welcome-${workspace.id}`,
            role: "sonny",
            text: `I am online for ${workspace.name}. I can read the company, summarize operations, create tasks, and manage orchestration runs and assignments.`,
            createdAt: new Date().toISOString(),
          },
        ]
      : [],
    speak,
    maxStoredMessages: 80,
    streamIntervalMs: 28,
  });

  const {
    working,
    pendingAction,
    pendingPlan,
    executionStage,
    requestAbortRef,
    setWorking,
    setPendingPlan,
    setExecutionStage,
    beginRequest,
    finishRequest,
    askConfirmation,
    executePendingAction,
    cancelPendingAction,
    cancelPendingPlan,
    runAction,
  } = useAIExecution<SonnyPlan>({
    onReply: reply,
    onWarning: setWarning,
    onNotice: setNotice,
    onRefresh: load,
  });


  const [pendingConfirmationId, setPendingConfirmationId] =
    useState<string | null>(null);

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

    load();
  }, [workspace?.id]);



  async function load() {
    if (!workspace?.id) return;

    setLoading(true);
    setWarning("");

    const results = await Promise.allSettled([
      getSonny(workspace.id),
      getSonnyState(workspace.id),
      getSonnyAgents(),
      getSonnyOrchestrations(workspace.id),
      getSonnyDecisions(workspace.id),
      getSonnyAutomations(workspace.id),
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
      results[3],
      { runs: [] as SonnyOrchestrationRun[] },
      "orchestration engine"
    );

    const baseRuns = array<SonnyOrchestrationRun>(orchestration.runs);

  const hydratedRuns: SonnyOrchestrationRun[] = await Promise.all(
  baseRuns.map(
    async (run): Promise<SonnyOrchestrationRun> => {
      try {
        const assignments = await getSonnyAssignments(
          workspace.id,
          run.id
        );

        return {
          ...run,
          assignments: array<SonnyAssignment>(assignments),
        };
      } catch {
        return {
          ...run,
          assignments: array<SonnyAssignment>(
            run.assignments
          ),
        };
      }
    }
  )
);

    const sonnyBrief = pick(
      results[0],
      null,
      "company brief"
    );

    const companyState = pick(
      results[1],
      null,
      "company state"
    );

    const decisions = pick(
      results[4],
      [] as SonnyDecision[],
      "decisions"
    );

    const automations = pick(
      results[5],
      [] as SonnyAutomationRun[],
      "automations"
    );

    setData({
      sonny: sonnyBrief,
      state: companyState,
      tasks: array(companyState?.tasks?.items),
      documents: array(companyState?.documents?.items),
      agents: mergeCompanyAgents(
        array(pick(results[2], [], "agent registry")),
        paidOrderAgents(String(workspace.id))
      ),
      runs: hydratedRuns,

      decisions: array<SonnyDecision>(decisions),
      automations: array<SonnyAutomationRun>(automations),
    });

    if (failed.length) {
      setWarning(
        `Some services are unavailable: ${failed.join(
          ", "
        )}. Sonny is showing all available intelligence.`
      );
    }

    setReviewedAt(new Date());
    setLoading(false);
  }

  function startListening() {
    stopStreaming();
    startVoiceListening();
  }

  function stopVoiceAndStreaming() {
    stopVoice();
    stopStreaming();
  }

  async function perform(
    key: string,
    action: () => Promise<any>,
    success: string
  ) {
    await runAction({
      key,
      action,
      success,
      refresh: true,
    });
  }

  const completedTasks = data.tasks.filter(
    (task) => task.status === "completed"
  ).length;
  const pendingTasks = data.tasks.length - completedTasks;
  // Firmic's unified Sonny company state is the authority.
  const score = Number(
    data.state?.progress?.score ??
    data.sonny?.summary?.progress ??
    0
  );

  const workforceSummary =
    data.state?.ai_workforce?.summary || {};

  const activeAgents = Number(
    workforceSummary.active || 0
  );

  const includedAICapacity =
    workforceSummary.unlimited
      ? null
      : Number(
          workforceSummary.included_capacity || 0
        );

  const availableAISlots =
    workforceSummary.unlimited
      ? null
      : Number(
          workforceSummary.available_slots || 0
        );

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
  type FounderApprovalItem = {
    id: string;
    source:
      | "decision"
      | "automation"
      | "automation_action"
      | "orchestration"
      | "assignment";
    title: string;
    detail: string;
    status: string;
    priority?: string;
    risk?: string;
    createdAt?: string | null;
    runId?: string;
    actionId?: string;
    reasoning?: string;
    recommendedAction?: string;
    expectedOutcome?: string;
    target?: string;
    service?: string;
    context?: string;
  };

  const founderApprovalQueue = useMemo<FounderApprovalItem[]>(() => {
    const queue: FounderApprovalItem[] = [];

    data.decisions
      .filter(
        (decision) =>
          decision.approval_required === true &&
          decision.status === "proposed"
      )
      .forEach((decision) => {
        queue.push({
          id: decision.id,
          source: "decision",
          title: decision.title || "Sonny decision",
          detail:
            decision.summary ||
            decision.recommended_action ||
            "Founder decision required.",
          status: decision.status || "proposed",
          priority: decision.priority,
          risk: decision.risk_level,
          createdAt: decision.created_at,
          reasoning: decision.reasoning,
          recommendedAction: decision.recommended_action,
          expectedOutcome: decision.expected_outcome,
        });
      });

    data.automations
      .filter(
        (run) =>
          run.approval_required === true &&
          run.status === "awaiting_approval"
      )
      .forEach((run) => {
        queue.push({
          id: run.id,
          source: "automation",
          title:
            run.automation_type
              ? label(run.automation_type)
              : "Automation run",
          detail: "Automation run requires founder approval.",
          status: run.status || "awaiting_approval",
          createdAt: run.created_at,
          runId: run.id,
          context:
            run.workflow_id
              ? `Workflow: ${run.workflow_id}`
              : run.trigger_type
                ? `Trigger: ${label(run.trigger_type)}`
                : undefined,
        });
      });

    data.automations.forEach((run) => {
      array<SonnyAutomationAction>(run.actions)
        .filter(
          (action) =>
            action.approval_required === true &&
            action.status === "awaiting_approval"
        )
        .forEach((action) => {
          queue.push({
            id: action.id,
            source: "automation_action",
            title:
              action.action_code
                ? label(action.action_code)
                : "Automation action",
            detail:
              action.service_name
                ? `Service: ${action.service_name}`
                : "Sensitive automation action requires approval.",
            status: action.status || "awaiting_approval",
            createdAt: action.created_at,
            runId: run.id,
            actionId: action.id,
            service: action.service_name,
            target:
              action.target_type || action.target_id
                ? [
                    action.target_type
                      ? label(action.target_type)
                      : null,
                    action.target_id || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : undefined,
          });
        });
    });

    data.runs
      .filter((run) => run.status === "awaiting_approval")
      .forEach((run) => {
        queue.push({
          id: run.id,
          source: "orchestration",
          title: "Orchestration run",
          detail:
            "Orchestration requires founder approval.",
          status: run.status || "awaiting_approval",
          createdAt: run.created_at,
          runId: run.id,
          context:
            run.orchestration_type
              ? `Type: ${label(run.orchestration_type)}`
              : run.coordinator_agent_code
                ? `Coordinator: ${label(run.coordinator_agent_code)}`
                : undefined,
        });
      });

    assignments
      .filter(
        (assignment) =>
          assignment.status === "awaiting_approval"
      )
      .forEach((assignment) => {
        queue.push({
          id: assignment.id,
          source: "assignment",
          title:
            assignment.title ||
            assignment.agent_code ||
            "Agent assignment",
          detail:
            assignment.instructions ||
            "Agent assignment requires founder approval.",
          status:
            assignment.status || "awaiting_approval",
          createdAt: assignment.created_at,
          runId: assignment.runId,
          context:
            assignment.required_capability
              ? `Capability: ${label(assignment.required_capability)}`
              : assignment.agent_code
                ? `Agent: ${label(assignment.agent_code)}`
                : undefined,
        });
      });

    return queue.sort((a, b) => {
      const priorityRank: Record<string, number> = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1,
      };

      const priorityDelta =
        (priorityRank[b.priority || ""] || 0) -
        (priorityRank[a.priority || ""] || 0);

      if (priorityDelta !== 0) return priorityDelta;

      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });
  }, [
    data.decisions,
    data.automations,
    data.runs,
    assignments,
  ]);

  const pendingApprovals = founderApprovalQueue.length;

  async function handleFounderApproval(
    item: FounderApprovalItem,
    action: "approve" | "reject" | "cancel"
  ) {
    if (!workspace?.id) return;

    setWarning("");

    try {
      if (item.source === "decision") {
        if (action === "approve") {
          await approveSonnyDecision(
            workspace.id,
            item.id
          );
        } else if (action === "reject") {
          await rejectSonnyDecision(
            workspace.id,
            item.id
          );
        } else {
          await cancelSonnyDecision(
            workspace.id,
            item.id
          );
        }
      } else if (item.source === "automation") {
        if (action === "approve") {
          await approveSonnyAutomation(
            workspace.id,
            item.runId || item.id
          );
        } else if (action === "cancel") {
          await cancelSonnyAutomation(
            workspace.id,
            item.runId || item.id
          );
        } else {
          return;
        }
      } else if (item.source === "automation_action") {
        if (
          action !== "approve" ||
          !item.runId ||
          !item.actionId
        ) {
          return;
        }

        await approveSonnyAutomationAction(
          workspace.id,
          item.runId,
          item.actionId
        );
      } else if (item.source === "orchestration") {
        if (action !== "approve") return;

        await approveSonnyOrchestration(
          workspace.id,
          item.runId || item.id
        );
      } else if (item.source === "assignment") {
        if (
          action !== "approve" ||
          !item.runId
        ) {
          return;
        }

        await approveSonnyAssignment(
          workspace.id,
          item.runId,
          item.id
        );
      }

      setNotice(
        action === "approve"
          ? "Founder approval recorded."
          : "Founder rejection recorded."
      );

      await load();
    } catch (error) {
      setWarning(
        error instanceof Error
          ? error.message
          : "Founder control failed."
      );
    }
  }

  const workforceSummaryText =
    workforceSummary.unlimited
      ? `${activeAgents} active AI employee assignment(s), unlimited included capacity`
      : `${activeAgents} active AI employee assignment(s), ${includedAICapacity} included, ${availableAISlots} available`;

  const summary =
    `${workspace?.name || "The company"} is at ${score}% readiness. ` +
    `${workforceSummaryText}. ` +
    `${runningRuns} orchestration runs are active, ` +
    `${completedRuns} are completed, ` +
    `${pendingApprovals} approvals are pending, ` +
    `${completedAssignments} assignments are completed, ` +
    `and ${pendingTasks} tasks remain open.`;

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
    if (
      !pendingPlan ||
      !pendingConfirmationId ||
      !workspace?.id ||
      working
    ) {
      return;
    }

    stopVoiceAndStreaming();
    const controller = beginRequest(
      "executive-action",
      "executing",
      "Executing approved executive action..."
    );

    try {
      const response = await sendSonnyChat(
        workspace.id,
        "Confirm executive action",
        {
          confirmed: true,
          confirmationId: pendingConfirmationId,
          signal: controller.signal,
        }
      );

      setExecutionStage("refreshing");
      setNotice("Action completed. Refreshing company intelligence...");
      setPendingPlan(null);
      setPendingConfirmationId(null);

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
      finishRequest();
    }
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
        await executePendingAction();
        return;
      }

      reply("There is no pending action to confirm.");
      return;
    }

    if (lower === "cancel" || lower === "cancel action") {
      if (pendingPlan) {
        cancelPendingPlan();
      } else {
        cancelPendingAction();
      }
      return;
    }

    if (lower === "clear conversation") {
      clearConversation();
      stopVoice();
      return;
    }

    const dateTimeAnswer = getSonnyDateTimeAnswer(clean);
    if (dateTimeAnswer) {
      reply(dateTimeAnswer, dateTimeAnswer);
      return;
    }

    const asksForWorkforce =
      lower === "show agents" ||
      lower === "show workforce" ||
      lower === "ai workforce overview" ||
      lower.includes("how many ai employee") ||
      lower.includes("how many agents");

    if (asksForWorkforce) {
      const assigned = Number(
        workforceSummary.assigned || 0
      );

      const capacity = workforceSummary.unlimited
        ? "Unlimited"
        : String(includedAICapacity);

      const available = workforceSummary.unlimited
        ? "Unlimited"
        : String(availableAISlots);

      const response =
        `AI workforce overview:\n` +
        `Plan: ${String(
          workforceSummary.plan_name || "Unknown"
        )}.\n` +
        `Included capacity: ${capacity}.\n` +
        `Active assignments: ${activeAgents}.\n` +
        `Company-specific assignments: ${assigned}.\n` +
        `Available slots: ${available}.`;

      reply(response, response);
      return;
    }

    try {
      const controller = beginRequest(
        "sonny-chat",
        "understanding",
        "Understanding your request..."
      );

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

      // Never allow an AI provider request to leave Sonny permanently
      // stuck in the working/planning state.
      const requestTimeout = window.setTimeout(() => {
        controller.abort();
      }, 45000);

      let response: SonnyChatResponse;

      try {
        response = await sendSonnyChat(workspace.id, clean, {
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(requestTimeout);
      }

      if (response.actions?.length) {
        setPendingPlan(null);
        setPendingConfirmationId(null);
        setExecutionStage("executing");
        setNotice("Executing Sonny navigation...");

        // Give the acknowledgement time to appear before route changes.
        reply(response.reply, response.speech || response.reply);
        await new Promise((resolve) => window.setTimeout(resolve, 260));

        await executeSonnyActions(response.actions as SonnyAction[], {
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
        response.plan?.action &&
        response.confirmation_id
      ) {
        setPendingPlan(response.plan);
        setPendingConfirmationId(response.confirmation_id);
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
        setPendingConfirmationId(null);
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
      finishRequest();
    }
  }

  const executionSteps = DEFAULT_AI_EXECUTION_STEPS;
  const reviewLabel = useLiveRelativeTime(reviewedAt);

  const activeExecutionIndex = executionSteps.findIndex(
    (step) => step.key === executionStage
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 text-slate-950 flex">
        <FirmicSidebar />

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
                    {greeting}. Operational Review Complete.
                  </h1>

                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    {loading ? "Reviewing company..." : reviewLabel}
                  </div>

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
                  <AIOnlinePill workers={activeAgents} label={executiveStatus} />

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

                <ExecutiveExecutionProgress
                  steps={executionSteps}
                  stage={executionStage}
                />
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
                              <div>
                                <SonnyMessageContent text={message.text} />
                                {streamingMessageId === message.id && (
                                  <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-full bg-violet-500 align-middle" />
                                )}


                              </div>
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
                              onClick={() => cancelPendingPlan()}
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
                                await executePendingAction();
                              }}
                              className="bg-amber-300 text-slate-950 px-4 py-2 rounded-xl font-black"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => {
                                cancelPendingAction();
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
                              onClick={listening ? stopListening : startListening}
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
                          value={Number(
                            data.state?.documents?.summary?.total || 0
                          )}
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
                      subtitle={
                        workforceSummary.unlimited
                          ? `${activeAgents} active · unlimited included`
                          : `${activeAgents} active · ${includedAICapacity} included`
                      }
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

                    <Panel
                      title="Founder Approval Queue"
                      subtitle={
                        pendingApprovals > 0
                          ? `${pendingApprovals} item(s) require founder authority`
                          : "No founder decisions are waiting"
                      }
                    >
                      {founderApprovalQueue.length === 0 ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <p className="font-black text-emerald-800">
                            Approval queue clear
                          </p>
                          <p className="text-sm text-emerald-700 mt-1">
                            No sensitive operation is waiting for founder approval.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                          {founderApprovalQueue.map((item) => (
                            <div
                              key={`${item.source}:${item.id}`}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] uppercase tracking-wide font-black text-violet-600">
                                      {label(item.source)}
                                    </span>

                                    {item.priority && (
                                      <span className="text-[11px] font-bold text-slate-500">
                                        {label(item.priority)}
                                      </span>
                                    )}

                                    {item.risk && (
                                      <span className="text-[11px] font-bold text-amber-600">
                                        {label(item.risk)} risk
                                      </span>
                                    )}
                                  </div>

                                  <p className="font-black text-slate-950 mt-2">
                                    {item.title}
                                  </p>

                                  <p className="text-sm text-slate-500 mt-1">
                                    {item.detail}
                                  </p>

                                  {(item.reasoning ||
                                    item.recommendedAction ||
                                    item.expectedOutcome ||
                                    item.target ||
                                    item.service ||
                                    item.context) && (
                                    <div className="mt-3 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                      {item.reasoning && (
                                        <div>
                                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                            Why approval is needed
                                          </p>
                                          <p className="mt-1 text-xs text-slate-600">
                                            {item.reasoning}
                                          </p>
                                        </div>
                                      )}

                                      {item.recommendedAction && (
                                        <div>
                                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                            Recommended action
                                          </p>
                                          <p className="mt-1 text-xs text-slate-600">
                                            {item.recommendedAction}
                                          </p>
                                        </div>
                                      )}

                                      {item.expectedOutcome && (
                                        <div>
                                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                            Expected outcome
                                          </p>
                                          <p className="mt-1 text-xs text-slate-600">
                                            {item.expectedOutcome}
                                          </p>
                                        </div>
                                      )}

                                      {item.service && (
                                        <p className="text-xs text-slate-500">
                                          <span className="font-black">
                                            Service:
                                          </span>{" "}
                                          {item.service}
                                        </p>
                                      )}

                                      {item.target && (
                                        <p className="text-xs text-slate-500">
                                          <span className="font-black">
                                            Target:
                                          </span>{" "}
                                          {item.target}
                                        </p>
                                      )}

                                      {item.context && (
                                        <p className="text-xs text-slate-500">
                                          {item.context}
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {item.createdAt && (
                                    <p className="text-xs text-slate-400 mt-2">
                                      {new Date(
                                        item.createdAt
                                      ).toLocaleString()}
                                    </p>
                                  )}
                                </div>

                                <Status value={item.status} />
                              </div>

                              <div className="flex flex-wrap gap-2 mt-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleFounderApproval(
                                      item,
                                      "approve"
                                    )
                                  }
                                  className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white hover:bg-violet-700 transition"
                                >
                                  Approve
                                </button>

                                {item.source === "decision" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleFounderApproval(
                                        item,
                                        "reject"
                                      )
                                    }
                                    className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 transition"
                                  >
                                    Reject
                                  </button>
                                )}

                                {(item.source === "decision" ||
                                  item.source === "automation") && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleFounderApproval(
                                        item,
                                        "cancel"
                                      )
                                    }
                                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 transition"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
