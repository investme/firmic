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
  ];

  return (
    <aside className="hidden xl:flex w-[240px] bg-slate-950 text-white min-h-screen flex-col">
      <div className="p-5 border-b border-slate-900">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-violet-600 flex items-center justify-center text-xl">
            ◆
          </div>

          <div>
            <h1 className="text-3xl font-bold">Firmic</h1>
            <p className="text-slate-400 text-sm">
              The Shopify of Business Infrastructure.
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {items.map(([name, href]) => (
          <a
            key={name}
            href={href}
            className={`block px-5 py-4 rounded-2xl font-medium transition ${
              active === name
                ? "bg-gradient-to-r from-violet-700 to-fuchsia-500 text-white"
                : "text-slate-300 hover:bg-slate-900"
            }`}
          >
            {name}
          </a>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-900">
        <div className="rounded-3xl bg-slate-900 p-5">
          <h3 className="font-bold">Upgrade Your Plan</h3>

          <p className="text-xs text-slate-400 mt-2">
            Unlock more AI employees and premium business services.
          </p>

          <button className="mt-4 w-full bg-violet-600 hover:bg-violet-700 py-3 rounded-xl font-bold">
            Upgrade 🚀
          </button>
        </div>
      </div>
    </aside>
  );
}