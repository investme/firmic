import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import LaunchProgress from "../components/launch-center/LaunchProgress";

import {
  createLaunchApplication,
  getBankPartners,
  getFormationPartners,
  getLaunchApplicationByCompany,
  isLaunchApplicationNotFound,
  type BankPartner,
  type FormationPartner,
  type LaunchApplication,
  type LaunchMilestone,
} from "../services/launchCenterApi";

import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
  type FirmicWorkspace,
} from "../src/utils/workspaceContext";

type PageState = "loading" | "no_workspace" | "not_started" | "ready" | "error";

const completedStatuses = new Set(["approved", "completed"]);

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatStatus(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getNextMilestone(
  application: LaunchApplication | null,
): LaunchMilestone | null {
  if (!application) {
    return null;
  }

  return (
    [...application.milestones]
      .sort((left, right) => left.position - right.position)
      .find((milestone) => !completedStatuses.has(milestone.status)) || null
  );
}

function estimateRemainingDays(
  application: LaunchApplication | null,
): number | null {
  if (!application) {
    return null;
  }

  if (application.completed_at) {
    return 0;
  }

  if (application.estimated_completion_at) {
    const remaining =
      new Date(application.estimated_completion_at).getTime() - Date.now();

    return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
  }

  const progress = Math.max(
    0,
    Math.min(100, Number(application.progress_percent || 0)),
  );

  if (progress >= 100) {
    return 0;
  }

  return Math.max(1, Math.ceil((100 - progress) / 12.5));
}

export default function LaunchCenterPage() {
  const [workspace, setWorkspace] = useState<FirmicWorkspace | null>(() =>
    getActiveWorkspace(),
  );

  const [application, setApplication] = useState<LaunchApplication | null>(
    null,
  );

  const [formationPartners, setFormationPartners] = useState<
    FormationPartner[]
  >([]);

  const [bankPartners, setBankPartners] = useState<BankPartner[]>([]);

  const [pageState, setPageState] = useState<PageState>("loading");

  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const synchronizeWorkspace = () => {
      setWorkspace(getActiveWorkspace());
    };

    synchronizeWorkspace();

    window.addEventListener(
      getWorkspaceChangedEventName(),
      synchronizeWorkspace,
    );

    window.addEventListener("storage", synchronizeWorkspace);

    return () => {
      window.removeEventListener(
        getWorkspaceChangedEventName(),
        synchronizeWorkspace,
      );

      window.removeEventListener("storage", synchronizeWorkspace);
    };
  }, []);

  const loadLaunchCenter = useCallback(async () => {
    if (!workspace?.id) {
      setApplication(null);
      setFormationPartners([]);
      setBankPartners([]);
      setPageState("no_workspace");
      setError("");
      return;
    }

    try {
      setPageState("loading");
      setError("");

      const currentApplication = await getLaunchApplicationByCompany(
        workspace.id,
      );

      setApplication(currentApplication);

      const [formationResult, bankResult] = await Promise.allSettled([
        getFormationPartners({
          country: currentApplication.country,
          jurisdiction: currentApplication.jurisdiction,
        }),
        getBankPartners({
          country: currentApplication.country,
        }),
      ]);

      setFormationPartners(
        formationResult.status === "fulfilled" ? formationResult.value : [],
      );

      setBankPartners(
        bankResult.status === "fulfilled" ? bankResult.value : [],
      );

      setPageState("ready");
    } catch (caughtError) {
      if (isLaunchApplicationNotFound(caughtError)) {
        setApplication(null);
        setFormationPartners([]);
        setBankPartners([]);
        setPageState("not_started");
        return;
      }

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to load the Launch Center.";

      setError(message);
      setPageState("error");
    }
  }, [workspace?.id]);

  useEffect(() => {
    void loadLaunchCenter();
  }, [loadLaunchCenter]);

  async function beginLaunch() {
    if (!workspace?.id) {
      return;
    }

    try {
      setCreating(true);
      setError("");

      const created = await createLaunchApplication({
        company_id: workspace.id,
        country: "United Arab Emirates",
        jurisdiction: workspace.jurisdiction || "Abu Dhabi",
        business_activity: workspace.industry || "Technology",
        business_description: `${workspace.name} launch application managed through Firmic.`,
      });

      setApplication(created);
      setPageState("ready");

      const [formationResult, bankResult] = await Promise.allSettled([
        getFormationPartners({
          country: created.country,
          jurisdiction: created.jurisdiction,
        }),
        getBankPartners({
          country: created.country,
        }),
      ]);

      setFormationPartners(
        formationResult.status === "fulfilled" ? formationResult.value : [],
      );

      setBankPartners(
        bankResult.status === "fulfilled" ? bankResult.value : [],
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to begin the company launch.";

      setError(message);
    } finally {
      setCreating(false);
    }
  }

  const nextMilestone = useMemo(
    () => getNextMilestone(application),
    [application],
  );

  const remainingDays = useMemo(
    () => estimateRemainingDays(application),
    [application],
  );

  const companyName = workspace?.name || "your company";

  return (
    <ProtectedRoute>
      <Head>
        <title>Launch Center | Firmic</title>
        <meta
          name="description"
          content="Launch and activate your company through the Firmic Launch Center."
        />
      </Head>

      <div className="flex min-h-screen bg-slate-50">
        <FirmicSidebar />

        <main className="min-w-0 flex-1 p-6 xl:p-8">
          <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Firmic Launch Center
              </p>

              <h1 className="mt-1 text-3xl font-bold text-slate-950">
                Launch {companyName}.
              </h1>

              <p className="mt-2 max-w-3xl leading-7 text-slate-500">
                Coordinate company formation, licensing, corporate banking,
                headquarters, and workspace activation from one guided
                experience.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadLaunchCenter()}
                disabled={pageState === "loading"}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                {pageState === "loading" ? "Refreshing..." : "Refresh"}
              </button>

              <Link
                href="/companies"
                className="rounded-xl bg-violet-600 px-6 py-3 text-center font-bold text-white transition hover:bg-violet-700"
              >
                Manage Companies
              </Link>
            </div>
          </header>

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
              {error}
            </div>
          )}

          {pageState === "loading" && <LaunchCenterLoading />}

          {pageState === "no_workspace" && <NoWorkspaceState />}

          {pageState === "not_started" && (
            <NotStartedState
              companyName={companyName}
              creating={creating}
              onBegin={() => void beginLaunch()}
            />
          )}

          {pageState === "error" && !error && (
            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8">
              <h2 className="text-xl font-bold text-slate-950">
                Launch Center could not be loaded
              </h2>

              <button
                type="button"
                onClick={() => void loadLaunchCenter()}
                className="mt-5 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700"
              >
                Try Again
              </button>
            </div>
          )}

          {pageState === "ready" && application && (
            <div className="mt-8 space-y-6">
              <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  title="Launch Progress"
                  value={`${application.progress_percent}%`}
                  detail={formatStatus(application.status)}
                  icon="🚀"
                />

                <MetricCard
                  title="Next Step"
                  value={nextMilestone?.title || "Complete"}
                  detail={
                    nextMilestone
                      ? formatStatus(nextMilestone.status)
                      : "Your launch journey is complete"
                  }
                  icon="→"
                />

                <MetricCard
                  title="Estimated Time"
                  value={
                    remainingDays === null
                      ? "Pending"
                      : remainingDays === 0
                        ? "Complete"
                        : `${remainingDays} days`
                  }
                  detail="Estimated remaining time"
                  icon="◷"
                />

                <MetricCard
                  title="Updated"
                  value={formatDate(application.updated_at)}
                  detail="Latest launch activity"
                  icon="↻"
                />
              </section>

              <section className="overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-700 to-indigo-700 text-white shadow-sm">
                <div className="grid xl:grid-cols-[1fr_340px]">
                  <div className="p-6 lg:p-8">
                    <p className="text-sm font-bold text-violet-200">
                      Sonny · Launch Advisor
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      {nextMilestone
                        ? `Your next priority is ${nextMilestone.title}.`
                        : "Your company launch is complete."}
                    </h2>

                    <p className="mt-3 max-w-3xl leading-7 text-violet-100">
                      {nextMilestone
                        ? `I am monitoring ${companyName}'s launch journey. Complete the next requirement and I will keep the remaining milestones synchronized.`
                        : `${companyName} has completed every Launch Center milestone and is ready to operate through Firmic.`}
                    </p>
                  </div>

                  <div className="border-t border-white/15 bg-white/10 p-6 xl:border-l xl:border-t-0 lg:p-8">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
                      Recommended action
                    </p>

                    <p className="mt-3 text-lg font-bold">
                      {nextMilestone?.title || "Open your company workspace"}
                    </p>

                    <Link
                      href={
                        nextMilestone?.key === "virtual_office"
                          ? "/virtual-offices"
                          : "/sonny"
                      }
                      className="mt-6 block rounded-xl bg-white px-5 py-3 text-center font-bold text-violet-700 transition hover:bg-violet-50"
                    >
                      {nextMilestone ? "Continue Launch" : "Enter Workspace"}
                    </Link>
                  </div>
                </div>
              </section>

              <LaunchProgress application={application} />

              <section className="grid gap-6 xl:grid-cols-2">
                <PartnerSummary
                  title="Formation Partner"
                  emptyMessage="No formation partner has been selected."
                  partnerName={application.formation_partner?.name}
                  availableCount={formationPartners.length}
                  href="/launch-partners?type=formation"
                />

                <PartnerSummary
                  title="Banking Introduction"
                  emptyMessage="No banking option has been selected."
                  partnerName={application.bank_partner?.name}
                  availableCount={bankPartners.length}
                  href="/launch-partners?type=banking"
                />
              </section>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

function MetricCard({
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
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-slate-500">{title}</p>

        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 font-black text-violet-700">
          {icon}
        </span>
      </div>

      <p className="mt-5 truncate text-2xl font-black text-slate-950">
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </article>
  );
}

function PartnerSummary({
  title,
  emptyMessage,
  partnerName,
  availableCount,
  href,
}: {
  title: string;
  emptyMessage: string;
  partnerName?: string;
  availableCount: number;
  href: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
      <p className="text-sm font-bold text-violet-700">{title}</p>

      <h2 className="mt-2 text-xl font-bold text-slate-950">
        {partnerName || emptyMessage}
      </h2>

      <p className="mt-3 leading-7 text-slate-500">
        {availableCount > 0
          ? `${availableCount} demonstration option${
              availableCount === 1 ? "" : "s"
            } currently available.`
          : "No matching options are currently available for this jurisdiction."}
      </p>

      <Link
        href={href}
        className="mt-6 inline-flex rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 font-bold text-violet-700 transition hover:bg-violet-100"
      >
        Review Options
      </Link>
    </article>
  );
}

function LaunchCenterLoading() {
  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white"
          />
        ))}
      </div>

      <div className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white" />
    </div>
  );
}

