import { useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import { aiAgents } from "../src/data/aiAgents";
import { pricing, toAED } from "../src/data/pricing";
import { getOffices } from "../services/officeApi";

import {
  getSonny,
  getProgress,
} from "../services/sonnyApi";

import {
  getHermes,
} from "../services/hermesApi";

type Office = {
  id: number;
  office_code: string;
  location?: string;
  status: string;
  monthly_price_usd?: number;
};

export default function Dashboard() {
  const [office, setOffice] = useState<Office | null>(null);
  const [loadingOffice, setLoadingOffice] = useState(true);

  const activeAgents = aiAgents.slice(0, 7);
  const officePrice = office?.monthly_price_usd || pricing.officeRental.usd;

  const monthlyUsd =
    officePrice +
    pricing.mailbox.usd +
    pricing.voip.usd +
    pricing.zoom.usd +
    pricing.crm.usd +
    pricing.microsoft365.usd +
    activeAgents.reduce((sum, agent) => sum + agent.price, 0);

  const taxUsd = monthlyUsd * 0.05;
  const totalUsd = monthlyUsd + taxUsd;

  useEffect(() => {
    loadOffice();
  }, []);

  async function loadOffice() {
    try {
      setLoadingOffice(true);
      const offices = await getOffices();

      const rentedOffice = offices.find(
        (item: Office) => item.status === "rented"
      );

      setOffice(rentedOffice || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOffice(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Dashboard" />

      <main className="flex-1 p-6 xl:p-8">
        <Topbar office={office} loadingOffice={loadingOffice} />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-6">
          <div className="space-y-6">
            <OfficeCard office={office} loadingOffice={loadingOffice} />
            <AIWorkforce />
            <AddonGrid />
            <BottomGrid />
          </div>

          <div className="space-y-6">
            <BillingSummary
              totalUsd={totalUsd}
              taxUsd={taxUsd}
              officePrice={officePrice}
            />
            <QuickActions />
            <HelpCard />
          </div>
        </div>
      </main>
    </div>
  );
}

function Topbar({
  office,
  loadingOffice,
}: {
  office: Office | null;
  loadingOffice: boolean;
}) {
  const officeCode = office?.office_code || "No Office";

  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h2 className="text-3xl font-bold text-slate-950">
          Welcome back, Matar! 👋
        </h2>
        <p className="text-slate-500 mt-1">
          Firmic is the Shopify of Business Infrastructure — launch, operate,
          and scale with an AI workforce from day one.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <a
          href="/virtual-offices"
          className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold shadow-sm"
        >
          + Launch New Company
        </a>

        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
          <p className="text-sm font-bold">
            {loadingOffice ? "Loading Office..." : `Office ${officeCode}`}
          </p>
          <p className="text-xs text-slate-500">
            {office ? "● Active" : "No rented office yet"}
          </p>
        </div>
      </div>
    </header>
  );
}

function OfficeCard({
  office,
  loadingOffice,
}: {
  office: Office | null;
  loadingOffice: boolean;
}) {
  const officeCode = office?.office_code || "Not Selected";
  const officeLocation = office?.location || "Rent an office to activate Firmic";
  const officePrice = office?.monthly_price_usd || pricing.officeRental.usd;

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-bold">My Virtual Office</h3>
        <a
          href={office ? "/my-office" : "/virtual-offices"}
          className="border border-slate-200 px-4 py-2 rounded-xl font-semibold"
        >
          {office ? "View Office Details" : "Rent Office"}
        </a>
      </div>

      {loadingOffice ? (
        <div className="mt-5 text-slate-500">Loading office from backend...</div>
      ) : (
        <div className="mt-5 flex flex-col lg:flex-row gap-6 items-center lg:items-start">
          <div className="w-full lg:w-56 h-36 rounded-2xl bg-gradient-to-br from-sky-100 to-violet-100 flex items-center justify-center text-6xl">
            🏢
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">Office {officeCode}</h2>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  office
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {office ? "Active" : "Not Active"}
              </span>
            </div>

            <p className="text-slate-500 mt-2">📍 {officeLocation}</p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
              <Mini title="Mailbox" value="Active" icon="📬" />
              <Mini title="VoIP Number" value="+971 4 XXX 047" icon="☎️" />
              <Mini
                title="Office Rental"
                value={`$${officePrice}/mo`}
                icon="💰"
              />
              <Mini title="Office Plan" value="Premium" icon="⭐" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function AIWorkforce() {
  const [agentPage, setAgentPage] = useState(0);
  const agentsPerPage = 5;
  const totalPages = Math.ceil(aiAgents.length / agentsPerPage);

  const visibleAgents = aiAgents.slice(
    agentPage * agentsPerPage,
    agentPage * agentsPerPage + agentsPerPage
  );

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm relative">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">AI Workforce</h3>
        <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold">
          15 Agents
        </span>
      </div>

      <button
        onClick={() => setAgentPage(Math.max(0, agentPage - 1))}
        className="absolute left-2 top-1/2 bg-white border border-slate-200 shadow-sm rounded-full h-9 w-9 z-10"
      >
        ‹
      </button>

      <button
        onClick={() => setAgentPage(Math.min(totalPages - 1, agentPage + 1))}
        className="absolute right-2 top-1/2 bg-white border border-slate-200 shadow-sm rounded-full h-9 w-9 z-10"
      >
        ›
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-5 px-6">
        {visibleAgents.map((agent, index) => (
          <div
            key={agent.name}
            className="border border-slate-200 rounded-2xl p-4 text-center"
          >
            <div className="h-16 w-16 mx-auto rounded-full bg-violet-100 flex items-center justify-center text-3xl">
              {index === 4 ? "🤖" : "👤"}
            </div>

            <h4 className="font-bold text-sm mt-3 min-h-[38px]">
              {agent.name}
            </h4>

            <span className="inline-block mt-2 bg-green-100 text-green-700 px-2 py-1 rounded-full text-[11px]">
              Active
            </span>

            <p className="text-xs text-slate-500 mt-3 min-h-[48px]">
              {agent.desc}
            </p>

            <p className="text-xs font-bold mt-3">{agent.price} USD/mo</p>
            <p className="text-xs font-bold">{toAED(agent.price)} AED/mo</p>

            <div className="mt-3 mx-auto h-5 w-9 rounded-full bg-violet-600 relative">
              <div className="absolute right-1 top-1 h-3 w-3 rounded-full bg-white" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-5">
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            key={index}
            onClick={() => setAgentPage(index)}
            className={`h-2.5 w-2.5 rounded-full ${
              index === agentPage ? "bg-violet-600" : "bg-slate-300"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

function AddonGrid() {
  const addons = [
    {
      title: "Meeting Rooms",
      desc: "Book professional meeting rooms with Zoom.",
      usd: 25,
      suffix: "/hr",
      icon: "📅",
    },
    {
      title: "CRM Software",
      desc: "Manage leads, deals and customers.",
      usd: pricing.crm.usd,
      suffix: "/mo",
      icon: "📊",
    },
    {
      title: "Microsoft 365",
      desc: "Business apps, email and storage.",
      usd: pricing.microsoft365.usd,
      suffix: "/mo",
      icon: "📁",
    },
    {
      title: "Zoom Pro",
      desc: "Host unlimited meetings.",
      usd: pricing.zoom.usd,
      suffix: "/mo",
      icon: "🎥",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {addons.map((addon) => (
        <div
          key={addon.title}
          className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm"
        >
          <div className="text-3xl">{addon.icon}</div>
          <h3 className="font-bold mt-3">{addon.title}</h3>
          <p className="text-xs text-slate-500 mt-1 min-h-[34px]">
            {addon.desc}
          </p>

          <div className="mt-4">
            <p className="font-bold">
              {addon.usd} USD{addon.suffix}
            </p>
            <p className="font-bold">
              {toAED(addon.usd)} AED{addon.suffix}
            </p>
          </div>

          <button className="mt-4 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-violet-700">
            Manage
          </button>
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
          <div
            key={item}
            className="flex justify-between py-2 border-b border-slate-100 text-sm"
          >
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric icon="☎️" title="Calls Today" value="14" compact />
          <Metric icon="✅" title="Answered" value="12" compact />
          <Metric icon="❌" title="Missed" value="2" compact />
          <Metric icon="⏱️" title="Avg. Duration" value="03:14" compact />
        </div>
      </Panel>
    </div>
  );
}

function BillingSummary({
  totalUsd,
  taxUsd,
  officePrice,
}: {
  totalUsd: number;
  taxUsd: number;
  officePrice: number;
}) {
  const agentTotal = aiAgents.slice(0, 7).reduce((s, a) => s + a.price, 0);

  const rows = [
    ["Office Rental", officePrice, "monthly"],
    ["AI Employees (7)", agentTotal, "monthly"],
    ["Mailbox", pricing.mailbox.usd, "monthly"],
    ["VoIP Number", pricing.voip.usd, "monthly"],
    ["Meeting Rooms", 25, "hourly"],
    ["CRM Software", pricing.crm.usd, "monthly"],
    ["Microsoft 365", pricing.microsoft365.usd, "monthly"],
    ["Taxes (5%)", taxUsd, "monthly"],
  ];

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-xl font-bold">Monthly Summary</h3>

      <p className="text-sm text-slate-500 mt-6">Total</p>

      <h2 className="text-4xl font-bold">{totalUsd.toFixed(0)} USD</h2>

      <p className="text-slate-500">
        {toAED(totalUsd).toLocaleString()} AED / month
      </p>

      <div className="mt-5">
        <p className="text-slate-500 text-sm">Hook Up Fee</p>
        <p className="font-bold">49.00 USD / {toAED(49)} AED</p>
        <span className="inline-block mt-2 text-xs bg-violet-100 text-violet-700 px-3 py-1 rounded-full">
          One-time
        </span>
      </div>

      <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
        {rows.map(([name, amount, type]) => (
          <div
            key={name as string}
            className="grid grid-cols-[1fr_90px_70px] gap-2 text-sm items-center"
          >
            <span>{name}</span>
            <span className="font-bold text-right">
              {Number(amount).toFixed(2)} USD
            </span>
            <span className="font-bold text-right text-slate-500">
              {toAED(Number(amount))} AED
              {type === "hourly" ? "/hr" : ""}
            </span>
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
        <div
          key={item}
          className="flex justify-between py-3 border-b border-slate-100 text-sm"
        >
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
      <p className="text-sm text-violet-100 mt-2">
        Our support team is available 24/7.
      </p>
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

function Mini({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-2xl bg-violet-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{title}</p>
        <p className="font-bold text-sm">{value}</p>
      </div>
    </div>
  );
}

function Metric({
  icon,
  title,
  value,
  compact = false,
}: {
  icon: string;
  title: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 min-w-0">
      <div className="text-xl">{icon}</div>
      <p
        className={`font-bold mt-2 break-words ${
          compact ? "text-lg" : "text-2xl"
        }`}
      >
        {value}
      </p>
      <p className="text-[11px] text-slate-500 leading-tight">{title}</p>
    </div>
  );
}