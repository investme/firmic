import { useState } from "react";
import { aiAgents } from "../data/aiAgents";
import { money, pricing, toAED } from "../data/pricing";

const addons = [
  pricing.mailbox,
  pricing.voip,
  pricing.meetingRooms,
  pricing.zoom,
  pricing.crm,
  pricing.microsoft365,
];

export default function ConfigureOffice() {
  const [selectedAddons, setSelectedAddons] = useState<string[]>([
    "Mailbox",
    "VoIP Number",
    "Meeting Rooms",
  ]);

  const [selectedAgents, setSelectedAgents] = useState<string[]>([
    "Receptionist AI",
    "Sales AI",
    "Support AI",
  ]);

  const monthlyUsd =
    pricing.officeRental.usd +
    addons
      .filter((addon) => selectedAddons.includes(addon.name))
      .reduce((sum, addon) => sum + addon.usd, 0) +
    aiAgents
      .filter((agent) => selectedAgents.includes(agent.name))
      .reduce((sum, agent) => sum + agent.price, 0);

  const toggleAddon = (name: string) => {
    setSelectedAddons((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  };

  const toggleAgent = (name: string) => {
    setSelectedAgents((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  };

  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold">Configure Office A047</h1>
      <p className="text-slate-500 mt-1">
        Select services, AI employees, and tools for your virtual office.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
        <div className="xl:col-span-2 space-y-8">
          <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold">Core Office</h2>

            <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex justify-between items-center">
              <div>
                <p className="font-bold">Virtual Office Rental</p>
                <p className="text-sm text-slate-500">
                  Business Bay, Dubai address
                </p>
              </div>

              <p className="font-bold">{money(pricing.officeRental.usd)}/mo</p>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold">Office Add-ons</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {addons.map((addon) => (
                <button
                  key={addon.name}
                  onClick={() => toggleAddon(addon.name)}
                  className={`text-left rounded-2xl border p-5 ${
                    selectedAddons.includes(addon.name)
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between">
                    <p className="font-bold">{addon.name}</p>
                    <span>
                      {selectedAddons.includes(addon.name) ? "✅" : "➕"}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 mt-1">
                    {money(addon.usd)}/mo
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold">Hire AI Employees</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {aiAgents.map((agent) => (
                <button
                  key={agent.name}
                  onClick={() => toggleAgent(agent.name)}
                  className={`text-left rounded-2xl border p-5 ${
                    selectedAgents.includes(agent.name)
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between">
                    <p className="font-bold">{agent.name}</p>
                    <span>
                      {selectedAgents.includes(agent.name) ? "✅" : "➕"}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 mt-1">
                    {agent.desc}
                  </p>

                  <p className="font-bold mt-3">
                    {money(agent.price)}/mo
                  </p>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="bg-slate-950 text-white rounded-3xl p-6 h-fit sticky top-6">
          <h2 className="text-xl font-bold">Live Total</h2>

          <div className="mt-6">
            <p className="text-slate-400">Hookup Fee</p>
            <p className="text-3xl font-bold">
              ${pricing.hookupFee.usd.toFixed(2)}
            </p>
            <p className="text-slate-400">
              AED {toAED(pricing.hookupFee.usd)}
            </p>
          </div>

          <div className="mt-8">
            <p className="text-slate-400">Monthly Subscription</p>
            <p className="text-4xl font-bold">
              ${monthlyUsd.toFixed(2)}
            </p>
            <p className="text-slate-400">
              AED {toAED(monthlyUsd)}/month
            </p>
          </div>

          <div className="mt-8 border-t border-slate-800 pt-5 space-y-2 text-sm">
            <p>Office Rental: {money(pricing.officeRental.usd)}</p>
            <p>Add-ons Selected: {selectedAddons.length}</p>
            <p>AI Employees: {selectedAgents.length}</p>
          </div>

          <button className="mt-8 w-full bg-violet-600 rounded-xl py-3 font-semibold">
            Continue to Checkout
          </button>
        </aside>
      </div>
    </div>
  );
}