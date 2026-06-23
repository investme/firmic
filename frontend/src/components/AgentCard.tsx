import { money } from "../data/pricing";

type AgentCardProps = {
  name: string;
  price: number;
  desc: string;
  active?: boolean;
};

export default function AgentCard({ name, price, desc, active = true }: AgentCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="h-14 w-14 rounded-full bg-violet-100 flex items-center justify-center text-2xl mb-3">
        🤖
      </div>

      <h3 className="font-semibold text-slate-900">{name}</h3>
      <p className="text-sm text-slate-500 mt-1 min-h-[40px]">{desc}</p>

      <div className="mt-4 text-sm font-bold text-slate-900">
        {money(price)}/mo
      </div>

      <button
        className={`mt-4 w-full rounded-xl py-2 text-sm font-semibold ${
          active
            ? "bg-violet-600 text-white"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {active ? "Hired" : "Hire Agent"}
      </button>
    </div>
  );
}