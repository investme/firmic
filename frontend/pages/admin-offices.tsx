import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import AdminProtectedRoute from "../components/AdminProtectedRoute";
import {
  getAdminOffices,
} from "../services/adminApi";

export default function AdminOffices() {
  const [offices, setOffices] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  useEffect(() => {
    loadOffices();
  }, []);

  async function loadOffices() {
    try {
      setLoading(true);
      setError("");

      const data =
        await getAdminOffices();

      setOffices(
        Array.isArray(data) ? data : []
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load admin office inventory."
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredOffices = useMemo(() => {
    return offices.filter((office) => {
      const text = `${
        office.office_code || ""
      } ${office.location || ""} ${
        office.status || ""
      } ${office.company?.name || ""} ${
        office.company?.id || ""
      }`.toLowerCase();

      const matchesSearch =
        text.includes(
          search.toLowerCase()
        );

      const matchesStatus =
        statusFilter === "all" ||
        office.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    offices,
    search,
    statusFilter,
  ]);

  const available = offices.filter(
    (office) =>
      office.status === "available"
  ).length;

  const rented = offices.filter(
    (office) =>
      office.status === "rented"
  ).length;

  const reserved = offices.filter(
    (office) =>
      office.status === "reserved"
  ).length;

  const maintenance = offices.filter(
    (office) =>
      office.status === "maintenance"
  ).length;

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar active="Office Inventory" />

        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Firmic Admin
              </p>

              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                Office Inventory
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Live office inventory with exact
                company assignments from PostgreSQL.
              </p>
            </div>

            <button
              type="button"
              onClick={loadOffices}
              disabled={loading}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold disabled:bg-slate-300"
            >
              {loading
                ? "Refreshing..."
                : "Refresh Inventory"}
            </button>
          </header>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
              {error}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-5 gap-5 mt-8">
            <Stat
              title="Total Offices"
              value={String(offices.length)}
              icon="🏢"
            />

            <Stat
              title="Available"
              value={String(available)}
              icon="✅"
            />

            <Stat
              title="Rented"
              value={String(rented)}
              icon="🔒"
            />

            <Stat
              title="Reserved"
              value={String(reserved)}
              icon="📌"
            />

            <Stat
              title="Maintenance"
              value={String(maintenance)}
              icon="🛠️"
            />
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mt-8">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search office, location, tenant company, or ID..."
                className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
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
                <option value="all">
                  All Status
                </option>

                <option value="available">
                  Available
                </option>

                <option value="rented">
                  Rented
                </option>

                <option value="reserved">
                  Reserved
                </option>

                <option value="maintenance">
                  Maintenance
                </option>
              </select>
            </div>
          </section>

          {loading && (
            <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-500">
              Loading live office inventory...
            </div>
          )}

          {!loading &&
            filteredOffices.length === 0 && (
              <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-3xl p-6 text-yellow-700">
                No matching offices found.
              </div>
            )}

          {!loading &&
            filteredOffices.length > 0 && (
              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-8">
                <h2 className="text-xl font-bold">
                  Inventory Directory
                </h2>

                <div className="mt-5 space-y-3">
                  {filteredOffices.map(
                    (office) => (
                      <div
                        key={office.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 xl:grid-cols-[1fr_140px_220px_190px] gap-4 items-center"
                      >
                        <div>
                          <p className="font-bold text-lg">
                            Headquarters{" "}
                            {
                              office.office_code
                            }
                          </p>

                          <p className="text-sm text-slate-500 mt-1">
                            {office.location}
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            ${Number(
                              office.monthly_price_usd ||
                                0
                            ).toFixed(2)}
                            /month
                          </p>
                        </div>

                        <StatusBadge
                          status={office.status}
                        />

                        <div>
                          <p className="text-xs text-slate-500">
                            Assigned Company
                          </p>

                          <p className="font-bold mt-1">
                            {office.company
                              ?.name ||
                              "Not assigned"}
                          </p>

                          {office.company?.id && (
                            <p className="text-xs text-slate-500 break-all mt-1">
                              {
                                office.company
                                  .id
                              }
                            </p>
                          )}
                        </div>

                        {office.company ? (
                          <a
                            href={`/admin-companies?company_id=${office.company.id}`}
                            className="bg-violet-600 text-white px-4 py-3 rounded-xl font-bold text-center"
                          >
                            Open Company
                          </a>
                        ) : (
                          <span className="bg-white border border-slate-200 px-4 py-3 rounded-xl font-bold text-center text-slate-500">
                            Available
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>
              </section>
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

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    String(status || "").toLowerCase();

  const style =
    normalized === "rented"
      ? "bg-green-100 text-green-700"
      : normalized === "available"
      ? "bg-blue-100 text-blue-700"
      : normalized === "maintenance"
      ? "bg-red-100 text-red-700"
      : "bg-violet-100 text-violet-700";

  return (
    <span
      className={`w-fit px-3 py-1 rounded-full text-xs font-bold ${style}`}
    >
      {status}
    </span>
  );
}
