import { useEffect, useMemo, useState } from "react";
import Head from "next/head";

import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import { getActiveWorkspace } from "../src/utils/workspaceContext";
import { getAuthToken } from "../services/authApi";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  return `$${Number(value || 0).toFixed(2)}`;
}

function scoreLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Stable";
  if (score >= 50) return "Needs Attention";
  return "Critical";
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
    return "bg-green-50 text-green-700 border-green-200";
  }

  return "bg-violet-50 text-violet-700 border-violet-200";
}

export default function ExecutiveIntelligencePage() {
  const [data, setData] = useState<Intelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    load();

    const timer = window.setInterval(load, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const scoreTone = useMemo(
    () => scoreLabel(data?.health.overall || 0),
    [data]
  );

  return (
    <ProtectedRoute>
      <Head>
        <title>Executive Intelligence | Firmic</title>
      </Head>

      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Sonny Executive Layer
              </p>

              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                Executive Intelligence
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Live business health, operating performance, risks, and recommended next actions.
              </p>
            </div>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl font-bold transition disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh Intelligence"}
            </button>
          </header>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
              {error}
            </div>
          )}

          {loading && !data && (
            <section className="mt-8 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <div className="h-12 w-12 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
              <p className="mt-5 text-slate-500 font-medium">
                Building your executive brief...
              </p>
            </section>
          )}

          {data && (
            <div className="space-y-6 mt-8">
              <section className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Business Health
                  </p>

                  <div className="mt-5 flex items-end gap-3">
                    <span className="text-6xl font-black text-slate-950">
                      {data.health.overall}
                    </span>

                    <span className="pb-2 text-xl text-slate-400">
                      /100
                    </span>
                  </div>

                  <p className="mt-3 font-bold text-violet-700">
                    {scoreTone}
                  </p>

                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-violet-600 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, data.health.overall)
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-5 text-sm text-slate-400">
                    Updated {dateTime(data.generated_at)}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-3xl p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <p className="text-sm text-violet-100">
                        Executive Brief
                      </p>

                      <h2 className="mt-1 text-2xl font-bold">
                        {data.company.name}
                      </h2>
                    </div>

                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-bold capitalize ${badgeTone(
                        data.company.status
                      )}`}
                    >
                      {data.company.status}
                    </span>
                  </div>

                  <p className="mt-6 text-lg leading-8 text-violet-50">
                    {data.executive_brief}
                  </p>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {Object.entries(data.health)
                  .filter(([key]) => key !== "overall")
                  .map(([key, value]) => (
                    <HealthCard
                      key={key}
                      title={label(key)}
                      value={value}
                    />
                  ))}
              </section>

              <section>
                <div className="flex items-end justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">
                      Key KPIs
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                      Live company operating metrics.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
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
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Panel
                  title="Operational Risks"
                  subtitle="Issues that may need founder attention."
                >
                  {data.risks.length === 0 ? (
                    <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 font-semibold">
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
                        />
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel
                  title="Recommended Actions"
                  subtitle="The strongest next steps based on current data."
                >
                  {data.recommendations.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-2xl p-4">
                      No recommendations are available yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.recommendations.map((item, index) => (
                        <InsightItem
                          key={`${item.title}-${index}`}
                          title={item.title}
                          description={item.impact}
                          badge={item.priority}
                        />
                      ))}
                    </div>
                  )}
                </Panel>
              </section>

              <Panel
                title="Recent Executive Activity"
                subtitle="Recent company and AI workforce events."
              >
                {data.recent_activity.length === 0 ? (
                  <p className="text-slate-500">
                    No recent activity yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.recent_activity.map((item) => (
                      <div
                        key={item.id}
                        className="py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <p className="font-bold text-slate-900">
                            {item.title}
                          </p>

                          <span className="text-xs text-slate-400">
                            {dateTime(item.created_at)}
                          </span>
                        </div>

                        {item.description && (
                          <p className="mt-1 text-sm text-slate-500">
                            {item.description}
                          </p>
                        )}
                      </div>
                    ))}
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

function HealthCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="font-bold text-slate-950">{value}%</p>
      </div>

      <div className="mt-4 h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-violet-600"
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
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-950 mt-2">
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
    <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-950">
        {title}
      </h2>

      {subtitle && (
        <p className="text-sm text-slate-500 mt-1">
          {subtitle}
        </p>
      )}

      <div className="mt-5">{children}</div>
    </section>
  );
}

function InsightItem({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="font-bold text-slate-900">
          {title}
        </p>

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
    </div>
  );
}
