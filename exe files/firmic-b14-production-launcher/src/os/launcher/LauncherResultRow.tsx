import { ArrowRight, Command } from "lucide-react";

import type { OSSearchItem } from "../types";

type Props = {
  item: OSSearchItem;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
};

export function LauncherResultRow({
  item,
  active,
  onHover,
  onSelect,
}: Props) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onClick={onSelect}
      className={`flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
        active
          ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
          : "text-slate-800 hover:bg-slate-100"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          active
            ? "bg-white/15 text-white"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {Icon ? (
          <Icon className="h-5 w-5" />
        ) : (
          <Command className="h-5 w-5" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">
          {item.title}
        </span>

        {item.subtitle ? (
          <span
            className={`mt-0.5 block truncate text-xs ${
              active ? "text-violet-100" : "text-slate-500"
            }`}
          >
            {item.subtitle}
          </span>
        ) : null}
      </span>

      <span
        className={`hidden rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide md:block ${
          active
            ? "bg-white/10 text-white"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {item.kind}
      </span>

      <ArrowRight
        className={`h-4 w-4 shrink-0 ${
          active ? "text-white" : "text-slate-300"
        }`}
      />
    </button>
  );
}
