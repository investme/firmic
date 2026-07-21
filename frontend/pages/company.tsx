import { useCallback, useEffect, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";

import { getCompanyDocuments } from "../services/documentApi";
import { getCompanyTasks, updateTaskStatus } from "../services/taskApi";
import { getSonny, getProgress } from "../services/sonnyApi";
import { getHermes } from "../services/hermesApi";
import { getOffices } from "../services/officeApi";

import {
  getActiveWorkspace,
  type FirmicWorkspace,
  type FirmicHeadquarters,
} from "../src/utils/workspaceContext";


type DocumentItem = {
  id: string | number;
  name?: string;
  type?: string;
  status?: string;
};

type TaskItem = {
  id: string | number;
  title?: string;
  description?: string;
  status?: string;
};

type OfficeItem = {
  id?: string | number;
  company_id?: string | number;
  office_code?: string;
  office_name?: string;
  location?: string;
  phone?: string;
  mailbox?: string;
  status?: string;
  monthly_price_usd?: number;
};

function fulfilledValue<T>(
  result: PromiseSettledResult<T>,
  fallback: T
): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

function safeText(
  value: unknown,
  fallback = "Not configured"
): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function safeNumber(
  value: unknown,
  fallback = 0
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export default function CompanyControlCenter() {
  const [workspace, setWorkspace] =
  useState<FirmicWorkspace | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [sonny, setSonny] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [hermes, setHermes] = useState<any>(null);
  const [office, setOffice] = useState<OfficeItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshingTaskId, setRefreshingTaskId] = useState<
    string | number | null
  >(null);
  const [notice, setNotice] = useState("");
  const [loadWarning, setLoadWarning] = useState("");

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setLoadWarning("");

    try {
  const activeWorkspace = getActiveWorkspace();

      if (!activeWorkspace?.id) {
        setWorkspace(null);
        setDocuments([]);
        setTasks([]);
        setSonny(null);
        setProgress(null);
        setHermes(null);
        setOffice(null);
        return;
      }

      setWorkspace(activeWorkspace);

      const companyId = String(activeWorkspace.id);

      const results = await Promise.allSettled([
        getCompanyDocuments(companyId),
        getCompanyTasks(companyId),
        getSonny(companyId),
        getProgress(companyId),
        getHermes(companyId),
        getOffices(),
      ]);

      const [
        documentsResult,
        tasksResult,
        sonnyResult,
        progressResult,
        hermesResult,
        officesResult,
      ] = results;

      const loadedDocuments = fulfilledValue(
        documentsResult as PromiseSettledResult<DocumentItem[]>,
        []
      );

      const loadedTasks = fulfilledValue(
        tasksResult as PromiseSettledResult<TaskItem[]>,
        []
      );

      const loadedSonny = fulfilledValue(
        sonnyResult as PromiseSettledResult<any>,
        null
      );

      const loadedProgress = fulfilledValue(
        progressResult as PromiseSettledResult<any>,
        null
      );

      const loadedHermes = fulfilledValue(
        hermesResult as PromiseSettledResult<any>,
        null
      );

      const loadedOffices = fulfilledValue(
        officesResult as PromiseSettledResult<OfficeItem[]>,
        []
      );

      setDocuments(
        Array.isArray(loadedDocuments) ? loadedDocuments : []
      );

      setTasks(
        Array.isArray(loadedTasks) ? loadedTasks : []
      );

      setSonny(loadedSonny);
      setProgress(loadedProgress);
      setHermes(loadedHermes);

      const safeOffices = Array.isArray(loadedOffices)
        ? loadedOffices
        : [];

      const companyOffice =
        safeOffices.find(
          (item) =>
            String(item.company_id ?? "") === companyId &&
            item.status === "rented"
        ) ||
        safeOffices.find(
          (item) =>
            String(item.company_id ?? "") === companyId &&
            item.status === "active"
        ) ||
        safeOffices.find(
          (item) =>
            String(item.company_id ?? "") === companyId
        ) ||
        null;

      setOffice(companyOffice);

      const failedRequests = results.filter(
        (result) => result.status === "rejected"
      ).length;

      if (failedRequests > 0) {
        setLoadWarning(
          `${failedRequests} workspace service${
            failedRequests === 1 ? "" : "s"
          } could not be loaded. Available company data is still shown.`
        );

        results.forEach((result, index) => {
          if (result.status === "rejected") {
            console.error(
              `Company Control Center request ${index + 1} failed:`,
              result.reason
            );
          }
        });
      }
    } catch (error) {
      console.error("Failed to load company workspace:", error);

      setLoadWarning(
        "Some company data could not be loaded. The page remains available."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspace();

    function handleWorkspaceChange() {
      loadWorkspace();
    }

    window.addEventListener(
      "firmic-workspace-changed",
      handleWorkspaceChange
    );

    window.addEventListener(
      "storage",
      handleWorkspaceChange
    );

    return () => {
      window.removeEventListener(
        "firmic-workspace-changed",
        handleWorkspaceChange
      );

      window.removeEventListener(
        "storage",
        handleWorkspaceChange
      );
    };
  }, [loadWorkspace]);

  async function completeTask(
    taskId: string | number
  ) {
    try {
      setRefreshingTaskId(taskId);
      setNotice("");

      await updateTaskStatus(
        String(taskId),
        "completed"
      );

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          String(task.id) === String(taskId)
            ? {
                ...task,
                status: "completed",
              }
            : task
        )
      );

      setNotice("Task completed successfully.");

      await loadWorkspace();
    } catch (error) {
      console.error(
        "Failed to complete task:",
        error
      );

      setNotice(
        "The task could not be updated. The rest of the workspace remains available."
      );
    } finally {
      setRefreshingTaskId(null);
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-50 flex">
          <FirmicSidebar />

          <main className="flex-1 p-6 xl:p-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-slate-500">
              Loading the active company workspace...
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (!workspace) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-50 flex">
          <FirmicSidebar />

          <main className="flex-1 p-6 xl:p-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
              <p className="text-sm font-bold text-violet-700">
                Company Workspace
              </p>

              <h1 className="text-3xl font-bold text-slate-950 mt-2">
                No active company selected
              </h1>

              <p className="text-slate-500 mt-3 max-w-2xl">
                Select a company workspace before opening the Company Control
                Center.
              </p>

              <a
                href="/companies"
                className="inline-block mt-6 bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition"
              >
                Select Company
              </a>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  const companyName = safeText(
    workspace.name,
    "Company"
  );

  const companyId = safeText(
    workspace.id,
    "Unknown"
  );

  const jurisdiction = safeText(
    workspace.jurisdiction,
    "Not configured"
  );

  const plan = safeText(
    workspace.plan,
    "Not configured"
  );

  const companyStatus = safeText(
    workspace.status,
    "Active"
  );

  const completedTasks = tasks.filter(
    (task) => task.status === "completed"
  ).length;

  const pendingTasks = tasks.filter(
    (task) => task.status !== "completed"
  ).length;

  const progressScore = safeNumber(
    progress?.progress ??
      sonny?.summary?.progress ??
      (tasks.length > 0
        ? Math.round(
            (completedTasks / tasks.length) * 100
          )
        : 0),
    0
  );

  const hermesScore = safeNumber(
    hermes?.score ??
      hermes?.compliance_score ??
      0,
    0
  );

  const headquartersObject: FirmicHeadquarters | null =
    workspace.headquarters &&
    typeof workspace.headquarters === "object"
      ? workspace.headquarters
      : null;

  const headquartersString =
    typeof workspace.headquarters === "string"
      ? workspace.headquarters
      : "";

  const officeCode = safeText(
    office?.office_code ??
      headquartersObject?.office_code ??
      headquartersObject?.office_code,
    ""
  );

  const officeName = safeText(
    office?.office_name ??
      headquartersObject?.office_name,
    ""
  );

  const officeLocation = safeText(
    office?.location ??
      headquartersObject?.location ??
      headquartersString ??
      headquartersObject?.location,
    ""
  );

  const officeStatus = safeText(
    office?.status ??
      headquartersObject?.status,
    ""
  );

  const officePhone = safeText(
    office?.phone ??
      headquartersObject?.phone,
    ""
  );

  const officeMailbox = safeText(
    office?.mailbox ??
      headquartersObject?.mailbox,
    ""
  );

  const monthlyPrice = safeNumber(
    office?.monthly_price_usd ??
      headquartersObject?.monthly_price_usd,
    0
  );

  const hasOffice = Boolean(
    officeCode ||
      officeName ||
      officeLocation ||
      officeStatus
  );

  const headquartersTitle = hasOffice
    ? officeName ||
      (officeCode
        ? `Headquarters ${officeCode}`
        : "Active Headquarters")
    : "No headquarters activated";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Company Control Center
              </p>

              <h1 className="text-3xl font-bold text-slate-950 mt-1">
                {companyName}
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Manage company profile, headquarters, documents, tasks, Sonny,
                Hermes, AI workforce, and operating readiness.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/sonny"
                className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-violet-700 transition"
              >
                Open Sonny
              </a>

              <a
                href="/hermes"
                className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold hover:bg-slate-50 transition"
              >
                Open Hermes
              </a>
            </div>
          </header>

          {loadWarning && (
            <div className="mt-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 font-medium">
              {loadWarning}
            </div>
          )}

          {notice && (
            <div className="mt-6 bg-violet-50 border border-violet-200 text-violet-800 rounded-2xl p-4 font-medium">
              {notice}
            </div>
          )}

          <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-8">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div>
                <p className="text-sm text-violet-700 font-bold">
                  Company Profile
                </p>

                <h2 className="text-3xl font-bold mt-2">
                  {companyName}
                </h2>

                <p className="text-slate-500 mt-2">
                  Company ID: {companyId}
                </p>

                <p className="text-slate-500 mt-1">
                  Status: {companyStatus}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Mini
                  title="Headquarters"
                  value={
                    officeCode ||
                    officeName ||
                    "Not activated"
                  }
                />

                <Mini
                  title="Plan"
                  value={plan}
                />

                <Mini
                  title="Jurisdiction"
                  value={jurisdiction}
                />

                <Mini
                  title="Workspace"
                  value="Tenant"
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat
              title="Progress"
              value={`${progressScore}%`}
              icon="📈"
            />

            <Stat
              title="Hermes Score"
              value={`${hermesScore}%`}
              icon="🛡️"
            />

            <Stat
              title="Documents"
              value={String(documents.length)}
              icon="📄"
            />

            <Stat
              title="Open Tasks"
              value={String(pendingTasks)}
              icon="✅"
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
            <div className="space-y-6">
              <Panel title="Registered Headquarters">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <h3 className="text-xl font-bold">
                    {headquartersTitle}
                  </h3>

                  <p className="text-slate-500 mt-1">
                    {officeLocation ||
                      "Choose a headquarters from the Office Marketplace."}
                  </p>

                  {hasOffice && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                      <Detail
                        title="Phone"
                        value={
                          officePhone ||
                          "Not configured"
                        }
                      />

                      <Detail
                        title="Mailbox"
                        value={
                          officeMailbox ||
                          "Not configured"
                        }
                      />

                      <Detail
                        title="Monthly Price"
                        value={
                          monthlyPrice > 0
                            ? `$${monthlyPrice.toLocaleString()} USD`
                            : "Not configured"
                        }
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                    <Mini
                      title="Digital Mailroom"
                      value={
                        hasOffice
                          ? "Active"
                          : "Pending"
                      }
                    />

                    <Mini
                      title="Business Calls"
                      value={
                        hasOffice
                          ? "Active"
                          : "Pending"
                      }
                    />

                    <Mini
                      title="Plan"
                      value={plan}
                    />

                    <Mini
                      title="Status"
                      value={
                        hasOffice
                          ? officeStatus || "Active"
                          : "Not Active"
                      }
                    />
                  </div>

                  {!hasOffice && (
                    <a
                      href="/virtual-offices"
                      className="mt-5 inline-block bg-violet-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-violet-700 transition"
                    >
                      Open Office Marketplace
                    </a>
                  )}
                </div>
              </Panel>

              <Panel title="Document Vault">
                {documents.length === 0 ? (
                  <div className="text-slate-500">
                    No documents are available for this company.

                    <div className="mt-4">
                      <a
                        href="/documents"
                        className="inline-block bg-violet-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-violet-700 transition"
                      >
                        Open Document Vault
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.map((document) => (
                      <div
                        key={document.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4"
                      >
                        <p className="font-bold">
                          {safeText(
                            document.name,
                            "Untitled document"
                          )}
                        </p>

                        <p className="text-sm text-slate-500">
                          Type:{" "}
                          {safeText(
                            document.type,
                            "General"
                          )}
                        </p>

                        <p className="text-sm text-slate-500">
                          Status:{" "}
                          {safeText(
                            document.status,
                            "pending"
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Tasks">
                {tasks.length === 0 ? (
                  <p className="text-slate-500">
                    No tasks are available for this company.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => {
                      const isUpdating =
                        String(refreshingTaskId) ===
                        String(task.id);

                      const taskStatus = safeText(
                        task.status,
                        "pending"
                      );

                      return (
                        <div
                          key={task.id}
                          className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                        >
                          <div>
                            <p className="font-bold">
                              {safeText(
                                task.title,
                                "Untitled task"
                              )}
                            </p>

                            <p className="text-sm text-slate-500 mt-1">
                              {safeText(
                                task.description,
                                "No description provided."
                              )}
                            </p>

                            <p className="text-sm text-slate-500 mt-1">
                              Status: {taskStatus}
                            </p>
                          </div>

                          {taskStatus !== "completed" ? (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() =>
                                completeTask(task.id)
                              }
                              className="bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-xl font-bold h-fit shrink-0"
                            >
                              {isUpdating
                                ? "Updating..."
                                : "Complete"}
                            </button>
                          ) : (
                            <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold h-fit shrink-0">
                              Done
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Company Health
                </h2>

                <p className="text-violet-100 text-sm mt-2">
                  Firmic is monitoring operations, compliance, documents, AI
                  activity, and headquarters readiness for {companyName}.
                </p>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <DarkMini
                    title="Progress"
                    value={`${progressScore}%`}
                  />

                  <DarkMini
                    title="Hermes"
                    value={`${hermesScore}%`}
                  />

                  <DarkMini
                    title="Tasks"
                    value={String(tasks.length)}
                  />

                  <DarkMini
                    title="Docs"
                    value={String(documents.length)}
                  />
                </div>
              </div>

              <Panel title="Sonny Summary">
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">
                    Documents:{" "}
                    {safeNumber(
                      sonny?.summary?.documents,
                      documents.length
                    )}
                  </p>

                  <p className="text-sm text-slate-500">
                    Tasks:{" "}
                    {safeNumber(
                      sonny?.summary?.tasks,
                      tasks.length
                    )}
                  </p>

                  <p className="text-sm text-slate-500">
                    Pending Tasks:{" "}
                    {safeNumber(
                      sonny?.summary?.pending_tasks,
                      pendingTasks
                    )}
                  </p>

                  <p className="text-sm text-slate-500">
                    Completed Tasks:{" "}
                    {safeNumber(
                      sonny?.summary?.completed_tasks,
                      completedTasks
                    )}
                  </p>
                </div>
              </Panel>

              <Panel title="Quick Actions">
                <div className="space-y-3">
                  <Action
                    href="/virtual-offices"
                    text={
                      hasOffice
                        ? "Manage Headquarters"
                        : "Activate Headquarters"
                    }
                  />

                  <Action
                    href="/ai-workforce"
                    text="Manage AI Workforce"
                  />

                  <Action
                    href="/documents"
                    text="Open Document Vault"
                  />

                  <Action
                    href="/billing"
                    text="Open Billing Center"
                  />

                  <Action
                    href="/reports"
                    text="Generate Report"
                  />
                </div>
              </Panel>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Stat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>

      <p className="text-sm text-slate-500 mt-3">
        {title}
      </p>

      <p className="text-2xl font-bold mt-1">
        {value}
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
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="font-bold text-sm mt-1 break-words">
        {value}
      </p>
    </div>
  );
}

function Detail({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4">
      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="font-bold text-sm mt-1 break-words">
        {value}
      </p>
    </div>
  );
}

function DarkMini({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 text-center">
      <p className="text-xs text-violet-100">
        {title}
      </p>

      <p className="font-bold text-xl mt-1">
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-5">
        {title}
      </h2>

      {children}
    </section>
  );
}

function Action({
  href,
  text,
}: {
  href: string;
  text: string;
}) {
  return (
    <a
      href={href}
      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center font-semibold hover:bg-white hover:border-violet-200 transition"
    >
      <span>{text}</span>
      <span className="text-violet-700">›</span>
    </a>
  );
}
