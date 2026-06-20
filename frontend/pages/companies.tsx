import { useEffect, useMemo, useState } from "react";
import { getCompanies } from "../services/api";

export default function Companies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const data = await getCompanies();
        setCompanies(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchesSearch =
        company.name?.toLowerCase().includes(search.toLowerCase()) ||
        company.id?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        company.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [companies, search, statusFilter]);

  return (
    <div
      className={`min-h-screen p-8 ${
        darkMode
          ? "bg-slate-950 text-white"
          : "bg-slate-100 text-slate-900"
      }`}
    >
      <div className="mx-auto max-w-7xl space-y-8">

        {/* HERO */}
        <div
          className={`rounded-3xl border p-8 shadow-xl ${
            darkMode
              ? "bg-slate-900 border-white/10"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-blue-500">
                Firmic Business OS
              </p>

              <h1 className="mt-3 text-4xl font-bold">
                Companies Command Center
              </h1>

              <p className="mt-3 text-slate-500">
                Manage all virtual offices and client companies.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <a
                href="/documents"
                className="rounded-xl border px-5 py-3"
              >
                Documents
              </a>

              <a
                href="/create-company"
                className="rounded-xl bg-blue-600 px-5 py-3 text-white"
              >
                + Create Company
              </a>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="rounded-xl border px-5 py-3"
              >
                {darkMode ? "☀️ Light" : "🌙 Dark"}
              </button>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title="Companies"
            value={companies.length}
            darkMode={darkMode}
          />

          <StatCard
            title="Active"
            value={
              companies.filter(
                (c) => c.status === "active"
              ).length
            }
            darkMode={darkMode}
          />

          <StatCard
            title="Initiated"
            value={
              companies.filter(
                (c) => c.status === "initiated"
              ).length
            }
            darkMode={darkMode}
          />

          <StatCard
            title="Virtual Offices"
            value={companies.length}
            darkMode={darkMode}
          />
        </div>

        {/* FILTERS */}
        <div
          className={`rounded-2xl border p-5 flex flex-col md:flex-row gap-4 ${
            darkMode
              ? "bg-white/5 border-white/10"
              : "bg-white border-slate-200"
          }`}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies..."
            className={`w-full rounded-xl border px-4 py-3 ${
              darkMode
                ? "bg-slate-900 border-white/10"
                : "bg-white border-slate-300"
            }`}
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            className={`rounded-xl border px-4 py-3 ${
              darkMode
                ? "bg-slate-900 border-white/10"
                : "bg-white border-slate-300"
            }`}
          >
            <option value="all">All Status</option>
            <option value="initiated">Initiated</option>
            <option value="active">Active</option>
          </select>
        </div>

        {/* COMPANY CARDS */}
        {loading ? (
          <div>Loading companies...</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredCompanies.map((company) => (
              <div
                key={company.id}
                className={`rounded-2xl border p-6 shadow-lg ${
                  darkMode
                    ? "bg-slate-900 border-white/10"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {company.name}
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                      Virtual Office
                    </p>
                  </div>

                  <StatusBadge
                    status={company.status}
                  />
                </div>

                <div className="mt-6 space-y-2 text-sm text-slate-500">
                  <p>Office ID</p>
                  <p className="break-all">
                    {company.id}
                  </p>
                </div>

                <div className="mt-5 flex gap-3">
                  <a
                    href={`/company?id=${company.id}`}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-center text-white"
                  >
                    Open Workspace →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  darkMode,
}: any) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        darkMode
          ? "bg-white/5 border-white/10"
          : "bg-white border-slate-200"
      }`}
    >
      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: any) {
  return (
    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-500">
      {status}
    </span>
  );
}