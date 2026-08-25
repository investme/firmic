import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";
import {
  executeWorkforceJob,
  getCompanyWorkforceJobs,
  getCompanyWorkforceHealth,
  getWorkforceRegistry,
  WorkforceAgent,
  WorkforceExecutionHealth,
  WorkforceJob,
} from "../services/workforceApi";
import {
  CompanySubscription,
  getCompanySubscription,
} from "../services/subscriptionApi";
import {
  deactivateAIAgent,
  getCompanyAIAgents,
  hireAIAgent,
} from "../services/aiWorkforceApi";

const CORE_AGENTS = ["Sonny", "Hermes", "Julia"];

const CORE_AGENT_CODES = new Set([
  "sonny",
  "hermes",
  "julia",
]);

type CompanyAIAgent = {
  id: string;
  company_id: string;
  registry_agent_id?: string | null;
  agent_name: string;
  monthly_price_usd: number;
  status: string;
  activated_at?: string | null;
  deactivated_at?: string | null;
};

function agentDisplayName(
  agentCode?: string | null
) {
  const normalized = String(
    agentCode || ""
  )
    .trim()
    .toLowerCase();

  if (normalized === "sonny") {
    return "Sonny";
  }

  return normalized
    .split("_")
    .filter(Boolean)
    .map(
      (part) =>
        part.charAt(0).toUpperCase()
        + part.slice(1)
    )
    .join(" ");
}

type AgentVoiceProfile = {
  rate: number;
  pitch: number;
};

function normalizeVoiceCode(
  value?: string | null
) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function agentVoiceProfile(
  senderAgentCode: string
): AgentVoiceProfile {
  const sender = normalizeVoiceCode(
    senderAgentCode
  );

  if (sender === "sonny") {
    return {
      rate: 0.91,
      pitch: 0.9,
    };
  }

  if (sender === "finance_ai") {
    return {
      rate: 0.97,
      pitch: 1.08,
    };
  }

  return {
    rate: 0.96,
    pitch: 1.02,
  };
}

function stableAgentVoiceIndex(
  agentCode: string,
  availableVoiceCount: number
) {
  if (availableVoiceCount <= 1) {
    return 0;
  }

  const normalized = normalizeVoiceCode(
    agentCode
  );

  if (normalized === "sonny") {
    return 0;
  }

  if (normalized === "finance_ai") {
    return 1;
  }

  let hash = 0;

  for (
    let index = 0;
    index < normalized.length;
    index += 1
  ) {
    hash = (
      (hash * 31)
      + normalized.charCodeAt(index)
    ) >>> 0;
  }

  return (
    1
    + (
      hash
      % Math.max(
          availableVoiceCount - 1,
          1
        )
    )
  );
}

function preferredBrowserVoices(
  voices: SpeechSynthesisVoice[]
) {
  const english = voices.filter(
    (voice) =>
      String(
        voice.lang || ""
      )
        .toLowerCase()
        .startsWith("en")
  );

  const candidates =
    english.length > 0
      ? english
      : voices;

  return [...candidates].sort(
    (left, right) => {
      const leftKey = `${
        left.localService
          ? "0"
          : "1"
      }:${left.lang}:${left.name}:${left.voiceURI}`;

      const rightKey = `${
        right.localService
          ? "0"
          : "1"
      }:${right.lang}:${right.name}:${right.voiceURI}`;

      return leftKey.localeCompare(
        rightKey
      );
    }
  );
}

async function loadBrowserVoices() {
  if (
    typeof window === "undefined"
    || !window.speechSynthesis
  ) {
    return [] as SpeechSynthesisVoice[];
  }

  const immediate =
    window.speechSynthesis.getVoices();

  if (immediate.length > 0) {
    return immediate;
  }

  return await new Promise<
    SpeechSynthesisVoice[]
  >((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;

      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        handleVoicesChanged
      );

      resolve(
        window.speechSynthesis.getVoices()
      );
    };

    const handleVoicesChanged = () => {
      finish();
    };

    window.speechSynthesis.addEventListener(
      "voiceschanged",
      handleVoicesChanged
    );

    window.setTimeout(
      finish,
      1200
    );
  });
}

