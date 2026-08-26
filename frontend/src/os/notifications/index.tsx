import {
  Bell, CheckCheck, ExternalLink, Plus, RefreshCw, Search, Sparkles, X
} from "lucide-react";
import { useRouter } from "next/router";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode
} from "react";

import { API_URL } from "../../../services/config";
import { getActiveWorkspace, getWorkspaceChangedEventName } from "../../utils/workspaceContext";
import { useEvents } from "../events";

type Tone = "info" | "success" | "warning" | "danger" | "ai";

export type FirmicNotification = {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  read: boolean;
  tone: Tone;
  source?: string;
  workspaceId?: string;
  href?: string;
  eventId?: string;
};

type ContextValue = {
  notifications: FirmicNotification[];
  unreadCount: number;
  loading: boolean;
  panelOpen: boolean;
  togglePanel: () => void;
  closePanel: () => void;
  refresh: () => Promise<void>;
  push: (item: Omit<FirmicNotification, "id" | "createdAt" | "read"> & {
    id?: string; createdAt?: string; read?: boolean;
  }) => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (id: string) => void;
};

const Context = createContext<ContextValue | null>(null);

function useNotificationContext() {
  const value = useContext(Context);
  if (!value) throw new Error("Notification components require FirmicNotificationSystem.");
  return value;
}


function toneFor(type: string): Tone {
  const value = type.toLowerCase();
  if (/(failed|error|overdue|rejected)/.test(value)) return "danger";
  if (/(warning|pending|required)/.test(value)) return "warning";
  if (/(completed|created|approved|paid|success)/.test(value)) return "success";
  if (/(ai\.|sonny|hermes|julia)/.test(value)) return "ai";
  return "info";
}

function hrefFor(type: string) {
  const value = type.toLowerCase();
  if (value.includes("company")) return "/companies";
  if (value.includes("task")) return "/tasks";
  if (value.includes("document")) return "/documents";
  if (value.includes("invoice") || value.includes("billing")) return "/billing";
  if (value.includes("meeting")) return "/meeting-rooms";
  if (value.includes("hermes") || value.includes("compliance")) return "/hermes";
  if (value.includes("sonny")) return "/sonny";
  if (value.includes("julia") || value.includes("lead")) return "/crm";
  if (value.includes("ai.job") || value.includes("workforce")) return "/ai-workforce";
  return "/notifications";
}

