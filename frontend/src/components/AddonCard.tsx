import { money } from "../data/pricing";

type Props = {
  title: string;
  desc: string;
  price: number;
  emoji: string;
  active?: boolean;
};

export default function AddonCard({ title, desc, price, emoji, active = true }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="text-3xl">{emoji}</div>
      <h3 className="font-bold text-slate-900 mt-3">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 min-h-[42px]">{desc}</p>

      <p className="font-bold mt-4">{money(price)}/mo</p>

      <button className={`mt-4 w-full rounded-xl py-2 font-semibold ${
        active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"
      }`}>
        {active ? "Active" : "Add Service"}
      </button>
    </div>
  );
}