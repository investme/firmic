import {
  useEffect,
  useMemo,
  useState,
} from "react";

import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";

import {
  closeSupportTicket,
  createSupportTicket,
  getCompanySupportTickets,
  reopenSupportTicket,
  replyToSupportTicket,
} from "../services/supportApi";

import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";

const categories = [
  ["general", "General"],
  ["billing", "Billing"],
  ["compliance", "Compliance"],
  ["technical", "Technical"],
  ["office", "Office"],
  ["mailbox", "Digital Mailroom"],
  ["voip", "Business Communications"],
  ["microsoft_365", "Microsoft 365"],
  ["ai_workforce", "AI Workforce"],
  ["meeting_rooms", "Meeting Rooms"],
];

export default function SupportCenter() {
  const [workspace, setWorkspace] =
    useState(() =>
      getActiveWorkspace()
    );

  const [data, setData] =
    useState<any>(null);

  const [selectedId, setSelectedId] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [subject, setSubject] =
    useState("");

  const [category, setCategory] =
    useState("general");

  const [message, setMessage] =
    useState("");

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
    function sync() {
      setWorkspace(
        getActiveWorkspace()
      );
    }

    sync();

    window.addEventListener(
      getWorkspaceChangedEventName(),
      sync
    );

    window.addEventListener(
      "storage",
      sync
    );

    return () => {
      window.removeEventListener(
        getWorkspaceChangedEventName(),
        sync
      );

      window.removeEventListener(
        "storage",
        sync
      );
    };
  }, []);

  useEffect(() => {
    void load();
  }, [workspace?.id]);

  async function load(
    preferredTicketId?: string
  ) {
    if (!workspace?.id) {
      setData(null);
      setSelectedId("");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result =
        await getCompanySupportTickets(
          workspace.id
        );

      setData(result);

      const tickets =
        result?.tickets || [];

      const next =
        tickets.find(
          (ticket: any) =>
            ticket.id ===
            (preferredTicketId ||
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
          "Failed to load Support Center."
      );
    } finally {
      setLoading(false);
    }
  }

  async function createTicket() {
    if (!workspace?.id) {
      setError(
        "Select a company first."
      );
      return;
    }

    if (
      subject.trim().length < 3 ||
      message.trim().length < 3
    ) {
      setError(
        "Enter a subject and a clear support message."
      );
      return;
    }

    try {
      setBusy("create");
      setError("");
      setNotice("");

      const result =
        await createSupportTicket({
          company_id:
            workspace.id,
          subject:
            subject.trim(),
          category,
          message:
            message.trim(),
        });

      setSubject("");
      setCategory("general");
      setMessage("");

      setNotice(
        result?.message ||
          "Support ticket created."
      );

      await load(
        result?.ticket?.id
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to create support ticket."
      );
    } finally {
      setBusy("");
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
        await replyToSupportTicket(
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
          "Failed to send reply."
      );
    } finally {
      setBusy("");
    }
  }

  async function toggleClosed() {
    if (!selectedId) return;

    const selected =
      tickets.find(
        (ticket: any) =>
          ticket.id === selectedId
      );

    if (!selected) return;

    try {
      setBusy("status");
      setError("");
      setNotice("");

      const result =
        selected.status ===
        "closed"
          ? await reopenSupportTicket(
              selectedId
            )
          : await closeSupportTicket(
              selectedId
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

  const metrics =
    data?.metrics || {};

  const selected =
    tickets.find(
      (ticket: any) =>
        ticket.id === selectedId
    ) || null;

  const filtered = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return tickets.filter(
      (ticket: any) => {
        const searchable = [
          ticket.subject,
          ticket.category,
          ticket.priority,
          ticket.status,
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
              statusFilter)
        );
      }
    );
  }, [
    tickets,
    search,
    statusFilter,
  ]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar
          active="Support Center"
        />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Support Center
              </p>

              <h1 className="text-3xl font-bold mt-1">
                Firmic Support for{" "}
                {workspace?.name ||
                  "Active Company"}.
              </h1>

              <p className="text-slate-500 mt-2">
                Create support requests and communicate directly with the Firmic operations team.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                load(selectedId)
              }
              className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold"
            >
              Refresh Support
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

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat
              title="Total Tickets"
              value={
                metrics.total || 0
              }
              icon="🎫"
            />

            <Stat
              title="Open"
              value={
                metrics.open || 0
              }
              icon="🔔"
            />

            <Stat
              title="Pending"
              value={
                metrics.pending || 0
              }
              icon="⏳"
            />

            <Stat
              title="Resolved"
              value={
                metrics.resolved || 0
              }
              icon="✅"
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-6 mt-8">
            <div className="space-y-6">
              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h2 className="text-xl font-bold">
                  Your Support Tickets
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4 mt-5">
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search tickets..."
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
                      Waiting on You
                    </option>
                    <option value="resolved">
                      Resolved
                    </option>
                    <option value="closed">
                      Closed
                    </option>
                  </select>
                </div>

                {loading ? (
                  <Empty text="Loading support tickets..." />
                ) : filtered.length ===
                  0 ? (
                  <Empty text="No support tickets yet." />
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
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <p className="font-bold">
                                {
                                  ticket.subject
                                }
                              </p>

                              <p className="text-sm text-slate-500 mt-1">
                                {label(
                                  ticket.category
                                )}{" "}
                                ·{" "}
                                {
                                  ticket.message_count
                                }{" "}
                                messages
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
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
                          </div>
                        </button>
                      )
                    )}
                  </div>
                )}
              </section>

              {selected && (
                <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">
                        {
                          selected.subject
                        }
                      </h2>

                      <p className="text-sm text-slate-500 mt-1">
                        Ticket{" "}
                        {
                          selected.id
                        }
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        toggleClosed
                      }
                      disabled={
                        busy ===
                        "status"
                      }
                      className="border border-slate-200 px-4 py-2 rounded-xl font-bold"
                    >
                      {selected.status ===
                      "closed"
                        ? "Reopen Ticket"
                        : "Close Ticket"}
                    </button>
                  </div>

                  <div className="space-y-4 mt-6">
                    {(selected.messages ||
                      []).map(
                      (item: any) => (
                        <div
                          key={
                            item.id
                          }
                          className={`max-w-[85%] rounded-2xl p-4 ${
                            item.sender_type ===
                            "tenant"
                              ? "ml-auto bg-violet-600 text-white"
                              : "mr-auto bg-slate-100 text-slate-900"
                          }`}
                        >
                          <p className="text-xs font-bold opacity-70">
                            {item.sender_type ===
                            "tenant"
                              ? "You"
                              : "Firmic Support"}
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
                    <div className="mt-6">
                      <textarea
                        value={reply}
                        onChange={(event) =>
                          setReply(
                            event.target.value
                          )
                        }
                        rows={4}
                        placeholder="Reply to Firmic Support..."
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
                        className="mt-3 bg-violet-600 text-white px-5 py-3 rounded-xl font-bold disabled:bg-slate-300"
                      >
                        {busy ===
                        "reply"
                          ? "Sending..."
                          : "Send Reply"}
                      </button>
                    </div>
                  )}
                </section>
              )}
            </div>

            <aside className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit">
              <h2 className="text-xl font-bold">
                Create Support Ticket
              </h2>

              <p className="text-sm text-slate-500 mt-2">
                Give the Firmic team enough detail to resolve the issue quickly.
              </p>

              <div className="space-y-4 mt-5">
                <input
                  value={subject}
                  onChange={(event) =>
                    setSubject(
                      event.target.value
                    )
                  }
                  placeholder="Ticket subject"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3"
                />

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value
                    )
                  }
                  className="w-full border border-slate-200 rounded-xl px-4 py-3"
                >
                  {categories.map(
                    ([value, name]) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {name}
                      </option>
                    )
                  )}
                </select>

                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(
                      event.target.value
                    )
                  }
                  rows={7}
                  placeholder="Describe the issue or request..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-3"
                />

                <button
                  type="button"
                  onClick={
                    createTicket
                  }
                  disabled={
                    busy ===
                    "create"
                  }
                  className="w-full bg-violet-600 text-white rounded-xl py-3 font-bold disabled:bg-slate-300"
                >
                  {busy ===
                  "create"
                    ? "Creating..."
                    : "Create Ticket"}
                </button>
              </div>
            </aside>
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
    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 capitalize">
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
