import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/router";

import AdminSidebar from "../components/AdminSidebar";
import AdminProtectedRoute from "../components/AdminProtectedRoute";

import {
  getAdminSupport,
  replyAdminSupportTicket,
  updateAdminSupportTicket,
} from "../services/adminApi";

export default function AdminSupport() {
  const router = useRouter();

  const [data, setData] =
    useState<any>(null);

  const [selectedId, setSelectedId] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [priorityFilter, setPriorityFilter] =
    useState("all");

  const [categoryFilter, setCategoryFilter] =
    useState("all");

  const [reply, setReply] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState("");

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load(
    preferredId?: string
  ) {
    try {
      setLoading(true);
      setError("");

      const result =
        await getAdminSupport();

      setData(result);

      const tickets =
        result?.tickets || [];

      const next =
        tickets.find(
          (ticket: any) =>
            ticket.id ===
            (preferredId ||
              selectedId)
        ) ||
        tickets[0] ||
        null;

      setSelectedId(
        next?.id || ""
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load Support Inbox."
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendReply() {
    if (
      !selectedId ||
      !reply.trim()
    ) {
      return;
    }

    try {
      setBusy("reply");
      setError("");
      setNotice("");

      const result =
        await replyAdminSupportTicket(
          selectedId,
          reply.trim()
        );

      setReply("");
      setNotice(
        result?.message ||
          "Reply sent."
      );

      await load(selectedId);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to send support reply."
      );
    } finally {
      setBusy("");
    }
  }

  async function updateTicket(
    changes: any
  ) {
    if (!selectedId) return;

    try {
      setBusy(
        Object.keys(changes)[0] ||
          "update"
      );
      setError("");
      setNotice("");

      const result =
        await updateAdminSupportTicket(
          selectedId,
          changes
        );

      setNotice(
        result?.message ||
          "Ticket updated."
      );

      await load(selectedId);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to update ticket."
      );
    } finally {
      setBusy("");
    }
  }

  const tickets =
    data?.tickets || [];

  const admins =
    data?.admins || [];

  const metrics =
    data?.metrics || {};

  const selected =
    tickets.find(
      (ticket: any) =>
        ticket.id === selectedId
    ) || null;

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          tickets.map(
            (ticket: any) =>
              ticket.category
          )
        )
      ).sort(),
    [tickets]
  );

  const filtered = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return tickets.filter(
      (ticket: any) => {
        const searchable = [
          ticket.subject,
          ticket.company_name,
          ticket.category,
          ticket.priority,
          ticket.status,
          ticket.headquarters || "",
          ...(ticket.messages || []).map(
            (item: any) =>
              item.message
          ),
        ]
          .join(" ")
          .toLowerCase();

        return (
          (!query ||
            searchable.includes(
              query
            )) &&
          (statusFilter ===
            "all" ||
            ticket.status ===
              statusFilter) &&
          (priorityFilter ===
            "all" ||
            ticket.priority ===
              priorityFilter) &&
          (categoryFilter ===
            "all" ||
            ticket.category ===
              categoryFilter)
        );
      }
    );
  }, [
    tickets,
    search,
    statusFilter,
    priorityFilter,
    categoryFilter,
  ]);

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar
          active="Support Inbox"
        />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Firmic Operations
              </p>

              <h1 className="text-3xl font-bold mt-1">
                Support Inbox
              </h1>

              <p className="text-slate-500 mt-2">
                Live tenant support tickets, threaded conversations, assignment, priority, and resolution controls.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                load(selectedId)
              }
              disabled={loading}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold disabled:bg-slate-300"
            >
              {loading
                ? "Refreshing..."
                : "Refresh Inbox"}
            </button>
          </header>

          {error && (
            <Alert
              type="error"
              text={error}
            />
          )}

          {notice && (
            <Alert
              type="success"
              text={notice}
            />
          )}

          <section className="grid grid-cols-1 md:grid-cols-5 gap-5 mt-8">
            <Stat
              title="Total Tickets"
              value={
                metrics.total_tickets ||
                0
              }
              icon="🎫"
            />

            <Stat
              title="Open"
              value={
                metrics.open_tickets ||
                0
              }
              icon="🔔"
            />

            <Stat
              title="Pending"
              value={
                metrics.pending_tickets ||
                0
              }
              icon="⏳"
            />

            <Stat
              title="Urgent"
              value={
                metrics.urgent_tickets ||
                0
              }
              icon="🚨"
            />

            <Stat
              title="Resolved"
              value={
                metrics.resolved_tickets ||
                0
              }
              icon="✅"
            />
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_180px_220px] gap-4">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search company, subject, message, office, status..."
                className="border border-slate-200 rounded-xl px-4 py-3"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="border border-slate-200 rounded-xl px-4 py-3"
              >
                <option value="all">
                  All Status
                </option>
                <option value="open">
                  Open
                </option>
                <option value="pending">
                  Pending
                </option>
                <option value="waiting_on_tenant">
                  Waiting on Tenant
                </option>
                <option value="resolved">
                  Resolved
                </option>
                <option value="closed">
                  Closed
                </option>
              </select>

              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(
                    event.target.value
                  )
                }
                className="border border-slate-200 rounded-xl px-4 py-3"
              >
                <option value="all">
                  All Priority
                </option>
                <option value="low">
                  Low
                </option>
                <option value="normal">
                  Normal
                </option>
                <option value="high">
                  High
                </option>
                <option value="urgent">
                  Urgent
                </option>
              </select>

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
                className="border border-slate-200 rounded-xl px-4 py-3"
              >
                <option value="all">
                  All Categories
                </option>

                {categories.map(
                  (category: any) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {label(category)}
                    </option>
                  )
                )}
              </select>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_450px] gap-6 mt-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-w-0">
              <h2 className="text-xl font-bold">
                Ticket Queue
              </h2>

              {loading ? (
                <Empty text="Loading support queue..." />
              ) : filtered.length ===
                0 ? (
                <Empty text="No tickets match these filters." />
              ) : (
                <div className="space-y-3 mt-5">
                  {filtered.map(
                    (ticket: any) => (
                      <button
                        type="button"
                        key={
                          ticket.id
                        }
                        onClick={() =>
                          setSelectedId(
                            ticket.id
                          )
                        }
                        className={`w-full text-left border rounded-2xl p-4 ${
                          selectedId ===
                          ticket.id
                            ? "border-violet-500 bg-violet-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_150px_160px] gap-4 items-center">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-lg">
                                {
                                  ticket.subject
                                }
                              </p>

                              <Priority
                                value={
                                  ticket.priority
                                }
                              />

                              <Status
                                value={
                                  ticket.status
                                }
                              />
                            </div>

                            <p className="text-sm text-slate-500 mt-1">
                              {
                                ticket.company_name
                              }{" "}
                              ·{" "}
                              {label(
                                ticket.category
                              )}
                            </p>
                          </div>

                          <Info
                            title="Messages"
                            value={String(
                              ticket.message_count ||
                                0
                            )}
                          />

                          <Info
                            title="Updated"
                            value={dateTime(
                              ticket.updated_at
                            )}
                          />
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <aside className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit xl:sticky xl:top-6">
              <h2 className="text-xl font-bold">
                Ticket Inspector
              </h2>

              {!selected ? (
                <p className="text-slate-500 mt-5">
                  Select a ticket.
                </p>
              ) : (
                <>
                  <div className="mt-5 bg-violet-50 border border-violet-100 rounded-2xl p-5">
                    <p className="text-sm text-violet-700">
                      {
                        selected.company_name
                      }
                    </p>

                    <p className="text-xl font-bold mt-1">
                      {
                        selected.subject
                      }
                    </p>

                    <p className="text-xs text-violet-700 mt-2 break-all">
                      {
                        selected.id
                      }
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <Mini
                      title="Category"
                      value={label(
                        selected.category
                      )}
                    />

                    <Mini
                      title="Headquarters"
                      value={
                        selected.headquarters ||
                        "None"
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 mt-5">
                    <div>
                      <label className="text-xs font-bold text-slate-500">
                        Priority
                      </label>

                      <select
                        value={
                          selected.priority
                        }
                        onChange={(event) =>
                          updateTicket({
                            priority:
                              event.target.value,
                          })
                        }
                        disabled={
                          busy ===
                          "priority"
                        }
                        className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3"
                      >
                        <option value="low">
                          Low
                        </option>
                        <option value="normal">
                          Normal
                        </option>
                        <option value="high">
                          High
                        </option>
                        <option value="urgent">
                          Urgent
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500">
                        Status
                      </label>

                      <select
                        value={
                          selected.status
                        }
                        onChange={(event) =>
                          updateTicket({
                            status:
                              event.target.value,
                          })
                        }
                        disabled={
                          busy ===
                          "status"
                        }
                        className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3"
                      >
                        <option value="open">
                          Open
                        </option>
                        <option value="pending">
                          Pending
                        </option>
                        <option value="waiting_on_tenant">
                          Waiting on Tenant
                        </option>
                        <option value="resolved">
                          Resolved
                        </option>
                        <option value="closed">
                          Closed
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500">
                        Assigned Admin
                      </label>

                      <select
                        value={
                          selected.assigned_admin_id ||
                          ""
                        }
                        onChange={(event) =>
                          updateTicket({
                            assigned_admin_id:
                              event.target.value ||
                              null,
                          })
                        }
                        disabled={
                          busy ===
                          "assigned_admin_id"
                        }
                        className="mt-2 w-full border border-slate-200 rounded-xl px-4 py-3"
                      >
                        <option value="">
                          Unassigned
                        </option>

                        {admins.map(
                          (admin: any) => (
                            <option
                              key={
                                admin.id
                              }
                              value={
                                admin.id
                              }
                            >
                              {admin.full_name ||
                                admin.email}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 max-h-80 overflow-y-auto space-y-3">
                    {(selected.messages ||
                      []).map(
                      (item: any) => (
                        <div
                          key={
                            item.id
                          }
                          className={`rounded-2xl p-4 ${
                            item.sender_type ===
                            "admin"
                              ? "ml-8 bg-violet-600 text-white"
                              : "mr-8 bg-slate-100"
                          }`}
                        >
                          <p className="text-xs font-bold opacity-70">
                            {item.sender_type ===
                            "admin"
                              ? "Firmic Support"
                              : selected.company_name}
                          </p>

                          <p className="mt-2 whitespace-pre-wrap">
                            {
                              item.message
                            }
                          </p>

                          <p className="text-[11px] mt-2 opacity-60">
                            {dateTime(
                              item.created_at
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  {selected.status !==
                    "closed" && (
                    <div className="mt-5">
                      <textarea
                        value={reply}
                        onChange={(event) =>
                          setReply(
                            event.target.value
                          )
                        }
                        rows={4}
                        placeholder="Reply to tenant..."
                        className="w-full border border-slate-200 rounded-xl px-4 py-3"
                      />

                      <button
                        type="button"
                        onClick={
                          sendReply
                        }
                        disabled={
                          busy ===
                          "reply" ||
                          !reply.trim()
                        }
                        className="w-full mt-3 bg-violet-600 text-white rounded-xl py-3 font-bold disabled:bg-slate-300"
                      >
                        {busy ===
                        "reply"
                          ? "Sending..."
                          : "Send Reply"}
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/admin-company?company_id=${selected.company_id}`
                      )
                    }
                    className="w-full mt-3 border border-slate-200 rounded-xl py-3 font-bold"
                  >
                    Open Company Inspector
                  </button>
                </>
              )}
            </aside>
          </section>
        </main>
      </div>
    </AdminProtectedRoute>
  );
}