async function resolveAgentVoice(
  senderAgentCode: string
) {
  const voices = preferredBrowserVoices(
    await loadBrowserVoices()
  );

  if (voices.length === 0) {
    return null;
  }

  const index = stableAgentVoiceIndex(
    senderAgentCode,
    voices.length
  );

  return (
    voices[index]
    || voices[0]
    || null
  );
}

async function speakAgentMessage(
  senderAgentCode: string,
  content: string
) {
  if (
    typeof window === "undefined"
    || !window.speechSynthesis
    || typeof SpeechSynthesisUtterance
      === "undefined"
  ) {
    return;
  }

  const sender = normalizeVoiceCode(
    senderAgentCode
  );

  const profile = agentVoiceProfile(
    sender
  );

  const voice = await resolveAgentVoice(
    sender
  );

  const utterance =
    new SpeechSynthesisUtterance(
      `${agentDisplayName(sender)}. ${content}`
    );

  if (voice) {
    utterance.voice = voice;
    utterance.lang =
      voice.lang
      || "en-US";
  } else {
    utterance.lang = "en-US";
  }

  utterance.rate = profile.rate;
  utterance.pitch = profile.pitch;
  utterance.volume = 1;

  window.speechSynthesis.cancel();

  window.speechSynthesis.speak(
    utterance
  );
}


import {
  approveSonnyOrchestration,
  cancelSonnyOrchestration,
  getSonnyOrchestrations,
  SonnyOrchestrationRun,
} from "../services/sonnyApi";

