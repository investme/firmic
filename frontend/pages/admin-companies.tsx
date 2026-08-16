import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import AdminProtectedRoute from "../components/AdminProtectedRoute";
import {
  deleteAdminCompany,
  getAdminCompanies,
  restoreAdminCompany,
  terminateAdminCompany,
} from "../services/adminApi";

export default function AdminCompanies() {
  const [companies, setCompanies] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busyId, setBusyId] =
    useState("");

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      setError("");

      const data =
        await getAdminCompanies();

      setCompanies(
        Array.isArray(data) ? data : []
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load companies."
      );
    } finally {
      setLoading(false);
    }
  }

  async function runAction(
    company: any,
    action:
      | "terminate"
      | "restore"
      | "delete"
  ) {
    const confirmation =
      action === "delete"
        ? `Permanently delete ${company.name}? This cannot be undone.`
        : action === "terminate"
        ? `Terminate ${company.name}? Its Headquarters will be released.`
        : `Restore ${company.name} to initiated status?`;

    if (!confirm(confirmation)) {
      return;
    }

    if (action === "delete") {
      const typed = prompt(
        `Type DELETE ${company.name} to confirm permanent deletion.`
      );

      if (
        typed !== `DELETE ${company.name}`
      ) {
        setError(
          "Permanent deletion cancelled because the confirmation text did not match."
        );
        return;
      }
    }

    try {
      setBusyId(company.id);
      setError("");
      setNotice("");

      if (action === "terminate") {
        await terminateAdminCompany(
          company.id
        );
      } else if (action === "restore") {
        await restoreAdminCompany(
          company.id
        );
      } else {
        await deleteAdminCompany(
          company.id
        );
      }

      setNotice(
        `${company.name}: ${action} completed successfully.`
      );

      await loadCompanies();
    } catch (err: any) {
      setError(
        err?.message ||
          `Failed to ${action} company.`
      );
    } finally {
      setBusyId("");
    }
  }

  const filtered = useMemo(() => {
    return companies.filter((company) => {
      const text = [
        company.name,
        company.id,
        company.user_id,
        company.status,
        company.owner?.full_name || "",
        company.owner?.email || "",
        company.owner?.role || "",
        company.headquarters?.office_code || "",
      ]
        .join(" ")
        .toLowerCase();

      return (
        text.includes(
          search.toLowerCase()
        ) &&
        (
          statusFilter === "all" ||
          company.status === statusFilter
        )
      );
    });
  }, [
    companies,
    search,
    statusFilter,
  ]);

  const count = (status: string) =>
    companies.filter(
      (company) =>
        company.status === status
    ).length;

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar active="All Companies" />

        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Firmic Admin
              </p>

              <h1 className="text-3xl font-bold mt-1">
                Company Lifecycle Control
              </h1>

              <p className="text-slate-500 mt-2">
                Terminate, restore, and safely delete obsolete tenant companies.
              </p>
            </div>

            <button
              onClick={loadCompanies}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold"
            >
              Refresh Companies
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

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat title="Total" value={companies.length} icon="🏢" />
            <Stat title="Active" value={count("active")} icon="✅" />
            <Stat title="Initiated" value={count("initiated")} icon="🚀" />
            <Stat title="Terminated" value={count("terminated")} icon="⛔" />
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mt-8">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search company, ID, user, office, or status..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="border border-slate-200 rounded-xl px-4 py-3"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="initiated">Initiated</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </section>

          {loading ? (
            <div className="mt-8 bg-white rounded-3xl p-6 border border-slate-200">
              Loading companies...
            </div>
          ) : (
            <section className="mt-8 space-y-4">
              {filtered.map((company) => {
                const busy =
                  busyId === company.id;

                return (
                  <article
                    key={company.id}
                    className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm"
                  >
                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_150px_180px_420px] gap-5 items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold">
                            {company.name}
                          </h2>

                          <Badge
                            status={company.status}
                          />
                        </div>

                        <p className="text-xs text-slate-500 break-all mt-2">
                          Company: {company.id}
                        </p>

                        <p className="text-xs text-slate-500 break-all mt-1">
                          Tenant user: {company.user_id}
                        </p>

                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-xs font-bold text-slate-700">
                            Owner: {company.owner?.full_name || "Not resolved"}
                          </p>

                          <p className="text-xs text-slate-500 break-all mt-1">
                            {company.owner?.email || "No owner email"}
                          </p>
                        </div>
                      </div>

                      <Info
                        title="Headquarters"
                        value={
                          company.headquarters?.office_code ||
                          "None"
                        }
                      />

                      <Info
                        title="Location"
                        value={
                          company.headquarters?.location ||
                          "Not assigned"
                        }
                      />

                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                        <a
                          href={`/admin-company?company_id=${company.id}`}
                          className="bg-violet-600 text-white rounded-xl py-3 px-3 font-bold text-center"
                        >
                          View
                        </a>

                        {company.status !== "terminated" ? (
                          <button
                            disabled={busy}
                            onClick={() =>
                              runAction(
                                company,
                                "terminate"
                              )
                            }
                            className="border border-red-200 text-red-600 rounded-xl py-3 px-3 font-bold disabled:opacity-50"
                          >
                            Terminate
                          </button>
                        ) : (
                          <>
                            <button
                              disabled={busy}
                              onClick={() =>
                                runAction(
                                  company,
                                  "restore"
                                )
                              }
                              className="border border-green-200 text-green-700 rounded-xl py-3 px-3 font-bold disabled:opacity-50"
                            >
                              Restore
                            </button>

                            <button
                              disabled={busy}
                              onClick={() =>
                                runAction(
                                  company,
                                  "delete"
                                )
                              }
                              className="bg-red-600 text-white rounded-xl py-3 px-3 font-bold disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </main>
      </div>
    </AdminProtectedRoute>
  );
}

function Stat({ title, value, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function Badge({ status }: any) {
  const style =
    status === "active"
      ? "bg-green-100 text-green-700"
      : status === "terminated"
      ? "bg-red-100 text-red-700"
      : "bg-violet-100 text-violet-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${style}`}>
      {status}
    </span>
  );
}

function Info({ title, value }: any) {
  return (
    <div>
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold text-sm mt-1 break-words">{value}</p>
    </div>
  );
}

function Alert({ text, type }: any) {
  return (
    <div className={`mt-6 rounded-2xl p-4 border ${
      type === "error"
        ? "bg-red-50 border-red-200 text-red-700"
        : "bg-green-50 border-green-200 text-green-700"
    }`}>
      {text}
    </div>
  );
}
