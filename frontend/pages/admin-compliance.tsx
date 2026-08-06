import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import AdminSidebar from "../components/AdminSidebar";
import AdminProtectedRoute from "../components/AdminProtectedRoute";
import {
  getAdminCompliance,
  getAdminCompanyCompliance,
  markAdminComplianceReviewed,
  requestAdminComplianceDocuments,
  verifyAdminComplianceDocument,
} from "../services/adminApi";

export default function AdminCompliance() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue(preferredId?: string) {
    try {
      setLoading(true);
      setError("");

      const result = await getAdminCompliance();
      setData(result);

      const items = result?.items || [];
      const nextId =
        preferredId ||
        selected?.company?.id ||
        items[0]?.company?.id;

      if (nextId) {
        await inspectCompany(nextId, false);
      } else {
        setSelected(null);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load compliance queue.");
    } finally {
      setLoading(false);
    }
  }

  async function inspectCompany(companyId: string, scroll = true) {
    try {
      setDetailLoading(true);
      setError("");
      setSelected(await getAdminCompanyCompliance(companyId));

      if (scroll) {
        window.setTimeout(() => {
          document
            .getElementById("compliance-inspector")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to inspect company compliance.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function requestDocuments() {
    const companyId = selected?.company?.id;
    if (!companyId) return;

    try {
      setBusy("request");
      setError("");
      setNotice("");

      const result = await requestAdminComplianceDocuments(companyId);
      setNotice(result?.message || "Document request tasks created.");
      await loadQueue(companyId);
    } catch (err: any) {
      setError(err?.message || "Failed to request documents.");
    } finally {
      setBusy("");
    }
  }

  async function verifyDocument(
    documentId: string
  ) {
    if (!documentId) return;

    try {
      setBusy(`verify:${documentId}`);
      setError("");
      setNotice("");

      const result =
        await verifyAdminComplianceDocument(
          documentId
        );

      setNotice(
        result?.message ||
          "Document verified."
      );

      const companyId =
        selected?.company?.id;

      if (companyId) {
        await loadQueue(
          companyId
        );
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to verify document."
      );
    } finally {
      setBusy("");
    }
  }

  async function markReviewed() {
    const companyId = selected?.company?.id;
    if (!companyId) return;

    try {
      setBusy("review");
      setError("");
      setNotice("");

      const confirmed = window.confirm(
        "Approve this compliance package and unlock the company platform?"
      );

      if (!confirmed) return;

      const result = await markAdminComplianceReviewed(companyId);
      setNotice(
        result?.message ||
          "Compliance approved. Company platform unlocked."
      );
      await inspectCompany(companyId, false);
    } catch (err: any) {
      setError(err?.message || "Failed to record review.");
    } finally {
      setBusy("");
    }
  }

  const items = data?.items || [];
  const metrics = data?.metrics || {};

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item: any) => {
      const searchable = [
        item.company.name,
        item.company.id,
        item.company.status,
        item.company.headquarters?.office_code || "",
        item.queue_status,
        item.priority,
        ...(item.missing_documents || []),
        ...(item.reasons || []),
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (priority === "all" || item.priority === priority) &&
        (status === "all" || item.queue_status === status)
      );
    });
  }, [items, search, priority, status]);

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar active="Compliance Queue" />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Hermes Operations
              </p>

              <h1 className="text-3xl font-bold mt-1">
                Compliance Queue
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Live readiness from PostgreSQL documents, onboarding tasks,
                workflows, and headquarters state.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadQueue(selected?.company?.id)}
              disabled={loading}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold disabled:bg-slate-300"
            >
              {loading ? "Refreshing..." : "Refresh Queue"}
            </button>
          </header>

          {error && <Alert type="error" text={error} />}
          {notice && <Alert type="success" text={notice} />}

          <section className="grid grid-cols-1 md:grid-cols-5 gap-5 mt-8">
            <Stat title="Queue Items" value={metrics.queue_items || 0} icon="🛡️" />
            <Stat title="High Priority" value={metrics.high_priority || 0} icon="⚠️" />
            <Stat title="Review Needed" value={metrics.review_needed || 0} icon="🔎" />
            <Stat title="Ready" value={metrics.ready || 0} icon="✅" />
            <Stat title="Approved" value={metrics.approved || 0} icon="🔓" />
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_220px] gap-4">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search company, document, office, reason, or ID..."
                className="border border-slate-200 rounded-xl px-4 py-3"
              />

              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="border border-slate-200 rounded-xl px-4 py-3"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="border border-slate-200 rounded-xl px-4 py-3"
              >
                <option value="all">All Queue States</option>
                <option value="review_needed">Review Needed</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="in_progress">In Progress</option>
                <option value="ready">Ready for Approval</option>
                <option value="provisioning">Provisioning</option>
                <option value="approved">Approved / Unlocked</option>
              </select>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_430px] gap-6 mt-8">
            <div className="space-y-4 min-w-0">
              {loading ? (
                <Empty text="Loading Hermes compliance queue..." />
              ) : filtered.length === 0 ? (
                <Empty text="No companies match this search." />
              ) : (
                filtered.map((item: any) => (
                  <button
                    type="button"
                    key={item.company.id}
                    onClick={() => inspectCompany(item.company.id)}
                    className={`w-full text-left bg-white border rounded-3xl p-5 shadow-sm transition ${
                      selected?.company?.id === item.company.id
                        ? "border-violet-500 ring-2 ring-violet-100"
                        : "border-slate-200 hover:border-violet-300"
                    }`}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_130px_150px_150px] gap-5 items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold">
                            {item.company.name}
                          </h2>
                          <Priority value={item.priority} />
                          <Status value={item.queue_status} />
                        </div>

                        <p className="text-sm text-slate-500 mt-2">
                          {(item.reasons || []).join(" ")}
                        </p>

                        <p className="text-xs text-slate-400 mt-2 break-all">
                          {item.company.id}
                        </p>
                      </div>

                      <Info title="Readiness" value={`${item.readiness_score}%`} />
                      <Info
                        title="Required Docs"
                        value={`${item.uploaded_required_count}/${item.required_document_count}`}
                      />
                      <Info
                        title="Open Work"
                        value={`${item.pending_task_count} tasks · ${item.running_workflow_count} workflows`}
                      />
                    </div>
                  </button>
                ))
              )}
            </div>

            <aside id="compliance-inspector">
              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm xl:sticky xl:top-6">
                <h2 className="text-xl font-bold">Hermes Inspector</h2>

                {detailLoading ? (
                  <p className="text-slate-500 mt-5">Loading company compliance...</p>
                ) : !selected ? (
                  <p className="text-slate-500 mt-5">
                    Select a company to inspect its live compliance record.
                  </p>
                ) : (
                  <>
                    <div className="mt-5 bg-violet-50 border border-violet-100 rounded-2xl p-4">
                      <p className="text-sm text-violet-700">Tenant Company</p>
                      <p className="text-2xl font-bold mt-1">
                        {selected.company?.name}
                      </p>
                      <p className="text-sm text-violet-700 mt-2">
                        Launch status:{" "}
                        <strong>
                          {String(
                            selected.launch?.status ||
                              selected.company?.status ||
                              "pending"
                          ).replaceAll("_", " ")}
                        </strong>
                      </p>
                      <p className="text-sm mt-1">
                        Platform:{" "}
                        <strong
                          className={
                            selected.platform_unlocked
                              ? "text-green-700"
                              : "text-amber-700"
                          }
                        >
                          {selected.platform_unlocked
                            ? "Unlocked"
                            : "Locked"}
                        </strong>
                      </p>
                    </div>

                    <Progress value={selected.readiness_score} />

                    <h3 className="font-bold mt-6">Required Documents</h3>
                    <div className="space-y-3 mt-3">
                      {(selected.documents || []).map((document: any) => (
                        <div
                          key={document.key}
                          className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3"
                        >
                          <div>
                            <span className="font-medium">
                              {document.label}
                            </span>

                            {document.document?.name && (
                              <p className="text-xs text-slate-500 mt-1">
                                {document.document.name}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <DocumentState value={document.state} />

                            {document.state === "uploaded" &&
                              document.document?.id && (
                                <button
                                  type="button"
                                  disabled={
                                    busy ===
                                    `verify:${document.document.id}`
                                  }
                                  onClick={() =>
                                    verifyDocument(
                                      document.document.id
                                    )
                                  }
                                  className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold disabled:bg-slate-300"
                                >
                                  {busy ===
                                  `verify:${document.document.id}`
                                    ? "Verifying..."
                                    : "Verify"}
                                </button>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <Mini title="Open Tasks" value={selected.pending_task_count || 0} />
                      <Mini title="Workflows" value={selected.running_workflow_count || 0} />
                      <Mini title="Documents" value={selected.document_count || 0} />
                      <Mini
                        title="Headquarters"
                        value={selected.company?.headquarters?.office_code || "None"}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 mt-6">
                      <button
                        type="button"
                        onClick={requestDocuments}
                        disabled={busy === "request"}
                        className="bg-violet-600 text-white rounded-xl py-3 font-bold disabled:bg-slate-300"
                      >
                        {busy === "request"
                          ? "Creating Requests..."
                          : "Request Missing Documents"}
                      </button>

                      <button
                        type="button"
                        onClick={markReviewed}
                        disabled={
                          busy === "review" ||
                          !selected.all_required_verified ||
                          selected.platform_unlocked
                        }
                        className="bg-green-600 text-white rounded-xl py-3 font-bold disabled:bg-slate-300 disabled:text-slate-500"
                      >
                        {busy === "review"
                          ? "Approving & Unlocking..."
                          : selected.platform_unlocked
                          ? "Company Unlocked"
                          : "Approve & Unlock Company"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/admin-company?company_id=${selected.company.id}`
                          )
                        }
                        className="border border-slate-200 rounded-xl py-3 font-bold"
                      >
                        Open Company Inspector
                      </button>
                    </div>

                    <h3 className="font-bold mt-7">
                      Recent Compliance Activity
                    </h3>

                    <div className="space-y-3 mt-3 max-h-72 overflow-y-auto">
                      {(selected.activity || []).length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No activity has been recorded yet.
                        </p>
                      ) : (
                        selected.activity.map((event: any) => (
                          <div
                            key={event.id}
                            className="bg-slate-50 border border-slate-200 rounded-2xl p-3"
                          >
                            <p className="font-bold text-sm">{event.title}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {event.description}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-2">
                              {formatDate(event.created_at)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </section>
            </aside>
          </section>
        </main>
      </div>
    </AdminProtectedRoute>
  );
}

function Stat({ title, value, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Info({ title, value }: any) {
  return (
    <div>
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}

function Mini({ title, value }: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}

function Priority({ value }: any) {
  const style =
    value === "high"
      ? "bg-red-100 text-red-700"
      : value === "medium"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-green-100 text-green-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${style}`}>
      {value}
    </span>
  );
}

function Status({ value }: any) {
  return (
    <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700 capitalize">
      {String(value).replaceAll("_", " ")}
    </span>
  );
}

function DocumentState({ value }: any) {
  const style =
    value === "verified"
      ? "bg-green-100 text-green-700"
      : value === "uploaded"
      ? "bg-blue-100 text-blue-700"
      : "bg-red-100 text-red-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${style}`}>
      {value}
    </span>
  );
}

function Progress({ value }: any) {
  return (
    <div className="mt-5">
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">Live readiness</span>
        <strong>{value}%</strong>
      </div>

      <div className="h-3 rounded-full bg-slate-100 mt-2 overflow-hidden">
        <div
          className="h-full bg-violet-600 rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function Alert({ text, type }: any) {
  return (
    <div
      className={`mt-6 rounded-2xl p-4 border ${
        type === "error"
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-green-50 border-green-200 text-green-700"
      }`}
    >
      {text}
    </div>
  );
}

function Empty({ text }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-500">
      {text}
    </div>
  );
}

function formatDate(value: string) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}
