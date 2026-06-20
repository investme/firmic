import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getCompanies, getCompanyDocuments } from "../services/api";

export default function CompanyWorkspace() {
  const router = useRouter();
  const { id } = router.query;

  const [company, setCompany] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadWorkspace = async () => {
      try {
        const companies = await getCompanies();
        const selectedCompany = companies.find((c: any) => c.id === id);
        setCompany(selectedCompany);

        const docs = await getCompanyDocuments(String(id));
        setDocuments(docs);
      } catch (err) {
        console.error("Failed to load workspace:", err);
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
  }, [id]);

  if (loading) {
    return <div className="p-8">Loading workspace...</div>;
  }

  if (!company) {
    return <div className="p-8">Company not found.</div>;
  }

  return (
    <div className={`min-h-screen p-8 ${darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <div className="mx-auto max-w-7xl space-y-8">
        <div className={`rounded-3xl border p-8 shadow-xl ${darkMode ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"}`}>
          <div className="flex justify-between gap-6">
            <div>
              <p className="text-sm text-blue-500">Virtual Office Workspace</p>
              <h1 className="mt-3 text-4xl font-bold">{company.name}</h1>
              <p className="mt-2 text-slate-500">Office ID: {company.id}</p>
              <p className="mt-1 text-slate-500">Status: {company.status}</p>
            </div>

            <div className="flex gap-3">
              <a href="/companies" className="rounded-xl border px-5 py-3">
                Companies
              </a>

              <a href="/documents" className="rounded-xl border px-5 py-3">
                Documents
              </a>

              <button onClick={() => setDarkMode(!darkMode)} className="rounded-xl border px-5 py-3">
                {darkMode ? "☀️ Light" : "🌙 Dark"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card title="Documents" value={documents.length} darkMode={darkMode} />
          <Card title="Tasks" value="Soon" darkMode={darkMode} />
          <Card title="Workflows" value="Soon" darkMode={darkMode} />
          <Card title="Agent" value="Sonny" darkMode={darkMode} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel title="Documents" darkMode={darkMode}>
            {documents.length === 0 ? (
              <p className="text-slate-500">No documents yet.</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="rounded-xl border p-4">
                    <p className="font-semibold">{doc.name}</p>
                    <p className="text-sm text-slate-500">Type: {doc.type}</p>
                    <p className="text-sm text-slate-500">Status: {doc.status}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Sonny Office Agent" darkMode={darkMode}>
            <p className="text-slate-500">
              Sonny will monitor documents, tasks, workflows, renewals, and company operations for this virtual office.
            </p>

            <div className="mt-4 rounded-xl border p-4">
              Suggested next action: create onboarding workflow.
            </div>
          </Panel>

          <Panel title="Tasks" darkMode={darkMode}>
            <p className="text-slate-500">Tasks module coming next.</p>
          </Panel>

          <Panel title="Workflows" darkMode={darkMode}>
            <p className="text-slate-500">Workflow engine coming next.</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, darkMode }: any) {
  return (
    <div className={`rounded-2xl border p-5 ${darkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"}`}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Panel({ title, children, darkMode }: any) {
  return (
    <div className={`rounded-2xl border p-6 ${darkMode ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"}`}>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}