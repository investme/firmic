import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import AdminSidebar from "../components/AdminSidebar";
import AdminProtectedRoute from "../components/AdminProtectedRoute";

import {
  getAdminCompany,
  getAdminCompanyBilling,
} from "../services/adminApi";

type CompanyRecord = {
  id: string;
  name: string;
  status?: string;
  user_id?: string | number;

  jurisdiction?: string;
  plan?: string;

  headquarters_office_code?: string | null;
  headquarters_location?: string | null;
  headquarters_monthly_price_usd?: number | null;

  headquarters?: {
    office_code?: string | null;
    location?: string | null;
    monthly_price_usd?: number | null;
    status?: string | null;
  } | null;

  created_at?: string | null;
};

type BillingRecord = {
  summary?: {
    subtotal?: number;
    tax?: number;
    total?: number;
    entry_count?: number;
  };

  entries?: any[];
};

export default function AdminCompanyPage() {
  const router = useRouter();

  const [company, setCompany] =
    useState<CompanyRecord | null>(null);

  const [billing, setBilling] =
    useState<BillingRecord | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const companyId =
    typeof router.query.company_id === "string"
      ? router.query.company_id
      : "";

  useEffect(() => {
    if (!router.isReady || !companyId) {
      return;
    }

    loadCompany(companyId);
  }, [router.isReady, companyId]);

  async function loadCompany(id: string) {
    try {
      setLoading(true);
      setError("");

      const [companyResult, billingResult] =
        await Promise.all([
          getAdminCompany(id),
          getAdminCompanyBilling(id).catch(() => null),
        ]);

      setCompany(
        companyResult?.company ||
          companyResult ||
          null
      );

      setBilling(billingResult);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load the selected company."
      );
    } finally {
      setLoading(false);
    }
  }

  const headquarters =
    company?.headquarters_office_code ||
    company?.headquarters?.office_code ||
    "Not selected";

  const location =
    company?.headquarters_location ||
    company?.headquarters?.location ||
    "No headquarters location";

  const officePrice =
    company?.headquarters_monthly_price_usd ??
    company?.headquarters?.monthly_price_usd ??
    0;

  const billingSummary =
    billing?.summary ||
    (billing as any)?.billing?.summary ||
    billing ||
    {};

  const subtotal = Number(
    billingSummary?.subtotal || 0
  );

  const tax = Number(
    billingSummary?.tax || 0
  );

  const total = Number(
    billingSummary?.total || 0
  );

  const entries =
    billing?.entries ||
    (billing as any)?.billing?.entries ||
    [];

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar active="All Companies" />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Firmic Admin
              </p>

              <h1 className="text-3xl font-bold mt-1">
                Company Inspector
              </h1>

              <p className="text-slate-500 mt-2">
                Inspect the selected tenant company without
                entering its private tenant workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push("/admin-companies")
                }
                className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold"
              >
                Back to Companies
              </button>

              <button
                type="button"
                onClick={() =>
                  companyId &&
                  loadCompany(companyId)
                }
                disabled={loading}
                className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold disabled:bg-slate-300"
              >
                {loading
                  ? "Refreshing..."
                  : "Refresh Company"}
              </button>
            </div>
          </header>

          {!router.isReady && (
            <LoadingCard text="Preparing company inspector..." />
          )}

          {router.isReady && !companyId && (
            <ErrorCard text="No company ID was provided." />
          )}

          {error && <ErrorCard text={error} />}

          {loading && companyId && (
            <LoadingCard text="Loading company record..." />
          )}

          {!loading && company && (
            <>
              <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 mt-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-3xl font-bold">
                        {company.name}
                      </h2>

                      <StatusBadge
                        status={
                          company.status || "initiated"
                        }
                      />
                    </div>

                    <p className="text-sm text-slate-500 mt-3 break-all">
                      Company ID: {company.id}
                    </p>

                    <p className="text-sm text-slate-500 mt-1">
                      Tenant user:{" "}
                      {company.user_id ?? "Unknown"}
                    </p>
                  </div>

                  <div className="bg-violet-50 border border-violet-100 rounded-2xl px-5 py-4 min-w-[220px]">
                    <p className="text-sm text-violet-700">
                      Current Billing
                    </p>

                    <p className="text-3xl font-bold text-violet-800 mt-1">
                      {money(total)}
                    </p>

                    <p className="text-xs text-violet-600 mt-1">
                      Shared PostgreSQL ledger
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-6">
                <StatCard
                  icon="🏢"
                  title="Headquarters"
                  value={headquarters}
                />

                <StatCard
                  icon="📍"
                  title="Jurisdiction"
                  value={
                    company.jurisdiction ||
                    "Abu Dhabi"
                  }
                />

                <StatCard
                  icon="⭐"
                  title="Plan"
                  value={company.plan || "Premium"}
                />

                <StatCard
                  icon="💵"
                  title="Office Price"
                  value={
                    officePrice
                      ? `${money(officePrice)}/mo`
                      : "$0.00"
                  }
                />
              </section>

              <section className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 mt-6">
                <div className="space-y-6">
                  <Panel title="Head Office">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <InfoBox
                        title="Office"
                        value={headquarters}
                      />

                      <InfoBox
                        title="Location"
                        value={location}
                      />

                      <InfoBox
                        title="Status"
                        value={
                          company.headquarters?.status ||
                          (headquarters !==
                          "Not selected"
                            ? "Rented"
                            : "Not activated")
                        }
                      />
                    </div>
                  </Panel>

                  <Panel title="Usage Ledger">
                    {entries.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                        <p className="font-bold">
                          No billing entries found.
                        </p>

                        <p className="text-sm text-slate-500 mt-2">
                          This company currently has no
                          synchronized usage records.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {entries.map(
                          (
                            entry: any,
                            index: number
                          ) => (
                            <div
                              key={
                                entry.id ||
                                `${entry.service}-${index}`
                              }
                              className="grid grid-cols-1 md:grid-cols-[1fr_130px_130px] gap-4 items-center bg-slate-50 border border-slate-200 rounded-2xl p-4"
                            >
                              <div>
                                <p className="font-bold">
                                  {formatService(
                                    entry.service
                                  )}
                                </p>

                                <p className="text-sm text-slate-500 mt-1">
                                  {entry.resource ||
                                    entry.action ||
                                    "Firmic service"}
                                </p>
                              </div>

                              <InfoValue
                                title="Status"
                                value={
                                  entry.status ||
                                  "unbilled"
                                }
                              />

                              <InfoValue
                                title="Total"
                                value={money(
                                  entry.total_amount
                                )}
                              />
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </Panel>
                </div>

                <div className="space-y-6">
                  <Panel title="Billing Summary">
                    <SummaryRow
                      label="Subtotal"
                      value={money(subtotal)}
                    />

                    <SummaryRow
                      label="Tax"
                      value={money(tax)}
                    />

                    <SummaryRow
                      label="Total"
                      value={money(total)}
                      strong
                    />

                    <SummaryRow
                      label="Ledger Entries"
                      value={String(entries.length)}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/admin-billing?company_id=${company.id}`
                        )
                      }
                      className="w-full bg-violet-600 text-white rounded-xl py-3 font-bold mt-5"
                    >
                      Open Tenant Billing
                    </button>
                  </Panel>

                  <Panel title="Admin Actions">
                    <ActionButton
                      label="View Office Inventory"
                      onClick={() =>
                        router.push(
                          "/admin-offices"
                        )
                      }
                    />

                    <ActionButton
                      label="Open AI Workforce Monitor"
                      onClick={() =>
                        router.push(
                          "/admin-ai-workforce"
                        )
                      }
                    />

                    <ActionButton
                      label="Open Compliance Queue"
                      onClick={() =>
                        router.push(
                          "/admin-compliance"
                        )
                      }
                    />

                    <ActionButton
                      label="Return to Company Directory"
                      onClick={() =>
                        router.push(
                          "/admin-companies"
                        )
                      }
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

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
      <h2 className="text-xl font-bold">{title}</h2>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatCard({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5">
      <div className="text-3xl">{icon}</div>

      <p className="text-sm text-slate-500 mt-3">
        {title}
      </p>

      <p className="text-xl font-bold mt-1 break-words">
        {value}
      </p>
    </div>
  );
}

function InfoBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="font-bold mt-1 break-words">
        {value}
      </p>
    </div>
  );
}

function InfoValue({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="font-bold mt-1 capitalize">
        {value}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-b-0">
      <span className="text-slate-500">
        {label}
      </span>

      <span
        className={
          strong
            ? "font-bold text-xl"
            : "font-bold"
        }
      >
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between border-b border-slate-100 py-4 font-bold text-left"
    >
      <span>{label}</span>
      <span>→</span>
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized = status.toLowerCase();

  const style =
    normalized === "active"
      ? "bg-green-100 text-green-700"
      : normalized === "terminated"
      ? "bg-red-100 text-red-700"
      : "bg-violet-100 text-violet-700";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${style}`}
    >
      {status}
    </span>
  );
}

function LoadingCard({
  text,
}: {
  text: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-8 text-slate-500">
      {text}
    </div>
  );
}

function ErrorCard({
  text,
}: {
  text: string;
}) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5 mt-8">
      {text}
    </div>
  );
}

function money(value: any) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatService(value: string) {
  return String(value || "Service")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}