function titleFor(type: string) {
  return type.replace(/[._]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function descriptionFor(payload: unknown) {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  const value = record.message || record.description || record.result_summary || record.title;
  return typeof value === "string" ? value : undefined;
}

function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Recently";
  const difference = Date.now() - time;
  if (difference < 60_000) return "Just now";
  if (difference < 3_600_000) return `${Math.floor(difference / 60_000)}m ago`;
  if (difference < 86_400_000) return `${Math.floor(difference / 3_600_000)}h ago`;
  return `${Math.floor(difference / 86_400_000)}d ago`;
}

function NotificationProvider({ children }: { children: ReactNode }) {
  const { publish } = useEvents();
  const [workspaceId, setWorkspaceId] = useState(() => getActiveWorkspace()?.id || "");
  const [notifications, setNotifications] = useState<FirmicNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const sync = () => setWorkspaceId(getActiveWorkspace()?.id || "");
    window.addEventListener(getWorkspaceChangedEventName(), sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(getWorkspaceChangedEventName(), sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!workspaceId) {
      setNotifications([]);
      return;
    }

    const token = localStorage.getItem("firmic_token");
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/notifications/company/${encodeURIComponent(workspaceId)}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.detail || "Notification request failed.");

      const items = Array.isArray(body?.notifications)
        ? body.notifications
        : Array.isArray(body) ? body : [];

      setNotifications((current) => {
        const live = current.filter((item) => item.source === "event-bus");
        const api = items.map((item: any) => {
          const type = String(item.type || "info");
          return {
            id: String(item.id),
            type,
            title: item.title || "Firmic notification",
            description: item.description || undefined,
            createdAt: item.created_at || new Date().toISOString(),
            read: Boolean(item.read),
            tone: toneFor(type),
            source: item.source || "firmic-api",
            workspaceId,
            href: item.href || hrefFor(type),
          } satisfies FirmicNotification;
        });
        const unique = new Map<string, FirmicNotification>();
        [...live, ...api].forEach((item) => unique.set(item.id, item));
        return [...unique.values()].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      });
    } catch (error) {
      console.warn("Firmic notifications could not be refreshed.", error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!workspaceId || typeof window === "undefined") return;

    const token = localStorage.getItem("firmic_token");
    if (!token) return;

    const controller = new AbortController();

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let lastEventId: string | null = null;
    let stopped = false;

    const reconnectDelay = () =>
      Math.min(30_000, 1_000 * (2 ** Math.min(reconnectAttempt, 5)));

    const connect = async () => {
      if (stopped || controller.signal.aborted) return;

      try {
        const headers: Record<string, string> = {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
        };

        if (lastEventId) {
          headers["Last-Event-ID"] = lastEventId;
        }

        const response = await fetch(
          `${API_URL}/api/notifications/company/${encodeURIComponent(workspaceId)}/stream`,
          {
            method: "GET",
            headers,
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            `Notification stream failed with status ${response.status}`,
          );
        }

        if (!response.body) {
          throw new Error("Notification stream response has no body.");
        }

        reconnectAttempt = 0;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";

        while (!stopped && !controller.signal.aborted) {
          const { value, done } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          buffer = buffer.replace(/\r\n/g, "\n");

          let boundary = buffer.indexOf("\n\n");

          while (boundary !== -1) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);

            let eventName = "message";
            let eventId = "";
            const dataLines: string[] = [];

            for (const line of frame.split("\n")) {
              if (!line || line.startsWith(":")) continue;

              if (line.startsWith("id:")) {
                eventId = line.slice(3).trimStart();
                continue;
              }

              if (line.startsWith("event:")) {
                eventName = line.slice(6).trimStart();
                continue;
              }

              if (line.startsWith("data:")) {
                dataLines.push(line.slice(5).trimStart());
              }
            }

            if (eventId) {
              lastEventId = eventId;
            }

            if (
              eventName === "notification.created" &&
              dataLines.length > 0
            ) {
              const payload = JSON.parse(dataLines.join("\n"));

              await publish({
                type: "notification.created",
                payload,
                metadata: {
                  source: "notification-sse",
                  workspaceId,
                },
              });

              setNotifications((current) => {
                const incomingId = String(payload?.id || "");

                if (!incomingId) {
                  return current;
                }

                const alreadyPresent = current.some(
                  (notification) =>
                    String(notification.id) === incomingId,
                );

                if (alreadyPresent) {
                  return current;
                }

                const type = String(
                  payload?.type || "info",
                );

                const notification: FirmicNotification = {
                  id: incomingId,
                  type,
                  title:
                    payload?.title ||
                    "Firmic notification",
                  description:
                    payload?.description ||
                    undefined,
                  createdAt:
                    payload?.created_at ||
                    new Date().toISOString(),
                  read: Boolean(payload?.read),
                  tone: toneFor(type),
                  source: "notification-sse",
                  workspaceId,
                  href:
                    payload?.href ||
                    hrefFor(type),
                  eventId:
                    eventId ||
                    incomingId,
                };

                return [
                  notification,
                  ...current,
                ].slice(0, 150);
              });
            }

            boundary = buffer.indexOf("\n\n");
          }
        }
      } catch (error) {
        if (stopped || controller.signal.aborted) return;

        console.warn(
          "Firmic notification stream disconnected.",
          error,
        );
      }

      if (stopped || controller.signal.aborted) return;

      const delay = reconnectDelay();
      reconnectAttempt += 1;

      reconnectTimer = setTimeout(() => {
        void connect();
      }, delay);
    };

    void connect();

    return () => {
      stopped = true;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      controller.abort();
    };
  }, [publish, workspaceId]);

  const push = useCallback<ContextValue["push"]>((input) => {
    const item: FirmicNotification = {
      ...input,
      id: input.id || `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: input.createdAt || new Date().toISOString(),
      read: input.read ?? false,
      tone: input.tone || toneFor(input.type),
      workspaceId: input.workspaceId || workspaceId || undefined,
      href: input.href || hrefFor(input.type),
    };
    setNotifications((current) => {
      if (current.some((existing) =>
        existing.id === item.id || Boolean(item.eventId && existing.eventId === item.eventId)
      )) return current;
      return [item, ...current].slice(0, 150);
    });
  }, [workspaceId]);

  const markRead = useCallback(async (id: string) => {
    if (!workspaceId || typeof window === "undefined") return;

    const token = localStorage.getItem("firmic_token");
    if (!token) return;

    const response = await fetch(
      `${API_URL}/api/notifications/company/${encodeURIComponent(workspaceId)}/read/${encodeURIComponent(id)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        `Mark notification read failed with status ${response.status}`,
      );
    }

    setNotifications((current) => current.map((item) =>
      item.id === id ? { ...item, read: true } : item
    ));
  }, [workspaceId]);

  const markAllRead = useCallback(async () => {
    if (!workspaceId || typeof window === "undefined") return;

    const token = localStorage.getItem("firmic_token");
    if (!token) return;

    const response = await fetch(
      `${API_URL}/api/notifications/company/${encodeURIComponent(workspaceId)}/read-all`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        `Mark all notifications read failed with status ${response.status}`,
      );
    }

    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true }))
    );
  }, [workspaceId]);

  const value = useMemo<ContextValue>(() => ({
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
    loading,
    panelOpen,
    togglePanel: () => setPanelOpen((current) => !current),
    closePanel: () => setPanelOpen(false),
    refresh,
    push,
    markRead,
    markAllRead,
    dismiss: (id) => setNotifications((current) => current.filter((item) => item.id !== id)),
  }), [loading, markAllRead, markRead, notifications, panelOpen, push, refresh]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

function EventBridge() {
  const { subscribeAll } = useEvents();
  const { push } = useNotificationContext();

  useEffect(() => subscribeAll((event) => {
    if (event.type === "notification.created") return;
    if (!/^(action|company|task|document|invoice|meeting|ai\.job)\./.test(event.type)) return;

    push({
      id: `event-${event.id}`,
      eventId: event.id,
      type: event.type,
      title: titleFor(event.type),
      description: descriptionFor(event.payload),
      tone: toneFor(event.type),
      source: "event-bus",
      workspaceId: event.metadata.workspaceId,
      href: hrefFor(event.type),
    });
  }), [push, subscribeAll]);

  return null;
}

const toneClasses: Record<Tone, string> = {
  info: "bg-blue-50 text-blue-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  ai: "bg-violet-50 text-violet-700",
};

function Center() {
  const router = useRouter();
  const value = useNotificationContext();

  useEffect(() => {
    if (!value.panelOpen) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && value.closePanel();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [value]);

  if (!value.panelOpen) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <button className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={value.closePanel} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
        <header className="border-b border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Bell className="h-5 w-5 text-violet-600" /> Notifications
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {value.unreadCount ? `${value.unreadCount} unread updates` : "You are all caught up"}
              </p>
            </div>
            <button onClick={value.closePanel} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={value.markAllRead}
              disabled={!value.unreadCount}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-40"
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
            <button
              onClick={() => void value.refresh()}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"
            >
              <RefreshCw className={`h-4 w-4 ${value.loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {value.notifications.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed bg-white p-8 text-center">
              <Bell className="h-8 w-8 text-violet-600" />
              <h3 className="mt-4 text-lg font-bold">No notifications yet</h3>
              <p className="mt-2 text-sm text-slate-500">Company and AI workforce activity will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {value.notifications.map((item) => (
                <article key={item.id} className={`rounded-2xl border p-4 ${item.read ? "bg-white" : "border-violet-200 bg-violet-50/40"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses[item.tone]}`}>
                      <Bell className="h-5 w-5" />
                    </div>
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={async () => {
                        value.markRead(item.id);
                        if (item.href) {
                          value.closePanel();
                          await router.push(item.href);
                        }
                      }}
                    >
                      <div className="flex justify-between gap-3">
                        <h3 className="text-sm font-bold">{item.title}</h3>
                        {!item.read && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-violet-600" />}
                      </div>
                      {item.description && <p className="mt-1 text-sm text-slate-500">{item.description}</p>}
                      <p className="mt-2 text-xs text-slate-400">{relativeTime(item.createdAt)}{item.source ? ` • ${item.source}` : ""}</p>
                    </button>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    {item.href && (
                      <button
                        onClick={async () => {
                          value.markRead(item.id);
                          value.closePanel();
                          await router.push(item.href!);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-violet-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open
                      </button>
                    )}
                    <button onClick={() => value.dismiss(item.id)} className="p-1 text-slate-400 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="border-t bg-white p-4">
          <a href="/notifications" onClick={value.closePanel} className="block rounded-xl bg-slate-950 py-3 text-center text-sm font-bold text-white">
            Open Notification Archive
          </a>
        </footer>
      </aside>
    </div>
  );
}

export function FirmicNotificationSystem({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <EventBridge />
      {children}
      <Center />
    </NotificationProvider>
  );
}

export function NotificationBell() {
  const value = useNotificationContext();
  return (
    <button
      onClick={value.togglePanel}
      className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-violet-50 hover:text-violet-700"
    >
      <Bell className="h-5 w-5" />
      {value.unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white">
          {value.unreadCount > 99 ? "99+" : value.unreadCount}
        </span>
      )}
    </button>
  );
}

export function NotificationBadge() {
  const value = useNotificationContext();
  if (!value.unreadCount) return null;
  return (
    <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
      {value.unreadCount > 99 ? "99+" : value.unreadCount}
    </span>
  );
}
