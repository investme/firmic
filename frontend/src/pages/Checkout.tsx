import { aiAgents } from "../data/aiAgents";
import { money, pricing, toAED } from "../data/pricing";

export default function Checkout() {
  const selectedAgents = aiAgents.slice(0, 3);

  const selectedServices = [
    pricing.officeRental,
    pricing.mailbox,
    pricing.voip,
    pricing.meetingRooms,
    pricing.zoom,
    pricing.crm,
    pricing.microsoft365,
  ];

  const monthlyUsd =
    selectedServices.reduce((sum, item) => sum + item.usd, 0) +
    selectedAgents.reduce((sum, agent) => sum + agent.price, 0);

  const firstPaymentUsd = pricing.hookupFee.usd + monthlyUsd;

  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <p className="text-slate-500 mt-1">
        Confirm your Dubai virtual office package.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
        <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold">Order Summary</h2>

          <div className="mt-5 space-y-3">
            <Row name="Hookup Fee" price={money(pricing.hookupFee.usd)} note="one-time" />

            {selectedServices.map((item) => (
              <Row key={item.name} name={item.name} price={money(item.usd)} note="monthly" />
            ))}

            {selectedAgents.map((agent) => (
              <Row key={agent.name} name={agent.name} price={money(agent.price)} note="monthly AI employee" />
            ))}
          </div>
        </div>

        <aside className="bg-slate-950 text-white rounded-3xl p-6 h-fit">
          <h2 className="text-xl font-bold">Payment Due</h2>

          <div className="mt-6">
            <p className="text-slate-400">First Payment</p>
            <p className="text-4xl font-bold">${firstPaymentUsd.toFixed(2)}</p>
            <p className="text-slate-400">AED {toAED(firstPaymentUsd)}</p>
          </div>

          <div className="mt-8 border-t border-slate-800 pt-5">
            <p className="text-slate-400">Then Monthly</p>
            <p className="text-3xl font-bold">${monthlyUsd.toFixed(2)}</p>
            <p className="text-slate-400">AED {toAED(monthlyUsd)}/month</p>
          </div>

          <button className="mt-8 w-full bg-violet-600 rounded-xl py-3 font-semibold">
            Activate Office
          </button>
        </aside>
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