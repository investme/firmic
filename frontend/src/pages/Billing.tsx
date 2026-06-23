import { aiAgents } from "../data/aiAgents";
import { money, pricing, toAED } from "../data/pricing";

export default function Billing() {
  const activeAgents = aiAgents.slice(0, 7);

  const baseItems = [
    pricing.officeRental,
    pricing.mailbox,
    pricing.voip,
    pricing.meetingRooms,
    pricing.zoom,
    pricing.crm,
    pricing.microsoft365,
  ];

  const monthlyUsd =
    baseItems.reduce((sum, item) => sum + item.usd, 0) +
    activeAgents.reduce((sum, agent) => sum + agent.price, 0);

  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold">Billing</h1>
      <p className="text-slate-500 mt-1">
        Your virtual office, AI workforce, and rented business tools.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold">Selected Services</h2>

          <div className="mt-5 space-y-3">
            <Row name="Hookup Fee" price={money(pricing.hookupFee.usd)} note="one-time" />

            {baseItems.map((item) => (
              <Row key={item.name} name={item.name} price={money(item.usd)} note="monthly" />
            ))}

            {activeAgents.map((agent) => (
              <Row key={agent.name} name={agent.name} price={money(agent.price)} note="monthly" />
            ))}
          </div>
        </div>

        <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-sm">
          <h2 className="text-xl font-bold">Total</h2>

          <div className="mt-6">
            <p className="text-slate-400">One-time Hookup Fee</p>
            <p className="text-3xl font-bold">${pricing.hookupFee.usd.toFixed(2)}</p>
            <p className="text-slate-400">AED {toAED(pricing.hookupFee.usd)}</p>
          </div>

          <div className="mt-8">
            <p className="text-slate-400">Monthly Subscription</p>
            <p className="text-4xl font-bold">${monthlyUsd.toFixed(2)}</p>
            <p className="text-slate-400">AED {toAED(monthlyUsd)}/month</p>
          </div>

          <button className="mt-8 w-full bg-violet-600 rounded-xl py-3 font-semibold">
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ name, price, note }: { name: string; price: string; note: string }) {
  return (
    <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <div>
        <p className="font-bold">{name}</p>
        <p className="text-sm text-slate-500">{note}</p>
      </div>
      <p className="font-bold">{price}</p>
    </div>
  );
}