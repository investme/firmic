import FirmicSidebar from "../components/FirmicSidebar";
import { pricing, toAED } from "../src/data/pricing";

const monthlyTotal =
  pricing.officeRental.usd +
  pricing.mailbox.usd +
  pricing.voip.usd +
  25 +
  pricing.zoom.usd +
  pricing.crm.usd +
  pricing.microsoft365.usd +
  423;

export default function MyOffice() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="My Office" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">My Office</h1>
            <p className="text-slate-500 mt-1">
              Your virtual office, infrastructure, and operational stack.
            </p>
          </div>

          <button className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold">
            Upgrade Office
          </button>
        </header>

        <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-72 h-48 rounded-3xl bg-gradient-to-br from-violet-100 to-blue-100 flex items-center justify-center text-7xl">
              🏢
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold">Office A047</h2>
                  <p className="text-slate-500 mt-2">
                    Premium Business Bay Virtual Office
                  </p>
                  <p className="text-slate-500 mt-1">
                    Business Bay, Dubai, UAE · Activated May 12, 2026
                  </p>
                </div>

                <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                <Info title="Office Rental" value="$99/mo · AED 363/mo" icon="🏢" />
                <Info title="Mailbox" value="Active" icon="📬" />
                <Info title="VoIP Number" value="+971 4 XXX 047" icon="☎️" />
                <Info title="Plan" value="Premium" icon="⭐" />
              </div>

              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold">AI Workforce Capacity</p>
                    <p className="text-sm text-slate-500">7 of 15 AI employees active</p>
                  </div>
                  <p className="font-bold text-violet-700">47%</p>
                </div>

                <div className="h-3 bg-slate-200 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-violet-600 rounded-full w-[47%]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 bg-violet-600 text-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold">
            Firmic is the Operating System for AI-Native Companies.
          </h2>

          <p className="text-violet-100 mt-2 max-w-4xl">
            Launch your company in a day and equip it with a virtual office,
            business infrastructure, communications, software, and an AI workforce
            from day one.
          </p>
        </section>

        <div className="flex justify-between items-center mt-8">
          <h2 className="text-xl font-bold">Business Infrastructure</h2>

          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
            <p className="text-xs text-slate-500">Total Monthly Infrastructure</p>
            <p className="font-bold">
              ${monthlyTotal}/mo · AED {toAED(monthlyTotal)}/mo
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-5 mt-5">
          <Service title="Mailbox" desc="Receive, scan, forward, and archive business mail." usd={pricing.mailbox.usd} icon="📬" />
          <Service title="VoIP Number" desc="Dubai business number answered by AI receptionist." usd={pricing.voip.usd} icon="☎️" />
          <Service title="Meeting Rooms" desc="Book professional rooms with Zoom connection." usd={25} suffix="/hr" icon="🏛️" />
          <Service title="Zoom Pro" desc="Host unlimited client and team meetings." usd={pricing.zoom.usd} icon="🎥" />
          <Service title="CRM Software" desc="Manage leads, deals, customers, and AI follow-ups." usd={pricing.crm.usd} icon="📊" />
          <Service title="Microsoft 365" desc="Email, calendar, Office apps, Teams, and storage." usd={pricing.microsoft365.usd} icon="📁" />
          <Service title="AI Workforce" desc="Hire AI employees to operate your company." usd={423} icon="🤖" />
          <Service title="Billing Engine" desc="Track subscriptions, usage, invoices, and payments." usd={0} icon="💳" free />
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Panel title="Office Activity">
            <Activity text="Receptionist AI answered 18 calls today" />
            <Activity text="New package received in mailbox" />
            <Activity text="Sales AI created 2 CRM leads" />
            <Activity text="Meeting room booked for tomorrow" />
          </Panel>

          <Panel title="Office Health">
            <div className="grid grid-cols-2 gap-4">
              <Mini title="System Status" value="Operational" />
              <Mini title="AI Workforce" value="7 Active" />
              <Mini title="Mailbox" value="2 New" />
              <Mini title="VoIP" value="12 Answered" />
            </div>
          </Panel>
        </section>
      </main>
    </div>
  );
}

function Info({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}

function Service({ title, desc, usd, suffix = "/mo", icon, free = false }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="text-4xl">{icon}</div>
      <h3 className="font-bold text-lg mt-4">{title}</h3>
      <p className="text-sm text-slate-500 mt-2 min-h-[44px]">{desc}</p>

      <div className="mt-5">
        {free ? (
          <p className="font-bold text-green-700">Included</p>
        ) : (
          <>
            <p className="font-bold">{usd} USD{suffix}</p>
            <p className="font-bold text-slate-500">{toAED(usd)} AED{suffix}</p>
          </>
        )}
      </div>

      <button className="mt-5 w-full bg-violet-600 text-white rounded-xl py-3 font-bold">
        Manage
      </button>
    </div>
  );
}

function Panel({ title, children }: any) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

function Activity({ text }: { text: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-semibold">
      {text}
    </div>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 text-center">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}