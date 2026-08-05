import { useEffect, useMemo, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import { toAED } from "../src/data/pricing";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";
import {
  CompanySubscription,
  SubscriptionItem,
  getCompanySubscription,
} from "../services/subscriptionApi";

function formatMoney(value: number): string {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Not scheduled";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not scheduled";
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatStatus(value?: string): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isIncludedItem(item: SubscriptionItem): boolean {
  return (
    item.billing_behavior === "included" ||
    item.metadata_json?.included_by_plan === true
  );
}

function activeItems(
  subscription: CompanySubscription | null,
): SubscriptionItem[] {
  if (!subscription) {
    return [];
  }

  return subscription.items.filter((item) => item.status !== "cancelled");
}

export default function Billing() {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [subscription, setSubscription] = useState<CompanySubscription | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const syncWorkspace = () => {
      setWorkspace(getActiveWorkspace());
    };

    syncWorkspace();

    window.addEventListener(getWorkspaceChangedEventName(), syncWorkspace);
    window.addEventListener("storage", syncWorkspace);

    return () => {
      window.removeEventListener(getWorkspaceChangedEventName(), syncWorkspace);
      window.removeEventListener("storage", syncWorkspace);
    };
  }, []);

  useEffect(() => {
    void loadBilling();
  }, [workspace?.id]);

  async function loadBilling() {
    if (!workspace?.id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await getCompanySubscription(String(workspace.id));

      setSubscription(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load subscription.";

      setSubscription(null);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const companyName = workspace?.name || "Active Company";
  const headquarters = workspace?.headquarters;
  const officeCode = headquarters?.office_code || "Not selected";
  const officeLocation = headquarters?.location || "No headquarters selected";

  const items = useMemo(() => activeItems(subscription), [subscription]);

  const includedServices = useMemo(() => items.filter(isIncludedItem), [items]);

  const additionalServices = useMemo(
    () => items.filter((item) => !isIncludedItem(item)),
    [items],
  );

  const aiItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.service.category === "ai" &&
          item.service.code === "SERVICE_AI_EMPLOYEE",
      ),
    [items],
  );

  const usedAIEmployees = aiItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );

  const aiLimit = subscription?.plan.max_ai_employees ?? 0;

  const availableAIEmployees =
    aiLimit === 0 ? null : Math.max(0, aiLimit - usedAIEmployees);

  const subtotal = Number(subscription?.monthly_subtotal || 0);
  const discount = Number(subscription?.discount_total || 0);
  const tax = Number(subscription?.tax_total || 0);
  const total = Number(subscription?.monthly_total || 0);
  const launchFee = Number(subscription?.launch_activation_fee || 0);

  function downloadAccountStatement() {
    if (!subscription) {
      return;
    }

    const serviceLines = items.map((item) => {
      const pricing = isIncludedItem(item)
        ? "Included in plan"
        : `${formatMoney(item.monthly_price)}/month`;

      return [
        item.service.name,
        `Quantity: ${item.quantity}`,
        `Status: ${formatStatus(item.status)}`,
        pricing,
      ].join(" · ");
    });

    const statement = `FIRMIC SUBSCRIPTION STATEMENT

Company: ${companyName}
Plan: ${subscription.plan.name}
Subscription status: ${formatStatus(subscription.status)}
Billing cycle: ${formatStatus(subscription.billing_cycle)}
Headquarters: ${officeCode}
Location: ${officeLocation}

BUSINESS SERVICES
${serviceLines.join("\n") || "No active services"}

MONTHLY SUBSCRIPTION
Subtotal: ${formatMoney(subtotal)}
Discount: ${formatMoney(discount)}
Tax: ${formatMoney(tax)}
Monthly total: ${formatMoney(total)}
Monthly total in AED: AED ${toAED(total)}

ONE-TIME COMPANY LAUNCH
Company Launch Fee: ${formatMoney(launchFee)}

NEXT INVOICE
${formatDate(subscription.next_invoice_date)}
`;

    const blob = new Blob([statement], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${companyName.replace(
      /\s+/g,
      "_",
    )}_Subscription_Statement.txt`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-50">
        <FirmicSidebar />

        <main className="min-w-0 flex-1 p-6 xl:p-8">
          <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-bold text-violet-700">Subscription</p>

              <h1 className="mt-1 text-3xl font-bold text-slate-950">
                Subscription for {companyName}.
              </h1>

              <p className="mt-2 max-w-3xl text-slate-500">
                Review your Firmic plan, active business services, company
                launch fee, and recurring monthly subscription.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadBilling()}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold transition hover:bg-slate-100 disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>

              <button
                type="button"
                onClick={downloadAccountStatement}
                disabled={!subscription}
                className="rounded-xl bg-violet-600 px-6 py-3 font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Download Statement
              </button>
            </div>
          </header>

          {!workspace?.id && (
            <Notice tone="warning">
              Select or create a company to view its subscription.
            </Notice>
          )}

          {error && <Notice tone="error">{error}</Notice>}

          {loading && workspace?.id && (
            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              Loading subscription...
            </section>
          )}

          {!loading && workspace?.id && !subscription && !error && (
            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-sm font-bold text-violet-700">
                Subscription unavailable
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                This company does not have an active Firmic subscription yet.
              </h2>

              <p className="mt-3 text-slate-500">
                Start or complete the company launch process to activate a plan
                and business services.
              </p>

              <a
                href="/launch-center"
                className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:bg-violet-700"
              >
                Open Launch Center
              </a>
            </section>
          )}

          {subscription && (
            <>
              <section className="mt-8 grid grid-cols-1 gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-4">
                <Mini title="Company" value={companyName} />
                <Mini title="Current Plan" value={subscription.plan.name} />
                <Mini title="Headquarters" value={officeCode} />
                <Mini
                  title="Status"
                  value={formatStatus(subscription.status)}
                />
              </section>

              <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                <Stat
                  title="Monthly Subscription"
                  value={formatMoney(total)}
                  sub={`AED ${toAED(total)} per month`}
                  icon="💰"
                />

                <Stat
                  title="Monthly Subtotal"
                  value={formatMoney(subtotal)}
                  sub={
                    discount > 0
                      ? `${formatMoney(discount)} discount applied`
                      : "Before tax"
                  }
                  icon="🧾"
                />

                <Stat
                  title="Active Services"
                  value={String(items.length)}
                  sub={`${includedServices.length} included in plan`}
                  icon="🧩"
                />

                <Stat
                  title="Next Invoice"
                  value={formatDate(subscription.next_invoice_date)}
                  sub={formatStatus(subscription.billing_cycle)}
                  icon="📅"
                />
              </section>

              <section className="mt-8 overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px]">
                  <div className="p-6 lg:p-8">
                    <p className="text-sm font-bold text-violet-700">
                      Current Firmic Plan
                    </p>

                    <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-start">
                      <div>
                        <h2 className="text-3xl font-bold text-slate-950">
                          {subscription.plan.name}
                        </h2>

                        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                          {subscription.plan.description ||
                            "Your Firmic plan provides the operating infrastructure and business services assigned to this company."}
                        </p>
                      </div>

                      <div className="shrink-0 rounded-2xl bg-violet-50 px-5 py-4 text-right">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                          Plan price
                        </p>
                        <p className="mt-1 text-3xl font-bold text-violet-950">
                          {formatMoney(subscription.plan.monthly_price)}
                        </p>
                        <p className="text-sm font-medium text-violet-700">
                          per month
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-violet-200 bg-violet-50 p-6 xl:border-l xl:border-t-0 lg:p-8">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                      Company Launch Fee
                    </p>

                    <p className="mt-2 text-3xl font-bold text-violet-950">
                      {formatMoney(launchFee)}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-violet-800">
                      A one-time company activation charge for workspace
                      initialization, business infrastructure, and Firmic
                      service provisioning.
                    </p>

                    <div className="mt-6 rounded-2xl border border-violet-200 bg-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Charge type
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        One time only
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                <div className="space-y-6">
                  <ServiceSection
                    title="Included Business Services"
                    description="These services are covered by your current Firmic plan."
                    items={includedServices}
                    emptyMessage="No included services were found."
                  />

                  <ServiceSection
                    title="Additional Business Services"
                    description="These services are billed separately from the base plan."
                    items={additionalServices}
                    emptyMessage="No additional recurring services are active."
                  />
                </div>

                <div className="space-y-6">
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-bold text-violet-700">
                      AI Workforce Capacity
                    </p>

                    <h2 className="mt-2 text-2xl font-bold text-slate-950">
                      {aiLimit === 0
                        ? "Unlimited AI employees"
                        : `${usedAIEmployees} of ${aiLimit} used`}
                    </h2>

                    <div className="mt-6 space-y-4">
                      <InfoRow
                        label="Included capacity"
                        value={aiLimit === 0 ? "Unlimited" : String(aiLimit)}
                      />

                      <InfoRow
                        label="Currently assigned"
                        value={String(usedAIEmployees)}
                      />

                      <InfoRow
                        label="Available"
                        value={
                          availableAIEmployees === null
                            ? "Unlimited"
                            : String(availableAIEmployees)
                        }
                      />
                    </div>

                    <a
                      href="/ai-workforce"
                      className="mt-6 block rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 text-center font-bold text-violet-700 transition hover:bg-violet-100"
                    >
                      Manage AI Workforce
                    </a>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-bold text-violet-700">
                      Monthly Summary
                    </p>

                    <div className="mt-5 space-y-4">
                      <InfoRow
                        label="Plan and services"
                        value={formatMoney(subtotal)}
                      />

                      <InfoRow
                        label="Discount"
                        value={`-${formatMoney(discount)}`}
                      />

                      <InfoRow label="Tax" value={formatMoney(tax)} />

                      <div className="border-t border-slate-200 pt-4">
                        <InfoRow
                          label="Monthly total"
                          value={formatMoney(total)}
                          strong
                        />
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Billing cycle
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {formatStatus(subscription.billing_cycle)}
                      </p>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-bold text-violet-700">
                      Account Details
                    </p>

                    <div className="mt-5 space-y-4">
                      <InfoRow
                        label="Subscription status"
                        value={formatStatus(subscription.status)}
                      />

                      <InfoRow
                        label="Started"
                        value={formatDate(subscription.started_at)}
                      />

                      <InfoRow label="Headquarters" value={officeLocation} />

                      <InfoRow label="Currency" value={subscription.currency} />
                    </div>
                  </section>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function ServiceSection({
  title,
  description,
  items,
  emptyMessage,
}: {
  title: string;
  description: string;
  items: SubscriptionItem[];
  emptyMessage: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-950">
                    {item.service.name}
                  </p>

                  <Badge>{formatStatus(item.status)}</Badge>

                  {isIncludedItem(item) && (
                    <Badge tone="violet">Included</Badge>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {item.service.description || item.service.category}
                </p>

                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Quantity {item.quantity} ·{" "}
                  {item.provisioned ? "Provisioned" : "Provisioning pending"}
                </p>
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <p className="font-bold text-slate-950">
                  {isIncludedItem(item)
                    ? "Included"
                    : formatMoney(item.monthly_price)}
                </p>

                {!isIncludedItem(item) && (
                  <p className="text-xs text-slate-500">per month</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: string;
  sub: string;
  icon: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{sub}</p>
        </div>

        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <p className="mt-1 truncate font-bold text-slate-950">{value}</p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p
        className={
          strong ? "font-bold text-slate-950" : "text-sm text-slate-500"
        }
      >
        {label}
      </p>

      <p
        className={
          strong
            ? "text-lg font-bold text-slate-950"
            : "text-right text-sm font-bold text-slate-900"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "violet";
}) {
  const className =
    tone === "violet"
      ? "bg-violet-100 text-violet-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

function Notice({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "warning" | "error";
}) {
  const className =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className={`mt-6 rounded-2xl border p-4 ${className}`}>{children}</div>
  );
}
