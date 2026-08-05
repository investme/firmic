import type { SubscriptionPlan } from "../../services/subscriptionApi";
import { PLAN_UI, type FirmicPlanCode } from "../../src/config/planUi";

type PlanSelectorProps = {
  plans: SubscriptionPlan[];
  selectedPlan: FirmicPlanCode | null;
  loading: boolean;
  onSelect: (planCode: FirmicPlanCode) => void;
};

function formatAIEmployeeLimit(limit: number): string {
  return limit === 0 ? "Unlimited AI employees" : `${limit} AI employees`;
}

export default function PlanSelector({
  plans,
  selectedPlan,
  loading,
  onSelect,
}: PlanSelectorProps) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
        Loading Firmic plans...
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        Firmic plans could not be loaded.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {plans.map((plan) => {
        const code = plan.code as FirmicPlanCode;
        const presentation = PLAN_UI[code];
        const selected = selectedPlan === code;
        const recommended = code === "PLAN_BUSINESS";

        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(code)}
            className={[
              "relative flex h-full flex-col rounded-3xl border p-6 text-left shadow-sm transition",
              selected
                ? "border-violet-600 bg-violet-50 ring-4 ring-violet-100"
                : recommended
                  ? "border-violet-300 bg-white hover:border-violet-500"
                  : "border-slate-200 bg-white hover:border-slate-400",
            ].join(" ")}
          >
            {presentation?.badge && (
              <span className="absolute right-5 top-5 rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white">
                {presentation.badge}
              </span>
            )}

            <span className="text-3xl">{presentation?.icon || "◆"}</span>

            <h2 className="mt-5 text-2xl font-bold text-slate-950">
              {plan.name}
            </h2>

            <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
              {plan.description}
            </p>

            <div className="mt-6">
              <span className="text-4xl font-bold text-slate-950">
                ${Number(plan.monthly_price).toFixed(0)}
              </span>
              <span className="ml-1 text-sm font-medium text-slate-500">
                /month
              </span>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
              <p className="font-bold text-slate-800">
                {formatAIEmployeeLimit(plan.max_ai_employees)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Included workforce capacity
              </p>
            </div>

            <div className="mt-6 flex-1 space-y-3">
              {(presentation?.highlights || []).map((highlight) => (
                <div
                  key={highlight}
                  className="flex items-start gap-3 text-sm text-slate-600"
                >
                  <span className="font-bold text-emerald-600">✓</span>
                  <span>{highlight}</span>
                </div>
              ))}
            </div>

            <div
              className={[
                "mt-8 rounded-xl px-5 py-3 text-center font-bold transition",
                selected
                  ? "bg-violet-600 text-white"
                  : "bg-slate-100 text-slate-700",
              ].join(" ")}
            >
              {selected
                ? "Selected"
                : `Choose ${plan.name.replace("Firmic ", "")}`}
            </div>
          </button>
        );
      })}
    </div>
  );
}
