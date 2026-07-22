import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { API_URL } from "../services/config";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";

import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";

type Message = {
  id: string;
  channel: string;
  title: string;
  from: string;
  time: string;
  status: string;
  body: string;
  eventType: string;
};

function authHeaders() {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(
          "firmic_token"
        )
      : null;

  return {
    "Content-Type":
      "application/json",
    ...(token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : {}),
  };
}

export default function Messages() {
  const [workspace, setWorkspace] =
    useState(() =>
      getActiveWorkspace()
    );

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [selectedId, setSelectedId] =
    useState<string | null>(
      null
    );

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
    void loadMessages();
  }, [workspace?.id]);

  async function loadMessages() {
    if (!workspace?.id) {
      setMessages([]);
      setSelectedId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/activity/company/${encodeURIComponent(
          workspace.id
        )}?limit=100`,
        {
          headers:
            authHeaders(),
          cache: "no-store",
        }
      );

      const text =
        await response.text();

      if (!response.ok) {
        throw new Error(
          text ||
            "Failed to load communication activity."
        );
      }

      const activity = text
        ? JSON.parse(text)
        : [];

      const mapped: Message[] =
        (Array.isArray(activity)
          ? activity
          : []
        )
          .filter(
            (event: any) =>
              [
                "compliance_documents_requested",
                "compliance_document_uploaded",
                "compliance_document_verified",
                "compliance_reviewed",
              ].includes(
                String(
                  event.event_type ||
                    ""
                )
              )
          )
          .map(
            (event: any) => {
              const type =
                String(
                  event.event_type ||
                    ""
                );

              const actionNeeded =
                type ===
                "compliance_documents_requested";

              return {
                id:
                  event.id,
                channel:
                  "Hermes Compliance",
                title:
                  event.title,
                from:
                  event.actor_type ===
                  "admin"
                    ? "Firmic Compliance Team"
                    : "Hermes Compliance",
                time:
                  event.created_at
                    ? new Date(
                        event.created_at
                      ).toLocaleString()
                    : "Not recorded",
                status:
                  actionNeeded
                    ? "Action Needed"
                    : type ===
                      "compliance_document_verified"
                    ? "Verified"
                    : "Update",
                body:
                  event.description ||
                  "Compliance activity was recorded.",
                eventType:
                  type,
              };
            }
          );

      setMessages(mapped);
      setSelectedId(
        (current) =>
          current ||
          mapped[0]?.id ||
          null
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load messages."
      );
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  const companyName =
    workspace?.name ||
    "Active Company";

  const selected =
    messages.find(
      (message) =>
        message.id ===
        selectedId
    ) || null;

  const filteredMessages =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return messages;
      }

      return messages.filter(
        (message) =>
          [
            message.channel,
            message.title,
            message.from,
            message.status,
            message.body,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
      );
    }, [
      messages,
      search,
    ]);

  const actionNeeded =
    messages.filter(
      (message) =>
        message.status ===
        "Action Needed"
    ).length;

  const verified =
    messages.filter(
      (message) =>
        message.status ===
        "Verified"
    ).length;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar
          active="Communication Center"
        />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Communication Center
              </p>

              <h1 className="text-3xl font-bold mt-1">
                Compliance messages for{" "}
                {companyName}.
              </h1>

              <p className="text-slate-500 mt-2">
                Persistent Hermes alerts from the shared PostgreSQL Activity Log.
              </p>
            </div>

            <button
              type="button"
              onClick={
                loadMessages
              }
              className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold"
            >
              Refresh Messages
            </button>
          </header>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
              {error}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat
              title="Compliance Messages"
              value={
                messages.length
              }
              icon="💬"
            />

            <Stat
              title="Action Needed"
              value={
                actionNeeded
              }
              icon="⚠️"
            />

            <Stat
              title="Verified Updates"
              value={verified}
              icon="✅"
            />

            <Stat
              title="Live Source"
              value="PostgreSQL"
              icon="🔗"
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-6 mt-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-bold">
                  Unified Inbox
                </h2>

                <input
                  value={search}
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search compliance messages..."
                  className="border border-slate-200 rounded-xl px-4 py-3"
                />
              </div>

              {loading ? (
                <Empty text="Loading messages..." />
              ) : filteredMessages.length ===
                0 ? (
                <Empty text="No compliance messages have been created for this company." />
              ) : (
                <div className="mt-5 space-y-3">
                  {filteredMessages.map(
                    (message) => (
                      <button
                        key={
                          message.id
                        }
                        type="button"
                        onClick={() =>
                          setSelectedId(
                            message.id
                          )
                        }
                        className={`w-full text-left rounded-2xl border p-4 ${
                          selectedId ===
                          message.id
                            ? "border-violet-500 bg-violet-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_170px] gap-3 items-center">
                          <Badge
                            text={
                              message.channel
                            }
                          />

                          <div>
                            <p className="font-bold">
                              {
                                message.title
                              }
                            </p>

                            <p className="text-sm text-slate-500">
                              From:{" "}
                              {
                                message.from
                              }
                            </p>
                          </div>

                          <Status
                            text={
                              message.status
                            }
                          />
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <aside className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit">
              <h2 className="text-xl font-bold">
                Selected Message
              </h2>

              {!selected ? (
                <p className="mt-5 text-slate-500">
                  No message selected.
                </p>
              ) : (
                <>
                  <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                    <Badge
                      text={
                        selected.channel
                      }
                    />

                    <h3 className="text-xl font-bold mt-4">
                      {
                        selected.title
                      }
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                      {
                        selected.from
                      }{" "}
                      ·{" "}
                      {
                        selected.time
                      }
                    </p>

                    <p className="text-slate-600 mt-5">
                      {
                        selected.body
                      }
                    </p>
                  </div>

                  {selected.status ===
                    "Action Needed" && (
                    <a
                      href="/documents"
                      className="block text-center mt-4 bg-violet-600 text-white rounded-xl py-3 font-bold"
                    >
                      Open Document Vault
                    </a>
                  )}
                </>
              )}
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

function Badge({
  text,
}: {
  text: string;
}) {
  return (
    <span className="w-fit bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold">
      {text}
    </span>
  );
}

function Status({
  text,
}: {
  text: string;
}) {
  const style =
    text === "Action Needed"
      ? "bg-red-100 text-red-700"
      : text === "Verified"
      ? "bg-green-100 text-green-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span
      className={`w-fit px-3 py-1 rounded-full text-xs font-bold ${style}`}
    >
      {text}
    </span>
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
