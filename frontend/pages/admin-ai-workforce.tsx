import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/router";

import AdminSidebar from "../components/AdminSidebar";
import AdminProtectedRoute from "../components/AdminProtectedRoute";

import {
  deactivateAdminAIAgent,
  getAdminAIWorkforce,
  reactivateAdminAIAgent,
} from "../services/adminApi";

type AgentRecord = {
  id: string;
  company_id: string;
  company_name: string;
  company_status: string;
  headquarters?: string | null;
  agent_name: string;
  monthly_price_usd: number;
  status: string;
  activated_at?: string | null;
  deactivated_at?: string | null;
};

export default function AdminAIWorkforce() {
  const router = useRouter();

  const [data, setData] =
    useState<any>(null);

  const [selected, setSelected] =
    useState<AgentRecord | null>(null);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("all");

  const [company, setCompany] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [busyId, setBusyId] =
    useState("");

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load(
    preferredAgentId?: string
  ) {
    try {
      setLoading(true);
      setError("");

      const result =
        await getAdminAIWorkforce();

      setData(result);

      const agents: AgentRecord[] =
        result?.agents || [];

      const next =
        agents.find(
          (agent) =>
            agent.id ===
            (preferredAgentId ||
              selected?.id)
        ) ||
        agents[0] ||
        null;

      setSelected(next);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load AI workforce."
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleAgent(
    agent: AgentRecord
  ) {
    const isActive =
      agent.status === "active";

    const action =
      isActive
        ? "deactivate"
        : "reactivate";

    const confirmed = confirm(
      isActive
        ? `Pause ${agent.agent_name} for ${agent.company_name}? The current unbilled monthly AI charge will be voided.`
        : `Reactivate ${agent.agent_name} for ${agent.company_name} at $${moneyNumber(
            agent.monthly_price_usd
          )}/month?`
    );

    if (!confirmed) return;

    try {
      setBusyId(agent.id);
      setError("");
      setNotice("");

      if (isActive) {
        await deactivateAdminAIAgent({
          company_id:
            agent.company_id,
          agent_name:
            agent.agent_name,
        });
      } else {
        await reactivateAdminAIAgent({
          company_id:
            agent.company_id,
          agent_name:
            agent.agent_name,
          monthly_price_usd:
            Number(
              agent.monthly_price_usd ||
                0
            ),
        });
      }

      setNotice(
        `${agent.agent_name} was ${action}d for ${agent.company_name}.`
      );

      await load(agent.id);
    } catch (err: any) {
      setError(
        err?.message ||
          `Failed to ${action} AI agent.`
      );
    } finally {
      setBusyId("");
    }
  }

  const agents: AgentRecord[] =
    data?.agents || [];

  const metrics =
    data?.metrics || {};

  const companies = useMemo(
    () =>
      Array.from(
        new Set(
          agents.map(
            (agent) =>
              agent.company_name
          )
        )
      ).sort(),
    [agents]
  );

  const filtered = useMemo(() => {
    const query =
      search
        .trim()
        .toLowerCase();

    return agents.filter(
      (agent) => {
        const searchable = [
          agent.agent_name,
          agent.company_name,
          agent.company_id,
          agent.company_status,
          agent.headquarters || "",
          agent.status,
        ]
          .join(" ")
          .toLowerCase();

        return (
          (!query ||
            searchable.includes(
              query
            )) &&
          (status === "all" ||
            agent.status ===
              status) &&
          (company === "all" ||
            agent.company_name ===
              company)
        );
      }
    );
  }, [
    agents,
    search,
    status,
    company,
  ]);

  const grouped = useMemo(() => {
    const groups =
      new Map<
        string,
        AgentRecord[]
      >();

    for (const agent of filtered) {
      const existing =
        groups.get(
          agent.company_name
        ) || [];

      existing.push(agent);
      groups.set(
        agent.company_name,
        existing
      );
    }

    return Array.from(
      groups.entries()
    );
  }, [filtered]);

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar
          active="AI Workforce Admin"
        />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Firmic Admin
              </p>

              <h1 className="text-3xl font-bold mt-1">
                AI Workforce Monitor
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Live cross-tenant AI employees, subscriptions,
                activation state, and monthly operating cost from PostgreSQL.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                load(
                  selected?.id
                )
              }
              disabled={loading}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold disabled:bg-slate-300"
            >
              {loading
                ? "Refreshing..."
                : "Refresh Workforce"}
            </button>
          </header>

          {error && (
            <Alert
              type="error"
              text={error}
            />
          )}

          {notice && (
            <Alert
              type="success"
              text={notice}
            />
          )}

          <section className="grid grid-cols-1 md:grid-cols-5 gap-5 mt-8">
            <Stat
              title="AI Employees"
              value={
                metrics.total_agents ||
                0
              }
              icon="🤖"
            />

            <Stat
              title="Active"
              value={
                metrics.active_agents ||
                0
              }
              icon="✅"
            />

            <Stat
              title="Inactive"
              value={
                metrics.inactive_agents ||
                0
              }
              icon="⏸️"
            />

            <Stat
              title="Companies Served"
              value={
                metrics.companies_with_agents ||
                0
              }
              icon="🏢"
            />

            <Stat
              title="Active Monthly Cost"
              value={money(
                metrics.monthly_cost_usd
              )}
              icon="💰"
            />
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_260px] gap-4">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search agent, company, headquarters, status, or ID..."
                className="border border-slate-200 rounded-xl px-4 py-3"
              />

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value
                  )
                }
                className="border border-slate-200 rounded-xl px-4 py-3"
              >
                <option value="all">
                  All Status
                </option>
                <option value="active">
                  Active
                </option>
                <option value="inactive">
                  Inactive
                </option>
              </select>

              <select
                value={company}
                onChange={(event) =>
                  setCompany(
                    event.target.value
                  )
                }
                className="border border-slate-200 rounded-xl px-4 py-3"
              >
                <option value="all">
                  All Companies
                </option>

                {companies.map(
                  (companyName) => (
                    <option
                      value={
                        companyName
                      }
                      key={
                        companyName
                      }
                    >
                      {companyName}
                    </option>
                  )
                )}
              </select>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_410px] gap-6 mt-8">
            <div className="space-y-6 min-w-0">
              {loading ? (
                <Empty text="Loading AI workforce..." />
              ) : grouped.length ===
                0 ? (
                <Empty text="No AI employees match these filters." />
              ) : (
                grouped.map(
                  ([
                    companyName,
                    companyAgents,
                  ]) => {
                    const active =
                      companyAgents.filter(
                        (agent) =>
                          agent.status ===
                          "active"
                      );

                    const monthly =
                      active.reduce(
                        (
                          total,
                          agent
                        ) =>
                          total +
                          Number(
                            agent.monthly_price_usd ||
                              0
                          ),
                        0
                      );

                    return (
                      <section
                        key={
                          companyName
                        }
                        className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden"
                      >
                        <header className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <h2 className="text-xl font-bold">
                              {
                                companyName
                              }
                            </h2>

                            <p className="text-sm text-slate-500 mt-1">
                              {
                                companyAgents[0]
                                  ?.headquarters
                                  ? `Headquarters ${companyAgents[0].headquarters}`
                                  : "No headquarters"
                              }
                            </p>
                          </div>

                          <div className="text-left md:text-right">
                            <p className="font-bold">
                              {
                                active.length
                              }{" "}
                              active
                            </p>

                            <p className="text-sm text-slate-500">
                              {money(
                                monthly
                              )}
                              /month
                            </p>
                          </div>
                        </header>

                        <div className="divide-y divide-slate-100">
                          {companyAgents.map(
                            (
                              agent
                            ) => (
                              <button
                                type="button"
                                key={
                                  agent.id
                                }
                                onClick={() =>
                                  setSelected(
                                    agent
                                  )
                                }
                                className={`w-full text-left p-5 transition ${
                                  selected?.id ===
                                  agent.id
                                    ? "bg-violet-50"
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_130px_150px_160px] gap-4 items-center">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-bold text-lg">
                                        {
                                          agent.agent_name
                                        }
                                      </p>

                                      <StatusBadge
                                        value={
                                          agent.status
                                        }
                                      />
                                    </div>

                                    <p className="text-xs text-slate-400 mt-2 break-all">
                                      Agent ID:{" "}
                                      {
                                        agent.id
                                      }
                                    </p>
                                  </div>

                                  <Info
                                    title="Monthly Cost"
                                    value={money(
                                      agent.monthly_price_usd
                                    )}
                                  />

                                  <Info
                                    title="Activated"
                                    value={formatDate(
                                      agent.activated_at
                                    )}
                                  />

                                  <Info
                                    title="Company"
                                    value={
                                      agent.company_status ||
                                      "unknown"
                                    }
                                  />
                                </div>
                              </button>
                            )
                          )}
                        </div>
                      </section>
                    );
                  }
                )
              )}
            </div>

            <aside className="space-y-6">
              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm xl:sticky xl:top-6">
                <h2 className="text-xl font-bold">
                  Selected AI Employee
                </h2>

                {!selected ? (
                  <p className="text-slate-500 mt-5">
                    Select an AI employee to inspect and manage it.
                  </p>
                ) : (
                  <>
                    <div className="mt-5 bg-violet-50 border border-violet-100 rounded-2xl p-5">
                      <p className="text-sm text-violet-700">
                        AI Employee
                      </p>

                      <p className="text-2xl font-bold mt-1">
                        {
                          selected.agent_name
                        }
                      </p>

                      <p className="text-sm text-violet-700 mt-2">
                        {
                          selected.company_name
                        }
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <Mini
                        title="Status"
                        value={
                          selected.status
                        }
                      />

                      <Mini
                        title="Monthly"
                        value={money(
                          selected.monthly_price_usd
                        )}
                      />

                      <Mini
                        title="Headquarters"
                        value={
                          selected.headquarters ||
                          "None"
                        }
                      />

                      <Mini
                        title="Company State"
                        value={
                          selected.company_status ||
                          "Unknown"
                        }
                      />
                    </div>

                    <div className="mt-6 space-y-3">
                      <button
                        type="button"
                        onClick={() =>
                          toggleAgent(
                            selected
                          )
                        }
                        disabled={
                          busyId ===
                          selected.id
                        }
                        className={`w-full rounded-xl py-3 font-bold disabled:bg-slate-300 disabled:text-white ${
                          selected.status ===
                          "active"
                            ? "border border-red-200 text-red-600"
                            : "bg-violet-600 text-white"
                        }`}
                      >
                        {busyId ===
                        selected.id
                          ? "Updating..."
                          : selected.status ===
                            "active"
                          ? "Pause AI Employee"
                          : "Reactivate AI Employee"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/admin-company?company_id=${selected.company_id}`
                          )
                        }
                        className="w-full border border-slate-200 rounded-xl py-3 font-bold"
                      >
                        Open Company Inspector
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/admin-billing?company_id=${selected.company_id}`
                          )
                        }
                        className="w-full border border-slate-200 rounded-xl py-3 font-bold"
                      >
                        Open Tenant Billing
                      </button>
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <Detail
                        title="Activated At"
                        value={formatFullDate(
                          selected.activated_at
                        )}
                      />

                      <Detail
                        title="Deactivated At"
                        value={formatFullDate(
                          selected.deactivated_at
                        )}
                      />

                      <Detail
                        title="Company ID"
                        value={
                          selected.company_id
                        }
                      />
                    </div>

                    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <p className="font-bold text-amber-800">
                        Billing behavior
                      </p>

                      <p className="text-sm text-amber-700 mt-2">
                        Pausing an agent voids its current unbilled monthly charge.
                        Reactivating it restores the monthly subscription using
                        the stored agent price.
                      </p>
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

function Info({
  title,
  value,
}: any) {
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

function Mini({
  title,
  value,
}: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="font-bold mt-1 capitalize break-words">
        {value}
      </p>
    </div>
  );
}

function Detail({
  title,
  value,
}: any) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-b-0">
      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="font-bold mt-1 break-all">
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
  const active =
    value === "active";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
        active
          ? "bg-green-100 text-green-700"
          : "bg-slate-200 text-slate-600"
      }`}
    >
      {value}
    </span>
  );
}

function Alert({
  type,
  text,
}: any) {
  return (
    <div
      className={`mt-6 border rounded-2xl p-4 ${
        type === "error"
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-green-50 border-green-200 text-green-700"
      }`}
    >
      {text}
    </div>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-500">
      {text}
    </div>
  );
}

function money(
  value: any
) {
  return `$${moneyNumber(
    value
  )}`;
}

function moneyNumber(
  value: any
) {
  return Number(
    value || 0
  ).toFixed(2);
}

function formatDate(
  value?: string | null
) {
  if (!value) return "Not recorded";

  return new Date(
    value
  ).toLocaleDateString();
}

function formatFullDate(
  value?: string | null
) {
  if (!value) return "Not recorded";

  return new Date(
    value
  ).toLocaleString();
}
