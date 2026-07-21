import { useEffect, useMemo, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import { getActiveWorkspace, getWorkspaceChangedEventName } from "../src/utils/workspaceContext";
import { readCompanyStorage, writeCompanyStorage } from "../src/utils/companyStorage";

type User = { id: string; name: string; email: string; status: string; license: string; storageGb: number };

export default function Microsoft365() {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });

  useEffect(() => {
    const sync = () => setWorkspace(getActiveWorkspace());
    sync();
    window.addEventListener(getWorkspaceChangedEventName(), sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(getWorkspaceChangedEventName(), sync); window.removeEventListener("storage", sync); };
  }, []);

  useEffect(() => {
    const stored = workspace?.id ? readCompanyStorage<User[]>("microsoft_users", []) : [];
    setUsers(stored);
    setSelectedId(stored[0]?.id || null);
  }, [workspace?.id]);

  const selected = users.find((user) => user.id === selectedId) || null;
  const storage = useMemo(() => users.reduce((sum, user) => sum + user.storageGb, 0), [users]);

  function addUser() {
    if (!form.name.trim() || !form.email.trim()) return;
    const user: User = { id: crypto.randomUUID(), name: form.name.trim(), email: form.email.trim(), status: "Pending", license: "Unassigned", storageGb: 0 };
    const next = [...users, user];
    writeCompanyStorage("microsoft_users", next);
    setUsers(next);
    setSelectedId(user.id);
    setShowForm(false);
    setForm({ name: "", email: "" });
  }

  return (
    <ProtectedRoute><div className="min-h-screen bg-slate-50 flex"><FirmicSidebar /><main className="flex-1 p-6 xl:p-8">
      <header className="flex justify-between gap-4"><div><p className="text-sm font-bold text-violet-700">Microsoft 365</p><h1 className="text-3xl font-bold mt-1">Microsoft workspace for {workspace?.name || "Active Company"}.</h1><p className="text-slate-500 mt-2">New companies begin with zero users, licenses, storage, and mailboxes.</p></div><button onClick={() => setShowForm(true)} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold h-fit">+ Add User</button></header>
      {showForm && <section className="mt-6 bg-white border rounded-3xl p-6"><div className="grid md:grid-cols-2 gap-4"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="border rounded-xl p-3"/><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" className="border rounded-xl p-3"/></div><div className="flex gap-3 mt-4"><button onClick={addUser} className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold">Add User</button><button onClick={() => setShowForm(false)} className="border px-5 py-3 rounded-xl font-bold">Cancel</button></div></section>}
      <section className="grid md:grid-cols-4 gap-5 mt-8"><Stat title="Active Users" value={String(users.filter((user) => user.status === "Active").length)} icon="👥"/><Stat title="Licenses" value={String(users.filter((user) => user.license !== "Unassigned").length)} icon="🔑"/><Stat title="Storage Used" value={`${storage} GB`} icon="☁️"/><Stat title="Mailboxes" value={String(users.length)} icon="📧"/></section>
      <section className="grid xl:grid-cols-[1fr_360px] gap-6 mt-8"><div className="bg-white border rounded-3xl p-6"><h2 className="text-xl font-bold">Users & Mailboxes</h2>{users.length === 0 ? <p className="mt-5 text-slate-500">No Microsoft users yet.</p> : <div className="space-y-3 mt-5">{users.map((user) => <button key={user.id} onClick={() => setSelectedId(user.id)} className={`w-full text-left border rounded-2xl p-4 ${selectedId === user.id ? "border-violet-500 bg-violet-50" : "bg-slate-50"}`}><p className="font-bold">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></button>)}</div>}</div><div className="bg-white border rounded-3xl p-6"><h2 className="text-xl font-bold">Selected User</h2>{selected ? <div className="mt-5 bg-slate-50 border rounded-2xl p-5"><h3 className="text-xl font-bold">{selected.name}</h3><p className="text-sm text-slate-500">{selected.email}</p><p className="mt-4 font-bold">{selected.license}</p><p className="text-sm text-slate-500">{selected.status}</p></div> : <p className="mt-5 text-slate-500">No user selected.</p>}</div></section>
    </main></div></ProtectedRoute>
  );
}
function Stat({ title, value, icon }: { title: string; value: string; icon: string }) { return <div className="bg-white border rounded-3xl p-5"><div className="text-3xl">{icon}</div><p className="text-sm text-slate-500 mt-3">{title}</p><p className="text-2xl font-bold">{value}</p></div>; }
