import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

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
  type FirmicWorkspace,
} from "../src/utils/workspaceContext";

type DocumentRecord = {
  id: string;
  name: string;
  type: string;
  status: string;
  file_path?: string;
  uploaded_at?: string;
};

type ComplianceDocument = {
  name: string;
  uploaded_at?: string;
};

type ComplianceRequest = {
  key: string;
  label: string;
  state: string;
  description?: string;
  document?: ComplianceDocument | null;
};

type RequiredDocumentDefinition = {
  key: string;
  label: string;
  description: string;
  category: string;
  required: boolean;
  accepts: string;
  residencyRule?: "uae_resident_only";
};

const REQUIRED_DOCUMENTS: RequiredDocumentDefinition[] = [
  {
    key: "passport",
    label: "Passport",
    description:
      "Upload a clear scan or readable photo of the founder or authorized representative's valid passport.",
    category: "Identity",
    required: true,
    accepts: "PDF, JPG, JPEG or PNG",
  },
  {
    key: "emirates_id",
    label: "Emirates ID",
    description:
      "Required when the founder or authorized representative is a UAE resident. Upload the front and back in one PDF or a clear image.",
    category: "Identity",
    required: false,
    accepts: "PDF, JPG, JPEG or PNG",
    residencyRule: "uae_resident_only",
  },
  {
    key: "proof_of_address",
    label: "Proof of Address",
    description:
      "Upload a recent utility bill, bank statement, tenancy contract, or accepted residential address document.",
    category: "Identity",
    required: true,
    accepts: "PDF, JPG, JPEG or PNG",
  },
  {
    key: "trade_license",
    label: "Trade License",
    description:
      "Mandatory for operating the company in the UAE. Upload the valid trade license or licensing document issued by the relevant authority.",
    category: "Company",
    required: true,
    accepts: "PDF, JPG, JPEG or PNG",
  },
  {
    key: "incorporation_documents",
    label: "Company Formation Documents",
    description:
      "Upload the certificate of incorporation, memorandum, articles, or equivalent company formation papers.",
    category: "Company",
    required: true,
    accepts: "PDF, JPG, JPEG or PNG",
  },
  {
    key: "beneficial_owner",
    label: "Beneficial Owner Declaration",
    description:
      "Upload the completed ownership declaration showing the people who ultimately own or control the company.",
    category: "KYC",
    required: true,
    accepts: "PDF, JPG, JPEG or PNG",
  },
  {
    key: "kyc_questionnaire",
    label: "KYC Questionnaire",
    description:
      "Upload the completed Firmic KYC questionnaire covering company activity, ownership, source of funds, and expected use.",
    category: "KYC",
    required: true,
    accepts: "PDF, JPG, JPEG or PNG",
  },
];

const ACCEPTED_TYPES =
  ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

const MAX_FILE_SIZE_MB = 10;

function normalizeState(value?: string) {
  return String(value || "").trim().toLowerCase();
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function speakHermesMessage(
  companyName: string,
  onStart?: () => void,
  onEnd?: () => void,
) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const text = `Hello. I am Hermes. I have received the compliance package for ${companyName}. Your submitted identity, company, ownership, licensing, and KYC documents are now being verified. Most reviews are completed within twenty four hours. I will notify you if the package is approved, rejected, or requires another document. Your company remains securely locked during this review.`;

  const utterance =
    new SpeechSynthesisUtterance(text);

  const voices =
    window.speechSynthesis.getVoices();

  const voice =
    voices.find((candidate) =>
      /george|daniel|david|james|oliver|male/i.test(
        candidate.name,
      ),
    ) ||
    voices.find((candidate) =>
      /^en(-|_)/i.test(candidate.lang),
    ) ||
    voices[0];

  if (voice) utterance.voice = voice;

  utterance.rate = 0.94;
  utterance.pitch = 0.9;
  utterance.volume = 1;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
}

