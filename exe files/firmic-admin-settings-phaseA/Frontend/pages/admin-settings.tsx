import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AdminSidebar from "../components/AdminSidebar";
import AdminProtectedRoute from "../components/AdminProtectedRoute";

import {
  getAdminSettings,
} from "../services/adminApi";

type SettingsData = {
  platform?: {
    name?: string;
    environment?: string;
    database?: string;
    currency?: string;
    aed_conversion_rate?: number;
    vat_rate?: number;
    tenant_registration_enabled?: boolean;
    tenant_isolation_enabled?: boolean;
  };
  pricing?: {
    hookup_fee_usd?: number;
    default_office_monthly_usd?: number;
    meeting_room_hourly_usd?: number;
    business_number_monthly_usd?: number;
    digital_mailroom_monthly_usd?: number;
    microsoft_365_monthly_usd?: number;
  };
  inventory?: {
    total_offices?: number;
    available_offices?: number;
    rented_offices?: number;
    active_companies?: number;
  };
  billing?: {
    ledger_enabled?: boolean;
    automatic_setup_fee_reconciliation?: boolean;
    tax_applied_to_setup_fee?: boolean;
    supported_statuses?: string[];
  };
};

export default function AdminSettings() {
  const [data, setData] =
    useState<SettingsData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState("");

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const result =
        await getAdminSettings();

      setData(result);
      setLastUpdated(
        new Date().toLocaleString()
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load Admin Settings."
      );
    } finally {
      setLoading(false);
    }
  }

  const platform =
    data?.platform || {};

  const pricing =
    data?.pricing || {};

  const inventory =
    data?.inventory || {};

  const billing =
    data?.billing || {};

  const occupancy = useMemo(() => {
    const total =
      Number(
        inventory.total_offices ||
          0
      );

    const rented =
      Number(
        inventory.rented_offices ||
          0
      );

    if (total <= 0) {
      return 0;
    }

    return Math.round(
      (rented / total) * 100
    );
  }, [inventory]);

  const pricingRows = [
    {
      label:
        "Firmic One-Time Hookup Fee",
      value: money(
        pricing.hookup_fee_usd
      ),
      description:
        "Charged once when a company is created.",
      icon: "🔌",
      status: "Live",
    },
    {
      label:
        "Default Office Monthly Price",
      value: money(
        pricing.default_office_monthly_usd
      ),
      description:
        "Reference monthly price for virtual headquarters inventory.",
      icon: "🏢",
      status: "Live",
    },
    {
      label:
        "Meeting Room Hourly Price",
      value: money(
        pricing.meeting_room_hourly_usd
      ),
      description:
        "Default hourly rate used by the Meeting Center.",
      icon: "📅",
      status: "Live",
    },
    {
      label:
        "Business Number Monthly Price",
      value: money(
        pricing.business_number_monthly_usd
      ),
      description:
        "Planned monthly VoIP and business-number subscription.",
      icon: "☎️",
      status: "Planned",
    },
    {
      label:
        "Digital Mailroom Monthly Price",
      value: money(
        pricing.digital_mailroom_monthly_usd
      ),
      description:
        "Planned monthly mail handling and digital mailroom subscription.",
      icon: "📬",
      status: "Planned",
    },
    {
      label:
        "Microsoft 365 Monthly Price",
      value: money(
        pricing.microsoft_365_monthly_usd
      ),
      description:
        "Planned monthly mailbox and Microsoft 365 service price.",
      icon: "📧",
      status: "Planned",
    },
  ];

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar
          active="Admin Settings"
        />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Firmic Admin
              </p>

              <h1 className="text-3xl font-bold mt-1">
                Platform Settings
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Central platform identity, pricing, billing policy,
                tenant controls, and infrastructure reference values.
              </p>

              {lastUpdated && (
                <p className="text-xs text-slate-400 mt-2">
                  Last refreshed:{" "}
                  {lastUpdated}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={loadSettings}
              disabled={loading}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold disabled:bg-slate-300"
            >
              {loading
                ? "Refreshing..."
                : "Refresh Settings"}
            </button>
          </header>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
              {error}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat
              title="Hookup Fee"
              value={money(
                pricing.hookup_fee_usd
              )}
              icon="🔌"
            />

            <Stat
              title="VAT Rate"
              value={percent(
                platform.vat_rate
              )}
              icon="🧾"
            />

            <Stat
              title="USD → AED"
              value={Number(
                platform.aed_conversion_rate ||
                  0
              ).toFixed(2)}
              icon="💱"
            />

            <Stat
              title="Office Occupancy"
              value={`${occupancy}%`}
              icon="🏢"
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 mt-8">
            <div className="space-y-6">
              <Panel
                title="Platform Identity"
                description="Core Firmic environment and operating configuration."
              >
                <SettingsGrid>
                  <Setting
                    label="Platform Name"
                    value={
                      platform.name ||
                      "Firmic"
                    }
                  />

                  <Setting
                    label="Environment"
                    value={
                      platform.environment ||
                      "MVP"
                    }
                  />

                  <Setting
                    label="Database"
                    value={
                      platform.database ||
                      "PostgreSQL"
                    }
                  />

                  <Setting
                    label="Base Currency"
                    value={
                      platform.currency ||
                      "USD"
                    }
                  />
                </SettingsGrid>
              </Panel>

              <Panel
                title="Pricing Catalogue"
                description="Current and planned platform service prices."
              >
                <div className="space-y-4">
                  {pricingRows.map(
                    (item) => (
                      <div
                        key={
                          item.label
                        }
                        className="border border-slate-200 bg-slate-50 rounded-2xl p-5"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="text-3xl">
                              {
                                item.icon
                              }
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-lg">
                                  {
                                    item.label
                                  }
                                </h3>

                                <StatusBadge
                                  value={
                                    item.status
                                  }
                                />
                              </div>

                              <p className="text-sm text-slate-500 mt-1">
                                {
                                  item.description
                                }
                              </p>
                            </div>
                          </div>

                          <p className="text-2xl font-bold">
                            {
                              item.value
                            }
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </Panel>

              <Panel
                title="Billing Engine"
                description="Shared Usage Ledger policy used by Tenant and Admin billing."
              >
                <SettingsGrid>
                  <BooleanSetting
                    label="Usage Ledger"
                    value={
                      billing.ledger_enabled
                    }
                  />

                  <BooleanSetting
                    label="Automatic Setup-Fee Reconciliation"
                    value={
                      billing.automatic_setup_fee_reconciliation
                    }
                  />

                  <Setting
                    label="Setup-Fee Tax"
                    value={
                      billing.tax_applied_to_setup_fee
                        ? "Applied"
                        : "Not Applied"
                    }
                  />

                  <Setting
                    label="Supported Statuses"
                    value={(
                      billing.supported_statuses ||
                      []
                    )
                      .map(
                        formatLabel
                      )
                      .join(", ")}
                  />
                </SettingsGrid>
              </Panel>
            </div>

            <aside className="space-y-6">
              <Panel
                title="Tenant Controls"
                description="Authentication and workspace-isolation policy."
              >
                <div className="space-y-4">
                  <ControlRow
                    label="Tenant Registration"
                    enabled={
                      platform.tenant_registration_enabled
                    }
                  />

                  <ControlRow
                    label="Tenant Isolation"
                    enabled={
                      platform.tenant_isolation_enabled
                    }
                  />

                  <ControlRow
                    label="Shared PostgreSQL Ledger"
                    enabled={
                      billing.ledger_enabled
                    }
                  />
                </div>
              </Panel>

              <Panel
                title="Office Inventory"
                description="Live workspace capacity from PostgreSQL."
              >
                <div className="grid grid-cols-2 gap-3">
                  <Mini
                    title="Total"
                    value={
                      inventory.total_offices ||
                      0
                    }
                  />

                  <Mini
                    title="Available"
                    value={
                      inventory.available_offices ||
                      0
                    }
                  />

                  <Mini
                    title="Rented"
                    value={
                      inventory.rented_offices ||
                      0
                    }
                  />

                  <Mini
                    title="Active Companies"
                    value={
                      inventory.active_companies ||
                      0
                    }
                  />
                </div>
              </Panel>

              <section className="bg-amber-50 border border-amber-200 rounded-3xl p-6">
                <p className="text-sm font-bold text-amber-800">
                  Current Settings Mode
                </p>

                <h2 className="text-xl font-bold mt-1 text-amber-950">
                  Read-only platform reference
                </h2>

                <p className="text-sm text-amber-800 mt-3">
                  These values currently come from the Admin backend and are
                  shown consistently across the platform. Editing is intentionally
                  disabled until the values are moved into a persistent
                  PostgreSQL settings table.
                </p>
              </section>

              <section className="bg-violet-50 border border-violet-200 rounded-3xl p-6">
                <p className="text-sm font-bold text-violet-700">
                  Next Settings Upgrade
                </p>

                <h2 className="text-xl font-bold mt-1 text-violet-950">
                  PostgreSQL-backed controls
                </h2>

                <div className="space-y-3 mt-5 text-sm text-violet-800">
                  <Check text="Editable VAT percentage" />
                  <Check text="Editable hookup fee" />
                  <Check text="Office pricing defaults" />
                  <Check text="AI employee templates and pricing" />
                  <Check text="VoIP and answering-service pricing" />
                  <Check text="Mailbox and forwarding pricing" />
                  <Check text="Microsoft 365 user and mailbox pricing" />
                  <Check text="Meeting-room default pricing" />
                </div>
              </section>
            </aside>
          </section>
        </main>
      </div>
    </AdminProtectedRoute>
  );
}

function Panel({
  title,
  description,
  children,
}: any) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <h2 className="text-xl font-bold">
        {title}
      </h2>

      <p className="text-sm text-slate-500 mt-1">
        {description}
      </p>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function SettingsGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
    </div>
  );
}

function Setting({
  label,
  value,
}: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="font-bold mt-1 break-words">
        {value || "Not configured"}
      </p>
    </div>
  );
}

function BooleanSetting({
  label,
  value,
}: any) {
  return (
    <Setting
      label={label}
      value={
        value
          ? "Enabled"
          : "Disabled"
      }
    />
  );
}

function ControlRow({
  label,
  enabled,
}: any) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
      <span className="font-medium">
        {label}
      </span>

      <span
        className={`px-3 py-1 rounded-full text-xs font-bold ${
          enabled
            ? "bg-green-100 text-green-700"
            : "bg-slate-200 text-slate-600"
        }`}
      >
        {enabled
          ? "Enabled"
          : "Disabled"}
      </span>
    </div>
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

function Mini({
  title,
  value,
}: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="text-2xl font-bold mt-1">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  value,
}: {
  value: string;
}) {
  const live =
    value === "Live";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold ${
        live
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      {value}
    </span>
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

function percent(
  value: any
) {
  return `${Number(
    value || 0
  ) * 100}%`;
}

function formatLabel(
  value: string
) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}
