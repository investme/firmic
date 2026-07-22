export function AIOnlinePill({
  workers,
  label = "AI Online",
}: {
  workers?: number;
  label?: string;
}) {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-black text-emerald-800">{label}</span>
        {typeof workers === "number" && (
          <span className="block text-[11px] font-semibold text-emerald-700">
            {workers} worker{workers === 1 ? "" : "s"} active
          </span>
        )}
      </span>
    </div>
  );
}
