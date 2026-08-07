import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AdminSidebar from "../components/AdminSidebar";
import AdminProtectedRoute from "../components/AdminProtectedRoute";

import {
  getAdminAnalytics,
} from "../services/adminApi";

type AnalyticsData = {
  metrics?: {
    tenant_companies?: number;
    active_companies?: number;
    rented_offices?: number;
    available_offices?: number;
    active_ai_agents?: number;
    paid_revenue?: number;
    outstanding?: number;
    ledger_total?: number;
  };
  revenue_by_service?: {
    office?: number;
    ai_workforce?: number;
    meeting_center?: number;
    firmic_setup?: number;
  };
  ledger_entries?: number;
};

export default function AdminAnalytics() {
  const [data, setData] =
    useState<AnalyticsData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [generatedAt, setGeneratedAt] =
    useState("");

  useEffect(() => {
    void loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      setError("");

      const result =
        await getAdminAnalytics();

      setData(result);
      setGeneratedAt(
        new Date().toLocaleString()
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load Admin Reports."
      );
    } finally {
      setLoading(false);
    }
  }

  const metrics =
    data?.metrics || {};

  const revenue =
    data?.revenue_by_service || {};

  const totalOffices =
    Number(
      metrics.rented_offices || 0
    ) +
    Number(
      metrics.available_offices || 0
    );

  const occupancy =
    totalOffices > 0
      ? Math.round(
          (Number(
            metrics.rented_offices ||
              0
          ) /
            totalOffices) *
            100
        )
      : 0;

  const serviceRows = useMemo(
    () => [
      {
        key: "office",
        label: "Office Infrastructure",
        description:
          "Monthly headquarters and virtual office revenue.",
        value:
          revenue.office || 0,
        icon: "🏢",
      },
      {
        key: "ai_workforce",
        label: "AI Workforce",
        description:
          "Monthly AI employee subscriptions across tenants.",
        value:
          revenue.ai_workforce ||
          0,
        icon: "🤖",
      },
      {
        key: "meeting_center",
        label: "Meeting Center",
        description:
          "Tenant meeting-room bookings and hourly usage.",
        value:
          revenue.meeting_center ||
          0,
        icon: "📅",
      },
      {
        key: "firmic_setup",
        label: "Company Activation Fees",
        description:
          "One-time Firmic company activation fees.",
        value:
          revenue.firmic_setup ||
          0,
        icon: "🔌",
      },
    ],
    [revenue]
  );

  const largestService =
    [...serviceRows].sort(
      (a, b) =>
        Number(b.value) -
        Number(a.value)
    )[0];

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar
          active="Admin Reports"
        />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Firmic Admin
              </p>

              <h1 className="text-3xl font-bold mt-1">
                Platform Reports
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Live financial, occupancy, tenant, and AI workforce intelligence
                from the shared PostgreSQL platform.
              </p>

              {generatedAt && (
                <p className="text-xs text-slate-400 mt-2">
                  Last refreshed:{" "}
                  {generatedAt}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={loadReports}
              disabled={loading}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold disabled:bg-slate-300"
            >
              {loading
                ? "Refreshing..."
                : "Refresh Reports"}
            </button>
          </header>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
              {error}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat
              title="Ledger Total"
              value={money(
                metrics.ledger_total
              )}
              icon="💰"
            />

            <Stat
              title="Paid Revenue"
              value={money(
                metrics.paid_revenue
              )}
              icon="✅"
            />

            <Stat
              title="Outstanding"
              value={money(
                metrics.outstanding
              )}
              icon="🧾"
            />

            <Stat
              title="Ledger Entries"
              value={
                data?.ledger_entries ||
                0
              }
              icon="📚"
            />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-5">
            <Stat
              title="Tenant Companies"
              value={
                metrics.tenant_companies ||
                0
              }
              icon="🏢"
            />

            <Stat
              title="Active Companies"
              value={
                metrics.active_companies ||
                0
              }
              icon="🟢"
            />

            <Stat
              title="Rented Offices"
              value={
                metrics.rented_offices ||
                0
              }
              icon="🔑"
            />

            <Stat
              title="Active AI Employees"
              value={
                metrics.active_ai_agents ||
                0
              }
              icon="🤖"
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-6 mt-8">
            <div className="space-y-6">
              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      Revenue by Service
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                      Live totals from non-void Usage Ledger entries.
                    </p>
                  </div>

                  <span className="text-xs font-bold bg-violet-100 text-violet-700 px-3 py-1 rounded-full">
                    PostgreSQL Ledger
                  </span>
                </div>

                <div className="space-y-4 mt-6">
                  {serviceRows.map(
                    (service) => {
                      const total =
                        Number(
                          metrics.ledger_total ||
                            0
                        );

                      const percent =
                        total > 0
                          ? Math.round(
                              (Number(
                                service.value ||
                                  0
                              ) /
                                total) *
                                100
                            )
                          : 0;

                      return (
                        <div
                          key={
                            service.key
                          }
                          className="border border-slate-200 bg-slate-50 rounded-2xl p-5"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="text-3xl">
                                {
                                  service.icon
                                }
                              </div>

                              <div>
                                <h3 className="font-bold text-lg">
                                  {
                                    service.label
                                  }
                                </h3>

                                <p className="text-sm text-slate-500 mt-1">
                                  {
                                    service.description
                                  }
                                </p>
                              </div>
                            </div>

                            <div className="text-left md:text-right">
                              <p className="text-2xl font-bold">
                                {money(
                                  service.value
                                )}
                              </p>

                              <p className="text-sm text-slate-500">
                                {percent}% of ledger
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 h-3 bg-white border border-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-violet-600 rounded-full"
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(
                                    100,
                                    percent
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Platform Capacity
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Live office utilization and tenant activation.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <CapacityCard
                    title="Occupancy"
                    value={`${occupancy}%`}
                    detail={`${metrics.rented_offices || 0} rented of ${totalOffices} offices`}
                  />

                  <CapacityCard
                    title="Available Offices"
                    value={
                      metrics.available_offices ||
                      0
                    }
                    detail="Vacant inventory"
                  />

                  <CapacityCard
                    title="Tenant Activation"
                    value={
                      metrics.tenant_companies
                        ? `${Math.round(
                            (Number(
                              metrics.active_companies ||
                                0
                            ) /
                              Number(
                                metrics.tenant_companies ||
                                  1
                              )) *
                              100
                          )}%`
                        : "0%"
                    }
                    detail={`${metrics.active_companies || 0} active companies`}
                  />
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Executive Summary
                </h2>

                <div className="mt-5 space-y-4">
                  <SummaryRow
                    label="Largest Revenue Service"
                    value={
                      largestService
                        ?.label ||
                      "No revenue"
                    }
                  />

                  <SummaryRow
                    label="Largest Service Total"
                    value={money(
                      largestService
                        ?.value
                    )}
                  />

                  <SummaryRow
                    label="Paid Share"
                    value={percentage(
                      metrics.paid_revenue,
                      metrics.ledger_total
                    )}
                  />

                  <SummaryRow
                    label="Outstanding Share"
                    value={percentage(
                      metrics.outstanding,
                      metrics.ledger_total
                    )}
                  />

                  <SummaryRow
                    label="Office Occupancy"
                    value={`${occupancy}%`}
                  />
                </div>
              </section>

              <section className="bg-violet-50 border border-violet-200 rounded-3xl p-6">
                <p className="text-sm font-bold text-violet-700">
                  Reporting Scope
                </p>

                <h2 className="text-xl font-bold mt-1 text-violet-950">
                  Current MVP coverage
                </h2>

                <div className="space-y-3 mt-5 text-sm text-violet-800">
                  <Check text="Firmic setup fees" />
                  <Check text="Office subscriptions" />
                  <Check text="AI workforce subscriptions" />
                  <Check text="Meeting-room usage" />
                  <Check text="Paid and outstanding revenue" />
                  <Check text="Office occupancy" />
                </div>

                <p className="text-xs text-violet-700 mt-5">
                  VoIP, Digital Mailroom, Microsoft 365, forwarding,
                  and government-service revenue will appear automatically
                  after those services begin writing into the Usage Ledger.
                </p>
              </section>

              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Data Integrity
                </h2>

                <p className="text-sm text-slate-500 mt-2">
                  This page contains no fictional monthly growth,
                  conversion, churn, or forecast data. Trend charts can be
                  added after historical invoice periods are persisted.
                </p>
              </section>
            </aside>
          </section>
        </main>
      </div>
    </AdminProtectedRoute>
  );
}

function Stat({
  title,
  value,
  icon,
}: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">
        {icon}
      </div>

      <p className="text-sm text-slate-500 mt-3">
        {title}
      </p>

      <p className="text-2xl font-bold mt-1">
        {value}
      </p>
    </div>
  );
}

function CapacityCard({
  title,
  value,
  detail,
}: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="text-3xl font-bold mt-2">
        {value}
      </p>

      <p className="text-xs text-slate-400 mt-2">
        {detail}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: any) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-b-0">
      <span className="text-slate-500">
        {label}
      </span>

      <strong className="text-right">
        {value}
      </strong>
    </div>
  );
}

function Check({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span>✓</span>
      <span>{text}</span>
    </div>
  );
}

function money(
  value: any
) {
  return `$${Number(
    value || 0
  ).toFixed(2)}`;
}

function percentage(
  value: any,
  total: any
) {
  const normalizedTotal =
    Number(total || 0);

  if (normalizedTotal <= 0) {
    return "0%";
  }

  return `${Math.round(
    (Number(value || 0) /
      normalizedTotal) *
      100
  )}%`;
}
