import { aiAgents } from "../data/aiAgents";
import { pricing, toAED } from "../data/pricing";

export default function Dashboard() {
  const activeAgents = aiAgents.slice(0, 7);

  const monthlyUsd =
    pricing.officeRental.usd +
    pricing.mailbox.usd +
    pricing.voip.usd +
    pricing.meetingRooms.usd +
    pricing.zoom.usd +
    pricing.crm.usd +
    pricing.microsoft365.usd +
    activeAgents.reduce((sum, agent) => sum + agent.price, 0);

  const taxUsd = monthlyUsd * 0.05;
  const totalUsd = monthlyUsd + taxUsd;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <main className="flex-1 p-6 xl:p-8">
        <Topbar />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-6">
          <div className="space-y-6">
            <OfficeCard />
            <AIWorkforce agents={activeAgents} />
            <AddonGrid />
            <BottomGrid />
          </div>

          <div className="space-y-6">
            <BillingSummary
              monthlyUsd={monthlyUsd}
              taxUsd={taxUsd}
              totalUsd={totalUsd}
            />
            <QuickActions />
            <HelpCard />
          </div>
        </div>
      </main>
    </div>
  );
}

function Sidebar() {
  const items = [
    "Dashboard",
    "My Office",
    "AI Workforce",
    "Mailbox",
    "VoIP & Calls",
    "Meeting Rooms",
    "CRM",
    "Microsoft 365",
    "Messages",
    "Billing & Invoices",
    "Reports",
    "Integrations",
    "Settings",
  ];

  return (
    <aside className="hidden xl:flex w-[280px] bg-slate-950 text-white min-h-screen p-5 flex-col">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-violet-600 flex items-center justify-center text-xl">
          ◆
        </div>
        <div>
          <h1 className="text-2xl font-bold">Firmic</h1>
          <p className="text-xs text-slate-400">The Shopify of Business Infrastructure.</p>
        </div>
      </div>

      <nav className="mt-8 space-y-2">
        {items.map((item, index) => (
          <div
            key={item}
            className={`px-4 py-3 rounded-xl text-sm font-medium cursor-pointer ${
              index === 0
                ? "bg-violet-600 text-white"
                : "text-slate-300 hover:bg-slate-900"
            }`}
          >
            {item}
          </div>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-slate-800 p-4">
        <h3 className="font-bold">Upgrade Your Plan</h3>
        <p className="text-xs text-slate-400 mt-2">
          Unlock more AI employees and premium infrastructure.
        </p>
        <button className="mt-4 bg-violet-600 px-4 py-2 rounded-xl text-sm font-bold">
          Upgrade Plan 🚀
        </button>
      </div>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h2 className="text-3xl font-bold text-slate-950">
          Welcome back, Matar! 👋
        </h2>
        <p className="text-slate-500 mt-1">
          Here&apos;s what&apos;s happening with your AI-native company today.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold shadow-sm">
          + Book New Office
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
          <p className="text-sm font-bold">Office A047</p>
          <p className="text-xs text-slate-500">● Active</p>
        </div>
      </div>
    </header>
  );
}

function OfficeCard() {
  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-bold">My Virtual Office</h3>
        <button className="border border-slate-200 px-4 py-2 rounded-xl font-semibold">
          View Office Details
        </button>
      </div>

      <div className="mt-5 flex flex-col lg:flex-row gap-6 items-center lg:items-start">
        <div className="w-full lg:w-56 h-36 rounded-2xl bg-gradient-to-br from-sky-100 to-violet-100 flex items-center justify-center text-6xl">
          🏢
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Office A047</h2>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
              Active
            </span>
          </div>

          <p className="text-slate-500 mt-2">📍 Business Bay, Dubai, UAE</p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
            <Mini title="Mailbox" value="Active" icon="📬" />
            <Mini title="VoIP Number" value="+971 4 XXX 047" icon="☎️" />
            <Mini title="Office Plan" value="Premium" icon="⭐" />
            <Mini title="Joined On" value="May 12, 2025" icon="📅" />
          </div>
        </div>
      </div>
    </section>
  );
}

function AIWorkforce({ agents }: { agents: any[] }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">AI Workforce</h3>
        <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold">
          7 Active
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mt-5">
        {agents.map((agent, index) => (
          <div key={agent.name} className="border border-slate-200 rounded-2xl p-4 text-center">
            <div className="h-14 w-14 mx-auto rounded-full bg-violet-100 flex items-center justify-center text-2xl">
              {index === 4 ? "🤖" : "👤"}
            </div>
            <h4 className="font-bold text-xs mt-3">{agent.name}</h4>
            <span className="inline-block mt-2 bg-green-100 text-green-700 px-2 py-1 rounded-full text-[11px]">
              Active
            </span>
            <p className="text-[11px] text-slate-500 mt-2 min-h-[34px]">{agent.desc}</p>
            <p className="text-xs font-bold mt-2">AED {toAED(agent.price)}/mo</p>
            <div className="mt-3 mx-auto h-5 w-9 rounded-full bg-violet-600 relative">
              <div className="absolute right-1 top-1 h-3 w-3 rounded-full bg-white" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AddonGrid() {
  const addons = [
    ["Meeting Rooms", "Book professional meeting rooms with Zoom.", pricing.meetingRooms.usd, "📅"],
    ["CRM Software", "Manage leads, deals and customers.", pricing.crm.usd, "📊"],
    ["Microsoft 365", "Business apps, email and storage.", pricing.microsoft365.usd, "📁"],
    ["Zoom Pro", "Host unlimited meetings.", pricing.zoom.usd, "🎥"],
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {addons.map(([title, desc, price, icon]) => (
        <div key={title as string} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-3xl">{icon}</div>
          <h3 className="font-bold mt-3">{title}</h3>
          <p className="text-xs text-slate-500 mt-1 min-h-[34px]">{desc}</p>
          <div className="flex justify-between items-center mt-4">
            <p className="font-bold">AED {toAED(price as number)}/mo</p>
            <button className="border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-violet-700">
              Manage
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BottomGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Panel title="Activity & Feed">
        {[
          "Receptionist AI answered 18 calls",
          "Sales AI booked 3 meetings",
          "Support AI closed 12 tickets",
          "Executive Assistant scheduled 4 tasks",
          "New mail received",
        ].map((item) => (
          <div key={item} className="flex justify-between py-2 border-b border-slate-100 text-sm">
            <span>{item}</span>
            <span className="text-slate-400">Today</span>
          </div>
        ))}
      </Panel>

      <Panel title="Performance Overview">
        <div className="grid grid-cols-2 gap-4">
          <Metric icon="☎️" title="Calls Answered" value="142" />
          <Metric icon="👥" title="Meetings Booked" value="23" />
          <Metric icon="💬" title="Tickets Resolved" value="87" />
          <Metric icon="✉️" title="Mail Pieces" value="16" />
        </div>
      </Panel>

      <Panel title="Mailbox">
        <Mini title="2 New Mail Items" value="Today" icon="✉️" />
        <Mini title="1 Package Received" value="Yesterday" icon="📦" />
      </Panel>

      <Panel title="VoIP & Calls">
        <div className="grid grid-cols-4 gap-3">
          <Metric icon="☎️" title="Calls Today" value="14" />
          <Metric icon="✅" title="Answered" value="12" />
          <Metric icon="❌" title="Missed" value="2" />
          <Metric icon="⏱️" title="Avg." value="03:14" />
        </div>
      </Panel>
    </div>
  );
}

function BillingSummary({
  monthlyUsd,
  taxUsd,
  totalUsd,
}: {
  monthlyUsd: number;
  taxUsd: number;
  totalUsd: number;
}) {
  const rows = [
    ["Office Rental", pricing.officeRental.usd],
    ["AI Employees", aiAgents.slice(0, 7).reduce((s, a) => s + a.price, 0)],
    ["Mailbox", pricing.mailbox.usd],
    ["VoIP Number", pricing.voip.usd],
    ["Meeting Rooms", pricing.meetingRooms.usd],
    ["CRM Software", pricing.crm.usd],
    ["Microsoft 365", pricing.microsoft365.usd],
    ["Taxes (5%)", taxUsd],
  ];

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-xl font-bold">Monthly Summary</h3>

      <p className="text-sm text-slate-500 mt-6">Total (AED)</p>
      <h2 className="text-4xl font-bold">{toAED(totalUsd).toLocaleString()}</h2>
      <p className="text-slate-500">/month</p>

      <div className="mt-5">
        <p className="text-slate-500 text-sm">Hook Up Fee</p>
        <p className="font-bold">49.00 USD / AED {toAED(49)}</p>
      </div>

      <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
        {rows.map(([name, amount]) => (
          <div key={name as string} className="flex justify-between text-sm">
            <span>{name}</span>
            <span className="font-bold">{Number(amount).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <button className="mt-6 w-full bg-violet-600 text-white py-3 rounded-xl font-bold">
        View Invoice
      </button>
    </section>
  );
}

function QuickActions() {
  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <h3 className="font-bold text-lg">Quick Actions</h3>
      {[
        "Add AI Employee",
        "Book Meeting Room",
        "Add CRM Users",
        "Manage Microsoft 365",
        "Forward Mail",
        "Change VoIP Number",
      ].map((item) => (
        <div key={item} className="flex justify-between py-3 border-b border-slate-100 text-sm">
          <span>{item}</span>
          <span>›</span>
        </div>
      ))}
    </section>
  );
}

function HelpCard() {
  return (
    <section className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm overflow-hidden">
      <h3 className="text-xl font-bold">Need Help?</h3>
      <p className="text-sm text-violet-100 mt-2">Our support team is available 24/7.</p>
      <button className="mt-5 bg-white text-violet-700 px-5 py-3 rounded-xl font-bold">
        Chat with Support
      </button>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: any }) {
  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
      <h3 className="font-bold text-lg mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Mini({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-2xl bg-violet-50 flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{title}</p>
        <p className="font-bold text-sm">{value}</p>
      </div>
    </div>
  );
}

function Metric({ icon, title, value }: { icon: string; title: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4">
      <div className="text-2xl">{icon}</div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-xs text-slate-500">{title}</p>
    </div>
  );
}