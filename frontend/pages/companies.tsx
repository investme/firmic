import { useEffect, useMemo, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import {
  getCompanies,
  getCompany,
  terminateCompany,
} from "../services/companyApi";
import ProtectedRoute from "../components/ProtectedRoute";
import {
  clearActiveWorkspace,
  getActiveWorkspace,
  saveActiveWorkspace,
} from "../src/utils/workspaceContext";

type Company = {
  id: string | number;
  name?: string;
  status?: string;
  jurisdiction?: string;
  plan?: string;
  industry?: string;
  headquarters?: {
    office_code?: string;
    location?: string;
    phone?: string;
    monthly_price_usd?: number;
  } | null;
};

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      setError("");

      const data = await getCompanies();
      const safeCompanies = Array.isArray(data) ? data : [];
      const visibleCompanies = safeCompanies.filter(
        (company) =>
          (company.status || "").toLowerCase() !== "terminated"
      );

      setCompanies(visibleCompanies);

      const currentWorkspace = getActiveWorkspace();
      const selectedId = currentWorkspace?.id;

      let selectedCompany = selectedId
        ? visibleCompanies.find(
            (company) => String(company.id) === String(selectedId)
          )
        : undefined;

      if (!selectedCompany && visibleCompanies.length === 1) {
        selectedCompany = visibleCompanies[0];
      }

      if (!selectedCompany) {
        clearActiveWorkspace();
        setActiveCompanyId(null);
        return;
      }

      const freshCompany = await getCompany(String(selectedCompany.id));
      saveActiveWorkspace(freshCompany);
      setActiveCompanyId(String(freshCompany.id));
    } catch (err: any) {
      console.error("Failed to load companies:", err);
      setCompanies([]);
      setError(err?.message || "Failed to load company workspaces.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCompanyAsActive(company: Company) {
    const companyId = String(company.id);
    const freshCompany = await getCompany(companyId);

    saveActiveWorkspace(freshCompany);
    setActiveCompanyId(companyId);
  }

  async function openCompany(company: Company) {
    try {
      setError("");
      await saveCompanyAsActive(company);
      window.location.href = `/company?id=${company.id}`;
    } catch (err: any) {
      setError(err?.message || "Failed to open company.");
    }
  }

  async function setActiveCompany(company: Company) {
    try {
      setError("");
      await saveCompanyAsActive(company);
      setNotice(`${company.name || "Company"} is now the active company.`);

      window.setTimeout(() => {
        setNotice("");
      }, 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to select company.");
    }
  }

  async function handleTerminateCompany(company: Company) {
    const companyId = String(company.id);
    const companyName = company.name || "this company";

    const confirmed = window.confirm(
      `Terminate ${companyName}?\n\nThis will release its headquarters, stop active services, preserve company history, and remove it from the tenant workspace list.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setTerminatingId(companyId);
      setError("");
      setNotice("");

      await terminateCompany(companyId);

      const currentWorkspace = getActiveWorkspace();

      if (
        String(currentWorkspace?.id || "") === companyId
      ) {
        clearActiveWorkspace();
        setActiveCompanyId(null);
      }

      setNotice(
        `${companyName} was terminated successfully.`
      );

      await loadCompanies();
    } catch (err: any) {
      console.error("Failed to terminate company:", err);
      setError(
        err?.message ||
          "Failed to terminate company."
      );
    } finally {
      setTerminatingId(null);

      window.setTimeout(() => {
        setNotice("");
        setError("");
      }, 4000);
    }
  }

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return companies.filter((company) => {
      const name = company.name || "";
      const companyId = String(company.id || "");
      const status = company.status || "initiated";

      const matchesSearch =
        !normalizedSearch ||
        name.toLowerCase().includes(normalizedSearch) ||
        companyId.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [companies, search, statusFilter]);

  const activeCompanies = companies.filter(
    (company) => (company.status || "").toLowerCase() === "active"
  ).length;

  const initiatedCompanies = companies.filter(
    (company) =>
      !company.status ||
      company.status.toLowerCase() === "initiated"
  ).length;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Companies
              </p>

              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                Manage company workspaces.
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Create, select, and open company workspaces inside Firmic.
                The selected company becomes the active operating context
                across Command Center, Head Office, Sonny, Hermes, Billing,
                and Reports.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadCompanies}
                className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold hover:bg-slate-50 transition"
              >
                Refresh
              </button>

              <a
                href="/create-company"
                className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-violet-700 transition"
              >
                + Create Company
              </a>
            </div>
          </header>

          {notice && (
            <div className="mt-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 font-bold">
              {notice}
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 font-bold">
              {error}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat
              title="Total Companies"
              value={String(companies.length)}
              icon="🏢"
            />

            <Stat
              title="Active"
              value={String(activeCompanies)}
              icon="✅"
            />

            <Stat
              title="Initiated"
              value={String(initiatedCompanies)}
              icon="🚀"
            />

            <Stat
              title="Workspaces"
              value={String(companies.length)}
              icon="🧩"
            />
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mt-8">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search companies by name or ID..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-500"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
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
              Loading company workspaces...
            </div>
          )}

          {!loading && filteredCompanies.length === 0 && (
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-3xl p-6 shadow-sm text-yellow-700">
              No companies found. Create your first company workspace.
            </div>
          )}

          {!loading && filteredCompanies.length > 0 && (
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
              {filteredCompanies.map((company) => {
                const companyId = String(company.id);
                const status = company.status || "initiated";
                const isActive =
                  String(activeCompanyId || "") === companyId;

                return (
                  <article
                    key={companyId}
                    className={`bg-white border rounded-3xl p-6 shadow-sm transition ${
                      isActive
                        ? "border-violet-500 ring-2 ring-violet-100"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-violet-700 font-bold">
                          Company Workspace
                        </p>

                        <h2 className="text-2xl font-bold mt-2 break-words">
                          {company.name || "Unnamed Company"}
                        </h2>

                        <p className="text-sm text-slate-500 mt-2 break-all">
                          ID: {companyId}
                        </p>
                      </div>

                      <StatusBadge status={status} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <Mini
                        title="Jurisdiction"
                        value={company.jurisdiction || "Abu Dhabi"}
                      />

                      <Mini
                        title="Plan"
                        value={company.plan || "Premium"}
                      />

                      <Mini title="Sonny" value="Ready" />
                      <Mini
                        title="Headquarters"
                        value={
                          company.headquarters?.office_code ||
                          "Not Selected"
                        }
                      />
                    </div>

                    {isActive && (
                      <div className="mt-5 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-3 text-sm font-bold">
                        Active company
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <button
                        type="button"
                        onClick={() => openCompany(company)}
                        className="bg-violet-600 text-white rounded-xl py-3 font-bold hover:bg-violet-700 transition"
                      >
                        Open
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveCompany(company)}
                        disabled={isActive}
                        className="border border-slate-200 rounded-xl py-3 font-bold hover:bg-slate-50 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        {isActive ? "Selected" : "Set Active"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleTerminateCompany(company)
                        }
                        disabled={terminatingId === companyId}
                        className="col-span-2 border border-red-200 text-red-600 rounded-xl py-3 font-bold hover:bg-red-50 transition disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        {terminatingId === companyId
                          ? "Terminating..."
                          : "Terminate Company"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </main>
      </div>
    </ProtectedRoute>
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
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Mini({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center min-w-0">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold text-sm mt-1 truncate" title={value}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();

  const styles =
    normalizedStatus === "active"
      ? "bg-green-100 text-green-700"
      : normalizedStatus === "suspended"
      ? "bg-red-100 text-red-700"
      : "bg-violet-100 text-violet-700";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold capitalize shrink-0 ${styles}`}
    >
      {status}
    </span>
  );
}