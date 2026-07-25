import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { aiAgents } from "../data/aiAgents";
import { money, pricing, toAED } from "../data/pricing";
import {
  buildFirmicOrder,
  getConfirmedOrder,
  savePendingOrder,
} from "../utils/orderStorage";
import { getActiveWorkspace } from "../utils/workspaceContext";

const addons = [
  pricing.mailbox,
  pricing.voip,
  pricing.meetingRooms,
  pricing.zoom,
  pricing.crm,
  pricing.microsoft365,
];

export default function ConfigureOffice() {
  const router = useRouter();
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

  const [selectedHeadquarters, setSelectedHeadquarters] = useState<any>(null);
  const [isExistingHeadquarters, setIsExistingHeadquarters] = useState(false);
  const [existingAgents, setExistingAgents] = useState<string[]>([]);
  const [existingAddons, setExistingAddons] = useState<string[]>([]);
  const [confirmedOrder, setConfirmedOrder] = useState<any>(null);

  useEffect(() => {
    const workspace = getActiveWorkspace();
    const activeHeadquarters = workspace?.headquarters || null;

    // An active headquarters is authoritative. A stale public/onboarding
    // selection must never replace it during service reconfiguration.
    if (activeHeadquarters?.office_code) {
      setSelectedHeadquarters(activeHeadquarters);
      setIsExistingHeadquarters(true);
      localStorage.removeItem("firmic_selected_headquarters");

      const confirmedOrder = workspace?.id
        ? getConfirmedOrder(String(workspace.id))
        : null;

      if (confirmedOrder) {
        const paidAddons = confirmedOrder.items
          .filter((item) => item.category === "addon")
          .map((item) => item.name);
        const paidAgents = confirmedOrder.items
          .filter((item) => item.category === "ai")
          .map((item) => item.name);

        setConfirmedOrder(confirmedOrder);
        setSelectedAddons(paidAddons);
        setExistingAddons(paidAddons);
        setSelectedAgents(paidAgents);
        setExistingAgents(paidAgents);
      }
      return;
    }

    try {
      setSelectedHeadquarters(
        JSON.parse(localStorage.getItem("firmic_selected_headquarters") || "null")
      );
    } catch {
      setSelectedHeadquarters(null);
    }
  }, []);

  const officeMonthlyUsd = Number(
    selectedHeadquarters?.monthly_price_usd || pricing.officeRental.usd
  );

  const monthlyUsd =
    officeMonthlyUsd +
    addons
      .filter((addon) => selectedAddons.includes(addon.name))
      .reduce((sum, addon) => sum + addon.usd, 0) +
    aiAgents
      .filter((agent) => selectedAgents.includes(agent.name))
      .reduce((sum, agent) => sum + agent.price, 0);

  const toggleAddon = (name: string) => {
    if (existingAddons.includes(name)) return;
    setSelectedAddons((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  };

  const continueToCheckout = async () => {
    const workspace = getActiveWorkspace();

    if (!workspace?.id) {
      await router.push("/login?next=/configure-office");
      return;
    }

    const order = buildFirmicOrder({
      companyId: String(workspace.id),
      headquarters: selectedHeadquarters,
      selectedAddons: addons.filter((addon) => selectedAddons.includes(addon.name)),
      selectedAgents: aiAgents.filter((agent) => selectedAgents.includes(agent.name)),
      includeHookupFee: !workspace.headquarters?.office_code,
      officePriceUsd: Number(
        selectedHeadquarters?.monthly_price_usd || pricing.officeRental.usd
      ),
      previousOrder: confirmedOrder,
    });

    savePendingOrder(order);
    await router.push("/checkout");
  };

  const toggleAgent = (name: string) => {
    // Existing paid employees remain active in the MVP upgrade flow.
    // Downgrades/removals require separate billing treatment later.
    if (existingAgents.includes(name)) return;

    setSelectedAgents((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name]
    );
  };

  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold">
        {isExistingHeadquarters ? "Manage Company Services" : "Configure Office"}{" "}
        {selectedHeadquarters?.office_code || "A047"}
      </h1>
      <p className="text-slate-500 mt-1">
        {isExistingHeadquarters
          ? "Add AI employees or services to your active company subscription."
          : "Select services, AI employees, and tools for your virtual office."}
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

              <p className="font-bold">{money(officeMonthlyUsd)}/mo</p>
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold">Office Add-ons</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {addons.map((addon) => (
                <button
                  key={addon.name}
                  onClick={() => toggleAddon(addon.name)}
                  disabled={existingAddons.includes(addon.name)}
                  className={`text-left rounded-2xl border p-5 ${
                    existingAddons.includes(addon.name)
                      ? "border-emerald-300 bg-emerald-50 cursor-default"
                      : selectedAddons.includes(addon.name)
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-bold">{addon.name}</p>
                      {existingAddons.includes(addon.name) && (
                        <p className="text-xs font-bold text-emerald-700 mt-1">Active service</p>
                      )}
                    </div>
                    <span>
                      {existingAddons.includes(addon.name) ? "✓" : selectedAddons.includes(addon.name) ? "✅" : "➕"}
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
                  disabled={existingAgents.includes(agent.name)}
                  className={`text-left rounded-2xl border p-5 ${
                    existingAgents.includes(agent.name)
                      ? "border-emerald-300 bg-emerald-50 cursor-default"
                      : selectedAgents.includes(agent.name)
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-bold">{agent.name}</p>
                      {existingAgents.includes(agent.name) && (
                        <p className="text-xs font-bold text-emerald-700 mt-1">
                          Active employee
                        </p>
                      )}
                    </div>
                    <span>
                      {existingAgents.includes(agent.name)
                        ? "✓"
                        : selectedAgents.includes(agent.name)
                        ? "✅"
                        : "➕"}
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
              ${isExistingHeadquarters ? "0.00" : pricing.hookupFee.usd.toFixed(2)}
            </p>
            <p className="text-slate-400">
              AED {isExistingHeadquarters ? 0 : toAED(pricing.hookupFee.usd)}
            </p>
            {isExistingHeadquarters && (
              <p className="mt-1 text-xs text-emerald-400">Already activated</p>
            )}
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
            <p>Office Rental: {money(officeMonthlyUsd)}</p>
            <p>Add-ons Selected: {selectedAddons.length}</p>
            <p>AI Employees: {selectedAgents.length}</p>
          </div>

          {confirmedOrder && (
            <div className="mt-6 border-t border-slate-800 pt-5 text-sm">
              <p className="text-slate-400">Due today</p>
              <p className="text-xl font-bold mt-1">
                ${(selectedAgents.filter((name) => !existingAgents.includes(name)).reduce((sum, name) => sum + (aiAgents.find((agent) => agent.name === name)?.price || 0), 0) + selectedAddons.filter((name) => !existingAddons.includes(name)).reduce((sum, name) => sum + (addons.find((addon) => addon.name === name)?.usd || 0), 0)).toFixed(2)} + VAT
              </p>
              <p className="text-xs text-emerald-400 mt-1">Existing subscription is not charged again.</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void continueToCheckout()}
            className="mt-8 w-full bg-violet-600 rounded-xl py-3 font-semibold"
          >
            Continue to Checkout
          </button>
        </aside>
      </div>
    </div>
  );
}