function Stat({
  title,
  value,
  icon,
}: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">
        {icon}
      </div>
      <p className="text-sm text-slate-500 mt-3">
        {title}
      </p>
      <p className="text-2xl font-bold mt-1">
        {value}
      </p>
    </div>
  );
}

function Info({
  title,
  value,
}: any) {
  return (
    <div>
      <p className="text-xs text-slate-500">
        {title}
      </p>
      <p className="font-bold mt-1">
        {value}
      </p>
    </div>
  );
}

function Mini({
  title,
  value,
}: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
      <p className="text-xs text-slate-500">
        {title}
      </p>
      <p className="font-bold mt-1 break-words">
        {value}
      </p>
    </div>
  );
}

function Alert({
  type,
  text,
}: any) {
  return (
    <div
      className={`mt-6 border rounded-2xl p-4 ${
        type === "error"
          ? "bg-red-50 border-red-200 text-red-700"
          : "bg-green-50 border-green-200 text-green-700"
      }`}
    >
      {text}
    </div>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-slate-500">
      {text}
    </div>
  );
}

function Priority({
  value,
}: {
  value: string;
}) {
  const style =
    value === "urgent"
      ? "bg-red-100 text-red-700"
      : value === "high"
      ? "bg-orange-100 text-orange-700"
      : "bg-slate-200 text-slate-600";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${style}`}
    >
      {value}
    </span>
  );
}

function Status({
  value,
}: {
  value: string;
}) {
  return (
    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
      {label(value)}
    </span>
  );
}

function label(
  value: string
) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function dateTime(
  value?: string
) {
  return value
    ? new Date(
        value
      ).toLocaleString()
    : "Not recorded";
}
