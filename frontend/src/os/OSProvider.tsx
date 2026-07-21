import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/router";

import CommandPalette from "./CommandPalette";
import {
  adminCommands,
  sharedCommands,
  tenantCommands,
} from "./contextCommands";
import { OSContext } from "./OSContext";
import {
  commandToSearchItem,
  rankSearchItems,
} from "./searchEngine";
import type {
  OSCommand,
  OSSearchItem,
  OSSearchProvider,
} from "./types";

type Props = {
  children: ReactNode;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function isAdminRoute(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin-") ||
    pathname.startsWith("/admin/")
  );
}

function routeBelongsToMode(route: string | undefined, adminMode: boolean) {
  if (!route) return true;
  return adminMode ? isAdminRoute(route) : !isAdminRoute(route);
}

export function OSProvider({ children }: Props) {
  const router = useRouter();
  const providersRef = useRef(new Map<string, OSSearchProvider>());
  const adminMode = isAdminRoute(router.pathname);

  const contextualCommands = useMemo(
    () => [
      ...sharedCommands,
      ...(adminMode ? adminCommands : tenantCommands),
    ],
    [adminMode],
  );

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [registeredCommands, setRegisteredCommands] =
    useState<OSCommand[]>([]);

  useEffect(() => {
    setRegisteredCommands([]);
    setCommandPaletteOpen(false);
  }, [adminMode]);

  const commands = useMemo(() => {
    const byId = new Map<string, OSCommand>();

    for (const command of [
      ...contextualCommands,
      ...registeredCommands,
    ]) {
      if (routeBelongsToMode(command.route, adminMode)) {
        byId.set(command.id, command);
      }
    }

    return Array.from(byId.values());
  }, [adminMode, contextualCommands, registeredCommands]);

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const closeCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false);
  }, []);

  const toggleCommandPalette = useCallback(() => {
    setCommandPaletteOpen((currentValue) => !currentValue);
  }, []);

  const navigate = useCallback(
    async (route: string) => {
      if (!route.startsWith("/")) {
        console.error(`Firmic OS blocked an unsafe route: ${route}`);
        return false;
      }

      if (!routeBelongsToMode(route, adminMode)) {
        console.error(
          `Firmic OS blocked a ${
            adminMode ? "tenant" : "admin"
          } route from the current command palette: ${route}`,
        );
        return false;
      }

      closeCommandPalette();

      try {
        return await router.push(route);
      } catch (error) {
        console.error("Firmic OS navigation failed.", error);
        return false;
      }
    },
    [adminMode, closeCommandPalette, router],
  );

  const registerCommands = useCallback((nextCommands: OSCommand[]) => {
    setRegisteredCommands((currentCommands) => {
      const nextById = new Map(
        currentCommands.map((command) => [command.id, command]),
      );

      for (const command of nextCommands) {
        nextById.set(command.id, command);
      }

      return Array.from(nextById.values());
    });

    return () => {
      const commandIds = new Set(
        nextCommands.map((command) => command.id),
      );

      setRegisteredCommands((currentCommands) =>
        currentCommands.filter(
          (command) => !commandIds.has(command.id),
        ),
      );
    };
  }, []);

  const executeCommand = useCallback(
    async (command: OSCommand) => {
      closeCommandPalette();

      try {
        if (command.action) {
          await command.action();
          return;
        }

        if (command.route) {
          await navigate(command.route);
          return;
        }

        console.warn(`Firmic OS command "${command.id}" has no action.`);
      } catch (error) {
        console.error(`Firmic OS command "${command.id}" failed.`, error);
      }
    },
    [closeCommandPalette, navigate],
  );

  const registerSearchProvider = useCallback(
    (provider: OSSearchProvider) => {
      providersRef.current.set(provider.id, provider);

      return () => {
        providersRef.current.delete(provider.id);
      };
    },
    [],
  );

  const searchFirmic = useCallback(
    async (query: string) => {
      const commandItems = commands.map(commandToSearchItem);

      // Tenant data providers are deliberately disabled in Admin mode.
      if (adminMode) {
        return rankSearchItems(commandItems, query);
      }

      const providers = Array.from(providersRef.current.values());

      const providerResults = await Promise.allSettled(
        providers.map(async (provider) => {
          const items = await provider.search(query);

          return items
            .filter((item) =>
              routeBelongsToMode(item.route, adminMode),
            )
            .map((item) => ({
              ...item,
              providerId: item.providerId || provider.id,
            }));
        }),
      );

      const externalItems: OSSearchItem[] = [];

      for (const result of providerResults) {
        if (result.status === "fulfilled") {
          externalItems.push(...result.value);
        } else {
          console.error(
            "A Firmic search provider failed.",
            result.reason,
          );
        }
      }

      return rankSearchItems(
        [...commandItems, ...externalItems],
        query,
      );
    },
    [adminMode, commands],
  );

  const executeSearchItem = useCallback(
    async (item: OSSearchItem) => {
      closeCommandPalette();

      try {
        if (item.action) {
          await item.action();
          return;
        }

        if (item.route) {
          await navigate(item.route);
          return;
        }

        console.warn(`Firmic search item "${item.id}" has no action.`);
      } catch (error) {
        console.error(
          `Firmic search item "${item.id}" failed.`,
          error,
        );
      }
    },
    [closeCommandPalette, navigate],
  );

  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      const pressedCommandPaletteShortcut =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k";

      if (pressedCommandPaletteShortcut) {
        event.preventDefault();
        toggleCommandPalette();
        return;
      }

      if (event.key === "Escape" && commandPaletteOpen) {
        event.preventDefault();
        closeCommandPalette();
        return;
      }

      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isEditableTarget(event.target)
      ) {
        event.preventDefault();
        openCommandPalette();
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () =>
      window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    closeCommandPalette,
    commandPaletteOpen,
    openCommandPalette,
    toggleCommandPalette,
  ]);

  const contextValue = useMemo(
    () => ({
      commandPaletteOpen,
      openCommandPalette,
      closeCommandPalette,
      toggleCommandPalette,
      navigate,
      commands,
      registerCommands,
      executeCommand,
      registerSearchProvider,
      searchFirmic,
      executeSearchItem,
    }),
    [
      closeCommandPalette,
      commandPaletteOpen,
      commands,
      executeCommand,
      executeSearchItem,
      navigate,
      openCommandPalette,
      registerCommands,
      registerSearchProvider,
      searchFirmic,
      toggleCommandPalette,
    ],
  );

  return (
    <OSContext.Provider value={contextValue}>
      {children}
      <CommandPalette />

      <button
        type="button"
        onClick={openCommandPalette}
        aria-label={`Open ${
          adminMode ? "Firmic Admin" : "Firmic"
        } command palette`}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-xl shadow-violet-600/30 transition hover:-translate-y-0.5 hover:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200 xl:hidden"
      >
        <Search className="h-6 w-6" />
      </button>
    </OSContext.Provider>
  );
}
