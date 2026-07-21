import {
  useEffect,
  useMemo,
  useState,
} from "react";

import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";

import {
  createDocument,
  deleteDocument,
  getCompanyDocuments,
  getComplianceRequests,
} from "../services/documentApi";

import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";

export default function Documents() {
  const [workspace, setWorkspace] =
    useState(() =>
      getActiveWorkspace()
    );

  const [documents, setDocuments] =
    useState<any[]>([]);

  const [requests, setRequests] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [name, setName] =
    useState("");

  const [type, setType] =
    useState("General");

  const [fileReference, setFileReference] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [error, setError] =
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
    void loadPage();
  }, [workspace?.id]);

  async function loadPage() {
    if (!workspace?.id) {
      setDocuments([]);
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [
        documentResult,
        requestResult,
      ] = await Promise.all([
        getCompanyDocuments(
          workspace.id
        ),
        getComplianceRequests(
          workspace.id
        ),
      ]);

      setDocuments(
        Array.isArray(
          documentResult
        )
          ? documentResult
          : []
      );

      setRequests(
        requestResult?.requests ||
          []
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load Document Vault."
      );
    } finally {
      setLoading(false);
    }
  }

  async function registerDocument(
    documentName: string,
    documentType: string,
    reference = ""
  ) {
    if (!workspace?.id) {
      setError(
        "Select a company first."
      );
      return;
    }

    try {
      setBusy(documentType);
      setError("");
      setNotice("");

      await createDocument({
        company_id:
          workspace.id,
        name: documentName,
        type: documentType,
        status: "uploaded",
        file_path:
          reference || undefined,
      });

      setNotice(
        `${documentName} was submitted for Firmic Admin review.`
      );

      setName("");
      setType("General");
      setFileReference("");

      await loadPage();
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to submit document."
      );
    } finally {
      setBusy("");
    }
  }

  async function submitCustomDocument() {
    if (!name.trim()) {
      setError(
        "Document name is required."
      );
      return;
    }

    await registerDocument(
      name.trim(),
      type,
      fileReference.trim()
    );
  }

  async function removeDocument(
    documentId: string
  ) {
    if (
      !confirm(
        "Delete this document?"
      )
    ) {
      return;
    }

    try {
      await deleteDocument(
        documentId
      );
      await loadPage();
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to delete document."
      );
    }
  }

  const filteredDocuments =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return documents.filter(
        (document) => {
          const searchable = [
            document.name,
            document.type,
            document.status,
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
              document.status ===
                statusFilter)
          );
        }
      );
    }, [
      documents,
      search,
      statusFilter,
    ]);

  const companyName =
    workspace?.name ||
    "Active Company";

  const approvedCount =
    documents.filter(
      (document) =>
        [
          "approved",
          "verified",
        ].includes(
          String(
            document.status ||
              ""
          ).toLowerCase()
        )
    ).length;

  const uploadedCount =
    documents.filter(
      (document) =>
        String(
          document.status || ""
        ).toLowerCase() ===
        "uploaded"
    ).length;

  const actionRequired =
    requests.filter(
      (request) =>
        request.state ===
        "requested"
    ).length;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Document Vault
              </p>

              <h1 className="text-3xl font-bold mt-1">
                Compliance documents for{" "}
                {companyName}.
              </h1>

              <p className="text-slate-500 mt-2">
                Supply documents requested by Hermes and track Admin verification.
              </p>
            </div>

            <button
              type="button"
              onClick={loadPage}
              className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold"
            >
              Refresh Documents
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
              title="Documents"
              value={documents.length}
              icon="📄"
            />

            <Stat
              title="Verified"
              value={approvedCount}
              icon="✅"
            />

            <Stat
              title="Awaiting Review"
              value={uploadedCount}
              icon="🔎"
            />

            <Stat
              title="Action Required"
              value={actionRequired}
              icon="⚠️"
            />
          </section>

          <section className="bg-white border border-violet-200 rounded-3xl shadow-sm p-6 mt-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-violet-700">
                  Hermes Compliance Request
                </p>

                <h2 className="text-2xl font-bold mt-1">
                  Requested Documents
                </h2>

                <p className="text-slate-500 mt-2">
                  Submit each requested item. Uploaded documents remain pending until Firmic Admin verifies them.
                </p>
              </div>

              <a
                href="/messages"
                className="border border-violet-200 text-violet-700 px-5 py-3 rounded-xl font-bold"
              >
                Open Compliance Message
              </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
              {requests.map(
                (request) => (
                  <div
                    key={
                      request.key
                    }
                    className="border border-slate-200 bg-slate-50 rounded-2xl p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-lg">
                          {
                            request.label
                          }
                        </h3>

                        <p className="text-sm text-slate-500 mt-1">
                          {request.state ===
                          "requested"
                            ? "Firmic Admin requested this document."
                            : request.state ===
                              "uploaded"
                            ? "Uploaded and awaiting Admin verification."
                            : request.state ===
                              "verified"
                            ? "Verified by Firmic Admin."
                            : "Not currently requested."}
                        </p>
                      </div>

                      <StateBadge
                        value={
                          request.state
                        }
                      />
                    </div>

                    {request.document && (
                      <div className="mt-4 bg-white border border-slate-200 rounded-xl p-3">
                        <p className="font-semibold">
                          {
                            request
                              .document
                              .name
                          }
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          Submitted{" "}
                          {formatDate(
                            request
                              .document
                              .uploaded_at
                          )}
                        </p>
                      </div>
                    )}

                    {request.state ===
                      "requested" && (
                      <div className="mt-4 space-y-3">
                        <input
                          type="file"
                          onChange={(
                            event
                          ) => {
                            const file =
                              event
                                .target
                                .files?.[0];

                            if (file) {
                              setFileReference(
                                file.name
                              );
                            }
                          }}
                          className="block w-full text-sm"
                        />

                        <button
                          type="button"
                          disabled={
                            busy ===
                            request.key
                          }
                          onClick={() =>
                            registerDocument(
                              request.label,
                              request.label,
                              fileReference
                            )
                          }
                          className="w-full bg-violet-600 text-white rounded-xl py-3 font-bold disabled:bg-slate-300"
                        >
                          {busy ===
                          request.key
                            ? "Submitting..."
                            : `Submit ${request.label}`}
                        </button>

                        <p className="text-xs text-slate-400">
                          MVP note: this records the selected filename as the document reference. Binary file storage can be connected to S3 or Azure Blob after MVP.
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_370px] gap-6 mt-8">
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
                  <input
                    value={search}
                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Search documents..."
                    className="border border-slate-200 rounded-xl px-4 py-3"
                  />

                  <select
                    value={
                      statusFilter
                    }
                    onChange={(
                      event
                    ) =>
                      setStatusFilter(
                        event
                          .target
                          .value
                      )
                    }
                    className="border border-slate-200 rounded-xl px-4 py-3"
                  >
                    <option value="all">
                      All Status
                    </option>
                    <option value="uploaded">
                      Uploaded
                    </option>
                    <option value="approved">
                      Approved
                    </option>
                    <option value="pending">
                      Pending
                    </option>
                    <option value="rejected">
                      Rejected
                    </option>
                  </select>
                </div>
              </div>

              {loading ? (
                <Empty text="Loading documents..." />
              ) : filteredDocuments.length ===
                0 ? (
                <Empty text="No documents have been submitted yet." />
              ) : (
                filteredDocuments.map(
                  (document) => (
                    <div
                      key={
                        document.id
                      }
                      className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-lg">
                            {
                              document.name
                            }
                          </h3>

                          <p className="text-sm text-slate-500 mt-1">
                            Type:{" "}
                            {
                              document.type
                            }
                          </p>

                          <p className="text-xs text-slate-400 mt-2">
                            Uploaded{" "}
                            {formatDate(
                              document.uploaded_at
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <StateBadge
                            value={
                              document.status
                            }
                          />

                          <button
                            type="button"
                            onClick={() =>
                              removeDocument(
                                document.id
                              )
                            }
                            className="border border-red-200 text-red-600 px-4 py-2 rounded-xl font-bold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )
              )}
            </div>

            <aside className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit">
              <h2 className="text-xl font-bold">
                Add Other Document
              </h2>

              <p className="text-sm text-slate-500 mt-2">
                Register contracts, invoices, or other company records.
              </p>

              <div className="space-y-4 mt-5">
                <input
                  value={name}
                  onChange={(
                    event
                  ) =>
                    setName(
                      event.target
                        .value
                    )
                  }
                  placeholder="Document name"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3"
                />

                <input
                  value={type}
                  onChange={(
                    event
                  ) =>
                    setType(
                      event.target
                        .value
                    )
                  }
                  placeholder="Document type"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3"
                />

                <input
                  type="file"
                  onChange={(
                    event
                  ) => {
                    const file =
                      event.target
                        .files?.[0];

                    setFileReference(
                      file?.name ||
                        ""
                    );
                  }}
                  className="block w-full text-sm"
                />

                <button
                  type="button"
                  onClick={
                    submitCustomDocument
                  }
                  disabled={
                    busy === type
                  }
                  className="w-full bg-violet-600 text-white rounded-xl py-3 font-bold disabled:bg-slate-300"
                >
                  Add Document
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

function StateBadge({
  value,
}: {
  value: string;
}) {
  const normalized =
    String(value || "")
      .toLowerCase();

  const style =
    [
      "verified",
      "approved",
    ].includes(normalized)
      ? "bg-green-100 text-green-700"
      : normalized ===
        "uploaded"
      ? "bg-blue-100 text-blue-700"
      : normalized ===
        "requested"
      ? "bg-red-100 text-red-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${style}`}
    >
      {normalized.replaceAll(
        "_",
        " "
      )}
    </span>
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
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-500">
      {text}
    </div>
  );
}

function formatDate(
  value?: string
) {
  return value
    ? new Date(
        value
      ).toLocaleString()
    : "Not recorded";
}
