import { useEffect, useMemo, useState, type ReactNode } from "react";

import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";

import { getCompanyAIAgents } from "../services/aiWorkforceApi";
import { getCompany } from "../services/companyApi";
import {
  getIncludedAICount,
  normalizePlanCode,
  type FirmicPlanCode,
} from "../src/utils/planEntitlements";
import { getCompanyActivity } from "../services/activityApi";
import { API_URL } from "../services/config";
import { getCompanyLaunch, type LaunchSummary } from "../services/launchApi";
import { getCompanyLedgerSummary } from "../services/ledgerApi";
import { getCompanyMeetingBookings } from "../services/meetingBookingApi";
import { getCompanyTasks } from "../services/taskApi";

import { toAED } from "../src/data/pricing";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
  type FirmicWorkspace,
} from "../src/utils/workspaceContext";
import { FirmicOrder, getConfirmedOrder } from "../src/utils/orderStorage";

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

export default function Dashboard() {
  const [workspace, setWorkspace] = useState<FirmicWorkspace | null>(null);
  const [companyPlan, setCompanyPlan] = useState<FirmicPlanCode | null>(null);
  const [launch, setLaunch] = useState<LaunchSummary | null>(null);
  const [agents, setAgents] = useState<ActiveAgent[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<FirmicOrder | null>(
    null,
  );
  const [activity, setActivity] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const synchronizeWorkspace = () => {
      setWorkspace(getActiveWorkspace());
    };

    synchronizeWorkspace();

    const eventName = getWorkspaceChangedEventName();

    window.addEventListener(eventName, synchronizeWorkspace);
    window.addEventListener("storage", synchronizeWorkspace);

    return () => {
      window.removeEventListener(eventName, synchronizeWorkspace);
      window.removeEventListener("storage", synchronizeWorkspace);
    };
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [workspace?.id]);

  async function loadDashboard() {
    if (!workspace?.id) {
      setCompanyPlan(null);
      setLaunch(null);
      setAgents([]);
      setBookings([]);
      setSummary(null);
      setConfirmedOrder(null);
      setActivity([]);
      setNotifications([]);
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setConfirmedOrder(getConfirmedOrder(String(workspace.id)));

      const results = await Promise.allSettled([
        getCompany(workspace.id),
        getCompanyLaunch(workspace.id),
        getCompanyAIAgents(workspace.id),
        getCompanyMeetingBookings(workspace.id),
        getCompanyLedgerSummary(workspace.id),
        getCompanyActivity(workspace.id),
        getCompanyTasks(workspace.id),
        fetchCompanyResource(`/api/notifications/company/${workspace.id}`),
        fetchCompanyResource(`/api/timeline/company/${workspace.id}`),
      ]);

      const company =
        results[0].status === "fulfilled" ? results[0].value : null;

      setCompanyPlan(
        company?.plan_code ? normalizePlanCode(company.plan_code) : null,
      );

      setLaunch(results[1].status === "fulfilled" ? results[1].value : null);
      setAgents(fulfilledArray<ActiveAgent>(results[2]));
      setBookings(fulfilledArray<Booking>(results[3]));
      setSummary(results[4].status === "fulfilled" ? results[4].value : null);

      const legacyActivity = fulfilledArray<Activity>(results[5]);
      setTasks(fulfilledArray<TaskItem>(results[6]));

      const notificationBody =
        results[7].status === "fulfilled" ? results[7].value : null;

      setNotifications(
        Array.isArray(notificationBody?.notifications)
          ? notificationBody.notifications
          : [],
      );

      const timelineBody =
        results[8].status === "fulfilled" ? results[8].value : null;

      const timelineEvents = Array.isArray(timelineBody?.events)
        ? timelineBody.events
        : [];

      setActivity(timelineEvents.length > 0 ? timelineEvents : legacyActivity);

      if (results.some((result) => result.status === "rejected")) {
        setError(
          "Some Command Center modules could not be loaded. Available company data is still shown.",
        );
      }
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The Command Center could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  const companyName = workspace?.name || "Active Company";
  const headquarters = workspace?.headquarters;
  const hasOffice = Boolean(headquarters?.office_code);

  const monthlyTotal =
    confirmedOrder?.monthlyTotalUsd ?? Number(summary?.total || 0);

  const companyLaunchFee = 79;
  const firstMonthTotal = monthlyTotal + companyLaunchFee;

  const includedAIWorkers =
    companyPlan === null ? 0 : getIncludedAICount(companyPlan);

  const aiWorkforceDisplay =
    companyPlan !== null && agents.length <= includedAIWorkers
      ? "Included"
      : `$${agents
          .reduce(
            (total, agent) =>
              total + Number(agent.monthly_price_usd || 0),
            0,
          )
          .toFixed(2)}`;

  const subtotal =
    confirmedOrder?.monthlySubtotalUsd ?? Number(summary?.subtotal || 0);

  const tax = confirmedOrder?.monthlyVatUsd ?? Number(summary?.tax || 0);

  const activeServices = confirmedOrder
    ? confirmedOrder.items.filter((item) => item.billing === "monthly").length
    : summary?.services?.length || 0;

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.read),
    [notifications],
  );

  const openTasks = useMemo(
    () =>
      tasks.filter(
        (task) => String(task.status || "").toLowerCase() !== "completed",
      ),
    [tasks],
  );

  const totalBookedHours = useMemo(
    () =>
      bookings.reduce(
        (total, booking) => total + Number(booking.duration_hours || 0),
        0,
      ),
    [bookings],
  );

  const launchRequirements = launch?.requirements || [];

  const outstandingRequirements = launchRequirements.filter(
    (requirement) => requirement.required && requirement.status !== "approved",
  );

  const approvedRequirements = launchRequirements.filter(
    (requirement) => requirement.required && requirement.status === "approved",
  );

  const launchStatus = launch?.status || "pending_compliance";
  const launchComplete = launchStatus === "active";

  const launchActionHref = launch?.next_action_href || "/launch-center";

  const launchActionLabel = launch?.next_action_label || "Open Launch Center";

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-50">
        <FirmicSidebar />

        <main className="min-w-0 flex-1 p-6 xl:p-8">
          <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Firmic Command Center
              </p>

              <h1 className="mt-1 text-3xl font-bold text-slate-950">
                {greeting()}, {companyName}.
              </h1>

              <p className="mt-2 max-w-4xl text-slate-500">
                Review your company launch, current operations, and the next
                action required from your team.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadDashboard()}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold transition hover:bg-slate-100 disabled:opacity-50"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>

              <a
                href="/launch-center"
                className="rounded-xl bg-violet-600 px-6 py-3 text-center font-bold text-white transition hover:bg-violet-700"
              >
                Open Launch Center
              </a>
            </div>
          </header>

          {!workspace?.id && (
            <Alert>
              Select or create a company to activate the Command Center.
            </Alert>
          )}

          {error && <Alert>{error}</Alert>}

          {workspace?.id && (
            <>
              <LaunchPanel
                launch={launch}
                loading={loading}
                companyName={companyName}
                outstandingRequirements={outstandingRequirements}
                approvedRequirements={approvedRequirements}
                actionHref={launchActionHref}
                actionLabel={launchActionLabel}
              />

              <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-4">
                <Stat
                  title="Launch Status"
                  value={formatLabel(launchStatus)}
                  detail={
                    launchComplete
                      ? "Company fully operational"
                      : launch?.next_step || "Launch Engine synchronizing"
                  }
                  icon="🚀"
                />

                <Stat
                  title="Open Tasks"
                  value={String(openTasks.length)}
                  detail="Across company operations"
                  icon="✅"
                />

                <Stat
                  title="Unread Alerts"
                  value={String(unreadNotifications.length)}
                  detail="Notifications requiring review"
                  icon="🔔"
                />

                <Stat
                  title="Monthly Billing"
                  value={`$${monthlyTotal.toFixed(2)}`}
                  detail="Recurring monthly operating cost"
                  icon="💳"
                />
              </section>

              <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                <div className="space-y-6">
                  <Panel
                    title="Launch Requirements"
                    actionHref="/launch-center"
                    actionText="View Full Launch"
                  >
                    {launchRequirements.length === 0 ? (
                      <Empty text="Launch requirements are loading." />
                    ) : (
                      <div className="space-y-3">
                        {launchRequirements.slice(0, 7).map((requirement) => (
                          <RequirementRow
                            key={requirement.key}
                            label={requirement.label}
                            status={requirement.status}
                            actionHref={requirement.action_href}
                            actionLabel={requirement.action_label}
                          />
                        ))}
                      </div>
                    )}
                  </Panel>

                  <Panel
                    title="Recent Company Activity"
                    actionHref="/timeline"
                    actionText="Open Timeline"
                  >
                    {activity.length === 0 ? (
                      <Empty text="No synchronized activity yet." />
                    ) : (
                      <div className="space-y-3">
                        {activity.slice(0, 6).map((event) => (
                          <ActivityRow key={event.id} event={event} />
                        ))}
                      </div>
                    )}
                  </Panel>

                  <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Panel
                      title="Headquarters"
                      actionHref={hasOffice ? "/my-office" : "/launch-center"}
                      actionText={
                        hasOffice ? "Manage Headquarters" : "Continue Launch"
                      }
                    >
                      {!hasOffice ? (
                        <Empty text="Your headquarters has not been reserved yet." />
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Mini
                            title="Office"
                            value={headquarters?.office_code || "Reserved"}
                          />
                          <Mini
                            title="Status"
                            value={formatLabel(
                              launch?.office_status || "awaiting_compliance",
                            )}
                          />
                          <Mini
                            title="Location"
                            value={
                              headquarters?.location ||
                              "Location being prepared"
                            }
                          />
                          <Mini
                            title="Phone"
                            value={headquarters?.phone || "Pending activation"}
                          />
                        </div>
                      )}
                    </Panel>

                    <Panel
                      title="AI Workforce"
                      actionHref="/ai-workforce"
                      actionText="Open Workforce"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Mini
                          title="Assigned Agents"
                          value={String(agents.length)}
                        />
                        <Mini
                          title="Launch State"
                          value={
                            launchComplete
                              ? "Operational"
                              : "Waiting for Activation"
                          }
                        />
                        <Mini
                          title="AI Workforce"
                          value={aiWorkforceDisplay}
                        />
                        <Mini
                          title="Sonny"
                          value={
                            launchComplete ? "Orchestrating" : "Guiding Launch"
                          }
                        />
                      </div>
                    </Panel>
                  </section>

                  <Panel
                    title="Meeting Center"
                    actionHref="/meeting-rooms"
                    actionText="Manage Meetings"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <Mini title="Bookings" value={String(bookings.length)} />
                      <Mini
                        title="Booked Hours"
                        value={String(totalBookedHours)}
                      />
                      <Mini
                        title="Availability"
                        value={
                          launchComplete ? "Operational" : "Activation pending"
                        }
                      />
                    </div>
                  </Panel>
                </div>

                <aside className="space-y-6">
                  <Panel title="Next Actions">
                    <div className="space-y-3">
                      {outstandingRequirements.length === 0 ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                          All launch requirements have been completed.
                        </div>
                      ) : (
                        outstandingRequirements.slice(0, 5).map((item) => (
                          <a
                            key={item.key}
                            href={item.action_href || "/launch-center"}
                            className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-violet-300 hover:bg-violet-50"
                          >
                            <p className="font-bold text-slate-900">
                              {item.label}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {item.status === "uploaded"
                                ? "Uploaded and awaiting review."
                                : item.action_label || "Continue this step."}
                            </p>
                          </a>
                        ))
                      )}
                    </div>
                  </Panel>

                  <Panel title="Monthly Operating Cost">
                    <div className="space-y-1">
                      <Row title="Subtotal" value={`$${subtotal.toFixed(2)}`} />
                      <Row title="Tax" value={`$${tax.toFixed(2)}`} />
                      <Row
                        title="Company Launch Fee"
                        value="$79.00 · one time"
                      />
                      <Row
                        title="First Month Total"
                        value={`$${firstMonthTotal.toFixed(2)}`}
                      />
                      <Row
                        title="Active Services"
                        value={String(activeServices)}
                      />
                    </div>

                    <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                      <p className="text-sm font-bold text-violet-700">
                        Monthly Total
                      </p>
                      <p className="mt-1 text-3xl font-bold text-violet-950">
                        ${monthlyTotal.toFixed(2)}
                      </p>
                      <p className="text-violet-700">
                        AED {toAED(monthlyTotal)}
                      </p>
                    </div>

                    <a
                      href="/billing"
                      className="mt-5 block rounded-xl bg-violet-600 py-3 text-center font-bold text-white"
                    >
                      Open Subscription
                    </a>
                  </Panel>

                  <Panel title="Quick Access">
                    <div className="grid grid-cols-2 gap-3">
                      <QuickAction
                        href="/documents"
                        icon="📄"
                        text="Documents"
                      />
                      <QuickAction href="/hermes" icon="🛡️" text="Hermes" />
                      <QuickAction href="/sonny" icon="👔" text="Sonny" />
                      <QuickAction
                        href="/launch-center"
                        icon="🚀"
                        text="Launch Center"
                      />
                    </div>
                  </Panel>
                </aside>
              </section>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function LaunchPanel({
  launch,
  loading,
  companyName,
  outstandingRequirements,
  approvedRequirements,
  actionHref,
  actionLabel,
}: {
  launch: LaunchSummary | null;
  loading: boolean;
  companyName: string;
  outstandingRequirements: LaunchSummary["requirements"];
  approvedRequirements: LaunchSummary["requirements"];
  actionHref: string;
  actionLabel: string;
}) {
  const status = launch?.status || "pending_compliance";
  const active = status === "active";
  const progress = Number(launch?.progress_percent || 0);

  return (
    <section
      className={[
        "mt-8 overflow-hidden rounded-3xl border shadow-sm",
        active ? "border-emerald-200 bg-white" : "border-violet-200 bg-white",
      ].join(" ")}
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_330px]">
        <div className="p-6 lg:p-8">
          <div className="flex items-start gap-4">
            <div
              className={[
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl",
                active ? "bg-emerald-100" : "bg-violet-100",
              ].join(" ")}
            >
              {active ? "✓" : "🚀"}
            </div>

            <div className="min-w-0">
              <p
                className={[
                  "text-sm font-bold",
                  active ? "text-emerald-700" : "text-violet-700",
                ].join(" ")}
              >
                Company Launch
              </p>

              <h2 className="mt-1 text-3xl font-bold text-slate-950">
                {loading
                  ? "Synchronizing launch status..."
                  : active
                    ? `${companyName} is operational.`
                    : `${companyName} is ${formatLabel(status).toLowerCase()}.`}
              </h2>

              <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                {active
                  ? "Your headquarters and Firmic operating services are active."
                  : "Complete the remaining requirements before Firmic activates your headquarters and operating services."}
              </p>
            </div>
          </div>

          <div className="mt-7">
            <div className="flex items-center justify-between gap-4">
              <p className="font-bold text-slate-900">Launch progress</p>

              <p className="font-bold text-violet-700">
                {progress.toFixed(0)}%
              </p>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className={[
                  "h-full rounded-full transition-all duration-500",
                  active ? "bg-emerald-600" : "bg-violet-600",
                ].join(" ")}
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>

            <p className="mt-3 text-sm text-slate-500">
              {approvedRequirements.length} of {launch?.total_requirements || 0}{" "}
              launch requirements completed.
            </p>
          </div>
        </div>

        <div
          className={[
            "border-t p-6 xl:border-l xl:border-t-0 lg:p-8",
            active
              ? "border-emerald-200 bg-emerald-50"
              : "border-violet-200 bg-violet-50",
          ].join(" ")}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            {active ? "Launch Complete" : "Next Step"}
          </p>

          <p className="mt-3 text-xl font-bold text-slate-950">
            {active
              ? "Company operational"
              : launch?.next_step || "Review launch requirements"}
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {active
              ? "Firmic services are available for your company."
              : `${outstandingRequirements.length} requirement${
                  outstandingRequirements.length === 1 ? "" : "s"
                } remain.`}
          </p>

          <a
            href={active ? "/launch-center" : actionHref}
            className={[
              "mt-6 block rounded-xl px-5 py-3 text-center font-bold text-white transition",
              active
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-violet-600 hover:bg-violet-700",
            ].join(" ")}
          >
            {active ? "View Launch Record" : actionLabel}
          </a>
        </div>
      </div>
    </section>
  );
}

