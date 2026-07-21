import { useEffect, useMemo, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import { API_URL } from "../services/config";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";

type TimelineEvent = {
  id: string;
  company_id?: string;
  event_type: string;
  title: string;
  description?: string | null;
  actor_type?: string | null;
  actor_id?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

type TimelineResponse = {
  company_id: string;
  total_events: number;
  events: TimelineEvent[];
};

type FilterKey = "all" | "tasks" | "documents" | "meetings" | "billing" | "sonny";

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "tasks", label: "Tasks" },
  { key: "documents", label: "Documents" },
  { key: "meetings", label: "Meetings" },
  { key: "billing", label: "Billing" },
  { key: "sonny", label: "Sonny" },
];

export default function Timeline() {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function syncWorkspace() {
      setWorkspace(getActiveWorkspace());
    }

    syncWorkspace();
    window.addEventListener(getWorkspaceChangedEventName(), syncWorkspace);
    window.addEventListener("storage", syncWorkspace);

    return () => {
      window.removeEventListener(getWorkspaceChangedEventName(), syncWorkspace);
      window.removeEventListener("storage", syncWorkspace);
    };
  }, []);

  useEffect(() => {
    void loadTimeline();
  }, [workspace?.id]);

  async function loadTimeline(manualRefresh = false) {
    if (!workspace?.id) {
      setEvents([]);
      setTotalEvents(0);
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

      if (!token) throw new Error("Not authenticated.");

      const response = await fetch(
        `${API_URL}/api/timeline/company/${workspace.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const detail =
          body?.detail ||
          body?.message ||
          `Timeline request failed with status ${response.status}`;

        throw new Error(
          typeof detail === "string" ? detail : JSON.stringify(detail)
        );
      }

      const result = body as TimelineResponse;
      const returnedEvents = Array.isArray(result?.events) ? result.events : [];

      setEvents(returnedEvents);
      setTotalEvents(
        typeof result?.total_events === "number"
          ? result.total_events
          : returnedEvents.length
      );
    } catch (err: any) {
      setEvents([]);
      setTotalEvents(0);
      setError(err?.message || "Unable to load timeline.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const filteredEvents = useMemo(() => {
    if (activeFilter === "all") return events;
    return events.filter((event) => matchesFilter(event, activeFilter));
  }, [events, activeFilter]);

  const todayCount = useMemo(
    () => events.filter((event) => isToday(event.created_at)).length,
    [events]
  );

  const aiCount = useMemo(
    () => events.filter((event) => isAIEvent(event)).length,
    [events]
  );

  const founderCount = useMemo(
    () => events.filter((event) => isFounderEvent(event)).length,
    [events]
  );

  const companyName = workspace?.name || "Active Company";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">Company Timeline</p>
              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                Activity history for {companyName}.
              </h1>
              <p className="text-slate-500 mt-2 max-w-3xl">
                Review company actions from founders, Sonny, Hermes, workflows,
                documents, meetings, tasks, and Firmic services.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadTimeline(true)}
              disabled={refreshing || !workspace?.id}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {refreshing ? "Refreshing..." : "Refresh Timeline"}
            </button>
          </header>

          {!workspace?.id && (
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-3xl p-6 text-yellow-700">
              Select or create a company to view its timeline.
            </div>
          )}

          {error && (
            <div className="mt-8 bg-red-50 border border-red-200 rounded-3xl p-6 text-red-700">
              <p className="font-bold">Unable to load timeline.</p>
              <p className="text-sm mt-1">{error}</p>
              <button
                type="button"
                onClick={() => void loadTimeline(true)}
                className="mt-4 border border-red-200 bg-white px-4 py-2 rounded-xl font-bold hover:bg-red-50 transition"
              >
                Try Again
              </button>
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat title="Total Events" value={String(totalEvents)} icon="📌" />
            <Stat title="Today" value={String(todayCount)} icon="🕒" />
            <Stat title="AI Events" value={String(aiCount)} icon="🤖" />
            <Stat title="Founder Events" value={String(founderCount)} icon="👤" />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6 mt-8">
            <div className="space-y-6">
              <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">Activity Feed</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Newest company activity appears first.
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
                <TimelineState text="Loading company timeline..." />
              ) : !workspace?.id ? (
                <TimelineState text="No company selected." />
              ) : filteredEvents.length === 0 ? (
                <TimelineState
                  text={
                    activeFilter === "all"
                      ? "No company activity yet. Start using Firmic and your company timeline will automatically appear here."
                      : `No ${filterLabel(activeFilter).toLowerCase()} activity found.`
                  }
                />
              ) : (
                <section className="relative">
                  <div className="absolute left-[27px] top-7 bottom-7 w-px bg-slate-200 hidden sm:block" />
                  <div className="space-y-4">
                    {filteredEvents.map((event) => (
                      <ActivityCard key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-6">
              <section className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">Firmic Activity Engine</h2>
                <p className="text-violet-100 text-sm mt-2">
                  Firmic records operational events so founders can understand
                  what happened, who acted, and which company resource changed.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <DarkMini title="Events" value={String(totalEvents)} />
                  <DarkMini title="Today" value={String(todayCount)} />
                  <DarkMini title="AI" value={String(aiCount)} />
                  <DarkMini title="Founder" value={String(founderCount)} />
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">Activity Sources</h2>
                <div className="space-y-3 mt-5">
                  <SourceRow icon="✅" title="Tasks" value={countByFilter(events, "tasks")} />
                  <SourceRow icon="📄" title="Documents" value={countByFilter(events, "documents")} />
                  <SourceRow icon="📅" title="Meetings" value={countByFilter(events, "meetings")} />
                  <SourceRow icon="💳" title="Billing" value={countByFilter(events, "billing")} />
                  <SourceRow icon="🤖" title="Sonny" value={countByFilter(events, "sonny")} />
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">Timeline Status</h2>
                <div className="mt-5 bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="text-sm text-green-700">Activity logging</p>
                  <p className="font-bold text-green-800">Connected</p>
                </div>
                <p className="text-sm text-slate-500 mt-4">
                  Events are loaded directly from the company Activity Log and
                  displayed newest first.
                </p>
              </section>
            </aside>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function ActivityCard({ event }: { event: TimelineEvent }) {
  const presentation = getEventPresentation(event);

  return (
    <article className="relative bg-white border border-slate-200 rounded-3xl p-5 shadow-sm sm:pl-20">
      <div className="sm:absolute sm:left-4 sm:top-5 h-11 w-11 rounded-2xl bg-violet-100 flex items-center justify-center text-xl ring-4 ring-slate-50">
        {presentation.icon}
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold">
              {presentation.category}
            </span>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
              {actorLabel(event)}
            </span>
          </div>

          <h3 className="text-lg font-bold text-slate-950 mt-3">
            {event.title || label(event.event_type)}
          </h3>

          {event.description && (
            <p className="text-sm text-slate-500 mt-1 whitespace-pre-line">
              {event.description}
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs text-slate-400">
            {event.source_type && <span>Source: {label(event.source_type)}</span>}
            {event.actor_id && <span>Actor ID: {event.actor_id}</span>}
          </div>
        </div>

        <div className="md:text-right shrink-0">
          <p className="text-sm font-semibold text-slate-700">
            {formatRelativeTime(event.created_at)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {formatFullDate(event.created_at)}
          </p>
        </div>
      </div>
    </article>
  );
}

function Stat({ title, value, icon }: { title: string; value: string; icon: string }) {
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

function SourceRow({ icon, title, value }: { icon: string; title: string; value: number }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <span className="font-semibold">{title}</span>
      </div>
      <span className="bg-white border border-slate-200 rounded-xl px-3 py-1 text-sm font-bold">
        {value}
      </span>
    </div>
  );
}

function TimelineState({ text }: { text: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-slate-500">
      {text}
    </div>
  );
}

function matchesFilter(event: TimelineEvent, filter: FilterKey) {
  const haystack = [
    event.event_type,
    event.title,
    event.description,
    event.actor_type,
    event.source_type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  switch (filter) {
    case "tasks":
      return includesAny(haystack, ["task", "work_item"]);
    case "documents":
      return includesAny(haystack, ["document", "compliance", "kyb", "hermes"]);
    case "meetings":
      return includesAny(haystack, ["meeting", "booking", "room", "calendar"]);
    case "billing":
      return includesAny(haystack, ["billing", "invoice", "payment", "subscription", "ledger", "charge"]);
    case "sonny":
      return includesAny(haystack, ["sonny", "orchestration", "assignment", "workforce_job", "workflow", "agent"]);
    default:
      return true;
  }
}

function countByFilter(events: TimelineEvent[], filter: FilterKey) {
  return events.filter((event) => matchesFilter(event, filter)).length;
}

function getEventPresentation(event: TimelineEvent) {
  const haystack = [event.event_type, event.source_type, event.actor_type, event.title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (includesAny(haystack, ["task", "work_item"])) return { icon: "✅", category: "Task" };
  if (includesAny(haystack, ["document", "compliance", "kyb", "hermes"])) return { icon: "📄", category: "Document" };
  if (includesAny(haystack, ["meeting", "booking", "calendar", "room"])) return { icon: "📅", category: "Meeting" };
  if (includesAny(haystack, ["billing", "invoice", "payment", "ledger", "charge", "subscription"])) return { icon: "💳", category: "Billing" };
  if (includesAny(haystack, ["office", "headquarters", "workspace"])) return { icon: "🏢", category: "Office" };
  if (includesAny(haystack, ["sonny", "agent", "workflow", "orchestration", "assignment", "workforce_job"])) return { icon: "🤖", category: "AI Workforce" };

  return {
    icon: "📌",
    category: label(event.source_type || event.event_type || "Activity"),
  };
}

function actorLabel(event: TimelineEvent) {
  const actor = String(event.actor_type || event.actor_id || "System").toLowerCase();

  if (includesAny(actor, ["sonny", "agent", "ai", "workflow", "system"])) {
    return label(event.actor_type || "System");
  }

  if (includesAny(actor, ["founder", "owner", "tenant", "user", "human"])) {
    return "Founder";
  }

  return label(event.actor_type || event.actor_id || "System");
}

function isAIEvent(event: TimelineEvent) {
  const value = [
    event.actor_type,
    event.actor_id,
    event.event_type,
    event.source_type,
    event.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return includesAny(value, [
    "sonny",
    "hermes",
    "agent",
    "ai",
    "workflow",
    "orchestration",
    "automation",
    "system",
    "workforce_job",
  ]);
}

function isFounderEvent(event: TimelineEvent) {
  const value = [event.actor_type, event.actor_id]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return includesAny(value, ["founder", "owner", "tenant", "user", "human"]);
}

function isToday(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
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

function filterLabel(key: FilterKey) {
  return filters.find((filter) => filter.key === key)?.label || "Activity";
}

function label(value?: string | null) {
  if (!value) return "Unknown";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}
