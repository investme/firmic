import { useEffect, useMemo, useRef, useState } from "react";

import type { OSSearchItem } from "../types";
import { useFirmicSearch } from "../useFirmicSearch";
import { useOS } from "../useOS";
import { LauncherFooter } from "./LauncherFooter";
import { LauncherResults } from "./LauncherResults";
import { LauncherSearchInput } from "./LauncherSearchInput";
import {
  MAX_RECENT_ITEMS,
  readRecentItemIds,
  writeRecentItemId,
} from "./recentItems";

export default function ExecutiveLauncher() {
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

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
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
      const existing = groups.get(item.category) ?? [];
      existing.push(item);
      groups.set(item.category, existing);
    }

    return Array.from(groups.entries());
  }, [orderedResults]);

  const flatResults = useMemo(
    () => groupedResults.flatMap(([, items]) => items),
    [groupedResults],
  );

  useEffect(() => {
    setActiveIndex((currentIndex) =>
      flatResults.length === 0
        ? 0
        : Math.min(currentIndex, flatResults.length - 1),
    );
  }, [flatResults.length]);

  async function selectItem(item: OSSearchItem) {
    writeRecentItemId(item);
    setRecentIds(readRecentItemIds());
    await executeSearchItem(item);
  }

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/65 px-3 py-3 backdrop-blur-md sm:px-6 sm:pt-[8vh]"
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
        className="flex h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.34)] transition duration-200 ease-out sm:h-[min(680px,78vh)] sm:max-w-[900px] sm:rounded-[2rem]"
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
            void selectItem(flatResults[activeIndex]);
          }

          if (event.key === "Escape") {
            event.preventDefault();
            closeCommandPalette();
          }
        }}
      >
        <LauncherSearchInput
          inputRef={inputRef}
          query={query}
          loading={loading}
          onQueryChange={(value) => {
            setQuery(value);
            setActiveIndex(0);
          }}
          onClose={closeCommandPalette}
        />

        <LauncherResults
          query={query}
          loading={loading}
          groupedResults={groupedResults}
          flatResults={flatResults}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          onSelectItem={(item) => void selectItem(item)}
        />

        <LauncherFooter />
      </section>
    </div>
  );
}
