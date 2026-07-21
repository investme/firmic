import { useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import { getActiveWorkspace, getWorkspaceChangedEventName } from "../src/utils/workspaceContext";
import { readCompanyStorage, writeCompanyStorage } from "../src/utils/companyStorage";

const catalog = [
  ["OpenAI", "Powers Sonny, Hermes, and AI workforce reasoning.", "🤖"],
  ["Microsoft 365", "Email, Teams, storage, and mailboxes.", "💼"],
  ["Zoom", "Meeting Center conferencing.", "🎥"],
  ["HubSpot", "CRM and sales automation.", "📊"],
  ["Slack", "Internal communication and alerts.", "💬"],
  ["QuickBooks", "Accounting and invoicing.", "📒"],
];

export default function Integrations() {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [connected, setConnected] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setWorkspace(getActiveWorkspace());
    sync();
    window.addEventListener(getWorkspaceChangedEventName(), sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(getWorkspaceChangedEventName(), sync); window.removeEventListener("storage", sync); };
  }, []);

  useEffect(() => {
    setConnected(workspace?.id ? readCompanyStorage<string[]>("integrations", []) : []);
  }, [workspace?.id]);

  function toggle(name: string) {
    const next = connected.includes(name) ? connected.filter((item) => item !== name) : [...connected, name];
    writeCompanyStorage("integrations", next);
    setConnected(next);
  }

  return <ProtectedRoute><div className="min-h-screen bg-slate-50 flex"><FirmicSidebar /><main className="flex-1 p-6 xl:p-8"><header><p className="text-sm font-bold text-violet-700">Integrations</p><h1 className="text-3xl font-bold mt-1">Integrations for {workspace?.name || "Active Company"}.</h1><p className="text-slate-500 mt-2">New workspaces begin with no external integrations connected.</p></header><section className="grid md:grid-cols-4 gap-5 mt-8"><Stat title="Connected" value={String(connected.length)} icon="🔗"/><Stat title="Available" value={String(catalog.length - connected.length)} icon="⚡"/><Stat title="Sync Health" value={connected.length ? "100%" : "—"} icon="✅"/><Stat title="Last Sync" value={connected.length ? "Now" : "Never"} icon="🔄"/></section><section className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">{catalog.map(([name, desc, icon]) => { const active = connected.includes(name); return <article key={name} className="bg-white border rounded-3xl p-6"><div className="flex justify-between"><div className="h-14 w-14 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl">{icon}</div><span className={`px-3 py-1 rounded-full text-xs font-bold ${active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{active ? "Connected" : "Available"}</span></div><h3 className="text-xl font-bold mt-5">{name}</h3><p className="text-sm text-slate-500 mt-2 min-h-[45px]">{desc}</p><button onClick={() => toggle(name)} className={`w-full mt-6 py-3 rounded-xl font-bold ${active ? "border border-red-200 text-red-600" : "bg-violet-600 text-white"}`}>{active ? "Disconnect" : "Connect"}</button></article>; })}</section></main></div></ProtectedRoute>;
}
function Stat({ title, value, icon }: { title: string; value: string; icon: string }) { return <div className="bg-white border rounded-3xl p-5"><div className="text-3xl">{icon}</div><p className="text-sm text-slate-500 mt-3">{title}</p><p className="text-2xl font-bold">{value}</p></div>; }
