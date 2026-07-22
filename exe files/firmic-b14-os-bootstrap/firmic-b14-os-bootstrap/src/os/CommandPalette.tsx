import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Command, Search, X } from "lucide-react";
import type { OSCommand, OSCommandCategory } from "./types";
import { useOS } from "./useOS";

const RECENT_COMMANDS_KEY = "firmic-os-recent-commands";
const MAX_RECENT_COMMANDS = 5;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function scoreCommand(command: OSCommand, rawQuery: string) {
  const query = normalize(rawQuery);
  if (!query) return 1;

  const title = normalize(command.title);
  const subtitle = normalize(command.subtitle ?? "");
  const keywords = command.keywords.map(normalize);
  let score = 0;

  if (title === query) score += 100;
  if (title.startsWith(query)) score += 80;
  if (keywords.some((keyword) => keyword === query)) score += 70;
  if (keywords.some((keyword) => keyword.startsWith(query))) score += 60;
  if (title.includes(query)) score += 50;
  if (keywords.some((keyword) => keyword.includes(query))) score += 40;
  if (subtitle.includes(query)) score += 20;

  for (const part of query.split(/\s+/).filter(Boolean)) {
    if (title.includes(part)) score += 10;
    if (keywords.some((keyword) => keyword.includes(part))) score += 8;
  }

  return score;
}

function readRecentCommandIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(RECENT_COMMANDS_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeRecentCommandId(commandId: string) {
  const existing = readRecentCommandIds();
  const next = [commandId, ...existing.filter((id) => id !== commandId)].slice(0, MAX_RECENT_COMMANDS);
  window.localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(next));
}

export default function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette, commands, executeCommand } = useOS();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    setQuery("");
    setActiveIndex(0);
    setRecentIds(readRecentCommandIds());
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [commandPaletteOpen]);

  const results = useMemo(() => {
    const recentRank = new Map(recentIds.map((id, index) => [id, MAX_RECENT_COMMANDS - index]));
    return commands
      .map((command) => ({ command, score: scoreCommand(command, query) + (query ? 0 : (recentRank.get(command.id) ?? 0) * 10) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.command.title.localeCompare(b.command.title))
      .slice(0, 12)
      .map((entry) => entry.command);
  }, [commands, query, recentIds]);

  const groupedResults = useMemo(() => {
    const groups = new Map<OSCommandCategory, OSCommand[]>();
    for (const command of results) {
      groups.set(command.category, [...(groups.get(command.category) ?? []), command]);
    }
    return Array.from(groups.entries());
  }, [results]);

  const flatResults = groupedResults.flatMap(([, group]) => group);

  useEffect(() => {
    setActiveIndex((index) => flatResults.length === 0 ? 0 : Math.min(index, flatResults.length - 1));
  }, [flatResults.length]);

  async function runCommand(command: OSCommand) {
    writeRecentCommandId(command.id);
    setRecentIds(readRecentCommandIds());
    await executeCommand(command);
  }

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:p-6 sm:pt-[10vh]"
      onMouseDown={(event) => event.target === event.currentTarget && closeCommandPalette()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Firmic command palette"
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[72vh] sm:max-w-2xl sm:rounded-3xl sm:border sm:border-slate-200"
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((index) => flatResults.length === 0 ? 0 : (index + 1) % flatResults.length);
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => flatResults.length === 0 ? 0 : (index - 1 + flatResults.length) % flatResults.length);
          }
          if (event.key === "Enter" && flatResults[activeIndex]) {
            event.preventDefault();
            void runCommand(flatResults[activeIndex]);
          }
          if (event.key === "Escape") {
            event.preventDefault();
            closeCommandPalette();
          }
        }}
      >
        <header className="flex min-h-16 items-center gap-3 border-b border-slate-200 px-4 sm:px-5">
          <Search className="h-5 w-5 shrink-0 text-violet-600" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            placeholder="Search Firmic or run a command..."
            className="h-16 min-w-0 flex-1 bg-transparent text-base font-medium text-slate-950 outline-none placeholder:text-slate-400"
          />
          <button type="button" onClick={closeCommandPalette} aria-label="Close command palette" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {flatResults.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600"><Command className="h-6 w-6" /></div>
              <h2 className="mt-4 text-lg font-bold text-slate-950">No matching command</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Try Tasks, Billing, Sonny, Documents, or Reports.</p>
            </div>
          ) : groupedResults.map(([category, categoryCommands]) => (
            <div key={category} className="mb-5 last:mb-0">
              <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{category}</p>
              <div className="space-y-1">
                {categoryCommands.map((command) => {
                  const globalIndex = flatResults.findIndex((result) => result.id === command.id);
                  const isActive = globalIndex === activeIndex;
                  const Icon = command.icon;
                  return (
                    <button
                      key={command.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      onClick={() => void runCommand(command)}
                      className={`flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${isActive ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-slate-800 hover:bg-slate-100"}`}
                    >
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>
                        {Icon ? <Icon className="h-5 w-5" /> : <Command className="h-5 w-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{command.title}</span>
                        {command.subtitle && <span className={`mt-0.5 block truncate text-xs ${isActive ? "text-violet-100" : "text-slate-500"}`}>{command.subtitle}</span>}
                      </span>
                      <ArrowRight className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-300"}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <footer className="hidden items-center justify-between border-t border-slate-200 px-5 py-3 text-xs text-slate-400 sm:flex">
          <span>↑↓ Navigate · Enter Open · Esc Close</span>
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-500">Firmic OS</span>
        </footer>
      </section>
    </div>
  );
}
