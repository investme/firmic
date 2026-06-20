import { useEffect, useMemo, useState } from "react";
import { getDocuments } from "../services/api";

export default function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const docs = await getDocuments();
        setDocuments(docs);
      } catch (err) {
        console.error("Failed to load documents:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, []);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const searchText = `${doc.name} ${doc.company_id} ${doc.type}`.toLowerCase();
      const matchesSearch = searchText.includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || doc.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [documents, search, statusFilter]);

  return (
    <div className={`min-h-screen p-8 ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className={`rounded-3xl border p-8 shadow-xl ${darkMode ? "border-white/10 bg-slate-900" : "border-slate-200 bg-white"}`}>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-blue-500">Firmic Business OS</p>

              <h1 className="mt-3 text-4xl font-bold">
                Documents Command Center
              </h1>

              <p className="mt-3 max-w-2xl text-slate-500">
                Manage company files, licenses, certificates, contracts, and compliance documents.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/companies"
                className="rounded-xl border px-5 py-3 font-medium hover:bg-slate-100"
              >
                Companies
              </a>

              <a
                href="/create-company"
                className="rounded-xl border px-5 py-3 font-medium hover:bg-slate-100"
              >
                + Create Company
              </a>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className="rounded-xl border px-5 py-3 font-medium"
              >
                {darkMode ? "☀️ Light" : "🌙 Dark"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Stat title="Total Documents" value={documents.length} darkMode={darkMode} />
          <Stat title="Approved" value={documents.filter((d) => d.status === "approved").length} darkMode={darkMode} />
          <Stat title="Pending" value={documents.filter((d) => d.status === "pending").length} darkMode={darkMode} />
          <Stat title="Expired" value={documents.filter((d) => d.status === "expired").length} darkMode={darkMode} />
        </div>

        <div className={`rounded-2xl border p-5 flex flex-col gap-4 md:flex-row ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents, company ID, or type..."
            className={`w-full rounded-xl border px-4 py-3 outline-none ${darkMode ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-300"}`}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`rounded-xl border px-4 py-3 ${darkMode ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-300"}`}
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <EmptyBox text="Loading documents..." darkMode={darkMode} />
        ) : filteredDocuments.length === 0 ? (
          <EmptyBox text="No documents found." darkMode={darkMode} />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`rounded-2xl border p-6 shadow-lg ${darkMode ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"}`}
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{doc.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Company ID: {doc.company_id}
                    </p>
                  </div>

                  <StatusBadge status={doc.status} />
                </div>

                <div className="mt-6 space-y-2 text-sm text-slate-500">
                  <p>Type: {doc.type}</p>
                  <p>Uploaded: {formatDate(doc.uploaded_at)}</p>
                  <p className="break-all">Document ID: {doc.id}</p>
                </div>

                <div className="mt-5 flex gap-3">
                  <button className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                    View
                  </button>

                  <button className="rounded-xl border px-4 py-2">
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ title, value, darkMode }: any) {
  return (
    <div className={`rounded-2xl border p-5 ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function EmptyBox({ text, darkMode }: any) {
  return (
    <div className={`rounded-2xl border p-8 ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
      {text}
    </div>
  );
}

function StatusBadge({ status }: any) {
  const styles: any = {
    approved: "bg-green-500/10 text-green-500",
    pending: "bg-yellow-500/10 text-yellow-500",
    expired: "bg-red-500/10 text-red-500",
    rejected: "bg-red-500/10 text-red-500",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs ${styles[status] || "bg-blue-500/10 text-blue-500"}`}>
      {status || "pending"}
    </span>
  );
}

function formatDate(date: string) {
  if (!date) return "Unknown";
  return new Date(date).toLocaleString();
}