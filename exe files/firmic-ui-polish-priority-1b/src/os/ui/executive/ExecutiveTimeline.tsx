export type ExecutiveTimelineItem = {
  id: string;
  time: string;
  title: string;
  detail?: string;
  actor?: string;
  tone?: "violet" | "blue" | "emerald" | "amber" | "slate";
};

const toneMap = {
  violet: "bg-violet-100 text-violet-700 ring-violet-200",
  blue: "bg-blue-100 text-blue-700 ring-blue-200",
  emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-100 text-amber-700 ring-amber-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function ExecutiveTimeline({
  items,
}: {
  items: ExecutiveTimelineItem[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
            Today
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-900">
            Executive Timeline
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
          Live
        </span>
      </div>

      <div className="space-y-5">
        {items.map((item, index) => {
          const tone = toneMap[item.tone || "slate"];

          return (
            <div key={item.id} className="group relative pl-10">
              {index < items.length - 1 && (
                <span className="absolute left-[13px] top-8 h-[calc(100%+12px)] w-px bg-slate-200" />
              )}

              <span
                className={`absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full ring-4 ${tone}`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
              </span>

              <div className="rounded-2xl border border-transparent px-3 py-2 transition-all duration-300 group-hover:border-violet-100 group-hover:bg-violet-50/40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black tabular-nums text-slate-400">
                    {item.time}
                  </span>
                  {item.actor && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                      {item.actor}
                    </span>
                  )}
                </div>

                <p className="mt-1 font-bold text-slate-900">{item.title}</p>

                {item.detail && (
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {item.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
