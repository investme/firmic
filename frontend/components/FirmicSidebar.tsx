import { logout } from "../services/authApi";

type Props = {
  active?: string;
};

export default function FirmicSidebar({ active = "Dashboard" }: Props) {
  const items = [
    ["Dashboard", "/dashboard"],
    ["Virtual Offices", "/virtual-offices"],
    ["My Office", "/my-office"],
    ["AI Workforce", "/ai-workforce"],
    ["Mailbox", "/mailbox"],
    ["VoIP & Calls", "/voip-calls"],
    ["Meeting Rooms", "/meeting-rooms"],
    ["CRM", "/crm"],
    ["Microsoft 365", "/microsoft-365"],
    ["Billing & Invoices", "/billing"],
    ["Messages", "/messages"],
    ["Reports", "/reports"],
    ["Integrations", "/integrations"],
    ["Sonny AI", "/sonny"],
    ["Hermes", "/hermes"],
    ["Company", "/company"],
    ["Companies", "/companies"],
    ["Documents", "/documents"],
    ["Tasks", "/tasks"],
    ["Create Company", "/create-company"],
  ];

  return (
    <aside className="hidden xl:flex w-[220px] h-screen sticky top-0 bg-slate-950 text-white flex-col">
      <div className="p-3 border-b border-slate-900 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-violet-600 flex items-center justify-center text-sm">
            ◆
          </div>

          <div>
            <h1 className="text-2xl font-bold leading-tight">Firmic</h1>
            <p className="text-slate-400 text-xs leading-tight">
              Business Infrastructure.
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {items.map(([name, href]) => (
          <a
            key={name}
            href={href}
            className={`block px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              active === name
                ? "bg-gradient-to-r from-violet-700 to-fuchsia-500 text-white"
                : "text-slate-300 hover:bg-slate-900"
            }`}
          >
            {name}
          </a>
        ))}
      </nav>

      <div className="border-t border-slate-900 p-2 flex-shrink-0">
        <p className="text-center text-xs text-slate-500 mb-2">
          Firmic v1.1
        </p>

        <button
          onClick={logout}
          className="w-full bg-slate-900 hover:bg-red-600 transition text-white py-2.5 rounded-xl font-bold text-sm"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}