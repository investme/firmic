import { Command, Sparkles } from "lucide-react";

import type { OSSearchItem } from "../types";
import { LauncherResultRow } from "./LauncherResultRow";

type GroupedResults = Array<[string, OSSearchItem[]]>;

type Props = {
  query: string;
  loading: boolean;
  groupedResults: GroupedResults;
  flatResults: OSSearchItem[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelectItem: (item: OSSearchItem) => void;
};

export function LauncherResults({
  query,
  loading,
  groupedResults,
  flatResults,
  activeIndex,
  onActiveIndexChange,
  onSelectItem,
}: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4">
      {!query.trim() ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/80 px-4 py-3 text-sm text-violet-800">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>
            Search pages, people, tasks, documents, invoices and AI agents.
          </span>
        </div>
      ) : null}

      {flatResults.length === 0 && !loading ? (
        <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Command className="h-6 w-6" />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-950">
            Nothing found
          </h2>

          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Try another company, document, task, invoice, person or command.
          </p>
        </div>
      ) : (
        groupedResults.map(([category, items]) => (
          <section key={category} className="mb-5 last:mb-0">
            <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {category}
            </p>

            <div className="space-y-1">
              {items.map((item) => {
                const globalIndex = flatResults.findIndex(
                  (result) =>
                    result.id === item.id &&
                    result.providerId === item.providerId,
                );

                return (
                  <LauncherResultRow
                    key={`${item.providerId}:${item.id}`}
                    item={item}
                    active={globalIndex === activeIndex}
                    onHover={() => onActiveIndexChange(globalIndex)}
                    onSelect={() => onSelectItem(item)}
                  />
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
