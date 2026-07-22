import { useAnimatedNumber } from "../AnimatedMetric";

export function CompanyHealthRing({
  value,
  reviewedLabel,
}: {
  value: number;
  reviewedLabel?: string;
}) {
  const safe = Math.max(0, Math.min(100, value));
  const animated = useAnimatedNumber(safe, 800);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference - (animated / 100) * circumference;

  const status =
    safe >= 85
      ? "Excellent"
      : safe >= 70
      ? "Healthy"
      : safe >= 50
      ? "Needs attention"
      : "At risk";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
            Company Intelligence
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-900">
            Company Health
          </h3>
        </div>

        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          {status}
        </span>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <div className="relative h-36 w-36">
          <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="10"
              className="stroke-slate-100"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              className="stroke-violet-600 transition-all duration-700"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: dash,
              }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black tabular-nums text-slate-900">
              {Math.round(animated)}%
            </span>
            <span className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Health
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm font-bold text-slate-700">{status}</p>
        {reviewedLabel && (
          <p className="mt-1 text-xs text-slate-400">{reviewedLabel}</p>
        )}
      </div>
    </section>
  );
}
