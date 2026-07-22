import { useEffect, useMemo, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import AdminProtectedRoute from "../components/AdminProtectedRoute";
import { getAdminModuleSummary } from "../services/adminApi";

type ComplianceItem = {
  id: string;
  company: string;
  lifecycleStatus: string;
  headquarters: string;
  status: "Review Needed" | "Pending";
  issue: string;
  priority: "High" | "Medium";
};

export default function AdminCompliance() {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminModuleSummary("compliance");
      const companies = Array.isArray(data?.companies)
        ? data.companies
        : [];

      /*
       * These are honest lifecycle-based queue states.
       * No invented compliance score is displayed until
       * a real compliance record exists in PostgreSQL.
       */
      const nextItems: ComplianceItem[] = companies
        .filter(
          (company: any) =>
            String(company.status || "").toLowerCase() !== "terminated"
        )
        .map((company: any) => {
          const hasHeadquarters = Boolean(
            company?.headquarters?.office_code
          );

          return {
            id: String(company.id),
            company: company.name,
            lifecycleStatus: company.status || "initiated",
            headquarters:
              company?.headquarters?.office_code || "Not selected",
            status: hasHeadquarters ? "Pending" : "Review Needed",
            issue: hasHeadquarters
              ? "Compliance record has not yet been created."
              : "Headquarters activation and compliance onboarding are pending.",
            priority: hasHeadquarters ? "Medium" : "High",
          };
        });

      setItems(nextItems);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load the compliance queue."
      );
    } finally {
      setLoading(false);
    }
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return items;

    return items.filter((item) =>
      [
        item.company,
        item.lifecycleStatus,
        item.headquarters,
        item.status,
        item.issue,
        item.priority,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [items, search]);

  const highPriority = items.filter(
    (item) => item.priority === "High"
  ).length;

  const reviewNeeded = items.filter(
    (item) => item.status === "Review Needed"
  ).length;

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar active="Compliance Queue" />

        <main className="flex-1 p-6 xl:p-8 min-w-0">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Firmic Admin
              </p>

              <h1 className="text-3xl font-bold mt-1">
                Compliance Queue
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Live tenant lifecycle records awaiting real Hermes and KYB
                synchronization. No fictional compliance scores are shown.
              </p>
            </div>

            <button
              type="button"
              onClick={loadQueue}
              disabled={loading}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold disabled:bg-slate-300"
            >
              {loading ? "Refreshing..." : "Refresh Queue"}
            </button>
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
            <Stat title="Queue Items" value={String(items.length)} icon="🛡️" />
            <Stat title="High Priority" value={String(highPriority)} icon="⚠️" />
            <Stat title="Review Needed" value={String(reviewNeeded)} icon="🔎" />
            <Stat title="Real Scores Available" value="0" icon="✅" />
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mt-8">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company, headquarters, lifecycle, or priority..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
            />
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold">
                Hermes Review Foundation
              </h2>

              <span className="text-xs font-bold bg-violet-100 text-violet-700 rounded-full px-3 py-1">
                PostgreSQL lifecycle data
              </span>
            </div>

            {loading ? (
              <p className="mt-5 text-slate-500">
                Loading compliance queue...
              </p>
            ) : filteredItems.length === 0 ? (
              <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-500">
                No non-terminated companies match this search.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 lg:grid-cols-[1fr_150px_150px_250px] gap-4 items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-lg">
                        {item.company}
                      </p>

                      <p className="text-sm text-slate-500 mt-1">
                        {item.issue}
                      </p>

                      <p className="text-xs text-slate-400 mt-2 break-all">
                        {item.id}
                      </p>
                    </div>

                    <Info
                      title="Headquarters"
                      value={item.headquarters}
                    />

                    <div>
                      <p className="text-xs text-slate-500">
                        Priority
                      </p>

                      <Priority
                        priority={item.priority}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          showNotice(
                            `Compliance record for ${item.company} will open when Hermes synchronization is implemented.`
                          )
                        }
                        className="bg-violet-600 text-white rounded-xl py-3 font-bold"
                      >
                        Review
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          showNotice(
                            `Document request workflow for ${item.company} is queued for the synchronization phase.`
                          )
                        }
                        className="border border-slate-200 bg-white rounded-xl py-3 font-bold"
                      >
                        Request Docs
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
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
      <p className="text-2xl font-bold mt-1">{value}</p>
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

function Priority({ priority }: { priority: "High" | "Medium" }) {
  const style =
    priority === "High"
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <span
      className={`inline-flex mt-1 px-3 py-1 rounded-full text-xs font-bold ${style}`}
    >
      {priority}
    </span>
  );
}
