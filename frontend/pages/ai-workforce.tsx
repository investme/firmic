import { useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import { aiAgents } from "../src/data/aiAgents";
import { toAED } from "../src/data/pricing";

export default function AIWorkforcePage() {
  const [selectedAgents, setSelectedAgents] = useState<string[]>(
    aiAgents.slice(0, 7).map((agent) => agent.name)
  );

  const toggleAgent = (name: string) => {
    setSelectedAgents((current) =>
      current.includes(name)
        ? current.filter((agent) => agent !== name)
        : [...current, name]
    );
  };

  const monthlyUsd = aiAgents
    .filter((agent) => selectedAgents.includes(agent.name))
    .reduce((sum, agent) => sum + agent.price, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="AI Workforce" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">AI Workforce</h1>
            <p className="text-slate-500 mt-1">
              Hire AI employees to operate your company from day one.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
            <p className="text-sm text-slate-500">Selected Workforce</p>
            <p className="font-bold">
              {selectedAgents.length} Agents · ${monthlyUsd}/mo · AED{" "}
              {toAED(monthlyUsd)}/mo
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-6">
          <Stat title="Available Agents" value="15" icon="🤖" />
          <Stat
            title="Hired Agents"
            value={String(selectedAgents.length)}
            icon="✅"
          />
          <Stat title="Monthly USD" value={`$${monthlyUsd}`} icon="💰" />
          <Stat
            title="Monthly AED"
            value={`AED ${toAED(monthlyUsd)}`}
            icon="🇦🇪"
          />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
          {aiAgents.map((agent, index) => {
            const active = selectedAgents.includes(agent.name);

            return (
              <div
                key={agent.name}
                className={`bg-white rounded-3xl border p-6 shadow-sm ${
                  active ? "border-violet-400" : "border-slate-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="h-16 w-16 rounded-2xl bg-violet-100 flex items-center justify-center text-3xl">
                    {index % 3 === 0 ? "🤖" : "👤"}
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {active ? "Hired" : "Available"}
                  </span>
                </div>

                <h2 className="text-xl font-bold mt-5">{agent.name}</h2>

                <p className="text-slate-500 text-sm mt-2 min-h-[44px]">
                  {agent.desc}
                </p>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  <Mini title="Tasks" value={String(24 + index * 3)} />
                  <Mini title="Chats" value={String(12 + index * 2)} />
                  <Mini title="Score" value={`${91 - index}%`} />
                </div>

                <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <p className="text-sm text-slate-500">Monthly Cost</p>
                  <p className="font-bold">{agent.price} USD/mo</p>
                  <p className="font-bold text-slate-500">
                    {toAED(agent.price)} AED/mo
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <button
                    onClick={() => toggleAgent(agent.name)}
                    className={`rounded-xl py-3 font-bold ${
                      active
                        ? "bg-red-50 text-red-600"
                        : "bg-violet-600 text-white"
                    }`}
                  >
                    {active ? "Remove" : "Hire"}
                  </button>

                  <button className="rounded-xl py-3 font-bold border border-slate-200 text-slate-700">
                    Configure
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function Stat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-3 text-center">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}