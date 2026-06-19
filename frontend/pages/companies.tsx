import { useEffect, useState } from "react";
import { getCompanies } from "../services/api";

export default function Companies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await getCompanies();

        setCompanies(res.companies || res);
      } catch (error) {
        console.error("Failed to load companies:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">
            Companies
          </h1>

          <p className="text-slate-500 mt-2">
            Manage all companies created through Firmic.
          </p>
        </div>

        <a
          href="/create-company"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium transition"
        >
          + New Company
        </a>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
          Loading companies...
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold mb-2">
            No companies found
          </h2>

          <p className="text-slate-500">
            Create your first company to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {companies.map((c: any) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {c.name}
                  </h2>

                  <p className="text-slate-500 mt-1">
                    Status: {c.status}
                  </p>

                  <p className="text-xs text-slate-400 mt-2 break-all">
                    ID: {c.id}
                  </p>
                </div>

                <div>
                  <a
                    href={`/dashboard?company_id=${c.id}`}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
                  >
                    Open Dashboard
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}