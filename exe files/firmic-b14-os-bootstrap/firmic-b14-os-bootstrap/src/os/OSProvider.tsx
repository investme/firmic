import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/router";
import CommandPalette from "./CommandPalette";
import { coreCommands } from "./commandRegistry";
import { OSContext } from "./OSContext";
import type { OSCommand } from "./types";

type Props = { children: ReactNode };

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function OSProvider({ children }: Props) {
  const router = useRouter();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [registeredCommands, setRegisteredCommands] = useState<OSCommand[]>(coreCommands);

  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);
  const toggleCommandPalette = useCallback(() => setCommandPaletteOpen((value) => !value), []);

  const navigate = useCallback(async (route: string) => {
    if (!route.startsWith("/")) {
      console.error(`Firmic OS blocked an unsafe route: ${route}`);
      return false;
    }
    closeCommandPalette();
    try {
      return await router.push(route);
    } catch (error) {
      console.error("Firmic OS navigation failed.", error);
      return false;
    }
  }, [closeCommandPalette, router]);

  const registerCommands = useCallback((commands: OSCommand[]) => {
    setRegisteredCommands((current) => {
      const next = new Map(current.map((command) => [command.id, command]));
      commands.forEach((command) => next.set(command.id, command));
      return Array.from(next.values());
    });

    return () => {
      const ids = new Set(commands.map((command) => command.id));
      setRegisteredCommands((current) => current.filter((command) => !ids.has(command.id)));
    };
  }, []);

  const executeCommand = useCallback(async (command: OSCommand) => {
    closeCommandPalette();
    try {
      if (command.action) {
        await command.action();
      } else if (command.route) {
        await navigate(command.route);
      } else {
        console.warn(`Firmic OS command "${command.id}" has no action.`);
      }
    } catch (error) {
      console.error(`Firmic OS command "${command.id}" failed.`, error);
    }
  }, [closeCommandPalette, navigate]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const paletteShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (paletteShortcut) {
        event.preventDefault();
        toggleCommandPalette();
      } else if (event.key === "Escape" && commandPaletteOpen) {
        event.preventDefault();
        closeCommandPalette();
      } else if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditableTarget(event.target)) {
        event.preventDefault();
        openCommandPalette();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeCommandPalette, commandPaletteOpen, openCommandPalette, toggleCommandPalette]);

  const value = useMemo(() => ({
    commandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    navigate,
    commands: registeredCommands,
    registerCommands,
    executeCommand,
  }), [commandPaletteOpen, openCommandPalette, closeCommandPalette, toggleCommandPalette, navigate, registeredCommands, registerCommands, executeCommand]);

  return (
    <OSContext.Provider value={value}>
      {children}
      <CommandPalette />
      <button
        type="button"
        onClick={openCommandPalette}
        aria-label="Open Firmic command palette"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-xl shadow-violet-600/30 transition hover:-translate-y-0.5 hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200 xl:hidden"
      >
        <Search className="h-6 w-6" />
      </button>
    </OSContext.Provider>
  );
}
