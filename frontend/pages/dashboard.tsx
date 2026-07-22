import { useEffect, useMemo, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import { API_URL } from "../services/config";
import { toAED } from "../src/data/pricing";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";
import { getCompanyAIAgents } from "../services/aiWorkforceApi";
import { getCompanyMeetingBookings } from "../services/meetingBookingApi";
import { getCompanyLedgerSummary } from "../services/ledgerApi";
import { getCompanyActivity } from "../services/activityApi";
import { getCompanyTasks } from "../services/taskApi";
import {
  AIOnlinePill,
  AnimatedMetric,
  useLiveRelativeTime,
  AIWorkforceActivity,
  AIWorkforceStatus,
  CompanyHealthRing,
  ExecutiveActivityFeed,
  ExecutiveTimeline,
} from "../src/os/ui";


type ActiveAgent = {
  id: string;
  agent_name: string;
  monthly_price_usd: number;
};

type Booking = {
  id: string;
  room_name: string;
  booking_date: string;
  booking_time: string;
  duration_hours: number;
  hourly_price_usd: number;
};

type LedgerSummary = {
  subtotal: number;
  tax: number;
  total: number;
  services: Array<{
    service: string;
    total: number;
    entries: number;
  }>;
};

type Activity = {
  id: string;
  event_type: string;
  title: string;
  description?: string;
  actor_type?: string;
  source_type?: string;
  created_at?: string;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  created_at: string;
  read: boolean;
};

type TaskItem = {
  id: string | number;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
};

type ExecutiveIntelligence = {
  business_health?: {
    score?: number;
    status?: string;
  };
  health_score?: number;
  status?: string;
  company_status?: string;
  compliance?: {
    score?: number;
    status?: string;
  };
  revenue?: {
    total?: number;
    status?: string;
  };
  kpis?: Array<{
    name?: string;
    label?: string;
    value?: string | number;
  }>;
  risks?: Array<{
    title?: string;
    description?: string;
    severity?: string;
  }>;
  recommendations?: Array<{
    title?: string;
    description?: string;
    priority?: string;
  }>;
  executive_brief?: string;
  brief?: string;
};

type WorkforceStatus = {
  name: string;
  role: string;
  status: string;
  detail: string;
};

export default function Dashboard() {
  const [workspace, setWorkspace] = useState(() =>
    getActiveWorkspace()
  );
  const [agents, setAgents] = useState<ActiveAgent[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [intelligence, setIntelligence] =
    useState<ExecutiveIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewedAt, setReviewedAt] = useState<Date | null>(null);

  useEffect(() => {
    const sync = () => setWorkspace(getActiveWorkspace());

    sync();
    window.addEventListener(getWorkspaceChangedEventName(), sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(getWorkspaceChangedEventName(), sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [workspace?.id]);

  async function loadDashboard() {
    if (!workspace?.id) {
      setAgents([]);
      setBookings([]);
      setSummary(null);
      setActivity([]);
      setNotifications([]);
      setTasks([]);
      setIntelligence(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        getCompanyAIAgents(workspace.id),
        getCompanyMeetingBookings(workspace.id),
        getCompanyLedgerSummary(workspace.id),
        getCompanyActivity(workspace.id),
        getCompanyTasks(workspace.id),
        fetchCompanyResource(
          `/api/notifications/company/${workspace.id}`
        ),
        fetchCompanyResource(
          `/api/timeline/company/${workspace.id}`
        ),
        fetchCompanyResource(
          `/api/executive-intelligence/${workspace.id}`
        ),
      ]);

      setAgents(
        fulfilledArray<ActiveAgent>(results[0])
      );

      setBookings(
        fulfilledArray<Booking>(results[1])
      );

      setSummary(
        results[2].status === "fulfilled"
          ? results[2].value
          : null
      );

      const legacyActivity =
        fulfilledArray<Activity>(results[3]);

      setTasks(
        fulfilledArray<TaskItem>(results[4])
      );

      const notificationsBody =
        results[5].status === "fulfilled"
          ? results[5].value
          : null;

      setNotifications(
        Array.isArray(notificationsBody?.notifications)
          ? notificationsBody.notifications
          : []
      );

      const timelineBody =
        results[6].status === "fulfilled"
          ? results[6].value
          : null;

      const timelineEvents =
        Array.isArray(timelineBody?.events)
          ? timelineBody.events
          : [];

      setActivity(
        timelineEvents.length > 0
          ? timelineEvents
          : legacyActivity
      );

      setIntelligence(
        results[7].status === "fulfilled"
          ? results[7].value
          : null
      );

      if (
        results.some(
          (result) => result.status === "rejected"
        )
      ) {
        setError(
          "Some Command Center modules could not be loaded. Available company data is still shown."
        );
      }
    } finally {
      setReviewedAt(new Date());
      setLoading(false);
    }
  }

  const headquarters = workspace?.headquarters;
  const hasOffice = Boolean(headquarters?.office_code);
  const companyName = workspace?.name || "Active Company";
  const officeCode =
    headquarters?.office_code || "Not Selected";
  const officeLocation =
    headquarters?.location || "No headquarters selected";
  const businessNumber =
    headquarters?.phone || "Not Assigned";
  const officePrice =
    headquarters?.monthly_price_usd || 0;
  const plan = workspace?.plan || "Premium";

  const totalBookedHours = useMemo(
    () =>
      bookings.reduce(
        (sum, booking) =>
          sum + Number(booking.duration_hours || 0),
        0
      ),
    [bookings]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.read),
    [notifications]
  );

  const actionRequiredCount = useMemo(
    () =>
      notifications.filter(
        (item) => normalizeNotificationType(item.type) === "action_required"
      ).length,
    [notifications]
  );

  const warningCount = useMemo(
    () =>
      notifications.filter(
        (item) => normalizeNotificationType(item.type) === "warning"
      ).length,
    [notifications]
  );

  const pendingCount = useMemo(
    () =>
      notifications.filter(
        (item) => normalizeNotificationType(item.type) === "pending"
      ).length,
    [notifications]
  );

  const openTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          String(task.status || "").toLowerCase() !== "completed"
      ),
    [tasks]
  );

  const completedTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          String(task.status || "").toLowerCase() === "completed"
      ).length,
    [tasks]
  );

  const overdueTasks = useMemo(
    () =>
      tasks.filter((task) =>
        ["overdue", "late"].includes(
          String(task.status || "").toLowerCase()
        )
      ).length,
    [tasks]
  );

  const priorities = useMemo(
    () =>
      buildPriorities({
        notifications,
        tasks: openTasks,
        recommendations: intelligence?.recommendations || [],
      }).slice(0, 5),
    [notifications, openTasks, intelligence]
  );

  const workforceStatuses = useMemo(
    () => buildWorkforceStatuses(activity),
    [activity]
  );