function RequirementRow({
  label,
  status,
  actionHref,
  actionLabel,
}: {
  label: string;
  status: string;
  actionHref?: string | null;
  actionLabel?: string | null;
}) {
  const approved = status === "approved";
  const uploaded = status === "uploaded";

  return (
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            approved
              ? "bg-emerald-600 text-white"
              : uploaded
                ? "bg-blue-100 text-blue-700"
                : "bg-amber-100 text-amber-700",
          ].join(" ")}
        >
          {approved ? "✓" : uploaded ? "↑" : "!"}
        </span>

        <div>
          <p className="font-bold text-slate-900">{label}</p>
          <p className="mt-1 text-sm text-slate-500">
            {approved
              ? "Completed"
              : uploaded
                ? "Uploaded and awaiting review"
                : "Action required"}
          </p>
        </div>
      </div>

      {!approved && actionHref && (
        <a
          href={actionHref}
          className="text-sm font-bold text-violet-700 hover:text-violet-900"
        >
          {actionLabel || "Continue"} →
        </a>
      )}
    </div>
  );
}

function Stat({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="mt-3 text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{detail}</p>
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
  children: ReactNode;
  actionHref?: string;
  actionText?: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>

        {actionHref && actionText && (
          <a
            href={actionHref}
            className="text-sm font-bold text-violet-700 hover:text-violet-900"
          >
            {actionText} →
          </a>
        )}
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function ActivityRow({ event }: { event: Activity }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <div>
        <p className="font-semibold text-slate-900">
          {event.title || formatLabel(event.event_type)}
        </p>

        {event.description && (
          <p className="mt-1 text-sm text-slate-500">{event.description}</p>
        )}
      </div>

      <p className="shrink-0 text-xs text-slate-400">
        {formatRelativeTime(event.created_at)}
      </p>
    </div>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="mt-1 break-words font-bold text-slate-900">{value}</p>
    </div>
  );
}

function Row({ title, value }: { title: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-slate-500">{title}</span>
      <span className="font-bold text-slate-900">{value}</span>
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
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-violet-200 hover:bg-violet-50"
    >
      <span className="text-2xl">{icon}</span>
      <p className="mt-3 text-sm font-bold text-slate-900">{text}</p>
    </a>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-slate-500">{text}</p>;
}

function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
      {children}
    </div>
  );
}

async function fetchCompanyResource(path: string) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("firmic_token") : null;

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
      typeof detail === "string" ? detail : JSON.stringify(detail),
    );
  }

  return body;
}

function fulfilledArray<T>(result: PromiseSettledResult<unknown>): T[] {
  if (result.status !== "fulfilled") {
    return [];
  }

  return Array.isArray(result.value) ? (result.value as T[]) : [];
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatLabel(value?: string | null) {
  if (!value) return "Unknown";

  return value
    .replace(/_/g, " ")
    .replace(/\w/g, (letter) => letter.toUpperCase());
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
    return `${Math.floor(difference / minute)}m ago`;
  }

  if (difference < day) {
    return `${Math.floor(difference / hour)}h ago`;
  }

  return `${Math.floor(difference / day)}d ago`;
}