export default function AIWorkforcePage() {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [registry, setRegistry] = useState<WorkforceAgent[]>([]);
  const [jobs, setJobs] = useState<WorkforceJob[]>([]);
  const [orchestrationRuns, setOrchestrationRuns] =
    useState<SonnyOrchestrationRun[]>([]);
  const [orchestrationMutation, setOrchestrationMutation] =
    useState("");
  const [executionHealth, setExecutionHealth] =
    useState<WorkforceExecutionHealth | null>(null);
  const [subscription, setSubscription] =
    useState<CompanySubscription | null>(null);
  const [companyAgents, setCompanyAgents] =
    useState<CompanyAIAgent[]>([]);
  const [title, setTitle] = useState("");
  const [requestText, setRequestText] = useState("");
  const [preferredAgent, setPreferredAgent] = useState("");
  const [fanoutMode, setFanoutMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agentMutation, setAgentMutation] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Only the newest workforce refresh may update browser state.
  // This prevents an older in-flight request from overwriting a
  // newer canonical job snapshot.
  const workforceLoadSequence = useRef(0);

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
      setOrchestrationRuns([]);
      setExecutionHealth(null);
      setSubscription(null);
      setCompanyAgents([]);
      setLoading(false);
      return;
    }

    const requestedWorkspaceId = workspace.id;
    const requestSequence =
      ++workforceLoadSequence.current;

    try {
      showLoading ? setLoading(true) : setRefreshing(true);
      setError("");

      const [
        registryResult,
        jobsResult,
        orchestrationResult,
        healthResult,
        subscriptionResult,
        companyAgentsResult,
      ] = await Promise.all([
        getWorkforceRegistry(),
        getCompanyWorkforceJobs(workspace.id, 40),
        getSonnyOrchestrations(workspace.id, 20),
        getCompanyWorkforceHealth(workspace.id),
        getCompanySubscription(workspace.id),
        getCompanyAIAgents(workspace.id),
      ]);

      // Ignore stale responses. A slower request that began
      // earlier must never overwrite a newer canonical snapshot.
      if (
        requestSequence !==
          workforceLoadSequence.current ||
        getActiveWorkspace()?.id !==
          requestedWorkspaceId
      ) {
        return;
      }

      setRegistry(
        Array.isArray(registryResult)
          ? registryResult
          : Array.isArray(registryResult?.agents)
          ? registryResult.agents
          : []
      );

      const authoritativeJobs =
        Array.isArray(jobsResult)
          ? jobsResult
          : Array.isArray(jobsResult?.jobs)
          ? jobsResult.jobs
          : [];


      setJobs(authoritativeJobs);

      setOrchestrationRuns(
        Array.isArray(orchestrationResult)
          ? orchestrationResult
          : Array.isArray(orchestrationResult?.runs)
          ? orchestrationResult.runs
          : []
      );

      setExecutionHealth(healthResult || null);

      setSubscription(
        subscriptionResult || null
      );

      setCompanyAgents(
        Array.isArray(companyAgentsResult)
          ? companyAgentsResult
          : []
      );
    } catch (err: any) {
      if (
        requestSequence ===
        workforceLoadSequence.current
      ) {
        setError(
          err?.message ||
            "Failed to load AI workforce."
        );
      }
    } finally {
      if (
        requestSequence ===
        workforceLoadSequence.current
      ) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  async function controlOrchestration(
    run: SonnyOrchestrationRun,
    action: "approve" | "cancel"
  ) {
    if (!workspace?.id || !run?.id) return;

    const mutationKey = `${run.id}:${action}`;

    try {
      setOrchestrationMutation(mutationKey);
      setError("");
      setNotice("");

      if (action === "approve") {
        await approveSonnyOrchestration(
          workspace.id,
          run.id
        );
        setNotice(
          "Founder approval recorded for orchestration run."
        );
      } else {
        await cancelSonnyOrchestration(
          workspace.id,
          run.id
        );
        setNotice(
          "Orchestration run cancelled by founder control."
        );
      }

      await loadWorkforce(false);
    } catch (err: any) {
      setError(
        err?.message ||
          `Failed to ${action} orchestration run.`
      );
    } finally {
      setOrchestrationMutation("");
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
        fanout: fanoutMode,
      });

      if (
        response?.mode === "fanout" &&
        Array.isArray(response?.jobs)
      ) {
        const createdJobs = response.jobs;

        setJobs((current) => [
          ...createdJobs,
          ...current.filter(
            (job) =>
              !createdJobs.some(
                (createdJob: WorkforceJob) =>
                  createdJob.id === job.id
              )
          ),
        ]);

        const unavailableCount =
          Array.isArray(response?.unavailable)
            ? response.unavailable.length
            : 0;

        setNotice(
          unavailableCount > 0
            ? `Sonny delegated ${createdJobs.length} specialist job${createdJobs.length === 1 ? "" : "s"}. ${unavailableCount} specialist${unavailableCount === 1 ? "" : "s"} unavailable.`
            : `Sonny delegated ${createdJobs.length} specialist job${createdJobs.length === 1 ? "" : "s"}.`
        );
      } else {
        const createdJob =
          response?.job || response;

        if (createdJob?.id) {
          setJobs((current) => [
            createdJob,
            ...current.filter(
              (job) => job.id !== createdJob.id
            ),
          ]);
        }
        setNotice(
          `${createdJob?.assigned_agent || "Sonny"} accepted the request.`
        );
      }

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

  async function changeAgentStatus(
    agent: WorkforceAgent,
    activate: boolean
  ) {
    if (!workspace?.id) {
      setError("Select a company first.");
      return;
    }

    if (CORE_AGENT_CODES.has(agent.key)) {
      setError(
        `${agent.name} is part of Firmic's core executive team and is not managed through AI Employee controls.`
      );
      return;
    }

    const mutationKey =
      `${activate ? "hire" : "deactivate"}:${agent.key}`;

    try {
      setAgentMutation(mutationKey);
      setError("");
      setNotice("");

      if (activate) {
        await hireAIAgent({
          company_id: workspace.id,
          agent_code: agent.key,
        });

        setNotice(
          `${agent.name} has been activated for ${
            workspace.name || "the company"
          }.`
        );
      } else {
        await deactivateAIAgent({
          company_id: workspace.id,
          agent_code: agent.key,
        });

        setNotice(
          `${agent.name} has been deactivated.`
        );
      }

      await loadWorkforce(false);
    } catch (err: any) {
      setError(
        err?.message ||
          `Could not ${
            activate ? "hire" : "deactivate"
          } ${agent.name}.`
      );
    } finally {
      setAgentMutation("");
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

  const hireableAgents = useMemo(
    () =>
      registry.filter(
        (agent) =>
          !CORE_AGENT_CODES.has(
            String(agent.key || "").toLowerCase()
          )
      ),
    [registry]
  );

  function activeCompanyAgentFor(
    definition: WorkforceAgent
  ) {
    return companyAgents.find(
      (agent) =>
        String(agent.status || "").toLowerCase() ===
          "active" &&
        String(agent.agent_name || "").toLowerCase() ===
          String(definition.name || "").toLowerCase()
    );
  }

  const activeSpecialistDefinitions = useMemo(
    () =>
      hireableAgents.filter((definition) =>
        companyAgents.some(
          (agent) =>
            String(agent.status || "").toLowerCase() ===
              "active" &&
            String(agent.agent_name || "").toLowerCase() ===
              String(definition.name || "").toLowerCase()
        )
      ),
    [companyAgents, hireableAgents]
  );

  function specialistOperationalState(
    definition: WorkforceAgent
  ) {
    const agentJobs = jobs.filter(
      (job) =>
        String(job.assigned_agent || "").toLowerCase() ===
        String(definition.name || "").toLowerCase()
    );

    const currentJob = agentJobs.find((job) =>
      ["pending", "accepted", "working"].includes(job.status)
    );

    return {
      currentJob,
      completed: agentJobs.filter(
        (job) => job.status === "completed"
      ).length,
      failed: agentJobs.filter(
        (job) => job.status === "failed"
      ).length,
    };
  }

  const activeJobs = jobs.filter((job) =>
    ["pending", "accepted", "working"].includes(job.status)
  );
  const completedJobs = jobs.filter((job) => job.status === "completed");
  const failedJobs = jobs.filter((job) => job.status === "failed");

  const activeAIEmployees = companyAgents.filter(
    (agent) =>
      String(agent.status || "").toLowerCase() === "active"
  ).length;

  const aiEmployeeLimit =
    subscription?.plan?.max_ai_employees ?? 0;

  const unlimitedAIEmployees =
    Boolean(subscription?.plan) &&
    aiEmployeeLimit === 0;

  const availableAISlots =
    unlimitedAIEmployees
      ? null
      : Math.max(
          aiEmployeeLimit - activeAIEmployees,
          0
        );

  const aiEmployeeCapacityLabel =
    unlimitedAIEmployees
      ? `${activeAIEmployees} / Unlimited`
      : `${activeAIEmployees} / ${aiEmployeeLimit}`;

  const recurringCompanyOperatingCost = Number(
    subscription?.monthly_total || 0
  );
  const agentConversation = useMemo(() => {
    const messages = jobs.flatMap((job) =>
      (job.agent_messages || []).map(
        (message) => ({
          ...message,
          jobTitle: job.title,
          assignedAgent: job.assigned_agent,
        })
      )
    );

    return messages.sort(
      (left, right) =>
        new Date(
          left.created_at || 0
        ).getTime()
        -
        new Date(
          right.created_at || 0
        ).getTime()
    );
  }, [jobs]);


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


  const workforceHealthStatus = String(
    executionHealth?.health?.status ||
      executionHealth?.health?.status ||
      "unknown"
  ).toLowerCase();

  const workforceHealthReasons =
    Array.isArray(executionHealth?.health?.reasons)
      ? executionHealth.health.reasons
      : [];

  const workforceFailureCounts =
    executionHealth?.failures || {};

  const workforceLeaseCounts =
    executionHealth?.leases || {};

  const workforceWorkerState =
    executionHealth?.worker || {};

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
                href="#manage-ai-employees"
                className="bg-violet-600 text-white rounded-xl px-5 py-3 font-bold hover:bg-violet-700 transition"
              >
                Manage AI Employees
              </a>

              <a
                href="#delegate-work"
                className="bg-white border border-slate-200 rounded-xl px-5 py-3 font-bold shadow-sm"
              >
                Delegate Work
              </a>

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fanoutMode}
                  onChange={(event) =>
                    setFanoutMode(event.target.checked)
                  }
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-900">
                    Enable multi-specialist delegation
                  </span>
                  <span className="block text-xs text-slate-500 mt-1">
                    Sonny may delegate this objective to multiple active AI employees when their domains match.
                  </span>
                </span>
              </label>

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


          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Execution health
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-lg font-bold text-slate-950">
                    Workforce runtime
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                      workforceHealthStatus === "healthy"
                        ? "bg-emerald-50 text-emerald-700"
                        : workforceHealthStatus === "critical"
                        ? "bg-red-50 text-red-700"
                        : workforceHealthStatus === "degraded"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {workforceHealthStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Mini
                  title="Failed jobs"
                  value={String(
                    workforceFailureCounts.failed_jobs || 0
                  )}
                />
                <Mini
                  title="Exhausted"
                  value={String(
                    Number(
                      workforceFailureCounts.exhausted_runs || 0
                    ) +
                      Number(
                        workforceFailureCounts.exhausted_assignments || 0
                      )
                  )}
                />
                <Mini
                  title="Expired leases"
                  value={String(
                    workforceLeaseCounts.expired || 0
                  )}
                />
                <Mini
                  title="Stale workers"
                  value={String(
                    workforceWorkerState.stale || 0
                  )}
                />
              </div>
            </div>

            {workforceHealthReasons.length > 0 && (
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-sm font-bold text-amber-900">
                  Runtime attention required
                </p>
                <ul className="mt-2 space-y-1 text-sm text-amber-800">
                  {workforceHealthReasons.map((reason, index) => (
                    <li key={`${reason}-${index}`}>
                      • {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>


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
              value={aiEmployeeCapacityLabel}
              icon="🤖"
            />
            <Stat title="Departments" value="4" icon="🏢" />
            <Stat title="Active Jobs" value={String(activeJobs.length)} icon="⚡" />
            <Stat title="Completed" value={String(completedJobs.length)} icon="✅" />
            <Stat title="Failed" value={String(failedJobs.length)} icon="⚠️" />
            <Stat
              title="Active Specialists"
              value={String(activeSpecialistDefinitions.length)}
              icon="💼"
            />
            <Stat
              title="Monthly Operating Cost"
              value={`$${recurringCompanyOperatingCost.toFixed(2)}`}
              icon="💳"
            />
          </section>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
            <span className="font-bold text-slate-900">
              Commercial authority:
            </span>{" "}
            AI employee hiring is reflected through Firmic&apos;s subscription
            service catalog. Monthly Operating Cost is the authoritative
            recurring subscription total. Workforce execution activity does
            not create a separate browser-calculated payroll value.
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

              <section
                id="manage-ai-employees"
                className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm scroll-mt-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-violet-700 font-bold">
                      AI Employees
                    </p>

                    <h2 className="text-2xl font-bold text-slate-950 mt-1">
                      Build your specialist workforce
                    </h2>

                    <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                      Activate specialist AI employees for your company.
                      Employees inside your plan allowance are included.
                      Any overage is calculated by Firmic&apos;s
                      server-side commercial catalog.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-violet-50 border border-violet-100 px-5 py-3">
                    <p className="text-xs uppercase tracking-wide text-violet-700 font-bold">
                      Plan Capacity
                    </p>

                    <p className="text-xl font-bold text-slate-950 mt-1">
                      {aiEmployeeCapacityLabel}
                    </p>

                    {availableAISlots !== null && (
                      <p className="text-xs text-slate-500 mt-1">
                        {availableAISlots} included slot
                        {availableAISlots === 1 ? "" : "s"} remaining
                      </p>
                    )}
                  </div>
                </div>

                {hireableAgents.length === 0 ? (
                  <Empty text="No specialist AI employees are currently available." />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
                    {hireableAgents.map((agent) => {
                      const activeAgent =
                        activeCompanyAgentFor(agent);

                      const isActive =
                        Boolean(activeAgent);

                      const operational =
                        specialistOperationalState(agent);

                      const mutationKey =
                        `${isActive ? "deactivate" : "hire"}:${agent.key}`;

                      const changing =
                        agentMutation === mutationKey;

                      return (
                        <article
                          key={agent.key}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="h-11 w-11 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-xl">
                                🤖
                              </div>

                              <h3 className="font-bold text-slate-950 mt-4">
                                {agent.name}
                              </h3>

                              <p className="text-sm font-semibold text-violet-700 mt-1">
                                {agent.role}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {isActive
                                ? "Active"
                                : "Available"}
                            </span>
                          </div>

                          <p className="text-sm text-slate-500 mt-4 min-h-[40px]">
                            {agent.description ||
                              "Specialist Firmic AI employee."}
                          </p>

                          {isActive && activeAgent && (
                            <>
                              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
                                Catalog price snapshot:{" "}
                                <span className="font-bold text-slate-900">
                                  $
                                  {Number(
                                    activeAgent.monthly_price_usd ||
                                      0
                                  ).toFixed(2)}
                                </span>{" "}
                                per employee/month before plan
                                inclusion.
                              </div>

                              <div className="grid grid-cols-3 gap-2 mt-3">
                                <Mini
                                  title="State"
                                  value={
                                    operational.currentJob?.status ||
                                    "Ready"
                                  }
                                />
                                <Mini
                                  title="Completed"
                                  value={String(
                                    operational.completed
                                  )}
                                />
                                <Mini
                                  title="Failed"
                                  value={String(
                                    operational.failed
                                  )}
                                />
                              </div>

                              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                                <p className="text-xs text-slate-500">
                                  Current assignment
                                </p>
                                <p className="text-sm font-bold text-slate-900 mt-1 truncate">
                                  {operational.currentJob?.title ||
                                    "Ready for work"}
                                </p>
                                <Progress
                                  value={
                                    operational.currentJob?.progress ||
                                    0
                                  }
                                />
                              </div>
                            </>
                          )}

                          <button
                            type="button"
                            disabled={
                              Boolean(agentMutation) ||
                              !workspace?.id
                            }
                            onClick={() =>
                              changeAgentStatus(
                                agent,
                                !isActive
                              )
                            }
                            className={`mt-5 w-full rounded-xl px-4 py-3 font-bold transition disabled:opacity-50 ${
                              isActive
                                ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
                                : "bg-violet-600 text-white hover:bg-violet-700"
                            }`}
                          >
                            {changing
                              ? isActive
                                ? "Deactivating..."
                                : "Activating..."
                              : isActive
                              ? `Deactivate ${agent.name}`
                              : `Hire ${agent.name}`}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                  Sonny, Hermes, and Julia are Firmic core
                  executives and are managed separately from
                  AI Employee controls.
                </div>
              </section>

              <section className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-violet-700 font-bold">
                      Founder Control
                    </p>
                    <h2 className="text-xl font-bold text-slate-950 mt-1">
                      Orchestration approval boundary
                    </h2>
                    <p className="text-sm text-slate-500 mt-2">
                      Review orchestration runs before approving or cancelling
                      founder-controlled work.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                    {orchestrationRuns.length} recent run
                    {orchestrationRuns.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {orchestrationRuns.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                      No orchestration runs are waiting for founder review.
                    </div>
                  ) : (
                    orchestrationRuns.slice(0, 8).map((run) => {
                      const status = String(
                        run.status || "unknown"
                      ).toLowerCase();

                      const canApprove =
                        Boolean(run.approval_required) &&
                        [
                          "pending",
                          "awaiting_approval",
                        ].includes(status);

                      const terminal = [
                        "completed",
                        "failed",
                        "cancelled",
                      ].includes(status);

                      const canCancel = !terminal;

                      const approving =
                        orchestrationMutation ===
                        `${run.id}:approve`;

                      const cancelling =
                        orchestrationMutation ===
                        `${run.id}:cancel`;

                      return (
                        <div
                          key={run.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-slate-950">
                                  {run.orchestration_type ||
                                    "workforce orchestration"}
                                </span>

                                <span className="rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold capitalize text-slate-700">
                                  {status.replaceAll("_", " ")}
                                </span>

                                {run.approval_required && (
                                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                                    Founder approval
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-500 mt-2">
                                Run {run.id}
                              </p>

                              <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-600">
                                <span>
                                  Coordinator:{" "}
                                  <strong>
                                    {run.coordinator_agent_code ||
                                      "Sonny"}
                                  </strong>
                                </span>
                                <span>
                                  Assignments:{" "}
                                  <strong>
                                    {Number(
                                      run.metrics
                                        ?.total_assignments || 0
                                    )}
                                  </strong>
                                </span>
                                <span>
                                  Retries:{" "}
                                  <strong>
                                    {Number(run.retry_count || 0)}
                                  </strong>
                                </span>
                              </div>

                              {run.error_message && (
                                <p className="mt-3 text-sm text-red-700">
                                  {run.error_message}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {canApprove && (
                                <button
                                  type="button"
                                  disabled={Boolean(
                                    orchestrationMutation
                                  )}
                                  onClick={() =>
                                    controlOrchestration(
                                      run,
                                      "approve"
                                    )
                                  }
                                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                                >
                                  {approving
                                    ? "Approving..."
                                    : "Approve"}
                                </button>
                              )}

                              {canCancel && (
                                <button
                                  type="button"
                                  disabled={Boolean(
                                    orchestrationMutation
                                  )}
                                  onClick={() =>
                                    controlOrchestration(
                                      run,
                                      "cancel"
                                    )
                                  }
                                  className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                  {cancelling
                                    ? "Cancelling..."
                                    : "Cancel"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Approval is explicit. This panel does not automatically
                  approve or execute orchestration work.
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

                            <optgroup label="Firmic executives">
                              {coreAgents.map((agent) => (
                                <option
                                  key={agent.name}
                                  value={agent.name.toLowerCase()}
                                >
                                  {agent.name} — {agent.role}
                                </option>
                              ))}
                            </optgroup>

                            {activeSpecialistDefinitions.length > 0 && (
                              <optgroup label="Active AI employees">
                                {activeSpecialistDefinitions.map(
                                  (agent) => (
                                    <option
                                      key={agent.key}
                                      value={agent.key}
                                    >
                                      {agent.name} — {agent.role}
                                    </option>
                                  )
                                )}
                              </optgroup>
                            )}
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

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                        Agent communication
                      </p>

                      <h2 className="text-xl font-black text-slate-950 mt-1">
                        Sonny ↔ AI Employee Conversation
                      </h2>

                      <p className="text-sm text-slate-500 mt-1">
                        Persisted messages from real workforce assignments.
                      </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {agentConversation.length} messages
                    </span>
                  </div>

                  {agentConversation.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                      No agent conversation has been recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                      {agentConversation
                        .slice(-40)
                        .map((message) => {
                          const sonnySpeaking =
                            String(
                              message.sender_agent_code || ""
                            ).toLowerCase() === "sonny";

                          return (
                            <div
                              key={message.id}
                              className={[
                                "rounded-2xl border p-4",
                                sonnySpeaking
                                  ? "border-indigo-200 bg-indigo-50/70"
                                  : "border-emerald-200 bg-emerald-50/70",
                              ].join(" ")}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-sm font-black text-slate-950">
                                    {agentDisplayName(
                                      message.sender_agent_code
                                    )}
                                    {" → "}
                                    {agentDisplayName(
                                      message.recipient_agent_code
                                    )}
                                  </p>

                                  <p className="text-xs text-slate-500 mt-1">
                                    {message.message_type}
                                    {message.jobTitle
                                      ? ` · ${message.jobTitle}`
                                      : ""}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400">
                                    {message.created_at
                                      ? new Date(
                                          message.created_at
                                        ).toLocaleTimeString()
                                      : "—"}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      speakAgentMessage(
                                        message.sender_agent_code,
                                        message.content
                                      )
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                  >
                                    🔊 Speak
                                  </button>
                                </div>
                              </div>

                              {message.subject && (
                                <p className="mt-3 text-sm font-bold text-slate-800">
                                  {message.subject}
                                </p>
                              )}

                              <p className="mt-2 text-sm leading-6 text-slate-700">
                                {message.content}
                              </p>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </section>

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
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3"
    >
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
