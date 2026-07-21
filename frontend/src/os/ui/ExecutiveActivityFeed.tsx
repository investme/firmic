export type ExecutiveFeedItem = {
  id: string;
  title: string;
  detail?: string;
  type?: "success" | "info" | "warning";
};

export function ExecutiveActivityFeed({
  items,
}: {
  items: ExecutiveFeedItem[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
          Recent Activity
        </p>
        <h3 className="mt-1 text-xl font-black text-slate-900">
          Executive Feed
        </h3>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3 transition-all duration-300 hover:border-violet-100 hover:bg-violet-50/30"
          >
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                item.type === "warning"
                  ? "bg-amber-100 text-amber-700"
                  : item.type === "info"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {item.type === "warning" ? "!" : item.type === "info" ? "i" : "✓"}
            </span>

            <div>
              <p className="font-bold text-slate-800">{item.title}</p>
              {item.detail && (
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {item.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
