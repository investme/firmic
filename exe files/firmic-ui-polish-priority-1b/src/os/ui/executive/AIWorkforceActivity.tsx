export type AIActivityItem = {
  id: string;
  agent: string;
  action: string;
  time: string;
};

export function AIWorkforceActivity({
  items,
}: {
  items: AIActivityItem[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
          Live Operations
        </p>
        <h3 className="mt-1 text-xl font-black text-slate-900">
          AI Workforce Activity
        </h3>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-2xl p-3 transition-all duration-300 hover:bg-slate-50"
          >
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 font-black text-violet-700">
              {item.agent.slice(0, 1)}
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black text-slate-900">{item.agent}</p>
                <span className="text-xs font-semibold text-slate-400">
                  {item.time}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-slate-500">
                {item.action}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
