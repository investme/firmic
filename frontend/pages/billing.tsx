import { useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import { toAED } from "../src/data/pricing";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";
import {
  getCompanyLedger,
  getCompanyLedgerSummary,
} from "../services/ledgerApi";

type LedgerEntry = {
  id: string;
  service: string;
  category: string;
  resource?: string;
  action: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: string;
  invoice_month: string;
  created_at?: string;
};

type LedgerSummary = {
  company_id: string;
  subtotal: number;
  tax: number;
  total: number;
  services: Array<{
    service: string;
    currency: string;
    subtotal: number;
    tax: number;
    total: number;
    entries: number;
  }>;
};

export default function Billing() {
  const [workspace, setWorkspace] = useState(() =>
    getActiveWorkspace()
  );
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    loadBilling();
  }, [workspace?.id]);

  async function loadBilling() {
    if (!workspace?.id) {
      setEntries([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [ledgerEntries, ledgerSummary] = await Promise.all([
        getCompanyLedger(workspace.id),
        getCompanyLedgerSummary(workspace.id),
      ]);

      setEntries(
        Array.isArray(ledgerEntries)
          ? ledgerEntries.filter(
              (entry) => entry.status !== "void"
            )
          : []
      );

      setSummary(ledgerSummary);
    } catch (err: any) {
      setError(err?.message || "Failed to load billing.");
    } finally {
      setLoading(false);
    }
  }

  const companyName = workspace?.name || "Active Company";
  const headquarters = workspace?.headquarters;
  const officeCode =
    headquarters?.office_code || "Not Selected";
  const officeLocation =
    headquarters?.location || "No headquarters selected";
  const plan = workspace?.plan || "Premium";

  const subtotal = Number(summary?.subtotal || 0);
  const tax = Number(summary?.tax || 0);
  const total = Number(summary?.total || 0);
  const activeServices = summary?.services?.length || 0;

  function downloadLatestInvoice() {
    const lines = entries.map(
      (entry) =>
        `${labelService(entry.service)} - ${
          entry.resource || entry.action
        }: $${entry.amount.toFixed(2)} + tax $${entry.tax_amount.toFixed(
          2
        )} = $${entry.total_amount.toFixed(2)}`
    );

    const invoice = `FIRMIC INVOICE

Company: ${companyName}
Plan: ${plan}
Headquarters: ${officeCode}
Location: ${officeLocation}

${lines.join("\n") || "No billable usage"}

Subtotal: $${subtotal.toFixed(2)}
Tax: $${tax.toFixed(2)}
Total: $${total.toFixed(2)}
AED ${toAED(total)}

Status: ${total > 0 ? "Payment due" : "No charges"}
`;

    const blob = new Blob([invoice], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${companyName.replace(/\s+/g, "_")}_Invoice.txt`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Billing Center
              </p>

              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                Billing for {companyName}.
              </h1>

              <p className="text-slate-500 mt-2">
                This page now reads directly from the PostgreSQL Usage Ledger.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={loadBilling}
                disabled={loading}
                className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold disabled:opacity-50"
              >
                Refresh
              </button>

              <button
                type="button"
                onClick={downloadLatestInvoice}
                className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold"
              >
                Download Latest Invoice
              </button>
            </div>
          </header>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
              {error}
            </div>
          )}

          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Mini title="Company" value={companyName} />
            <Mini title="Plan" value={plan} />
            <Mini title="Headquarters" value={officeCode} />
            <Mini title="Location" value={officeLocation} />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat title="Current Spend" value={`$${total.toFixed(2)}`} sub={`AED ${toAED(total)}`} icon="💰" />
            <Stat title="Subtotal" value={`$${subtotal.toFixed(2)}`} sub="Before tax" icon="🧾" />
            <Stat title="Active Services" value={String(activeServices)} sub="Ledger services" icon="✅" />
            <Stat title="Payment Status" value={total > 0 ? "Due" : "No Charges"} sub={total > 0 ? "Payment pending" : "Workspace clean"} icon="💳" />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 mt-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">
                Usage Ledger
              </h2>

              {loading ? (
                <p className="mt-5 text-slate-500">
                  Loading billing...
                </p>
              ) : entries.length === 0 ? (
                <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-slate-500">
                  No billable usage has been recorded for this company.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-[1fr_130px_130px_120px] gap-4 items-center"
                    >
                      <div>
                        <p className="font-bold">
                          {labelService(entry.service)}
                        </p>

                        <p className="text-sm text-slate-500 mt-1">
                          {entry.resource || entry.action}
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          {entry.quantity} {entry.unit} · {entry.invoice_month}
                        </p>
                      </div>

                      <Info title="Subtotal" value={`$${entry.amount.toFixed(2)}`} />
                      <Info title="Tax" value={`$${entry.tax_amount.toFixed(2)}`} />
                      <Info title="Total" value={`$${entry.total_amount.toFixed(2)}`} />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 bg-violet-600 text-white rounded-3xl p-6">
                <p className="text-violet-100">
                  Current Ledger Total
                </p>

                <h3 className="text-4xl font-bold mt-2">
                  ${total.toFixed(2)}
                </h3>

                <p className="text-violet-100 mt-1">
                  AED {toAED(total)}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Service Summary
                </h2>

                <div className="space-y-3 mt-5">
                  {(summary?.services || []).map((service) => (
                    <div
                      key={`${service.service}-${service.currency}`}
                      className="border-b border-slate-100 pb-3"
                    >
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold">
                          {labelService(service.service)}
                        </span>

                        <span className="font-bold">
                          ${service.total.toFixed(2)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-1">
                        {service.entries} ledger entr{service.entries === 1 ? "y" : "ies"}
                      </p>
                    </div>
                  ))}

                  {!summary?.services?.length && (
                    <p className="text-slate-500">
                      No active service charges.
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Tax Summary
                </h2>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <Mini title="Subtotal" value={`$${subtotal.toFixed(2)}`} />
                  <Mini title="Tax" value={`$${tax.toFixed(2)}`} />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function labelService(value: string) {
  return value
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function Stat({ title, value, sub, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-sm text-slate-500">{sub}</p>
    </div>
  );
}

function Mini({ title, value }: any) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 text-center overflow-hidden">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold text-lg mt-1 truncate">{value}</p>
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
