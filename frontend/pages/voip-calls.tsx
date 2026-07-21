import { useEffect, useMemo, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import { getActiveWorkspace, getWorkspaceChangedEventName } from "../src/utils/workspaceContext";
import { readCompanyStorage } from "../src/utils/companyStorage";

type CallRecord = { id: string; caller: string; status: string; handledBy: string; durationSeconds: number; type: string; transcript: string; time: string };

export default function VoipCalls() {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setWorkspace(getActiveWorkspace());
    sync();
    window.addEventListener(getWorkspaceChangedEventName(), sync);
    window.addEventListener("firmic-company-data-changed", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(getWorkspaceChangedEventName(), sync); window.removeEventListener("firmic-company-data-changed", sync); window.removeEventListener("storage", sync); };
  }, []);

  useEffect(() => {
    if (!workspace?.id) { setCalls([]); setSelectedCallId(null); return; }
    const stored = readCompanyStorage<CallRecord[]>("call_records", []);
    setCalls(stored); setSelectedCallId(stored[0]?.id || null);
  }, [workspace?.id]);

  const hq = workspace?.headquarters;
  const companyName = workspace?.name || "Active Company";
  const selected = calls.find((c) => c.id === selectedCallId) || null;
  const answered = calls.filter((c) => c.status === "Answered" || c.status === "Qualified").length;
  const missed = calls.filter((c) => c.status === "Missed").length;
  const avg = useMemo(() => calls.length ? formatDuration(Math.round(calls.reduce((s, c) => s + c.durationSeconds, 0) / calls.length)) : "00:00", [calls]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex"><FirmicSidebar />
        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><p className="text-sm font-bold text-violet-700">Business Communications</p><h1 className="text-3xl font-bold mt-1">Calls and AI reception for {companyName}.</h1><p className="text-slate-500 mt-2">Only calls received for this company appear here.</p></div><div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm"><p className="text-sm text-slate-500">Business Number</p><p className="font-bold">{hq?.phone || "Not Assigned"}</p><p className="text-xs text-slate-500">{hq?.location || "No headquarters selected"}</p></div></header>
          {!hq?.office_code && <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-3xl p-6 text-yellow-700">Activate a Headquarters before enabling Business Communications.</div>}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8"><Stat title="Calls Today" value={String(calls.length)} icon="☎️" /><Stat title="Answered by AI" value={String(answered)} icon="✅" /><Stat title="Missed Calls" value={String(missed)} icon="❌" /><Stat title="Avg. Duration" value={avg} icon="⏱️" /></section>
          <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8"><div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"><h2 className="text-xl font-bold">Recent Calls</h2>{calls.length === 0 ? <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-slate-500">No calls have been received for {companyName}.</div> : <div className="mt-5 space-y-3">{calls.map((c) => <button key={c.id} onClick={() => setSelectedCallId(c.id)} className={`w-full text-left rounded-2xl border p-4 ${selectedCallId === c.id ? "border-violet-500 bg-violet-50" : "border-slate-200 bg-slate-50"}`}><div className="grid grid-cols-1 md:grid-cols-5 gap-3"><p className="font-bold">{c.caller}</p><p>{c.status}</p><p>{c.handledBy}</p><p className="font-bold">{formatDuration(c.durationSeconds)}</p><p>{c.type}</p></div></button>)}</div>}</div><div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"><h2 className="text-xl font-bold">Call Transcript</h2>{selected ? <div className="mt-5 bg-slate-50 rounded-2xl p-5"><p className="font-bold">{selected.caller}</p><p className="text-sm text-slate-600 mt-4">{selected.transcript || "No transcript available."}</p></div> : <p className="mt-5 text-slate-500">No call selected.</p>}</div></section>
        </main>
      </div>
    </ProtectedRoute>
  );
}
function formatDuration(seconds: number) { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; }
function Stat({ title, value, icon }: { title: string; value: string; icon: string }) { return <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm"><div className="text-3xl">{icon}</div><p className="text-sm text-slate-500 mt-3">{title}</p><p className="text-2xl font-bold mt-1">{value}</p></div>; }
