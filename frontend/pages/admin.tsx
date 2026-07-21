import { useEffect, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import AdminProtectedRoute from "../components/AdminProtectedRoute";
import {
  getAdminBilling,
  getAdminDashboard,
} from "../services/adminApi";

type DashboardData = {
  metrics: {
    total_companies: number;
    active_companies: number;
    initiated_companies: number;
    terminated_companies: number;
    total_offices: number;
    rented_offices: number;
    available_offices: number;
  };
  recent_companies: any[];
  office_snapshot: any[];
  activity: any[];
};

type BillingData = {
  summary: any;
  companies: any[];
};

export default function AdminDashboard() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [billing, setBilling] =
    useState<BillingData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadAdmin();
  }, []);

  async function loadAdmin() {
    try {
      setLoading(true);
      setError("");

      const [dashboardResult, billingResult] =
        await Promise.all([
          getAdminDashboard(),
          getAdminBilling(),
        ]);

      setData(dashboardResult);
      setBilling(billingResult);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load Firmic admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  const metrics = data?.metrics;
  const billingSummary = billing?.summary;
  const billingByCompany = new Map(
    (billing?.companies || []).map((item) => [
      item.company.id,
      item,
    ])
  );

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar active="Admin Command Center" />

        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Firmic Admin
              </p>

              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                Internal Command Center
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Live tenant companies, office inventory,
                lifecycle status, and platform operations
                from PostgreSQL.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAdmin}
              disabled={loading}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 disabled:bg-slate-300 transition"
            >
              {loading
                ? "Refreshing..."
                : "Refresh Admin"}
            </button>
          </header>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
              {error}
            </div>
          )}

          {loading && (
            <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-500">
              Loading live Firmic admin data...
            </div>
          )}

          {!loading && data && metrics && (
            <>
              <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
                <Stat
                  title="Tenant Companies"
                  value={String(
                    metrics.total_companies
                  )}
                  icon="🏢"
                />

                <Stat
                  title="Active Companies"
                  value={String(
                    metrics.active_companies
                  )}
                  icon="✅"
                />

                <Stat
                  title="Rented Offices"
                  value={String(
                    metrics.rented_offices
                  )}
                  icon="🔒"
                />

                <Stat
                  title="Available Offices"
                  value={String(
                    metrics.available_offices
                  )}
                  icon="📍"
                />
              </section>

              <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-5">
                <Stat
                  title="Unbilled Usage"
                  value={`$${Number(billingSummary?.unbilled?.total || 0).toFixed(2)}`}
                  icon="⏳"
                />

                <Stat
                  title="Billed Amount"
                  value={`$${Number(billingSummary?.billed?.total || 0).toFixed(2)}`}
                  icon="🧾"
                />

                <Stat
                  title="Paid Revenue"
                  value={`$${Number(billingSummary?.paid?.total || 0).toFixed(2)}`}
                  icon="💰"
                />

                <Stat
                  title="Billable Tenants"
                  value={String(billingSummary?.billable_companies || 0)}
                  icon="💳"
                />
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
                <div className="space-y-6">
                  <Panel title="Recent Tenant Companies">
                    {data.recent_companies.length === 0 ? (
                      <p className="text-slate-500">
                        No tenant companies found.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {data.recent_companies.map(
                          (company) => (
                            <div
                              key={company.id}
                              className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-bold text-lg">
                                    {company.name}
                                  </p>

                                  <StatusBadge
                                    status={
                                      company.status
                                    }
                                  />
                                </div>

                                <p className="text-xs text-slate-500 break-all mt-1">
                                  {company.id}
                                </p>

                                <p className="text-sm text-slate-500 mt-2">
                                  {company.headquarters
                                    ?.office_code
                                    ? `Headquarters ${company.headquarters.office_code}`
                                    : "No Headquarters"}
                                </p>
                              </div>

                              <div className="flex flex-col md:items-end gap-2">
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Current Billing</p>
                                  <p className="font-bold text-lg">
                                    ${Number(billingByCompany.get(company.id)?.total || 0).toFixed(2)}
                                  </p>
                                </div>

                                <div className="flex gap-2">
                                  <a
                                    href={`/admin-billing?company_id=${company.id}`}
                                    className="border border-violet-200 text-violet-700 px-4 py-2 rounded-xl font-bold text-center"
                                  >
                                    Billing
                                  </a>

                                  <a
                                    href={`/admin-companies?company_id=${company.id}`}
                                    className="bg-violet-600 text-white px-4 py-2 rounded-xl font-bold text-center"
                                  >
                                    Open
                                  </a>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </Panel>

                  <Panel title="Office Inventory Snapshot">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InventoryCard
                        title="Available Inventory"
                        value={String(
                          metrics.available_offices
                        )}
                        desc="Offices ready for tenant activation."
                        icon="✅"
                      />

                      <InventoryCard
                        title="Rented Inventory"
                        value={String(
                          metrics.rented_offices
                        )}
                        desc="Offices assigned to tenant companies."
                        icon="🔒"
                      />
                    </div>

                    <div className="space-y-3 mt-5">
                      {data.office_snapshot
                        .filter(
                          (office) =>
                            office.status ===
                              "rented" ||
                            office.company
                        )
                        .slice(0, 6)
                        .map((office) => (
                          <div
                            key={office.id}
                            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between gap-4"
                          >
                            <div>
                              <p className="font-bold">
                                Headquarters{" "}
                                {
                                  office.office_code
                                }
                              </p>

                              <p className="text-sm text-slate-500">
                                {office.company
                                  ?.name ||
                                  "No tenant assigned"}
                              </p>
                            </div>

                            <StatusBadge
                              status={office.status}
                            />
                          </div>
                        ))}

                      {data.office_snapshot.filter(
                        (office) =>
                          office.status ===
                            "rented" ||
                          office.company
                      ).length === 0 && (
                        <p className="text-slate-500">
                          No rented offices found.
                        </p>
                      )}
                    </div>
                  </Panel>

                  <Panel title="Live Internal Activity">
                    {data.activity.length === 0 ? (
                      <p className="text-slate-500">
                        No platform activity found.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {data.activity.map(
                          (item, index) => (
                            <div
                              key={`${item.type}-${item.company_id}-${index}`}
                              className="py-3 border-b border-slate-100"
                            >
                              <p className="font-semibold">
                                {item.text}
                              </p>

                              {item.office_code && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Office{" "}
                                  {
                                    item.office_code
                                  }
                                </p>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </Panel>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-3xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold">
                      Admin Overview
                    </h2>

                    <p className="text-sm text-violet-100 mt-2">
                      Live operational view of company
                      lifecycle and office occupancy.
                    </p>

                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <Mini
                        title="Initiated"
                        value={String(
                          metrics.initiated_companies
                        )}
                      />

                      <Mini
                        title="Active"
                        value={String(
                          metrics.active_companies
                        )}
                      />

                      <Mini
                        title="Terminated"
                        value={String(
                          metrics.terminated_companies
                        )}
                      />

                      <Mini
                        title="Total Offices"
                        value={String(
                          metrics.total_offices
                        )}
                      />
                    </div>
                  </div>

                  <Panel title="Admin Quick Actions">
                    <Action
                      href="/admin-billing"
                      text="Open Tenant Billing"
                    />

                    <Action
                      href="/admin-companies"
                      text="View All Companies"
                    />

                    <Action
                      href="/admin-offices"
                      text="Manage Office Inventory"
                    />

                    <Action
                      href="/admin-compliance"
                      text="Open Compliance Queue"
                    />

                    <Action
                      href="/admin-support"
                      text="Open Support Inbox"
                    />

                    <Action
                      href="/admin-analytics"
                      text="Open Admin Reports"
                    />
                  </Panel>

                  <Panel title="Platform Status">
                    <Status
                      title="Backend"
                      value={
                        error
                          ? "Unavailable"
                          : "Online"
                      }
                    />

                    <Status
                      title="Database"
                      value="PostgreSQL"
                    />

                    <Status
                      title="Authentication"
                      value="Admin JWT"
                    />

                    <Status
                      title="Tenant Isolation"
                      value="Enabled"
                    />
                  </Panel>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </AdminProtectedRoute>
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
      <p className="text-sm text-slate-500 mt-3">
        {title}
      </p>
      <p className="text-2xl font-bold mt-1">
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <h2 className="text-xl font-bold">
        {title}
      </h2>
      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}

function InventoryCard({
  title,
  value,
  desc,
  icon,
}: {
  title: string;
  value: string;
  desc: string;
  icon: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
      <div className="text-3xl">{icon}</div>
      <p className="font-bold mt-3">{title}</p>
      <p className="text-3xl font-bold mt-1">
        {value}
      </p>
      <p className="text-sm text-slate-500 mt-2">
        {desc}
      </p>
    </div>
  );
}

function Mini({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 text-center">
      <p className="text-xs text-violet-100">
        {title}
      </p>
      <p className="font-bold text-xl">
        {value}
      </p>
    </div>
  );
}

function Action({
  href,
  text,
}: {
  href: string;
  text: string;
}) {
  return (
    <a
      href={href}
      className="flex justify-between items-center py-3 border-b border-slate-100 font-semibold hover:text-violet-700"
    >
      <span>{text}</span>
      <span>→</span>
    </a>
  );
}

function Status({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 py-3 border-b border-slate-100">
      <span className="text-slate-500">
        {title}
      </span>
      <span className="font-bold">
        {value}
      </span>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    String(status || "unknown").toLowerCase();

  const style =
    normalized === "active" ||
    normalized === "rented"
      ? "bg-green-100 text-green-700"
      : normalized === "terminated"
      ? "bg-red-100 text-red-700"
      : normalized === "available"
      ? "bg-blue-100 text-blue-700"
      : "bg-violet-100 text-violet-700";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold ${style}`}
    >
      {status}
    </span>
  );
}
