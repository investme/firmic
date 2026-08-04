import type {
  LaunchApplication,
  LaunchMilestone,
  MilestoneStatus,
} from "../../services/launchCenterApi";

type LaunchProgressProps = {
  application: LaunchApplication;
};

const completedStatuses = new Set<MilestoneStatus>(["approved", "completed"]);

const activeStatuses = new Set<MilestoneStatus>([
  "initiated",
  "information_required",
  "in_progress",
  "submitted_to_partner",
  "partner_reviewing",
  "government_processing",
]);

function formatStatus(status: MilestoneStatus): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function milestoneIcon(milestone: LaunchMilestone): string {
  if (completedStatuses.has(milestone.status)) {
    return "✓";
  }

  if (milestone.status === "rejected" || milestone.status === "blocked") {
    return "!";
  }

  if (activeStatuses.has(milestone.status)) {
    return "•";
  }

  return String(Math.round(milestone.position));
}

function milestoneStyles(status: MilestoneStatus): {
  icon: string;
  border: string;
  background: string;
  title: string;
  badge: string;
} {
  if (completedStatuses.has(status)) {
    return {
      icon: "bg-emerald-600 text-white",
      border: "border-emerald-200",
      background: "bg-emerald-50/70",
      title: "text-emerald-950",
      badge: "bg-emerald-100 text-emerald-700",
    };
  }

  if (status === "rejected" || status === "blocked") {
    return {
      icon: "bg-rose-600 text-white",
      border: "border-rose-200",
      background: "bg-rose-50/70",
      title: "text-rose-950",
      badge: "bg-rose-100 text-rose-700",
    };
  }

  if (activeStatuses.has(status)) {
    return {
      icon: "bg-violet-600 text-white",
      border: "border-violet-200",
      background: "bg-violet-50/70",
      title: "text-violet-950",
      badge: "bg-violet-100 text-violet-700",
    };
  }

  return {
    icon: "bg-slate-100 text-slate-500",
    border: "border-slate-200",
    background: "bg-white",
    title: "text-slate-800",
    badge: "bg-slate-100 text-slate-500",
  };
}

export default function LaunchProgress({ application }: LaunchProgressProps) {
  const progress = Math.max(
    0,
    Math.min(100, Number(application.progress_percent || 0)),
  );

  const milestones = [...application.milestones].sort(
    (left, right) => left.position - right.position,
  );

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6 lg:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold text-violet-700">
              Company launch progress
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              Your launch journey
            </h2>

            <p className="mt-2 max-w-2xl leading-7 text-slate-500">
              Follow every stage from company setup through licensing, corporate
              banking, headquarters, and workspace activation.
            </p>
          </div>

          <div className="text-left md:text-right">
            <p className="text-4xl font-black tracking-tight text-slate-950">
              {progress.toFixed(progress % 1 === 0 ? 0 : 1)}%
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Overall completion
            </p>
          </div>
        </div>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-[width] duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 p-6 lg:grid-cols-2 lg:p-8">
        {milestones.map((milestone) => {
          const styles = milestoneStyles(milestone.status);

          return (
            <article
              key={milestone.id}
              className={`rounded-2xl border p-5 transition ${styles.border} ${styles.background}`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${styles.icon}`}
                >
                  {milestoneIcon(milestone)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className={`font-bold ${styles.title}`}>
                      {milestone.title}
                    </h3>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${styles.badge}`}
                    >
                      {formatStatus(milestone.status)}
                    </span>
                  </div>

                  {milestone.notes && (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {milestone.notes}
                    </p>
                  )}

                  {!milestone.notes && (
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {completedStatuses.has(milestone.status)
                        ? "This launch stage has been completed."
                        : activeStatuses.has(milestone.status)
                          ? "This stage is currently being processed."
                          : "This stage will begin when the previous requirements are ready."}
                    </p>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
