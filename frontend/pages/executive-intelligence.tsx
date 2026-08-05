import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import { getActiveWorkspace } from "../src/utils/workspaceContext";
import { getAuthToken } from "../services/authApi";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://firmic-production.up.railway.app";

type Risk = {
  severity: string;
  title: string;
  description: string;
};

type Recommendation = {
  priority: string;
  title: string;
  impact: string;
};

type Activity = {
  id: string;
  event_type: string;
  title: string;
  description?: string | null;
  actor_type?: string | null;
  created_at?: string | null;
};

type Intelligence = {
  generated_at: string;
  company: {
    id: string;
    name: string;
    status: string;
    headquarters_active: boolean;
    headquarters_office_code?: string | null;
  };
  health: {
    overall: number;
    operations: number;
    infrastructure: number;
    compliance: number;
    growth: number;
  };
  kpis: Record<string, number>;
  risks: Risk[];
  recommendations: Recommendation[];
  executive_brief: string;
  recent_activity: Activity[];
};

type DecisionAction = {
  title: string;
  description: string;
  actionLabel: string;
  route: string;
  priority: "critical" | "high" | "medium" | "low";
};

function label(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function scoreLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Stable";
  if (score >= 50) return "Needs Attention";
  return "Critical";
}

function healthTone(score: number) {
  if (score >= 85) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 70) return "text-violet-700 bg-violet-50 border-violet-200";
  if (score >= 50) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function badgeTone(value: string) {
  const normalized = value.toLowerCase();

  if (
    normalized === "critical" ||
    normalized === "high" ||
    normalized === "failed"
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (
    normalized === "medium" ||
    normalized === "warning" ||
    normalized === "pending"
  ) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  if (
    normalized === "active" ||
    normalized === "low" ||
    normalized === "healthy" ||
    normalized === "completed"
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  return "bg-violet-50 text-violet-700 border-violet-200";
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function findKpi(
  kpis: Record<string, number>,
  possibleKeys: string[]
): number {
  for (const key of possibleKeys) {
    if (typeof kpis[key] === "number") {
      return kpis[key];
    }
  }

  return 0;
}

export default function ExecutiveIntelligencePage() {
  const router = useRouter();

  const [data, setData] = useState<Intelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function load() {
    const token = getAuthToken();
    const workspace = getActiveWorkspace();

    if (!token) {
      setError("Your session has expired. Please log in again.");
      setLoading(false);
      return;
    }

    if (!workspace?.id) {
      setError("No active company workspace was found.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/executive-intelligence/${encodeURIComponent(
          workspace.id
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.detail ||
            "Executive Intelligence could not be loaded."
        );
      }

      setData(body);
      setLastUpdated(new Date());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => {
      void load();
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const scoreTone = useMemo(
    () => scoreLabel(data?.health.overall || 0),
    [data]
  );

  const executiveMetrics = useMemo(() => {
    if (!data) {
      return {
        revenue: 0,
        cash: 0,
        tasks: 0,
        alerts: 0,
      };
    }

    return {
      revenue: findKpi(data.kpis, [
        "revenue_usd",
        "monthly_revenue_usd",
        "total_revenue_usd",
      ]),
      cash: findKpi(data.kpis, [
        "cash_balance_usd",
        "cash_usd",
        "available_cash_usd",
      ]),
      tasks: findKpi(data.kpis, [
        "open_tasks",
        "active_tasks",
        "tasks_pending",
      ]),
      alerts: data.risks.filter((risk) =>
        ["critical", "high"].includes(risk.severity.toLowerCase())
      ).length,
    };
  }, [data]);

  const decisions = useMemo<DecisionAction[]>(() => {
    if (!data) return [];

    const generated: DecisionAction[] = [];

    data.risks.slice(0, 2).forEach((risk) => {
      generated.push({
        title: risk.title,
        description: risk.description,
        actionLabel: "Review Risk",
        route: "/sonny",
        priority:
          risk.severity.toLowerCase() === "critical"
            ? "critical"
            : risk.severity.toLowerCase() === "high"
            ? "high"
            : "medium",
      });
    });

    data.recommendations.slice(0, 2).forEach((recommendation) => {
      generated.push({
        title: recommendation.title,
        description: recommendation.impact,
        actionLabel: "Ask Sonny",
        route: "/sonny",
        priority:
          recommendation.priority.toLowerCase() === "high"
            ? "high"
            : recommendation.priority.toLowerCase() === "low"
            ? "low"
            : "medium",
      });
    });

    if (!data.company.headquarters_active) {
      generated.unshift({
        title: "Activate a company headquarters",
        description:
          "Select a Firmic virtual office to complete the company infrastructure setup.",
        actionLabel: "Choose Office",
        route: "/virtual-offices",
        priority: "high",
      });
    }

    if (generated.length === 0) {
      generated.push({
        title: "Review company performance",
        description:
          "Ask Sonny to summarize current performance and identify the strongest next opportunity.",
        actionLabel: "Open Sonny",
        route: "/sonny",
        priority: "low",
      });
    }

    return generated.slice(0, 4);
  }, [data]);

  function askSonny(prompt: string) {
    void router.push({
      pathname: "/sonny",
      query: {
        prompt,
      },
    });
  }

  function openDecision(decision: DecisionAction) {
    if (decision.route === "/sonny") {
      askSonny(
        `Review this executive item and recommend the next action: ${decision.title}. ${decision.description}`
      );
      return;
    }

    void router.push(decision.route);
  }

  return (
    <ProtectedRoute>
      <Head>
        <title>Executive Intelligence | Firmic</title>
        <meta
          name="description"
          content="Firmic executive intelligence and company operating insights."
        />
      </Head>

      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="min-w-0 flex-1 p-5 md:p-6 xl:p-8">
          <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-bold text-violet-700">
                  Sonny Executive Layer
                </p>

                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Live
                </span>
              </div>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                Executive Intelligence
              </h1>

              <p className="mt-2 max-w-3xl text-slate-500">
                Your company’s live health, operating performance, risks,
                decisions, and recommended next actions.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              {lastUpdated && (
                <p className="text-xs text-slate-400">
                  Updated {lastUpdated.toLocaleTimeString()}
                </p>
              )}

              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="rounded-xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh Intelligence"}
              </button>
            </div>
          </header>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>{error}</p>

                <button
                  type="button"
                  onClick={() => void load()}
                  className="w-fit rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-bold"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {loading && !data && <ExecutiveLoadingState />}

          {data && (
            <div className="mt-8 space-y-6">
              <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-950 p-6 text-white shadow-xl md:p-8">
                <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
                  <div>
                    <p className="text-sm font-semibold text-violet-200">
                      {getGreeting()}
                    </p>

                    <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
                      {data.company.name}
                    </h2>

                    <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200 md:text-lg md:leading-8">
                      {data.executive_brief}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          askSonny(
                            "Summarize my company performance, current risks, and the three most important actions I should take today."
                          )
                        }
                        className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-violet-50"
                      >
                        Ask Sonny for Today’s Plan
                      </button>

                      <button
                        type="button"
                        onClick={() => void router.push("/reports")}
                        className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                      >
                        Open Reports
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-violet-200">
                          Company Health
                        </p>

                        <div className="mt-3 flex items-end gap-2">
                          <span className="text-6xl font-black">
                            {data.health.overall}
                          </span>

                          <span className="pb-2 text-xl text-slate-300">
                            /100
                          </span>
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${badgeTone(
                          data.company.status
                        )}`}
                      >
                        {data.company.status}
                      </span>
                    </div>

                    <p className="mt-3 font-bold text-violet-200">
                      {scoreTone}
                    </p>

                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-white transition-all duration-700"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, data.health.overall)
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <MiniMetric
                        title="Critical Alerts"
                        value={String(executiveMetrics.alerts)}
                      />

                      <MiniMetric
                        title="Open Tasks"
                        value={String(executiveMetrics.tasks)}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <ExecutiveMetricCard
                  eyebrow="Company Health"
                  value={`${data.health.overall}%`}
                  detail={scoreTone}
                />

                <ExecutiveMetricCard
                  eyebrow="Revenue"
                  value={money(executiveMetrics.revenue)}
                  detail="Current recorded revenue"
                />

                <ExecutiveMetricCard
                  eyebrow="Available Cash"
                  value={money(executiveMetrics.cash)}
                  detail="Current cash position"
                />

                <ExecutiveMetricCard
                  eyebrow="Priority Alerts"
                  value={String(executiveMetrics.alerts)}
                  detail={
                    executiveMetrics.alerts === 0
                      ? "No urgent intervention"
                      : "Founder attention required"
                  }
                  alert={executiveMetrics.alerts > 0}
                />
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <Panel
                  title="Executive Decisions"
                  subtitle="The most important actions requiring leadership attention."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    {decisions.map((decision, index) => (
                      <DecisionCard
                        key={`${decision.title}-${index}`}
                        decision={decision}
                        onOpen={() => openDecision(decision)}
                      />
                    ))}
                  </div>
                </Panel>

                <Panel
                  title="Sonny Status"
                  subtitle="Your AI executive operating layer."
                >
                  <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-lg font-black text-white">
                        S
                      </div>

                      <div>
                        <p className="font-bold text-slate-950">Sonny</p>
                        <p className="text-sm text-emerald-700">
                          Online and monitoring
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <StatusMetric
                        title="Insights"
                        value={String(data.recommendations.length)}
                      />

                      <StatusMetric
                        title="Risks"
                        value={String(data.risks.length)}
                      />

                      <StatusMetric
                        title="Events"
                        value={String(data.recent_activity.length)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        askSonny(
                          "Give me a concise executive briefing based on the latest company intelligence."
                        )
                      }
                      className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700"
                    >
                      Open Sonny
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {[
                      "Why is my company health at this score?",
                      "What is the biggest risk right now?",
                      "Prepare today’s executive action plan.",
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => askSonny(prompt)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </Panel>
              </section>

              <section>
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-slate-950">
                    Company Health Radar
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Performance across the core operating areas.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {Object.entries(data.health)
                    .filter(([key]) => key !== "overall")
                    .map(([key, value]) => (
                      <HealthCard
                        key={key}
                        title={label(key)}
                        value={value}
                      />
                    ))}
                </div>
              </section>

              <section>
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-slate-950">
                    Operating Metrics
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Live metrics collected from the company workspace.
                  </p>
                </div>

                {Object.keys(data.kpis).length === 0 ? (
                  <EmptyState message="No operating metrics are available yet." />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {Object.entries(data.kpis).map(([key, value]) => (
                      <KpiCard
                        key={key}
                        title={label(key)}
                        value={
                          key.includes("usd")
                            ? money(value)
                            : String(value)
                        }
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Panel
                  title="Operational Risks"
                  subtitle="Issues that may require founder attention."
                >
                  {data.risks.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-700">
                      No material risks detected.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.risks.map((risk, index) => (
                        <InsightItem
                          key={`${risk.title}-${index}`}
                          title={risk.title}
                          description={risk.description}
                          badge={risk.severity}
                          actionLabel="Review with Sonny"
                          onAction={() =>
                            askSonny(
                              `Explain this risk and recommend a response: ${risk.title}. ${risk.description}`
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel
                  title="Recommended Actions"
                  subtitle="Sonny’s strongest next steps based on current company data."
                >
                  {data.recommendations.length === 0 ? (
                    <EmptyState message="No recommendations are available yet." />
                  ) : (
                    <div className="space-y-3">
                      {data.recommendations.map((item, index) => (
                        <InsightItem
                          key={`${item.title}-${index}`}
                          title={item.title}
                          description={item.impact}
                          badge={item.priority}
                          actionLabel="Evaluate"
                          onAction={() =>
                            askSonny(
                              `Evaluate this recommendation and give me an implementation plan: ${item.title}. Expected impact: ${item.impact}`
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                </Panel>
              </section>

              <Panel
                title="Executive Timeline"
                subtitle="Recent company, platform, and AI operating events."
              >
                {data.recent_activity.length === 0 ? (
                  <EmptyState message="No recent company activity yet." />
                ) : (
                  <div className="relative">
                    <div className="absolute bottom-3 left-[11px] top-3 w-px bg-slate-200" />

                    <div className="space-y-1">
                      {data.recent_activity.map((item) => (
                        <div
                          key={item.id}
                          className="relative flex gap-4 py-4"
                        >
                          <div className="relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white bg-violet-600 shadow-sm" />

                          <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                              <p className="font-bold text-slate-900">
                                {item.title}
                              </p>

                              <span className="text-xs text-slate-400">
                                {dateTime(item.created_at)}
                              </span>
                            </div>

                            {item.description && (
                              <p className="mt-2 text-sm leading-6 text-slate-500">
                                {item.description}
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                {label(item.event_type)}
                              </span>

                              {item.actor_type && (
                                <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                                  {label(item.actor_type)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function ExecutiveLoadingState() {
  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />

      <p className="mt-5 font-medium text-slate-500">
        Sonny is building your executive brief...
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    </section>
  );
}

function MiniMetric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
      <p className="text-xs text-violet-200">{title}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function ExecutiveMetricCard({
  eyebrow,
  value,
  detail,
  alert = false,
}: {
  eyebrow: string;
  value: string;
  detail: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${
        alert
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p
        className={`text-sm ${
          alert ? "text-red-600" : "text-slate-500"
        }`}
      >
        {eyebrow}
      </p>

      <p
        className={`mt-2 text-3xl font-black ${
          alert ? "text-red-800" : "text-slate-950"
        }`}
      >
        {value}
      </p>

      <p
        className={`mt-2 text-xs ${
          alert ? "text-red-600" : "text-slate-400"
        }`}
      >
        {detail}
      </p>
    </div>
  );
}

function StatusMetric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-violet-100 bg-white p-3 text-center">
      <p className="text-xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {title}
      </p>
    </div>
  );
}

function DecisionCard({
  decision,
  onOpen,
}: {
  decision: DecisionAction;
  onOpen: () => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="font-bold text-slate-950">{decision.title}</p>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${badgeTone(
            decision.priority
          )}`}
        >
          {decision.priority}
        </span>
      </div>

      <p className="mt-3 flex-1 text-sm leading-6 text-slate-500">
        {decision.description}
      </p>

      <button
        type="button"
        onClick={onOpen}
        className="mt-5 w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-600 hover:text-white"
      >
        {decision.actionLabel}
      </button>
    </div>
  );
}

function HealthCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <p className="mt-1 text-xs text-slate-400">
            {scoreLabel(value)}
          </p>
        </div>

        <span
          className={`rounded-xl border px-3 py-2 text-lg font-black ${healthTone(
            value
          )}`}
        >
          {value}%
        </span>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-violet-600 transition-all duration-700"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
          }}
        />
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>

      <p className="mt-2 text-2xl font-black text-slate-950">
        {value}
      </p>
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
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>

      {subtitle && (
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      )}

      <div className="mt-5">{children}</div>
    </section>
  );
}

function InsightItem({
  title,
  description,
  badge,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  badge: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="font-bold text-slate-900">{title}</p>

        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${badgeTone(
            badge
          )}`}
        >
          {badge}
        </span>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 text-sm font-bold text-violet-700 hover:text-violet-900"
        >
          {actionLabel} →
        </button>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}