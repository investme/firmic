import type { NextRouter } from "next/router";

export type SonnyActionType =
  | "open_page"
  | "open_url"
  | "open_document"
  | "frontend_action";

export type SonnyAction = {
  type: SonnyActionType;
  target?: string;
  label?: string;
  document_id?: string;
  document_name?: string;
  name?: string;
  payload?: Record<string, unknown>;
};

export type SonnyFrontendActions = {
  refresh?: () => void | Promise<void>;
  start_listening?: () => void | Promise<void>;
  stop_speaking?: () => void | Promise<void>;
  scroll_to_bottom?: () => void | Promise<void>;
};

type ExecutorOptions = {
  router: NextRouter;
  frontendActions?: SonnyFrontendActions;
};

const ALLOWED_PAGE_PREFIXES = [
  "/dashboard",
  "/tasks",
  "/documents",
  "/timeline",
  "/notifications",
  "/billing",
  "/reports",
  "/crm",
  "/mailbox",
  "/meeting-rooms",
  "/ai-workforce",
  "/hermes",
  "/sonny",
  "/settings",
  "/integrations",
  "/microsoft-365",
  "/my-office",
];

const ALLOWED_EXTERNAL_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "google.com",
  "www.google.com",
  "github.com",
  "www.github.com",
  "hub71.com",
  "www.hub71.com",
  "openai.com",
  "www.openai.com",
  "microsoft.com",
  "www.microsoft.com",
]);

function isAllowedPage(target: string): boolean {
  if (!target.startsWith("/") || target.startsWith("//")) return false;
  return ALLOWED_PAGE_PREFIXES.some(
    (path) => target === path || target.startsWith(`${path}?`)
  );
}

function isAllowedExternalUrl(target: string): boolean {
  try {
    const url = new URL(target);
    return url.protocol === "https:" && ALLOWED_EXTERNAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export async function executeSonnyAction(
  action: SonnyAction,
  options: ExecutorOptions
): Promise<void> {
  switch (action.type) {
    case "open_page": {
      const target = String(action.target || "");
      if (!isAllowedPage(target)) {
        throw new Error("Sonny blocked an unapproved Firmic destination.");
      }
      await options.router.push(target);
      return;
    }

    case "open_url": {
      const target = String(action.target || "");
      if (!isAllowedExternalUrl(target)) {
        throw new Error("Sonny blocked an unapproved external website.");
      }
      const opened = window.open(target, "_blank", "noopener,noreferrer");
      if (!opened) {
        throw new Error("The browser blocked the new tab. Please allow pop-ups for Firmic.");
      }
      return;
    }

    case "open_document": {
      const documentId = String(action.document_id || "").trim();
      const documentName = String(action.document_name || "").trim();
      const query = documentId
        ? `document_id=${encodeURIComponent(documentId)}`
        : documentName
          ? `document_name=${encodeURIComponent(documentName)}`
          : "";

      await options.router.push(query ? `/documents?${query}` : "/documents");
      return;
    }

    case "frontend_action": {
      const name = String(action.name || action.target || "").trim();
      const handler = options.frontendActions?.[name as keyof SonnyFrontendActions];
      if (!handler) {
        throw new Error(`Unsupported frontend action: ${name || "unknown"}.`);
      }
      await handler();
      return;
    }

    default:
      throw new Error("Sonny returned an unsupported action type.");
  }
}

export async function executeSonnyActions(
  actions: SonnyAction[] | undefined,
  options: ExecutorOptions
): Promise<void> {
  for (const action of actions || []) {
    await executeSonnyAction(action, options);
  }
}
