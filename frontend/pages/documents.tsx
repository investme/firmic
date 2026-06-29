import { useEffect, useMemo, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import {
  getDocuments,
  createDocument,
  deleteDocument,
} from "../services/documentApi";
import ProtectedRoute from "../components/ProtectedRoute";

export default function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [name, setName] = useState("");
  const [type, setType] = useState("General");
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      setLoading(true);
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateDocument() {
    try {
      const companyId = localStorage.getItem("company_id");

      if (!companyId) {
        alert("Select or create a company first.");
        return;
      }

      if (!name.trim()) {
        alert("Document name is required.");
        return;
      }

      setCreating(true);

      await createDocument({
        company_id: companyId,
        name,
        type,
        status,
      });

      setName("");
      setType("General");
      setStatus("pending");

      await loadDocuments();
    } catch (err: any) {
      alert(err.message || "Failed to create document");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    if (!confirm("Delete this document?")) return;

    try {
      await deleteDocument(documentId);
      await loadDocuments();
    } catch (err: any) {
      alert(err.message || "Failed to delete document");
    }
  }

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const searchText = `${doc.name || ""} ${doc.company_id || ""} ${
        doc.type || ""
      }`.toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || doc.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [documents, search, statusFilter]);

  const approvedCount = documents.filter(
    (doc) => doc.status === "approved"
  ).length;

  const pendingCount = documents.filter(
    (doc) => doc.status === "pending"
  ).length;

  const expiredCount = documents.filter(
    (doc) => doc.status === "expired"
  ).length;

  return (
     <ProtectedRoute>
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Documents" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Documents</h1>

            <p className="text-slate-500 mt-1">
              Manage licenses, certificates, contracts, KYB files, and
              compliance documents.
            </p>
          </div>

          <button
            onClick={loadDocuments}
            className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold"
          >
            Refresh Documents
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="Total Documents" value={String(documents.length)} icon="📄" />
          <Stat title="Approved" value={String(approvedCount)} icon="✅" />
          <Stat title="Pending" value={String(pendingCount)} icon="⏳" />
          <Stat title="Expired" value={String(expiredCount)} icon="⚠️" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search documents, company ID, or type..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-500"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-500"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {loading && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-500">
                Loading documents from backend...
              </div>
            )}

            {!loading && filteredDocuments.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-3xl p-6 shadow-sm text-yellow-700">
                No documents found.
              </div>
            )}

            {!loading && filteredDocuments.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="text-sm text-violet-700 font-bold">
                          Document
                        </p>

                        <h2 className="text-xl font-bold mt-2">{doc.name}</h2>

                        <p className="mt-1 text-sm text-slate-500 break-all">
                          Company ID: {doc.company_id}
                        </p>
                      </div>

                      <StatusBadge status={doc.status || "pending"} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <Mini title="Type" value={doc.type || "General"} />
                      <Mini
                        title="Uploaded"
                        value={formatDate(doc.uploaded_at)}
                      />
                      <Mini title="Status" value={doc.status || "pending"} />
                      <Mini title="File" value={doc.file_path ? "Attached" : "None"} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <button className="bg-violet-600 text-white rounded-xl py-3 font-bold">
                        View
                      </button>

                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="border border-red-200 text-red-600 rounded-xl py-3 font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Document Intelligence</h2>

              <p className="text-violet-100 text-sm mt-2">
                Hermes uses company documents to calculate compliance readiness,
                identify missing files, and recommend next actions.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <DarkMini title="Docs" value={String(documents.length)} />
                <DarkMini title="Pending" value={String(pendingCount)} />
                <DarkMini title="Approved" value={String(approvedCount)} />
                <DarkMini title="Expired" value={String(expiredCount)} />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Add Document</h2>

              <div className="space-y-4 mt-5">
                <div>
                  <label className="text-sm font-semibold">Document Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Trade License"
                    className="w-full mt-2 border border-slate-200 rounded-xl p-3 outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full mt-2 border border-slate-200 rounded-xl p-3 outline-none focus:border-violet-500"
                  >
                    <option>General</option>
                    <option>Trade License</option>
                    <option>KYB</option>
                    <option>Contract</option>
                    <option>Invoice</option>
                    <option>Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full mt-2 border border-slate-200 rounded-xl p-3 outline-none focus:border-violet-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="expired">Expired</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <button
                  onClick={handleCreateDocument}
                  disabled={creating}
                  className="w-full bg-violet-600 text-white py-3 rounded-xl font-bold disabled:bg-slate-300"
                >
                  {creating ? "Creating..." : "Create Document"}
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Recommended Documents</h2>

              <div className="space-y-3 mt-5">
                <Recommendation text="Trade License" />
                <Recommendation text="Virtual Office Agreement" />
                <Recommendation text="Beneficial Owner Declaration" />
                <Recommendation text="KYB Document Package" />
              </div>
            </div>
          </div>
        </section>
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

function DarkMini({ title, value }: any) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 text-center">
      <p className="text-xs text-violet-100">{title}</p>
      <p className="font-bold text-xl">{value}</p>
    </div>
  );
}

function Recommendation({ text }: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
      <span className="font-semibold">{text}</span>
      <span className="text-violet-700 font-bold">Add</span>
    </div>
  );
}

function StatusBadge({ status }: any) {
  const styles: any = {
    approved: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    expired: "bg-red-100 text-red-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold ${
        styles[status] || "bg-violet-100 text-violet-700"
      }`}
    >
      {status}
    </span>
  );
}

function formatDate(date: string) {
  if (!date) return "Unknown";
  return new Date(date).toLocaleDateString();
}