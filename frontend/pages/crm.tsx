import { useEffect, useMemo, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import { getActiveWorkspace, getWorkspaceChangedEventName } from "../src/utils/workspaceContext";
import { readCompanyStorage, writeCompanyStorage } from "../src/utils/companyStorage";

type Lead = { id: string; name: string; company: string; stage: string; value: number };
const stages = ["New Lead", "Qualified", "Proposal Sent", "Won"];

export default function CRM() {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", value: "0" });

  useEffect(() => {
    const sync = () => setWorkspace(getActiveWorkspace());
    sync();
    window.addEventListener(getWorkspaceChangedEventName(), sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(getWorkspaceChangedEventName(), sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const stored = workspace?.id ? readCompanyStorage<Lead[]>("crm_opportunities", []) : [];
    setLeads(stored);
    setSelectedId(stored[0]?.id || null);
  }, [workspace?.id]);

  const selected = leads.find((lead) => lead.id === selectedId) || null;
  const pipelineValue = useMemo(() => leads.reduce((sum, lead) => sum + lead.value, 0), [leads]);
  const wonValue = useMemo(() => leads.filter((lead) => lead.stage === "Won").reduce((sum, lead) => sum + lead.value, 0), [leads]);

  function persist(next: Lead[]) {
    writeCompanyStorage("crm_opportunities", next);
    setLeads(next);
  }

  function addLead() {
    if (!form.name.trim() || !form.company.trim()) return;
    const lead: Lead = { id: crypto.randomUUID(), name: form.name.trim(), company: form.company.trim(), stage: "New Lead", value: Number(form.value) || 0 };
    persist([...leads, lead]);
    setSelectedId(lead.id);
    setForm({ name: "", company: "", value: "0" });
    setShowForm(false);
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />
        <main className="flex-1 p-6 xl:p-8">
          <header className="flex justify-between gap-4">
            <div><p className="text-sm font-bold text-violet-700">Sales Hub</p><h1 className="text-3xl font-bold mt-1">Sales pipeline for {workspace?.name || "Active Company"}.</h1><p className="text-slate-500 mt-2">New workspaces begin with no leads or revenue.</p></div>
            <button onClick={() => setShowForm(true)} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold h-fit">+ Add Opportunity</button>
          </header>

          {showForm && <section className="mt-6 bg-white border border-slate-200 rounded-3xl p-6"><div className="grid md:grid-cols-3 gap-4"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contact name" className="border rounded-xl p-3"/><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Customer company" className="border rounded-xl p-3"/><input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Deal value" className="border rounded-xl p-3"/></div><div className="flex gap-3 mt-4"><button onClick={addLead} className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold">Save</button><button onClick={() => setShowForm(false)} className="border px-5 py-3 rounded-xl font-bold">Cancel</button></div></section>}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8"><Stat title="Active Opportunities" value={String(leads.length)} icon="👥"/><Stat title="Pipeline Value" value={`$${pipelineValue}`} icon="💰"/><Stat title="Closed Revenue" value={`$${wonValue}`} icon="🏆"/><Stat title="AI Automations" value="0" icon="🤖"/></section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
            <div className="bg-white border rounded-3xl p-6"><h2 className="text-xl font-bold">Revenue Pipeline</h2>{leads.length === 0 ? <p className="mt-5 text-slate-500">No opportunities yet.</p> : <div className="grid md:grid-cols-4 gap-4 mt-5">{stages.map((stage) => <div key={stage} className="bg-slate-50 border rounded-2xl p-4"><h3 className="font-bold text-sm">{stage}</h3><div className="space-y-3 mt-4">{leads.filter((lead) => lead.stage === stage).map((lead) => <button key={lead.id} onClick={() => setSelectedId(lead.id)} className={`w-full text-left bg-white border rounded-2xl p-4 ${selectedId === lead.id ? "border-violet-500" : ""}`}><p className="font-bold">{lead.company}</p><p className="text-xs text-slate-500">{lead.name}</p><p className="font-bold mt-2">${lead.value}</p></button>)}</div></div>)}</div>}</div>
            <div className="bg-white border rounded-3xl p-6"><h2 className="text-xl font-bold">Selected Opportunity</h2>{selected ? <div className="mt-5 bg-slate-50 border rounded-2xl p-5"><h3 className="text-xl font-bold">{selected.company}</h3><p className="text-slate-500 mt-1">{selected.name}</p><p className="font-bold mt-4">${selected.value}</p></div> : <p className="mt-5 text-slate-500">No opportunity selected.</p>}</div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Stat({ title, value, icon }: { title: string; value: string; icon: string }) { return <div className="bg-white border rounded-3xl p-5"><div className="text-3xl">{icon}</div><p className="text-sm text-slate-500 mt-3">{title}</p><p className="text-2xl font-bold">{value}</p></div>; }
