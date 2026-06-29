import { useEffect, useMemo, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import { getCompanies } from "../services/companyApi";
import ProtectedRoute from "../components/ProtectedRoute";

export default function Companies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);

      const data = await getCompanies();
      setCompanies(data);
    } catch (err) {
      console.error("Failed to load companies:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const name = company.name || "";
      const id = String(company.id || "");
      const status = company.status || "initiated";

      const matchesSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        id.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [companies, search, statusFilter]);

  function openCompany(companyId: string) {
    localStorage.setItem("company_id", String(companyId));
    window.location.href = `/company?id=${companyId}`;
  }

  function setActiveCompany(companyId: string) {
    localStorage.setItem("company_id", String(companyId));
    alert("Active company selected.");
  }

  const activeCompanies = companies.filter(
    (company) => company.status === "active"
  ).length;

  const initiatedCompanies = companies.filter(
    (company) => company.status === "initiated"
  ).length;

  return (
     <ProtectedRoute>
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Companies" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              Companies
            </h1>

            <p className="text-slate-500 mt-1">
              Create, manage, and open client companies inside Firmic.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadCompanies}
              className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold"
            >
              Refresh
            </button>

            <a
              href="/create-company"
              className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold"
            >
              + Create Company
            </a>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="Total Companies" value={String(companies.length)} icon="🏢" />
          <Stat title="Active" value={String(activeCompanies)} icon="✅" />
          <Stat title="Initiated" value={String(initiatedCompanies)} icon="🚀" />
          <Stat title="Workspaces" value={String(companies.length)} icon="🧩" />
        </section>

        <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mt-8">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-500"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-500"
            >
              <option value="all">All Status</option>
              <option value="initiated">Initiated</option>
              <option value="active">Active</option>
            </select>
          </div>
        </section>

        {loading && (
          <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-500">
            Loading companies from backend...
          </div>
        )}

        {!loading && filteredCompanies.length === 0 && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-3xl p-6 shadow-sm text-yellow-700">
            No companies found. Create your first company.
          </div>
        )}

        {!loading && filteredCompanies.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
            {filteredCompanies.map((company) => {
              const status = company.status || "initiated";
              const activeId =
                typeof window !== "undefined"
                  ? localStorage.getItem("company_id")
                  : null;

              const isActive = String(activeId) === String(company.id);

              return (
                <div
                  key={company.id}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-sm text-violet-700 font-bold">
                        Company Workspace
                      </p>

                      <h2 className="text-2xl font-bold mt-2">
                        {company.name}
                      </h2>

                      <p className="text-sm text-slate-500 mt-2 break-all">
                        ID: {company.id}
                      </p>
                    </div>

                    <StatusBadge status={status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <Mini title="Office" value="Virtual" />
                    <Mini title="Plan" value="Premium" />
                    <Mini title="Sonny" value="Ready" />
                    <Mini title="Hermes" value="Monitoring" />
                  </div>

                  {isActive && (
                    <div className="mt-5 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-3 text-sm font-bold">
                      Active company
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <button
                      onClick={() => openCompany(company.id)}
                      className="bg-violet-600 text-white rounded-xl py-3 font-bold"
                    >
                      Open
                    </button>

                    <button
                      onClick={() => setActiveCompany(company.id)}
                      className="border border-slate-200 rounded-xl py-3 font-bold"
                    >
                      Set Active
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
    </ProtectedRoute>
  );
}

function Stat({ title, value, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Mini({ title, value }: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold text-sm mt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: any) {
  const styles =
    status === "active"
      ? "bg-green-100 text-green-700"
      : "bg-violet-100 text-violet-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles}`}>
      {status}
    </span>
  );
}