export default function Documents() {
  const router = useRouter();

  const [workspace, setWorkspace] =
    useState<FirmicWorkspace | null>(null);

  const [documents, setDocuments] =
    useState<DocumentRecord[]>([]);

  const [backendRequests, setBackendRequests] =
    useState<ComplianceRequest[]>([]);

  const [selectedFiles, setSelectedFiles] =
    useState<Record<string, File | null>>({});

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [name, setName] = useState("");
  const [type, setType] = useState("General");
  const [customFile, setCustomFile] =
    useState<File | null>(null);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [isUaeResident, setIsUaeResident] =
    useState<boolean | null>(null);

  const [localUploads, setLocalUploads] =
    useState<
      Record<
        string,
        {
          name: string;
          status: string;
          uploaded_at: string;
        }
      >
    >({});

  const [hermesOpen, setHermesOpen] =
    useState(false);

  const [hermesSpeaking, setHermesSpeaking] =
    useState(false);

  const onboarding =
    router.query.onboarding === "1" ||
    router.query.source === "hermes";

  useEffect(() => {
    function synchronizeWorkspace() {
      setWorkspace(getActiveWorkspace());
    }

    synchronizeWorkspace();

    const currentWorkspace = getActiveWorkspace();

    if (currentWorkspace?.id) {
      const savedResidency = readJson<{
        isUaeResident: boolean;
      }>(
        `firmic_residency:${currentWorkspace.id}`,
      );

      if (
        typeof savedResidency?.isUaeResident ===
        "boolean"
      ) {
        setIsUaeResident(
          savedResidency.isUaeResident,
        );
      }

      const savedUploads = readJson<
        Record<
          string,
          {
            name: string;
            status: string;
            uploaded_at: string;
          }
        >
      >(
        `firmic_compliance_uploads:${currentWorkspace.id}`,
      );

      if (savedUploads) {
        setLocalUploads(savedUploads);
      }
    }

    const eventName =
      getWorkspaceChangedEventName();

    window.addEventListener(
      eventName,
      synchronizeWorkspace,
    );

    window.addEventListener(
      "storage",
      synchronizeWorkspace,
    );

    return () => {
      window.removeEventListener(
        eventName,
        synchronizeWorkspace,
      );

      window.removeEventListener(
        "storage",
        synchronizeWorkspace,
      );
    };
  }, []);

  useEffect(() => {
    void loadPage();
  }, [workspace?.id]);

  async function loadPage() {
    if (!workspace?.id) {
      setDocuments([]);
      setBackendRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [documentResult, requestResult] =
        await Promise.allSettled([
          getCompanyDocuments(workspace.id),
          getComplianceRequests(workspace.id),
        ]);

      setDocuments(
        documentResult.status === "fulfilled" &&
          Array.isArray(documentResult.value)
          ? documentResult.value
          : [],
      );

      setBackendRequests(
        requestResult.status === "fulfilled" &&
          Array.isArray(
            requestResult.value?.requests,
          )
          ? requestResult.value.requests
          : [],
      );
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to load the Hermes Compliance Portal.",
      );
    } finally {
      setLoading(false);
    }
  }

  const requests = useMemo(() => {
    return REQUIRED_DOCUMENTS.map((definition) => {
      const backendRequest =
        backendRequests.find(
          (request) =>
            request.key === definition.key ||
            request.label === definition.label,
        );

      const matchingDocument =
        documents.find(
          (document) =>
            document.type === definition.key ||
            document.name === definition.label,
        );

      const localUpload =
        localUploads[definition.key];

      const notApplicable =
        definition.residencyRule ===
          "uae_resident_only" &&
        isUaeResident === false;

      const conditionallyRequired =
        definition.residencyRule ===
          "uae_resident_only"
          ? isUaeResident === true
          : definition.required;

      const recordedState = normalizeState(
        localUpload?.status ||
          matchingDocument?.status ||
          backendRequest?.state,
      );

      const completedOrReviewState = [
        "uploaded",
        "approved",
        "verified",
        "rejected",
        "under_review",
      ].includes(recordedState)
        ? recordedState
        : "";

      const state = notApplicable
        ? "not_applicable"
        : definition.residencyRule ===
              "uae_resident_only" &&
            isUaeResident === null
          ? "residency_confirmation_required"
          : completedOrReviewState ||
            (conditionallyRequired
              ? "requested"
              : "optional");

      return {
        ...definition,
        required: conditionallyRequired,
        state,
        document:
          backendRequest?.document ||
          (matchingDocument
            ? {
                name: matchingDocument.name,
                uploaded_at:
                  matchingDocument.uploaded_at,
              }
            : localUpload
              ? {
                  name: localUpload.name,
                  uploaded_at:
                    localUpload.uploaded_at,
                }
              : null),
      };
    });
  }, [backendRequests, documents, isUaeResident, localUploads]);

  const filteredDocuments = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return documents.filter((document) => {
      const searchable = [
        document.name,
        document.type,
        document.status,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!query ||
          searchable.includes(query)) &&
        (statusFilter === "all" ||
          document.status === statusFilter)
      );
    });
  }, [documents, search, statusFilter]);

  const companyName =
    workspace?.name || "Active Company";

  const approvedCount = requests.filter(
    (request) =>
      ["approved", "verified"].includes(
        normalizeState(request.state),
      ),
  ).length;

  const uploadedCount = requests.filter(
    (request) =>
      normalizeState(request.state) ===
      "uploaded",
  ).length;

  const actionRequired = requests.filter(
    (request) =>
      normalizeState(request.state) ===
        "requested" &&
      request.required,
  ).length;

  const completedCount =
    approvedCount + uploadedCount;

  const applicableRequests = requests.filter(
    (request) =>
      normalizeState(request.state) !==
      "not_applicable",
  );

  const complianceProgress =
    applicableRequests.length > 0
      ? Math.round(
          (completedCount /
            applicableRequests.length) *
            100,
        )
      : 0;

  function validateFile(file: File) {
    const allowedTypes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
    ]);

    if (!allowedTypes.has(file.type)) {
      throw new Error(
        `${file.name} is not supported. Upload PDF, JPG, JPEG, or PNG.`,
      );
    }

    if (
      file.size >
      MAX_FILE_SIZE_MB * 1024 * 1024
    ) {
      throw new Error(
        `${file.name} is larger than ${MAX_FILE_SIZE_MB} MB.`,
      );
    }
  }

  async function chooseAndUpload(
    request: (typeof requests)[number],
    file: File | null,
  ) {
    if (!file) return;

    try {
      validateFile(file);

      setSelectedFiles((current) => ({
        ...current,
        [request.key]: file,
      }));

      await submitRequiredDocument(
        request,
        file,
      );
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : `Failed to upload ${request.label}.`,
      );
    }
  }

  async function submitRequiredDocument(
    request: (typeof requests)[number],
    explicitFile?: File,
  ) {
    const file =
      explicitFile ||
      selectedFiles[request.key];

    if (!file) {
      setError(
        `Choose a file for ${request.label}.`,
      );
      return;
    }

    if (!workspace?.id) {
      setError("Select a company first.");
      return;
    }

    try {
      setBusy(request.key);
      setError("");
      setNotice("");

      await createDocument({
        company_id: workspace.id,
        name: request.label,
        type: request.key,
        status: "uploaded",
        file_path: file.name,
      });

      const uploadRecord = {
        name: file.name,
        status: "uploaded",
        uploaded_at: new Date().toISOString(),
      };

      setLocalUploads((current) => {
        const next = {
          ...current,
          [request.key]: uploadRecord,
        };

        writeJson(
          `firmic_compliance_uploads:${workspace.id}`,
          next,
        );

        return next;
      });

      setNotice(
        `${request.label} was uploaded and is awaiting Hermes and Firmic Admin review.`,
      );

      setSelectedFiles((current) => ({
        ...current,
        [request.key]: null,
      }));

      await loadPage();
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : `Failed to upload ${request.label}.`,
      );
    } finally {
      setBusy("");
    }
  }

  async function submitCustomDocument() {
    if (!workspace?.id) {
      setError("Select a company first.");
      return;
    }

    if (!name.trim()) {
      setError(
        "Document name is required.",
      );
      return;
    }

    if (!customFile) {
      setError(
        "Choose a document file.",
      );
      return;
    }

    try {
      setBusy("custom");
      setError("");

      await createDocument({
        company_id: workspace.id,
        name: name.trim(),
        type,
        status: "uploaded",
        file_path: customFile.name,
      });

      setName("");
      setType("General");
      setCustomFile(null);

      setNotice(
        "The additional document was submitted for review.",
      );

      await loadPage();
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to submit document.",
      );
    } finally {
      setBusy("");
    }
  }

  async function submitCompliancePackage() {
    if (!workspace?.id) return;

    if (isUaeResident === null) {
      setError(
        "Confirm whether the founder or authorized representative is a UAE resident.",
      );
      return;
    }

    const missing = requests.filter(
      (request) =>
        request.required &&
        ![
          "uploaded",
          "approved",
          "verified",
        ].includes(
          normalizeState(request.state),
        ),
    );

    if (missing.length > 0) {
      setError(
        `Upload all mandatory documents first. ${missing.length} requirement${
          missing.length === 1 ? "" : "s"
        } remain.`,
      );
      return;
    }

    writeJson(
      `firmic_compliance_status:${workspace.id}`,
      {
        status: "under_review",
        subscription_completed: true,
        admin_approved: false,
        infrastructure_provisioned: false,
        company_access_locked: true,
        next_step: "firmic_admin_review",
        updated_at: new Date().toISOString(),
      },
    );

    setHermesOpen(true);

    speakHermesMessage(
      companyName,
      () => setHermesSpeaking(true),
      () => setHermesSpeaking(false),
    );

    window.setTimeout(() => {
      void router.push("/launch");
    }, 4500);
  }

  async function removeDocument(
    documentId: string,
  ) {
    if (!confirm("Delete this document?")) {
      return;
    }

    try {
      setError("");
      await deleteDocument(documentId);
      await loadPage();
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to delete document.",
      );
    }
  }

  const content = (
    <main
      className={
        onboarding
          ? "min-w-0 flex-1 p-5 sm:p-8 lg:p-10"
          : "min-w-0 flex-1 p-6 xl:p-8"
      }
    >
      {onboarding && (
        <section className="mb-7 overflow-hidden rounded-[2rem] bg-[#09233d] p-6 text-white shadow-[0_24px_70px_rgba(9,35,61,0.18)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.17em] text-[#8de6e2]">
                Sonny → Hermes
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Hermes is now managing your compliance package.
              </h1>

              <p className="mt-4 max-w-3xl leading-7 text-white/65">
                Sonny has handed this stage to Hermes.
                Upload each mandatory identity, company,
                ownership, and KYC document below. Your
                company remains locked until Firmic Admin
                approves the complete package.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/12 bg-white/8 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8de6e2]">
                Compliance progress
              </p>

              <p className="mt-2 text-3xl font-black">
                {complianceProgress}%
              </p>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#20b9b5]"
                  style={{
                    width: `${complianceProgress}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-sm font-bold text-white/50">
                {completedCount} of {applicableRequests.length} supplied
              </p>
            </div>
          </div>
        </section>
      )}

      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-sm font-black text-violet-700">
            Hermes Compliance Portal
          </p>

          <h1 className="mt-1 text-3xl font-black">
            Verify {companyName}.
          </h1>

          <p className="mt-2 max-w-3xl text-slate-500">
            Upload the mandatory documents below.
            Accepted formats are PDF, JPG, JPEG, and PNG.
            You may use a scanner or a clear, readable phone
            photo. Maximum file size: {MAX_FILE_SIZE_MB} MB.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadPage()}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold"
        >
          Refresh Status
        </button>
      </header>

      {error && (
        <Alert type="error" text={error} />
      )}

      {notice && (
        <Alert type="success" text={notice} />
      )}

      <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-4">
        <Stat
          title="Required"
          value={requests.length}
          icon="📋"
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


      <section className="mt-8 rounded-[2rem] border border-[#09233d]/10 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-black text-[#0f8f91]">
          Residency Check
        </p>

        <h2 className="mt-2 text-2xl font-black">
          Is the founder or authorized representative a UAE resident?
        </h2>

        <p className="mt-2 max-w-3xl text-slate-500">
          Emirates ID is required only for UAE residents.
          Non-residents can complete compliance without an
          Emirates ID, but must still provide a passport and
          proof of address.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setIsUaeResident(true);

              if (workspace?.id) {
                writeJson(
                  `firmic_residency:${workspace.id}`,
                  { isUaeResident: true },
                );
              }
            }}
            className={[
              "rounded-2xl border p-5 text-left transition",
              isUaeResident === true
                ? "border-[#0f8f91] bg-[#0f8f91]/5 ring-4 ring-[#0f8f91]/10"
                : "border-slate-200 bg-slate-50 hover:border-[#0f8f91]/40",
            ].join(" ")}
          >
            <p className="font-black">Yes, UAE resident</p>
            <p className="mt-2 text-sm text-slate-500">
              Emirates ID becomes mandatory.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsUaeResident(false);

              if (workspace?.id) {
                writeJson(
                  `firmic_residency:${workspace.id}`,
                  { isUaeResident: false },
                );
              }
            }}
            className={[
              "rounded-2xl border p-5 text-left transition",
              isUaeResident === false
                ? "border-[#0f8f91] bg-[#0f8f91]/5 ring-4 ring-[#0f8f91]/10"
                : "border-slate-200 bg-slate-50 hover:border-[#0f8f91]/40",
            ].join(" ")}
          >
            <p className="font-black">No, non-resident</p>
            <p className="mt-2 text-sm text-slate-500">
              Emirates ID is marked not applicable.
            </p>
          </button>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black text-violet-700">
              Hermes Compliance Request
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Mandatory Document Package
            </h2>

            <p className="mt-2 max-w-3xl text-slate-500">
              Passport, proof of address, trade license,
              company formation documents, beneficial-owner
              declaration, and KYC are mandatory. Emirates ID
              is required only for UAE residents. Firmic cannot
              activate the office, AI workforce,
              communications, or Command Center until every
              applicable requirement is supplied and approved.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setHermesOpen(true);
              speakHermesMessage(
                companyName,
                () => setHermesSpeaking(true),
                () => setHermesSpeaking(false),
              );
            }}
            className="rounded-xl border border-violet-200 px-5 py-3 text-center font-bold text-violet-700"
          >
            Speak with Hermes
          </button>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            Loading Hermes requirements...
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {requests.map((request) => {
              const state =
                normalizeState(request.state);

              const selectedFile =
                selectedFiles[request.key] || null;

              const uploaded = [
                "uploaded",
                "approved",
                "verified",
              ].includes(state);

              const notApplicable =
                state === "not_applicable";

              const residencyPending =
                state ===
                "residency_confirmation_required";

              return (
                <article
                  key={request.key}
                  className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.13em] text-violet-700">
                        {request.category}
                      </p>

                      <h3 className="mt-2 text-lg font-black">
                        {request.label}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {request.description}
                      </p>
                    </div>

                    <StateBadge value={state} />
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Accepted upload
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {request.accepts}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Scan or clear phone photo · Maximum{" "}
                      {MAX_FILE_SIZE_MB} MB
                    </p>
                  </div>

                  {request.document && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="font-bold text-emerald-900">
                        {request.document.name}
                      </p>

                      <p className="mt-1 text-xs text-emerald-700">
                        Submitted{" "}
                        {formatDate(
                          request.document.uploaded_at,
                        )}
                      </p>
                    </div>
                  )}

                  {!uploaded &&
                    !notApplicable &&
                    !residencyPending && (
                    <div className="mt-4 space-y-3">
                      <label className="block rounded-xl border-2 border-dashed border-violet-200 bg-white p-4 text-center transition hover:border-violet-400">
                        <input
                          type="file"
                          accept={ACCEPTED_TYPES}
                          className="hidden"
                          onChange={(event) =>
                            void chooseAndUpload(
                              request,
                              event.target.files?.[0] ||
                                null,
                            )
                          }
                        />

                        <span className="block font-black text-violet-700">
                          Choose & Upload File
                        </span>

                        <span className="mt-1 block text-xs text-slate-500">
                          Upload starts immediately · PDF, JPG, JPEG or PNG
                        </span>
                      </label>

                      {selectedFile && (
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-sm font-bold">
                            {selectedFile.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {(
                              selectedFile.size /
                              1024 /
                              1024
                            ).toFixed(2)}{" "}
                            MB
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {uploaded && (
                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
                      Uploaded and awaiting Hermes / Firmic
                      Admin verification.
                    </div>
                  )}

                  {notApplicable && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-100 p-4 text-sm font-bold text-slate-700">
                      Not applicable because the founder or
                      authorized representative is not a UAE
                      resident.
                    </div>
                  )}

                  {residencyPending && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                      Confirm UAE residency above to determine
                      whether Emirates ID is required.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-8 rounded-[1.5rem] bg-[#09233d] p-6 text-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#8de6e2]">
                Submit to Firmic Compliance
              </p>

              <h3 className="mt-2 text-2xl font-black">
                Complete the mandatory package.
              </h3>

              <p className="mt-2 text-sm leading-6 text-white/55">
                Once every requirement is uploaded, Hermes
                will submit the company for Firmic Admin review.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void submitCompliancePackage()
              }
              disabled={
                requests.some(
                  (request) =>
                    request.required &&
                    ![
                      "uploaded",
                      "approved",
                      "verified",
                    ].includes(
                      normalizeState(
                        request.state,
                      ),
                    ),
                )
              }
              className="shrink-0 rounded-2xl bg-[#20b9b5] px-7 py-4 font-black text-[#09233d] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit Compliance Package →
            </button>
          </div>
        </div>
      </section>

      {!onboarding && (
        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_370px]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search documents..."
                  className="rounded-xl border border-slate-200 px-4 py-3"
                />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value,
                    )
                  }
                  className="rounded-xl border border-slate-200 px-4 py-3"
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
                  <option value="verified">
                    Verified
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

            {filteredDocuments.length === 0 ? (
              <Empty text="No additional documents have been submitted." />
            ) : (
              filteredDocuments.map((document) => (
                <div
                  key={document.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <h3 className="text-lg font-bold">
                        {document.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Type: {document.type}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        Uploaded{" "}
                        {formatDate(
                          document.uploaded_at,
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <StateBadge
                        value={document.status}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          void removeDocument(
                            document.id,
                          )
                        }
                        className="rounded-xl border border-red-200 px-4 py-2 font-bold text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">
              Add Other Document
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Add contracts, invoices, or other company
              records after the mandatory package.
            </p>

            <div className="mt-5 space-y-4">
              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Document name"
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />

              <input
                value={type}
                onChange={(event) =>
                  setType(event.target.value)
                }
                placeholder="Document type"
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />

              <input
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={(event) =>
                  setCustomFile(
                    event.target.files?.[0] || null,
                  )
                }
                className="block w-full text-sm"
              />

              <button
                type="button"
                onClick={() =>
                  void submitCustomDocument()
                }
                disabled={busy === "custom"}
                className="w-full rounded-xl bg-violet-600 py-3 font-bold text-white disabled:bg-slate-300"
              >
                Add Document
              </button>
            </div>
          </aside>
        </section>
      )}

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
        MVP storage note: the current backend records the selected
        filename as the document reference. Connect the document API
        to S3, Azure Blob Storage, or another secure binary-storage
        service before production use.
      </div>
    </main>
  );

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-slate-50">
        {!onboarding && <FirmicSidebar />}
        {content}
      </div>

      {hermesOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#09233d]/70 px-5 py-8 backdrop-blur-sm">
          <section className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] bg-[#09233d] p-7 text-white shadow-[0_30px_100px_rgba(9,35,61,0.35)] sm:p-10">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />

            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-violet-500 text-2xl font-black">
                H
              </div>

              <p className="mt-6 text-xs font-black uppercase tracking-[0.17em] text-violet-300">
                Hermes · Firmic Compliance
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Your documents are being verified.
              </h2>

              <p className="mt-5 text-lg leading-8 text-white/65">
                I have received the compliance package for {companyName}. Firmic Compliance is now verifying the submitted identity, company, ownership, licensing, and KYC documents.
              </p>

              <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-white/7 p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-300">
                  Expected response
                </p>

                <p className="mt-2 text-2xl font-black">
                  Within 24 hours
                </p>

                <p className="mt-2 text-sm leading-6 text-white/50">
                  I will notify you when the package is approved, rejected, or requires another document. The company remains securely locked while the review is in progress.
                </p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    speakHermesMessage(
                      companyName,
                      () => setHermesSpeaking(true),
                      () => setHermesSpeaking(false),
                    )
                  }
                  className="rounded-2xl bg-violet-500 px-6 py-4 font-black text-white"
                >
                  {hermesSpeaking ? "Hermes is speaking..." : "Replay Hermes Voice"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.speechSynthesis?.cancel();
                    setHermesSpeaking(false);
                    setHermesOpen(false);
                  }}
                  className="rounded-2xl border border-white/15 bg-white/5 px-6 py-4 font-black text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </ProtectedRoute>
  );
}

function Stat({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="mt-3 text-sm text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-2xl font-bold">
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
    normalizeState(value);

  const style = [
    "verified",
    "approved",
  ].includes(normalized)
    ? "bg-green-100 text-green-700"
    : normalized === "uploaded"
      ? "bg-blue-100 text-blue-700"
      : normalized === "requested"
        ? "bg-red-100 text-red-700"
        : normalized === "rejected"
          ? "bg-rose-100 text-rose-700"
          : normalized === "not_applicable"
            ? "bg-slate-200 text-slate-700"
            : normalized ===
                "residency_confirmation_required"
              ? "bg-amber-100 text-amber-800"
              : normalized === "optional"
                ? "bg-slate-100 text-slate-600"
                : "bg-red-100 text-red-700";

  const label =
    normalized === "requested" ||
    normalized === "not_requested"
      ? "Required"
      : normalized === "not_applicable"
        ? "Not Applicable"
        : normalized ===
            "residency_confirmation_required"
          ? "Confirm Residency"
          : normalized === "optional"
            ? "Optional"
            : normalized.replaceAll("_", " ");

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${style}`}
    >
      {label}
    </span>
  );
}

function Alert({
  type,
  text,
}: {
  type: "error" | "success";
  text: string;
}) {
  return (
    <div
      className={`mt-6 rounded-2xl border p-4 ${
        type === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-green-200 bg-green-50 text-green-700"
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
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
      {text}
    </div>
  );
}

function formatDate(value?: string) {
  return value
    ? new Date(value).toLocaleString()
    : "Not recorded";
}
