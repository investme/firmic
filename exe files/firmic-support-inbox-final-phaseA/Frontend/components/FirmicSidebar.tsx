import { useEffect, useState } from "react";
import { logout } from "../services/authApi";
import { getActiveWorkspace } from "../src/utils/workspaceContext";

type Props = { active?: string };
type SidebarItem = { name: string; href: string; icon: string };

const tenantItems: SidebarItem[] = [
  { name: "Command Center", href: "/dashboard", icon: "⌂" },
  { name: "Office Marketplace", href: "/virtual-offices", icon: "🏢" },
  { name: "Head Office", href: "/my-office", icon: "📍" },
  { name: "AI Workforce", href: "/ai-workforce", icon: "🤖" },
  { name: "Digital Mailroom", href: "/mailbox", icon: "📬" },
  { name: "Business Communications", href: "/voip-calls", icon: "☎️" },
  { name: "Meeting Center", href: "/meeting-rooms", icon: "📅" },
  { name: "Sales Hub", href: "/crm", icon: "📊" },
  { name: "Microsoft 365", href: "/microsoft-365", icon: "💼" },
  { name: "Billing Center", href: "/billing", icon: "💳" },
  { name: "Communication Center", href: "/messages", icon: "💬" },
  { name: "Support Center", href: "/support", icon: "🎫" },
  { name: "Reports", href: "/reports", icon: "📈" },
  { name: "Integrations", href: "/integrations", icon: "🔗" },
  { name: "Sonny AI COO", href: "/sonny", icon: "👔" },
  { name: "Hermes Compliance", href: "/hermes", icon: "🛡️" },
  { name: "Company", href: "/company", icon: "🏛️" },
  { name: "Companies", href: "/companies", icon: "🏢" },
  { name: "Document Vault", href: "/documents", icon: "📄" },
  { name: "Tasks", href: "/tasks", icon: "✅" },
  { name: "Create Company", href: "/create-company", icon: "＋" },
  { name: "Settings", href: "/settings", icon: "⚙️" },
];

export default function FirmicSidebar({ active = "Command Center" }: Props) {
  const [companyName, setCompanyName] = useState("Tenant Workspace");
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    function loadWorkspace() {
      const workspace = getActiveWorkspace();
      if (!workspace) {
        setCompanyName("Tenant Workspace");
        setCompanyId("");
        return;
      }
      setCompanyName(workspace.name || "Tenant Workspace");
      setCompanyId(workspace.id || "");
    }

    function handleWorkspaceChange() {
      loadWorkspace();
    }

    loadWorkspace();
    window.addEventListener("firmic-workspace-changed", handleWorkspaceChange);
    window.addEventListener("storage", handleWorkspaceChange);

    return () => {
      window.removeEventListener("firmic-workspace-changed", handleWorkspaceChange);
      window.removeEventListener("storage", handleWorkspaceChange);
    };
  }, []);

  return (
    <aside className="hidden xl:flex w-[260px] h-screen sticky top-0 bg-slate-950 text-white flex-col shrink-0">
      <div className="p-4 border-b border-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center text-lg font-bold shadow-sm">◆</div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold leading-tight">Firmic</h1>
            <p className="text-slate-400 text-xs leading-tight">Business Infrastructure.</p>
          </div>
        </div>
      </div>

      <div className="px-3 pt-3 shrink-0">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-bold text-violet-400">Tenant Workspace</p>
              <p className="font-bold text-sm mt-1 truncate" title={companyName}>{companyName}</p>
              {companyId && <p className="text-[10px] text-slate-500 mt-1 truncate" title={companyId}>ID: {companyId}</p>}
            </div>
            <div className="h-9 w-9 rounded-xl bg-violet-600/20 text-violet-300 flex items-center justify-center shrink-0">🏢</div>
          </div>
          <a href="/companies" className="mt-3 block text-center border border-slate-700 rounded-xl py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition">Switch Company</a>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {tenantItems.map((item) => {
          const isActive = active === item.name;
          return (
            <a key={item.name} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${isActive ? "bg-gradient-to-r from-violet-700 to-fuchsia-500 text-white shadow-sm" : "text-slate-300 hover:bg-slate-900 hover:text-white"}`}>
              <span className="w-6 text-center shrink-0">{item.icon}</span>
              <span className="leading-5">{item.name}</span>
            </a>
          );
        })}
      </nav>

      <div className="border-t border-slate-900 p-3 shrink-0">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">Firmic v1.1</p>
          <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-1 rounded-full font-bold">Tenant</span>
        </div>
        <button type="button" onClick={() => logout("/login")} className="mt-3 w-full bg-slate-900 hover:bg-red-600 transition text-white py-2.5 rounded-xl font-bold text-sm">Logout</button>
      </div>
    </aside>
  );
}
