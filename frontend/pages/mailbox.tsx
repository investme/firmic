import { useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import { getActiveWorkspace, getWorkspaceChangedEventName } from "../src/utils/workspaceContext";
import { readCompanyStorage } from "../src/utils/companyStorage";

type MailItem = { id: string; type: string; from: string; status: string; date: string; icon: string };

export default function Mailbox() {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [mailItems, setMailItems] = useState<MailItem[]>([]);
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setWorkspace(getActiveWorkspace());
    sync();
    window.addEventListener(getWorkspaceChangedEventName(), sync);
    window.addEventListener("firmic-company-data-changed", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(getWorkspaceChangedEventName(), sync); window.removeEventListener("firmic-company-data-changed", sync); window.removeEventListener("storage", sync); };
  }, []);

  useEffect(() => {
    if (!workspace?.id) { setMailItems([]); setSelectedMailId(null); return; }
    const stored = readCompanyStorage<MailItem[]>("mail_items", []);
    setMailItems(stored); setSelectedMailId(stored[0]?.id || null);
  }, [workspace?.id]);

  const hq = workspace?.headquarters;
  const companyName = workspace?.name || "Active Company";
  const selected = mailItems.find((m) => m.id === selectedMailId) || null;
  const count = (status: string) => mailItems.filter((m) => m.status === status).length;
  const packages = mailItems.filter((m) => m.type.toLowerCase().includes("package")).length;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex"><FirmicSidebar />
        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><p className="text-sm font-bold text-violet-700">Digital Mailroom</p><h1 className="text-3xl font-bold mt-1">Manage mail for {companyName}.</h1><p className="text-slate-500 mt-2">Only mail received for this company appears here.</p></div><div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm"><p className="text-sm text-slate-500">Mailroom Address</p><p className="font-bold">Headquarters {hq?.office_code || "Not Selected"}</p><p className="text-xs text-slate-500">{hq?.location || "No headquarters selected"}</p></div></header>
          {!hq?.office_code && <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-3xl p-6 text-yellow-700">Activate a Headquarters before using the Digital Mailroom.</div>}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8"><Stat title="New Mail" value={String(count("New"))} icon="✉️" /><Stat title="Packages" value={String(packages)} icon="📦" /><Stat title="Scanned Items" value={String(count("Scanned"))} icon="📄" /><Stat title="Forwarded" value={String(count("Forwarded"))} icon="🚚" /></section>
          <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8"><div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"><h2 className="text-xl font-bold">Incoming Mail</h2>{mailItems.length === 0 ? <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-slate-500">No mail has been received for {companyName}.</div> : <div className="mt-5 space-y-3">{mailItems.map((m) => <button key={m.id} onClick={() => setSelectedMailId(m.id)} className={`w-full text-left rounded-2xl border p-4 ${selectedMailId === m.id ? "border-violet-500 bg-violet-50" : "border-slate-200 bg-slate-50"}`}><div className="flex justify-between"><div><p className="font-bold">{m.type}</p><p className="text-xs text-slate-500">From: {m.from}</p></div><span>{m.status}</span></div></button>)}</div>}</div><div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"><h2 className="text-xl font-bold">Selected Mail</h2>{selected ? <div className="mt-5 bg-slate-50 rounded-2xl p-5"><h3 className="font-bold">{selected.type}</h3><p className="text-sm text-slate-500 mt-1">From: {selected.from}</p></div> : <p className="mt-5 text-slate-500">No mail selected.</p>}</div></section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
function Stat({ title, value, icon }: { title: string; value: string; icon: string }) { return <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm"><div className="text-3xl">{icon}</div><p className="text-sm text-slate-500 mt-3">{title}</p><p className="text-2xl font-bold mt-1">{value}</p></div>; }
