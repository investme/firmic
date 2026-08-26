import { useEffect, useMemo, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import { API_URL } from "../services/config";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";

type NotificationType =
  | "action_required"
  | "warning"
  | "pending"
  | "success"
  | "info"
  | string;

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  description?: string | null;
  created_at: string;
  read: boolean;
};

type NotificationsResponse = {
  company_id: string;
  unread: number;
  total_notifications: number;
  notifications: NotificationItem[];
};

type FilterKey =
  | "all"
  | "unread"
  | "action_required"
  | "pending"
  | "warning"
  | "success"
  | "info";

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "action_required", label: "Action Required" },
  { key: "pending", label: "Pending" },
  { key: "warning", label: "Warnings" },
  { key: "success", label: "Success" },
  { key: "info", label: "Information" },
];

export default function NotificationsPage() {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function syncWorkspace() {
      setWorkspace(getActiveWorkspace());
    }

    syncWorkspace();

    window.addEventListener(
      getWorkspaceChangedEventName(),
      syncWorkspace
    );
    window.addEventListener("storage", syncWorkspace);

    return () => {
      window.removeEventListener(
        getWorkspaceChangedEventName(),
        syncWorkspace
      );
      window.removeEventListener("storage", syncWorkspace);
    };
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [workspace?.id]);

  async function loadNotifications(manualRefresh = false) {
    if (!workspace?.id) {
      setNotifications([]);
      setError("");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      manualRefresh ? setRefreshing(true) : setLoading(true);
      setError("");

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("firmic_token")
          : null;

      if (!token) {
        throw new Error("Not authenticated.");
      }

      const response = await fetch(
        `${API_URL}/api/notifications/company/${workspace.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const detail =
          body?.detail ||
          body?.message ||
          `Notifications request failed with status ${response.status}`;

        throw new Error(
          typeof detail === "string"
            ? detail
            : JSON.stringify(detail)
        );
      }

      const result = body as NotificationsResponse;
      const returnedNotifications = Array.isArray(result?.notifications)
        ? result.notifications
        : [];

      setNotifications(
        returnedNotifications.map((item) => ({
          ...item,
          read: Boolean(item.read),
        }))
      );
    } catch (err: any) {
      setNotifications([]);
      setError(err?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function markNotificationRead(id: string) {
    if (!workspace?.id) {
      return;
    }

    try {
      setError("");

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("firmic_token")
          : null;

      if (!token) {
        throw new Error("Not authenticated.");
      }

      const response = await fetch(
        `${API_URL}/api/notifications/company/${workspace.id}/read/${id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const detail =
          body?.detail ||
          body?.message ||
          `Mark read request failed with status ${response.status}`;

        throw new Error(
          typeof detail === "string"
            ? detail
            : JSON.stringify(detail)
        );
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, read: true }
            : item
        )
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to mark notification as read."
      );
    }
  }

  async function markAllRead() {
    if (!workspace?.id) {
      return;
    }

    try {
      setError("");

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("firmic_token")
          : null;

      if (!token) {
        throw new Error("Not authenticated.");
      }

      const response = await fetch(
        `${API_URL}/api/notifications/company/${workspace.id}/read-all`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const detail =
          body?.detail ||
          body?.message ||
          `Mark all read request failed with status ${response.status}`;

        throw new Error(
          typeof detail === "string"
            ? detail
            : JSON.stringify(detail)
        );
      }

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
        }))
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to mark notifications as read."
      );
    }
  }

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "all") {
      return notifications;
    }

    if (activeFilter === "unread") {
      return notifications.filter((item) => !item.read);
    }

    return notifications.filter(
      (item) => normalizeType(item.type) === activeFilter
    );
  }, [notifications, activeFilter]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const actionRequiredCount = useMemo(
    () =>
      notifications.filter(
        (item) => normalizeType(item.type) === "action_required"
      ).length,
    [notifications]
  );

  const warningCount = useMemo(
    () =>
      notifications.filter(
        (item) => normalizeType(item.type) === "warning"
      ).length,
    [notifications]
  );

  const companyName = workspace?.name || "Active Company";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Notification Center
              </p>

              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                Important updates for {companyName}.
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Review actions, approvals, warnings, successes, and important
                updates from across your Firmic workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="border border-slate-200 bg-white text-slate-700 px-5 py-3 rounded-xl font-bold hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark All Read
              </button>

              <button
                type="button"
                onClick={() => void loadNotifications(true)}
                disabled={refreshing || !workspace?.id}
                className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </header>

          {!workspace?.id && (
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-3xl p-6 text-yellow-700">
              Select or create a company to view notifications.
            </div>
          )}

          {error && (
            <div className="mt-8 bg-red-50 border border-red-200 rounded-3xl p-6 text-red-700">
              <p className="font-bold">Unable to load notifications.</p>
              <p className="text-sm mt-1">{error}</p>

              <button
                type="button"
                onClick={() => void loadNotifications(true)}
                className="mt-4 border border-red-200 bg-white px-4 py-2 rounded-xl font-bold hover:bg-red-50 transition"
              >
                Try Again
              </button>
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <StatCard title="Unread" value={String(unreadCount)} icon="🔔" />
            <StatCard title="Total Notifications" value={String(notifications.length)} icon="📬" />
            <StatCard title="Action Required" value={String(actionRequiredCount)} icon="🔴" />
            <StatCard title="Warnings" value={String(warningCount)} icon="⚠️" />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6 mt-8">
            <div className="space-y-6">
              <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">Notifications</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Important company updates appear newest first.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {filters.map((filter) => {
                      const selected = activeFilter === filter.key;

                      return (
                        <button
                          key={filter.key}
                          type="button"
                          onClick={() => setActiveFilter(filter.key)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                            selected
                              ? "bg-violet-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {filter.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {loading ? (
                <NotificationState text="Loading notifications..." />
              ) : !workspace?.id ? (
                <NotificationState text="No company selected." />
              ) : filteredNotifications.length === 0 ? (
                <NotificationState
                  text={
                    activeFilter === "all"
                      ? "You're all caught up. No notifications."
                      : `No ${filterLabel(activeFilter).toLowerCase()} notifications found.`
                  }
                />
              ) : (
                <section className="space-y-4">
                  {filteredNotifications.map((item) => (
                    <NotificationCard
                      key={item.id}
                      item={item}
                      onMarkRead={markNotificationRead}
                    />
                  ))}
                </section>
              )}
            </div>

            <aside className="space-y-6">
              <section className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">Founder Attention</h2>
                <p className="text-violet-100 text-sm mt-2">
                  Firmic highlights events that may need a decision, approval,
                  review, or follow-up.
                </p>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <DarkMini title="Unread" value={String(unreadCount)} />
                  <DarkMini title="Action" value={String(actionRequiredCount)} />
                  <DarkMini title="Warnings" value={String(warningCount)} />
                  <DarkMini title="Total" value={String(notifications.length)} />
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">Notification Types</h2>

                <div className="space-y-3 mt-5">
                  <TypeRow icon="🔴" title="Action Required" value={countType(notifications, "action_required")} />
                  <TypeRow icon="🟡" title="Pending" value={countType(notifications, "pending")} />
                  <TypeRow icon="⚠️" title="Warnings" value={countType(notifications, "warning")} />
                  <TypeRow icon="🟢" title="Success" value={countType(notifications, "success")} />
                  <TypeRow icon="🔵" title="Information" value={countType(notifications, "info")} />
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">Notification Status</h2>
                <div className="mt-5 bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="text-sm text-green-700">Activity connection</p>
                  <p className="font-bold text-green-800">Connected</p>
                </div>
                <p className="text-sm text-slate-500 mt-4">
                  Notifications are derived from company Activity Log events.
                  Read status is stored in the browser for this session.
                </p>
              </section>
            </aside>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function NotificationCard({ item, onMarkRead }: { item: NotificationItem; onMarkRead: (id: string) => void }) {
  const presentation = getTypePresentation(item.type);

  return (
    <article className={`border rounded-3xl p-5 shadow-sm transition ${item.read ? "bg-white border-slate-200" : "bg-violet-50/50 border-violet-200"}`}>
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${presentation.iconClass}`}>
          {presentation.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${presentation.badgeClass}`}>
              {presentation.label}
            </span>

            {!item.read && (
              <span className="bg-violet-600 text-white px-3 py-1 rounded-full text-xs font-bold">UNREAD</span>
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-950 mt-3">
            {item.title || "Firmic notification"}
          </h3>

          {item.description && (
            <p className="text-sm text-slate-500 mt-1 whitespace-pre-line">{item.description}</p>
          )}

          <p className="text-xs text-slate-400 mt-4">
            {formatRelativeTime(item.created_at)} · {formatFullDate(item.created_at)}
          </p>
        </div>

        {!item.read && (
          <button
            type="button"
            onClick={() => onMarkRead(item.id)}
            className="border border-slate-200 bg-white px-4 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition shrink-0"
          >
            Mark Read
          </button>
        )}
      </div>
    </article>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function DarkMini({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 text-center">
      <p className="text-xs text-violet-100">{title}</p>
      <p className="font-bold text-xl mt-1">{value}</p>
    </div>
  );
}

function TypeRow({ icon, title, value }: { icon: string; title: string; value: number }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="font-semibold">{title}</span>
      </div>
      <span className="bg-white border border-slate-200 rounded-xl px-3 py-1 text-sm font-bold">{value}</span>
    </div>
  );
}

function NotificationState({ text }: { text: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-slate-500">{text}</div>
  );
}

function normalizeType(type?: string | null): FilterKey {
  const value = String(type || "").toLowerCase();

  if (value === "action_required" || value === "action" || value === "required") return "action_required";
  if (value === "pending" || value === "approval" || value === "pending_approval") return "pending";
  if (value === "warning" || value === "error" || value === "failed") return "warning";
  if (value === "success" || value === "completed") return "success";
  return "info";
}

function getTypePresentation(type?: string | null) {
  const normalized = normalizeType(type);

  switch (normalized) {
    case "action_required":
      return { icon: "🔴", label: "ACTION REQUIRED", iconClass: "bg-red-100", badgeClass: "bg-red-100 text-red-700" };
    case "pending":
      return { icon: "🟡", label: "PENDING", iconClass: "bg-yellow-100", badgeClass: "bg-yellow-100 text-yellow-700" };
    case "warning":
      return { icon: "⚠️", label: "WARNING", iconClass: "bg-orange-100", badgeClass: "bg-orange-100 text-orange-700" };
    case "success":
      return { icon: "🟢", label: "SUCCESS", iconClass: "bg-green-100", badgeClass: "bg-green-100 text-green-700" };
    default:
      return { icon: "🔵", label: "INFORMATION", iconClass: "bg-blue-100", badgeClass: "bg-blue-100 text-blue-700" };
  }
}

function countType(notifications: NotificationItem[], type: FilterKey) {
  return notifications.filter((item) => normalizeType(item.type) === type).length;
}

function filterLabel(key: FilterKey) {
  return filters.find((filter) => filter.key === key)?.label || "Notifications";
}

function formatFullDate(value?: string | null) {
  if (!value) return "Time not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Time not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const difference = Date.now() - date.getTime();
  if (difference < 0) return formatFullDate(value);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (difference < minute) return "Just now";
  if (difference < hour) {
    const minutes = Math.floor(difference / minute);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (difference < day) {
    const hours = Math.floor(difference / hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (difference < 7 * day) {
    const days = Math.floor(difference / day);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return formatFullDate(value);
}