function NoWorkspaceState() {
  return (
    <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-8">
      <p className="text-sm font-bold text-amber-700">Company required</p>

      <h2 className="mt-2 text-2xl font-bold text-amber-950">
        Select or create a company first.
      </h2>

      <p className="mt-3 max-w-2xl leading-7 text-amber-800">
        The Launch Center belongs to a specific Firmic company workspace. Select
        an existing company or create a new one before beginning the launch
        journey.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/companies"
          className="rounded-xl bg-amber-700 px-5 py-3 font-bold text-white hover:bg-amber-800"
        >
          Select Company
        </Link>

        <Link
          href="/create-company"
          className="rounded-xl border border-amber-300 bg-white px-5 py-3 font-bold text-amber-800 hover:bg-amber-100"
        >
          Create Company
        </Link>
      </div>
    </section>
  );
}

function NotStartedState({
  companyName,
  creating,
  onBegin,
}: {
  companyName: string;
  creating: boolean;
  onBegin: () => void;
}) {
  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm">
      <div className="grid xl:grid-cols-[1fr_360px]">
        <div className="p-7 lg:p-10">
          <p className="text-sm font-bold text-violet-700">
            Launch journey not started
          </p>

          <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-slate-950">
            Take {companyName} from workspace to operating company.
          </h2>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-500">
            Firmic will guide you through company details, jurisdiction,
            licensing coordination, banking introductions, virtual headquarters,
            and workspace activation.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "Company and jurisdiction profile",
              "Formation-partner coordination",
              "Licensing progress tracking",
              "Corporate banking introductions",
              "Virtual headquarters activation",
              "Firmic workspace readiness",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <span className="font-black text-emerald-600">✓</span>
                <p className="text-sm font-semibold text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-violet-200 bg-violet-50 p-7 xl:border-l xl:border-t-0 lg:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
            Ready when you are
          </p>

          <p className="mt-4 text-lg font-bold leading-7 text-violet-950">
            Begin with the company information already stored in your active
            Firmic workspace.
          </p>

          <button
            type="button"
            onClick={onBegin}
            disabled={creating}
            className="mt-7 w-full rounded-xl bg-violet-600 px-5 py-4 font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Starting Launch Center..." : "Begin Company Launch"}
          </button>

          <p className="mt-4 text-xs leading-5 text-violet-700">
            Formation and banking services are coordinated through partners.
            Firmic does not guarantee licensing or bank-account approval.
          </p>
        </div>
      </div>
    </section>
  );
}
