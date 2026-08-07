import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import AdminSidebar from "../components/AdminSidebar";
import AdminProtectedRoute from "../components/AdminProtectedRoute";
import {
  getAdminBilling,
  getAdminCompanyBilling,
  markAdminCompanyBilled,
  markAdminCompanyPaid,
  backfillAdminActivationFees,
} from "../services/adminApi";

type CompanyBillingRow = {
  company: {
    id: string;
    name: string;
    status: string;
    headquarters?: {
      office_code?: string;
    } | null;
  };
  entry_count: number;
  subtotal: number;
  tax: number;
  total: number;
  payment_status: string;
};

export default function AdminBilling() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [syncingFees, setSyncingFees] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!router.isReady) return;

    const companyId =
      typeof router.query.company_id === "string"
        ? router.query.company_id
        : undefined;

    load(companyId);
  }, [router.isReady, router.query.company_id]);

  async function load(preferredCompanyId?: string) {
    try {
      setLoading(true);
      setError("");
      const result = await getAdminBilling();
      setData(result);

      const rows: CompanyBillingRow[] = result?.companies || [];
      const nextId =
        preferredCompanyId ||
        selectedId ||
        rows.find((row) => row.total > 0)?.company.id ||
        rows[0]?.company.id ||
        "";

      if (nextId) {
        await openCompany(nextId);
      } else {
        setSelected(null);
        setSelectedId("");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load live tenant billing.");
    } finally {
      setLoading(false);
    }
  }

  async function openCompany(companyId: string) {
    try {
      setDetailLoading(true);
      setError("");
      setSelectedId(companyId);
      setSelected(await getAdminCompanyBilling(companyId));
    } catch (err: any) {
      setError(err?.message || "Failed to load company billing.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function updateStatus(action: "billed" | "paid") {
    if (!selectedId) return;

    try {
      setBusy(action);
      setError("");
      setNotice("");

      if (action === "billed") {
        await markAdminCompanyBilled(selectedId);
        setNotice("All unbilled entries were marked as billed.");
      } else {
        await markAdminCompanyPaid(selectedId);
        setNotice("All outstanding entries were marked as paid.");
      }

      await load(selectedId);
    } catch (err: any) {
      setError(err?.message || "Billing status update failed.");
    } finally {
      setBusy("");
    }
  }

  async function syncActivationFees() {
    try {
      setSyncingFees(true);
      setError("");
      setNotice("");

      const result = await backfillAdminActivationFees();

      setNotice(
        `Activation fee sync complete: ${result?.created_count || 0} created, ` +
        `${result?.migrated_or_existing_count || 0} migrated or already present.`
      );

      await load(selectedId);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to synchronize activation fees."
      );
    } finally {
      setSyncingFees(false);
    }
  }

  const rows: CompanyBillingRow[] = data?.companies || [];
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      [
        row.company.name,
        row.company.id,
        row.company.status,
        row.payment_status,
        row.company.headquarters?.office_code || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [rows, search]);

  const summary = data?.summary;

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar active="Tenant Billing" />

        <main className="flex-1 p-6 xl:p-8 min-w-0">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">Firmic Admin</p>
              <h1 className="text-3xl font-bold mt-1">Tenant Billing</h1>
              <p className="text-slate-500 mt-2">
                Live tenant charges from the same PostgreSQL Usage Ledger used by every Tenant Billing Center.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={syncActivationFees}
                disabled={syncingFees || loading}
                className="border border-violet-200 bg-white text-violet-700 px-5 py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {syncingFees
                  ? "Syncing Activation Fees..."
                  : "Sync Activation Fees"}
              </button>

              <button
                type="button"
                onClick={() => load(selectedId)}
                disabled={loading || syncingFees}
                className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold disabled:bg-slate-300"
              >
                {loading ? "Refreshing..." : "Refresh Billing"}
              </button>
            </div>
          </header>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
              {error}
            </div>
          )}

          {notice && (
            <div className="mt-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4">
              {notice}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat title="Unbilled" value={money(summary?.unbilled?.total)} sub={`${summary?.unbilled?.entries || 0} entries`} icon="⏳" />
            <Stat title="Billed" value={money(summary?.billed?.total)} sub={`${summary?.billed?.entries || 0} entries`} icon="🧾" />
            <Stat title="Paid Revenue" value={money(summary?.paid?.total)} sub={`${summary?.paid?.entries || 0} entries`} icon="✅" />
            <Stat title="Billable Companies" value={String(summary?.billable_companies || 0)} sub={`Ledger total ${money(summary?.grand_total)}`} icon="🏢" />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_430px] gap-6 mt-8">
            <div className="space-y-6 min-w-0">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search company, office, status, or ID..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3"
                />
              </div>

              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">Company Billing Directory</h2>

                <div className="space-y-3 mt-5">
                  {loading ? (
                    <p className="text-slate-500">Loading billing data...</p>
                  ) : filteredRows.length === 0 ? (
                    <p className="text-slate-500">No companies match this search.</p>
                  ) : (
                    filteredRows.map((row) => (
                      <button
                        type="button"
                        key={row.company.id}
                        onClick={() => openCompany(row.company.id)}
                        className={`w-full text-left border rounded-2xl p-4 grid grid-cols-1 md:grid-cols-[1fr_120px_120px_120px] gap-4 items-center transition ${
                          selectedId === row.company.id
                            ? "border-violet-500 bg-violet-50"
                            : "border-slate-200 bg-slate-50 hover:border-violet-300"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2 items-center">
                            <p className="font-bold text-lg">{row.company.name}</p>
                            <Badge value={row.payment_status} />
                          </div>
                          <p className="text-xs text-slate-500 break-all mt-1">{row.company.id}</p>
                          <p className="text-sm text-slate-500 mt-2">
                            {row.company.headquarters?.office_code
                              ? `Headquarters ${row.company.headquarters.office_code}`
                              : "No Headquarters"}
                            {` · ${row.entry_count} ledger entr${row.entry_count === 1 ? "y" : "ies"}`}
                          </p>
                        </div>

                        <Info title="Subtotal" value={money(row.subtotal)} />
                        <Info title="Tax" value={money(row.tax)} />
                        <Info title="Total" value={money(row.total)} />
                      </button>
                    ))
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm sticky top-6">
                <h2 className="text-xl font-bold">Selected Company Ledger</h2>

                {detailLoading ? (
                  <p className="mt-5 text-slate-500">Loading company ledger...</p>
                ) : !selected ? (
                  <p className="mt-5 text-slate-500">Select a company to inspect its charges.</p>
                ) : (
                  <>
                    <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <p className="text-sm text-slate-500">Tenant</p>
                      <p className="font-bold text-xl mt-1">{selected.company?.name}</p>
                      <p className="text-sm text-slate-500 mt-2">
                        {selected.company?.headquarters?.office_code
                          ? `Headquarters ${selected.company.headquarters.office_code}`
                          : "No Headquarters"}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <Mini title="Subtotal" value={money(selected.summary?.subtotal)} />
                      <Mini title="Tax" value={money(selected.summary?.tax)} />
                      <Mini title="Total" value={money(selected.summary?.total)} />
                    </div>

                    <div className="mt-5 space-y-3 max-h-[430px] overflow-y-auto pr-1">
                      {(selected.entries || []).length === 0 ? (
                        <p className="text-slate-500">No ledger entries for this company.</p>
                      ) : (
                        selected.entries.map((entry: any) => (
                          <div key={entry.id} className="border border-slate-200 rounded-2xl p-4">
                            <div className="flex justify-between gap-3">
                              <div>
                                <p className="font-bold">{label(entry.service)}</p>
                                <p className="text-sm text-slate-500 mt-1">{entry.resource || label(entry.action)}</p>
                              </div>
                              <Badge value={entry.status} />
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                              <Info title="Subtotal" value={money(entry.amount)} />
                              <Info title="Tax" value={money(entry.tax_amount)} />
                              <Info title="Total" value={money(entry.total_amount)} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <button
                        type="button"
                        onClick={() => updateStatus("billed")}
                        disabled={busy !== "" || Number(selected.summary?.total || 0) === 0}
                        className="bg-violet-600 text-white py-3 rounded-xl font-bold disabled:bg-slate-300"
                      >
                        {busy === "billed" ? "Updating..." : "Mark Billed"}
                      </button>

                      <button
                        type="button"
                        onClick={() => updateStatus("paid")}
                        disabled={busy !== "" || Number(selected.summary?.total || 0) === 0}
                        className="border border-green-300 text-green-700 py-3 rounded-xl font-bold disabled:text-slate-400 disabled:border-slate-200"
                      >
                        {busy === "paid" ? "Updating..." : "Mark Paid"}
                      </button>
                    </div>
                  </>
                )}
              </section>
            </aside>
          </section>
        </main>
      </div>
    </AdminProtectedRoute>
  );
}

function money(value: unknown) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function label(value: string) {
  return String(value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function Stat({ title, value, sub, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

function Info({ title, value }: any) {
  return (
    <div>
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}

function Mini({ title, value }: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center min-w-0">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold mt-1 truncate">{value}</p>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  const normalized = String(value || "unknown").toLowerCase();
  const style =
    normalized === "paid"
      ? "bg-green-100 text-green-700"
      : normalized === "billed"
      ? "bg-blue-100 text-blue-700"
      : normalized === "unbilled"
      ? "bg-yellow-100 text-yellow-700"
      : normalized === "no_charges"
      ? "bg-slate-100 text-slate-500"
      : "bg-violet-100 text-violet-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${style}`}>
      {label(normalized)}
    </span>
  );
}
