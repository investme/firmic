import { aiAgents } from "../src/data/aiAgents";
import FirmicSidebar from "../components/FirmicSidebar";
import { pricing, toAED } from "../src/data/pricing";
import ProtectedRoute from "../components/ProtectedRoute";

const activeAgents = aiAgents.slice(0, 7);

export default function Billing() {
  const aiTotal = activeAgents.reduce((sum, agent) => sum + agent.price, 0);

  const meetingRoomUsage = 75;

  const subtotal =
    pricing.officeRental.usd +
    aiTotal +
    pricing.mailbox.usd +
    pricing.voip.usd +
    meetingRoomUsage +
    pricing.crm.usd +
    pricing.microsoft365.usd;

  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  return (
     <ProtectedRoute>
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Billing & Invoices" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              Billing & Invoices
            </h1>
            <p className="text-slate-500 mt-1">
              Manage subscriptions, invoices, usage, and payment methods.
            </p>
          </div>

          <button className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold">
            Download Invoice
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="Monthly Spend" value={`$${total.toFixed(0)}`} sub={`AED ${toAED(total)}`} icon="💰" />
          <Stat title="Next Invoice" value="Jul 1" sub="2026" icon="📅" />
          <Stat title="Active Services" value="13" sub="Running" icon="✅" />
          <Stat title="Payment Status" value="Paid" sub="Auto-pay active" icon="💳" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Monthly Summary</h2>

              <div className="mt-5 space-y-3">
                <Row name="Office Rental" usd={pricing.officeRental.usd} />
                <Row name="AI Workforce" usd={aiTotal} note="7 active agents" />
                <Row name="Mailbox" usd={pricing.mailbox.usd} />
                <Row name="VoIP Number" usd={pricing.voip.usd} />
                <Row name="Meeting Rooms" usd={meetingRoomUsage} note="3 hours used" />
                <Row name="CRM Software" usd={pricing.crm.usd} />
                <Row name="Microsoft 365" usd={pricing.microsoft365.usd} />
                <Row name="Taxes (5%)" usd={tax} />
              </div>

              <div className="mt-6 bg-violet-600 text-white rounded-3xl p-6">
                <p className="text-violet-100">Total Monthly Subscription</p>
                <h3 className="text-4xl font-bold mt-2">${total.toFixed(2)}</h3>
                <p className="text-violet-100 mt-1">AED {toAED(total)}/month</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">AI Workforce Charges</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                {activeAgents.map((agent) => (
                  <div
                    key={agent.name}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between"
                  >
                    <div>
                      <p className="font-bold">{agent.name}</p>
                      <p className="text-sm text-slate-500">{agent.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${agent.price}</p>
                      <p className="text-sm text-slate-500">AED {toAED(agent.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Invoice History</h2>

              <div className="mt-5 space-y-3">
                <Invoice id="FMX-2026-006" month="June 2026" amount={total} status="Paid" />
                <Invoice id="FMX-2026-005" month="May 2026" amount={689} status="Paid" />
                <Invoice id="FMX-2026-004" month="April 2026" amount={612} status="Paid" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Payment Method</h2>

              <div className="mt-5 bg-slate-950 text-white rounded-2xl p-5">
                <p className="text-slate-400">Visa</p>
                <p className="text-2xl font-bold mt-2">•••• •••• •••• 8821</p>
                <p className="text-slate-400 mt-4">Expires 12/28</p>
              </div>

              <button className="mt-5 w-full bg-violet-600 text-white py-3 rounded-xl font-bold">
                Update Card
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Usage Breakdown</h2>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <Mini title="Room Hours" value="3" />
                <Mini title="VoIP Minutes" value="327" />
                <Mini title="Mail Scans" value="22" />
                <Mini title="AI Tasks" value="1,842" />
              </div>
            </div>

            <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Grow Your Company</h2>
              <p className="text-sm text-violet-100 mt-2">
                Add more infrastructure and AI employees to scale.
              </p>

              <div className="space-y-3 mt-5">
                <Upsell name="Add HR AI" price={49} />
                <Upsell name="Add Operations AI" price={59} />
                <Upsell name="Upgrade CRM" price={25} />
                <Upsell name="Add More Microsoft 365 Seats" price={19} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
    </ProtectedRoute>
  );
}

function Stat({ title, value, sub, icon }: { title: string; value: string; sub: string; icon: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-sm text-slate-500">{sub}</p>
    </div>
  );
}

function Row({ name, usd, note }: { name: string; usd: number; note?: string }) {
  return (
    <div className="grid grid-cols-[1fr_90px_80px] gap-3 py-3 border-b border-slate-100 text-sm items-center">
      <div>
        <p className="font-semibold">{name}</p>
        {note && <p className="text-xs text-slate-500">{note}</p>}
      </div>
      <p className="font-bold text-right">${usd.toFixed(2)}</p>
      <p className="font-bold text-right text-slate-500">AED {toAED(usd)}</p>
    </div>
  );
}

function Invoice({ id, month, amount, status }: { id: string; month: string; amount: number; status: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
      <div>
        <p className="font-bold">Invoice #{id}</p>
        <p className="text-sm text-slate-500">{month}</p>
      </div>

      <div className="text-right">
        <p className="font-bold">${amount.toFixed(2)}</p>
        <p className="text-sm text-slate-500">AED {toAED(amount)}</p>
      </div>

      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
        {status}
      </span>

      <button className="border border-slate-200 px-4 py-2 rounded-xl font-bold text-sm">
        PDF
      </button>
    </div>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 text-center">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold text-xl mt-1">{value}</p>
    </div>
  );
}

function Upsell({ name, price }: { name: string; price: number }) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 flex justify-between items-center">
      <div>
        <p className="font-bold">{name}</p>
        <p className="text-sm text-violet-100">
          +${price}/mo · AED {toAED(price)}/mo
        </p>
      </div>
      <button className="bg-white text-violet-700 px-4 py-2 rounded-xl font-bold text-sm">
        Add
      </button>
    </div>
  );
}