const monthlyTotal = Number(summary?.total || 0);
const subtotal = Number(summary?.subtotal || 0);
const tax = Number(summary?.tax || 0);
const activeServices = summary?.services?.length || 0;

// The Usage Ledger is the single source of truth.
// Do not manually add another hookup fee.
const hookupFee = 0;
const checkout = monthlyTotal;

  const healthScore = getHealthScore(intelligence);
  const healthStatus =
    intelligence?.business_health?.status ||
    intelligence?.status ||
    "Awaiting intelligence";

  const complianceStatus =
    intelligence?.compliance?.status ||
    (hasOffice ? "Operational" : "Setup needed");

  const companyStatus =
    intelligence?.company_status ||
    workspace?.status ||
    "Active";

  const reviewLabel = useLiveRelativeTime(reviewedAt);


  const healthValue = Math.max(
    0,
    Math.min(100, Number(healthScore ?? 92))
  );

  const timelineItems = [
    {
      id: "review",
      time: "09:02",
      title: "Operational review completed",
      detail: `Executive intelligence refreshed for ${workspace?.name || "this workspace"}.`,
      actor: "Sonny",
      tone: "violet" as const,
    },
    {
      id: "documents",
      time: "09:06",
      title: "Document readiness reviewed",
      detail: "Workspace documents are ready for review and generation.",
      actor: "Hermes",
      tone: "blue" as const,
    },
    {
      id: "growth",
      time: "09:09",
      title: "Growth signals monitored",
      detail: "Current growth indicators were checked for new opportunities.",
      actor: "Julia",
      tone: "emerald" as const,
    },
    {
      id: "tasks",
      time: "09:14",
      title: "Task progress synchronized",
      detail: `${completedTasks} tasks completed and ${overdueTasks} overdue.`,
      actor: "Operations",
      tone: overdueTasks > 0 ? ("amber" as const) : ("slate" as const),
    },
  ];

  const workforceCards = [
    {
      id: "sonny",
      name: "Sonny",
      role: "Chief Operating Officer",
      status: "Online" as const,
      activity: "Reviewing operations and executive priorities.",
    },
    {
      id: "hermes",
      name: "Hermes",
      role: "Documentation Officer",
      status: "Ready" as const,
      activity: "Ready to prepare and manage company documents.",
    },
    {
      id: "julia",
      name: "Julia",
      role: "Growth Officer",
      status: "Online" as const,
      activity: "Monitoring growth opportunities and performance signals.",
    },
  ];

  const workforceActivity = [
    {
      id: "sonny-activity",
      agent: "Sonny",
      action: "Reviewed company health and open priorities.",
      time: "Just now",
    },
    {
      id: "hermes-activity",
      agent: "Hermes",
      action: "Checked document readiness and pending files.",
      time: "3m ago",
    },
    {
      id: "julia-activity",
      agent: "Julia",
      action: "Updated growth monitoring status.",
      time: "7m ago",
    },
  ];

  const executiveFeed = [
    {
      id: "workspace-active",
      title: "Workspace operating normally",
      detail: `${workspace?.name || "Company"} is active and connected.`,
      type: "success" as const,
    },
    {
      id: "tasks-feed",
      title:
        overdueTasks > 0
          ? `${overdueTasks} overdue task${overdueTasks === 1 ? "" : "s"} need attention`
          : "Task operations are on track",
      detail: `${completedTasks} completed tasks recorded.`,
      type: overdueTasks > 0 ? ("warning" as const) : ("success" as const),
    },
    {
      id: "documents-feed",
      title: "Document workspace synchronized",
      detail: "The document workspace is connected and ready.",
      type: "info" as const,
    },
    {
      id: "ai-feed",
      title: "AI workforce online",
      detail: "Sonny, Hermes, and Julia are available.",
      type: "success" as const,
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Company Command Center
              </p>

              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                {greeting()}, {companyName}.
              </h1>

              <p className="text-slate-500 mt-2 max-w-4xl">
                Your executive intelligence, priorities, workforce,
                notifications, activity, headquarters, meetings, and billing
                are connected in one operating view.
              </p>

              <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                {loading ? "Reviewing company..." : reviewLabel}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <AIOnlinePill workers={Math.max(3, agents.length + 3)} />

              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={loading}
                className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold hover:bg-slate-100 transition disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>

              <a
                href={hasOffice ? "/my-office" : "/virtual-offices"}
                className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold text-center hover:bg-violet-700 transition"
              >
                {hasOffice
                  ? "Manage Headquarters"
                  : "Activate Headquarters"}
              </a>
            </div>
          </header>

          {!workspace?.id && (
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-3xl p-6 text-yellow-700">
              Select or create a company to activate the Command Center.
            </div>
          )}

          {error && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-2xl p-4">
              {error}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat
              title="Business Health"
              value={
                healthScore === null
                  ? "Pending"
                  : `${healthScore}%`
              }
              icon="🧠"
              detail={healthStatus}
            />

            <Stat
              title="Unread Notifications"
              value={String(unreadNotifications.length)}
              icon="🔔"
              detail={`${actionRequiredCount} action required`}
            />

            <Stat
              title="Open Tasks"
              value={String(openTasks.length)}
              icon="✅"
              detail={`${pendingCount} pending approvals`}
            />

            <Stat
              title="Current Billing"
              value={`$${monthlyTotal.toFixed(2)}`}
              icon="💰"
              detail={`AED ${toAED(monthlyTotal)}`}
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-6 mt-8">
            <div className="space-y-6">
              <section className="bg-gradient-to-br from-violet-700 to-indigo-700 text-white rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="max-w-3xl">
                    <p className="text-sm font-bold text-violet-200">
                      Executive Intelligence
                    </p>

                    <h2 className="text-2xl font-bold mt-2">
                      {healthStatus}
                    </h2>

                    <p className="text-violet-100 mt-3 leading-7">
                      {intelligence?.executive_brief ||
                        intelligence?.brief ||
                        "Firmic is consolidating your company data into an executive operating brief."}
                    </p>
                  </div>

                  <div className="bg-white/10 rounded-3xl p-5 text-center min-w-[170px]">
                    <p className="text-sm text-violet-200">
                      Health Score
                    </p>
                    <p className="text-5xl font-bold mt-2">
                      {healthScore === null ? "—" : healthScore}
                    </p>
                    <p className="text-sm text-violet-200 mt-1">
                      {healthScore === null ? "Pending" : "out of 100"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
                  <ExecutiveMini
                    title="Company Status"
                    value={label(companyStatus)}
                  />
                  <ExecutiveMini
                    title="Compliance"
                    value={label(complianceStatus)}
                  />
                  <ExecutiveMini
                    title="Active Services"
                    value={String(activeServices)}
                  />
                </div>

                <div className="flex flex-wrap gap-3 mt-6">
                  <a
                    href="/executive-intelligence"
                    className="bg-white text-violet-700 px-5 py-3 rounded-xl font-bold"
                  >
                    Open Intelligence
                  </a>

                  <a
                    href="/sonny"
                    className="bg-white/10 border border-white/20 px-5 py-3 rounded-xl font-bold"
                  >
                    Ask Sonny
                  </a>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Panel
                  title="Today's Priorities"
                  actionHref="/tasks"
                  actionText="Open Tasks"
                >
                  {priorities.length === 0 ? (
                    <EmptyText text="No urgent priorities found." />
                  ) : (
                    <div className="space-y-3">
                      {priorities.map((priority, index) => (
                        <PriorityRow
                          key={`${priority.title}-${index}`}
                          title={priority.title}
                          description={priority.description}
                          type={priority.type}
                        />
                      ))}
                    </div>
                  )}
                </Panel>

                <Panel
                  title="Attention Required"
                  actionHref="/notifications"
                  actionText="Open Notifications"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <AttentionMini
                      title="Unread"
                      value={unreadNotifications.length}
                      icon="🔔"
                    />
                    <AttentionMini
                      title="Action Required"
                      value={actionRequiredCount}
                      icon="🔴"
                    />
                    <AttentionMini
                      title="Warnings"
                      value={warningCount}
                      icon="⚠️"
                    />
                    <AttentionMini
                      title="Pending"
                      value={pendingCount}
                      icon="🟡"
                    />
                  </div>
                </Panel>
              </section>

              <Panel
                title="Latest Company Activity"
                actionHref="/timeline"
                actionText="View Timeline"
              >
                {activity.length === 0 ? (
                  <EmptyText text="No synchronized activity yet." />
                ) : (
                  <div className="space-y-3">
                    {activity.slice(0, 5).map((event) => (
                      <ActivityRow key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </Panel>

              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">
                      Head Office
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                      Registered company headquarters and infrastructure.
                    </p>
                  </div>

                  <a
                    href={hasOffice ? "/my-office" : "/virtual-offices"}
                    className="border border-slate-200 px-4 py-2 rounded-xl font-semibold hover:bg-slate-50 transition"
                  >
                    {hasOffice ? "Manage Office" : "Rent Office"}
                  </a>
                </div>

                {!hasOffice ? (
                  <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-slate-500">
                    No headquarters has been assigned to this company.
                  </div>
                ) : (
                  <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Mini title="Office" value={officeCode} />
                    <Mini title="Location" value={officeLocation} />
                    <Mini title="Business Number" value={businessNumber} />
                    <Mini
                      title="Plan"
                      value={`${plan} · $${officePrice}/mo`}
                    />
                  </div>
                )}
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Panel
                  title="Meeting Center"
                  actionHref="/meeting-rooms"
                  actionText="Manage Meetings"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Mini
                      title="Bookings"
                      value={String(bookings.length)}
                    />
                    <Mini
                      title="Booked Hours"
                      value={String(totalBookedHours)}
                    />
                  </div>
                </Panel>

                <Panel
                  title="Optional AI Employees"
                  actionHref="/ai-workforce"
                  actionText="Manage Workforce"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <Mini
                      title="Active Agents"
                      value={String(agents.length)}
                    />
                    <Mini
                      title="Monthly AI Cost"
                      value={`$${agents
                        .reduce(
                          (sum, agent) =>
                            sum + Number(agent.monthly_price_usd || 0),
                          0
                        )
                        .toFixed(2)}`}
                    />
                  </div>
                </Panel>
              </section>
            </div>

            <aside className="space-y-6">
              <Panel
                title="AI Workforce Health"
                actionHref="/ai-workforce"
                actionText="Open Workforce"
              >
                <div className="space-y-3">
                  {workforceStatuses.map((agent) => (
                    <WorkforceRow key={agent.name} agent={agent} />
                  ))}
                </div>
              </Panel>

              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Business Infrastructure Cost
                </h2>

                <div className="space-y-3 mt-5">
                  <Row
                    title="Subtotal"
                    value={`$${subtotal.toFixed(2)}`}
                  />
                  <Row
                    title="Tax"
                    value={`$${tax.toFixed(2)}`}
                  />
                  <Row
                    title="Active Services"
                    value={String(activeServices)}
                  />
                  <Row
                    title="One-Time Hookup"
                    value={`$${hookupFee.toFixed(2)}`}
                  />
                </div>

                <div className="mt-5 bg-violet-50 border border-violet-100 rounded-2xl p-4">
                  <p className="text-sm text-violet-700 font-bold">
                    Today’s Checkout
                  </p>

                  <h3 className="text-3xl font-bold text-violet-900 mt-1">
                    ${checkout.toFixed(2)}
                  </h3>

                  <p className="text-violet-700">
                    AED {toAED(checkout)}
                  </p>
                </div>

                <a
                  href="/billing"
                  className="mt-5 block text-center bg-violet-600 text-white py-3 rounded-xl font-bold"
                >
                  Open Billing Center
                </a>
              </section>

              <Panel title="Founder Quick Actions">
                <div className="grid grid-cols-2 gap-3">
                  <QuickAction
                    href="/tasks"
                    icon="✅"
                    text="Create Task"
                  />
                  <QuickAction
                    href="/documents"
                    icon="📄"
                    text="Upload Document"
                  />
                  <QuickAction
                    href="/meeting-rooms"
                    icon="📅"
                    text="Book Meeting"
                  />
                  <QuickAction
                    href="/sonny"
                    icon="👔"
                    text="Open Sonny"
                  />
                  <QuickAction
                    href="/timeline"
                    icon="📜"
                    text="Timeline"
                  />
                  <QuickAction
                    href="/notifications"
                    icon="🔔"
                    text="Notifications"
                  />
                </div>
              </Panel>
            </aside>
          </section>
        
        <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <ExecutiveTimeline items={timelineItems} />

          <CompanyHealthRing
            value={healthValue}
            reviewedLabel={reviewLabel}
          />
        </section>

        <section className="mt-6">
          <AIWorkforceStatus agents={workforceCards} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <AIWorkforceActivity items={workforceActivity} />
          <ExecutiveActivityFeed items={executiveFeed} />
        </section>

        </main>
      </div>
    </ProtectedRoute>
  );
}

async function fetchCompanyResource(path: string) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("firmic_token")
      : null;

  if (!token) {
    throw new Error("Not authenticated.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      body?.detail ||
      body?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(
      typeof detail === "string"
        ? detail
        : JSON.stringify(detail)
    );
  }

  return body;
}

function fulfilledArray<T>(
  result: PromiseSettledResult<any>
): T[] {
  if (
    result.status === "fulfilled" &&
    Array.isArray(result.value)
  ) {
    return result.value;
  }

  return [];
}

function getHealthScore(
  intelligence: ExecutiveIntelligence | null
): number | null {
  const value =
    intelligence?.business_health?.score ??
    intelligence?.health_score;

  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? Math.round(numeric)
    : null;
}

function buildPriorities({
  notifications,
  tasks,
  recommendations,
}: {
  notifications: NotificationItem[];
  tasks: TaskItem[];
  recommendations: Array<{
    title?: string;
    description?: string;
    priority?: string;
  }>;
}) {
  const notificationItems = notifications
    .filter((item) =>
      ["action_required", "warning", "pending"].includes(
        normalizeNotificationType(item.type)
      )
    )
    .map((item) => ({
      title: item.title || "Notification needs attention",
      description: item.description || "Review this company update.",
      type: normalizeNotificationType(item.type),
    }));

  const taskItems = tasks.map((task) => ({
    title: task.title || "Open company task",
    description:
      task.description ||
      `Task status: ${label(task.status || "open")}`,
    type: "task",
  }));

  const recommendationItems = recommendations.map((item) => ({
    title: item.title || "Executive recommendation",
    description:
      item.description ||
      "Review this recommendation from Executive Intelligence.",
    type: "recommendation",
  }));

  return [
    ...notificationItems,
    ...taskItems,
    ...recommendationItems,
  ];
}

function buildWorkforceStatuses(
  activity: Activity[]
): WorkforceStatus[] {
  return [
    buildAgentStatus(
      "Sonny",
      "AI Chief Operating Officer",
      activity
    ),
    buildAgentStatus(
      "Hermes",
      "AI Compliance Officer",
      activity
    ),
    buildAgentStatus(
      "Julia",
      "AI Growth Officer",
      activity
    ),
  ];
}

function buildAgentStatus(
  name: string,
  role: string,
  activity: Activity[]
): WorkforceStatus {
  const event = activity.find((item) =>
    [
      item.title,
      item.description,
      item.actor_type,
      item.source_type,
      item.event_type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(name.toLowerCase())
  );

  if (!event) {
    return {
      name,
      role,
      status: "Idle",
      detail: "Ready for company work",
    };
  }

  const text = [
    event.title,
    event.description,
    event.event_type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const status =
    text.includes("failed") || text.includes("error")
      ? "Attention"
      : text.includes("completed") || text.includes("finished")
      ? "Completed"
      : text.includes("started") ||
        text.includes("assigned") ||
        text.includes("working")
      ? "Working"
      : "Active";

  return {
    name,
    role,
    status,
    detail: event.title || "Recent workforce activity",
  };
}

function normalizeNotificationType(
  type?: string | null
) {
  const value = String(type || "").toLowerCase();

  if (
    ["action_required", "action", "required"].includes(value)
  ) {
    return "action_required";
  }

  if (
    ["pending", "approval", "pending_approval"].includes(value)
  ) {
    return "pending";
  }

  if (
    ["warning", "error", "failed"].includes(value)
  ) {
    return "warning";
  }

  if (
    ["success", "completed"].includes(value)
  ) {
    return "success";
  }

  return "info";
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Stat({
  title,
  value,
  icon,
  detail,
}: {
  title: string;
  value: string;
  icon: string;
  detail?: string;
}) {
  return (
    <div className="group bg-white border border-slate-200 rounded-3xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-violet-200">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">
        <AnimatedMetric value={value} />
      </p>
      {detail && (
        <p className="text-xs text-slate-400 mt-2">{detail}</p>
      )}
    </div>
  );
}

function Panel({
  title,
  children,
  actionHref,
  actionText,
}: {
  title: string;
  children: React.ReactNode;
  actionHref?: string;
  actionText?: string;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">{title}</h2>

        {actionHref && actionText && (
          <a
            href={actionHref}
            className="text-sm text-violet-700 font-bold hover:text-violet-900"
          >
            {actionText} →
          </a>
        )}
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function ExecutiveMini({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white/10 rounded-2xl p-4">
      <p className="text-xs text-violet-200">{title}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}

function AttentionMini({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <span className="text-xl">{icon}</span>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{title}</p>
    </div>
  );
}

function PriorityRow({
  title,
  description,
  type,
}: {
  title: string;
  description: string;
  type: string;
}) {
  const icon =
    type === "warning"
      ? "⚠️"
      : type === "pending"
      ? "🟡"
      : type === "action_required"
      ? "🔴"
      : type === "recommendation"
      ? "🧠"
      : "✅";

  return (
    <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <span className="text-xl shrink-0">{icon}</span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm text-slate-500 mt-1">
          {description}
        </p>
      </div>
    </div>
  );
}

function ActivityRow({
  event,
}: {
  event: Activity;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <div>
        <p className="font-semibold">
          {event.title || label(event.event_type)}
        </p>

        {event.description && (
          <p className="text-sm text-slate-500 mt-1">
            {event.description}
          </p>
        )}
      </div>

      <p className="text-xs text-slate-400 shrink-0">
        {formatRelativeTime(event.created_at)}
      </p>
    </div>
  );
}

function WorkforceRow({
  agent,
}: {
  agent: WorkforceStatus;
}) {
  const statusClass =
    agent.status === "Attention"
      ? "bg-red-100 text-red-700"
      : agent.status === "Working"
      ? "bg-blue-100 text-blue-700"
      : agent.status === "Completed"
      ? "bg-green-100 text-green-700"
      : "bg-slate-100 text-slate-600";

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{agent.name}</p>
          <p className="text-xs text-slate-500 mt-1">
            {agent.role}
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${statusClass}`}
        >
          {agent.status}
        </span>
      </div>

      <p className="text-sm text-slate-500 mt-3">
        {agent.detail}
      </p>
    </div>
  );
}

function Mini({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-w-0">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold mt-1 break-words">{value}</p>
    </div>
  );
}

function Row({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 py-3 border-b border-slate-100">
      <span className="text-slate-500">{title}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  text,
}: {
  href: string;
  icon: string;
  text: string;
}) {
  return (
    <a
      href={href}
      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:bg-violet-50 hover:border-violet-200 transition"
    >
      <span className="text-2xl">{icon}</span>
      <p className="font-bold text-sm mt-3">{text}</p>
    </a>
  );
}

function EmptyText({
  text,
}: {
  text: string;
}) {
  return (
    <p className="text-slate-500">
      {text}
    </p>
  );
}

function label(value?: string | null) {
  if (!value) return "Unknown";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatRelativeTime(value?: string | null) {
  if (!value) return "Recently";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const difference = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (difference < minute) return "Just now";

  if (difference < hour) {
    const minutes = Math.floor(difference / minute);
    return `${minutes}m ago`;
  }

  if (difference < day) {
    const hours = Math.floor(difference / hour);
    return `${hours}h ago`;
  }

  const days = Math.floor(difference / day);
  return `${days}d ago`;
}
