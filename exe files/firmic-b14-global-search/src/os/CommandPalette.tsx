import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Command,
  LoaderCircle,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import type { OSSearchItem } from "./types";
import { useFirmicSearch } from "./useFirmicSearch";
import { useOS } from "./useOS";

const RECENT_ITEMS_KEY = "firmic-os-recent-items";
const MAX_RECENT_ITEMS = 6;

function readRecentItemIds() {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(RECENT_ITEMS_KEY);
    const parsed = value ? JSON.parse(value) : [];

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeRecentItemId(item: OSSearchItem) {
  if (typeof window === "undefined") return;

  const identity = `${item.providerId}:${item.id}`;
  const existing = readRecentItemIds();
  const next = [
    identity,
    ...existing.filter((existingId) => existingId !== identity),
  ].slice(0, MAX_RECENT_ITEMS);

  window.localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(next));
}

export default function CommandPalette() {
  const {
    commandPaletteOpen,
    closeCommandPalette,
    executeSearchItem,
  } = useOS();

  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const { results, loading } = useFirmicSearch(query);

  useEffect(() => {
    if (!commandPaletteOpen) return;

    setQuery("");
    setActiveIndex(0);
    setRecentIds(readRecentItemIds());

    const animationFrame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [commandPaletteOpen]);

  const orderedResults = useMemo(() => {
    if (query.trim()) return results;

    const recentRank = new Map(
      recentIds.map((identity, index) => [
        identity,
        MAX_RECENT_ITEMS - index,
      ]),
    );

    return [...results].sort((a, b) => {
      const aIdentity = `${a.providerId}:${a.id}`;
      const bIdentity = `${b.providerId}:${b.id}`;
      const recentDifference =
        (recentRank.get(bIdentity) ?? 0) -
        (recentRank.get(aIdentity) ?? 0);

      if (recentDifference !== 0) return recentDifference;
      return (b.priority ?? 0) - (a.priority ?? 0);
    });
  }, [query, recentIds, results]);

  const groupedResults = useMemo(() => {
    const groups = new Map<string, OSSearchItem[]>();

    for (const item of orderedResults) {
      const groupItems = groups.get(item.category) ?? [];
      groupItems.push(item);
      groups.set(item.category, groupItems);
    }

    return Array.from(groups.entries());
  }, [orderedResults]);

  const flatResults = groupedResults.flatMap(([, items]) => items);

  useEffect(() => {
    setActiveIndex((currentIndex) =>
      flatResults.length === 0
        ? 0
        : Math.min(currentIndex, flatResults.length - 1),
    );
  }, [flatResults.length]);

  async function runItem(item: OSSearchItem) {
    writeRecentItemId(item);
    setRecentIds(readRecentItemIds());
    await executeSearchItem(item);
  }

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:p-6 sm:pt-[7vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeCommandPalette();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Firmic global search"
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[80vh] sm:max-w-3xl sm:rounded-3xl sm:border sm:border-slate-200"
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((currentIndex) =>
              flatResults.length === 0
                ? 0
                : (currentIndex + 1) % flatResults.length,
            );
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((currentIndex) =>
              flatResults.length === 0
                ? 0
                : (currentIndex - 1 + flatResults.length) %
                  flatResults.length,
            );
          }

          if (event.key === "Enter" && flatResults[activeIndex]) {
            event.preventDefault();
            void runItem(flatResults[activeIndex]);
          }

          if (event.key === "Escape") {
            event.preventDefault();
            closeCommandPalette();
          }
        }}
      >
        <header className="flex min-h-20 items-center gap-3 border-b border-slate-200 px-5 sm:px-7">
          <Search className="h-6 w-6 shrink-0 text-violet-600" />

          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search Firmic, people, tasks, documents..."
            className="h-20 min-w-0 flex-1 bg-transparent text-lg font-semibold text-slate-950 outline-none placeholder:text-slate-400"
          />

          {loading ? (
            <LoaderCircle className="h-5 w-5 animate-spin text-violet-600" />
          ) : null}

          <button
            type="button"
            onClick={closeCommandPalette}
            aria-label="Close global search"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {!query.trim() ? (
            <div className="mb-5 flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                Search every connected Firmic module from one place.
              </span>
            </div>
          ) : null}

          {flatResults.length === 0 && !loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Command className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-950">
                Nothing found
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Try another name, company, document, task, invoice, or command.
              </p>
            </div>
          ) : (
            groupedResults.map(([category, items]) => (
              <div key={category} className="mb-6 last:mb-0">
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
                    const isActive = globalIndex === activeIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={`${item.providerId}:${item.id}`}
                        type="button"
                        onMouseEnter={() => setActiveIndex(globalIndex)}
                        onClick={() => void runItem(item)}
                        className={`flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                          isActive
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                            : "text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                            isActive
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
                                isActive
                                  ? "text-violet-100"
                                  : "text-slate-500"
                              }`}
                            >
                              {item.subtitle}
                            </span>
                          ) : null}
                        </span>

                        <span
                          className={`hidden rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide sm:block ${
                            isActive
                              ? "bg-white/10 text-white"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {item.kind}
                        </span>

                        <ArrowRight
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? "text-white" : "text-slate-300"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="hidden items-center justify-between border-t border-slate-200 px-6 py-3 text-xs text-slate-400 sm:flex">
          <span>↑↓ Navigate · Enter Open · Esc Close</span>
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-500">
            Firmic Global Search
          </span>
        </footer>
      </section>
    </div>
  );
}
