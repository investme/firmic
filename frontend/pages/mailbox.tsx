import { useEffect, useMemo, useState } from "react";

import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";

import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";
import { readCompanyStorage } from "../src/utils/companyStorage";

type Tab =
  | "Overview"
  | "Incoming Mail"
  | "Packages"
  | "Scanned"
  | "Document Vault";

type MailItem = {
  id: string;
  type: string;
  from: string;
  status: string;
  date: string;
  icon: string;
  subject?: string;
  recipient?: string;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  summary?: string;
  category?: string;
  fileName?: string;
  fileUrl?: string;
  pageCount?: number;
  receivedAt?: string;
};

const tabs: Tab[] = [
  "Overview",
  "Incoming Mail",
  "Packages",
  "Scanned",
  "Document Vault",
];

export default function Mailbox() {
  const [workspace, setWorkspace] = useState(() =>
    getActiveWorkspace()
  );
  const [mailItems, setMailItems] = useState<MailItem[]>([]);
  const [selectedMailId, setSelectedMailId] =
    useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const sync = () => setWorkspace(getActiveWorkspace());

    sync();
    window.addEventListener(getWorkspaceChangedEventName(), sync);
    window.addEventListener("firmic-company-data-changed", sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(
        getWorkspaceChangedEventName(),
        sync
      );
      window.removeEventListener(
        "firmic-company-data-changed",
        sync
      );
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    loadMail();
  }, [workspace?.id]);

  function loadMail() {
    if (!workspace?.id) {
      setMailItems([]);
      setSelectedMailId(null);
      return;
    }

    const stored = readCompanyStorage<MailItem[]>(
      "mail_items",
      []
    );
    const safeItems = Array.isArray(stored) ? stored : [];

    setMailItems(safeItems);
    setSelectedMailId((current) =>
      current && safeItems.some((item) => item.id === current)
        ? current
        : safeItems[0]?.id || null
    );
  }

  const headquarters = workspace?.headquarters;
  const companyName = workspace?.name || "Active Company";
  const hasHeadquarters = Boolean(headquarters?.office_code);

  const selected =
    mailItems.find((item) => item.id === selectedMailId) || null;

  const newMail = countStatus(mailItems, "New");
  const scanned = countStatus(mailItems, "Scanned");
  const forwarded = countStatus(mailItems, "Forwarded");
  const archived = countStatus(mailItems, "Archived");

  const packages = mailItems.filter(isPackage);
  const scannedItems = mailItems.filter(
    (item) =>
      normalize(item.status) === "scanned" ||
      Boolean(item.fileName || item.fileUrl)
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return mailItems.filter((item) => {
      const tabMatch =
        activeTab === "Incoming Mail"
          ? !isPackage(item)
          : activeTab === "Packages"
            ? isPackage(item)
            : activeTab === "Scanned" ||
                activeTab === "Document Vault"
              ? scannedItems.some(
                  (scannedItem) => scannedItem.id === item.id
                )
              : true;

      const statusMatch =
        statusFilter === "All" ||
        normalize(item.status) === normalize(statusFilter);

      const searchMatch =
        !query ||
        [
          item.type,
          item.from,
          item.status,
          item.subject,
          item.recipient,
          item.trackingNumber,
          item.carrier,
          item.notes,
          item.summary,
          item.category,
          item.fileName,
          item.date,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      return tabMatch && statusMatch && searchMatch;
    });
  }, [
    mailItems,
    activeTab,
    search,
    statusFilter,
    scannedItems,
  ]);

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(
          mailItems
            .map((item) => item.status)
            .filter(Boolean)
        )
      ),
    [mailItems]
  );

  const readiness = hasHeadquarters ? 100 : 50;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-100/70 blur-3xl" />

            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Digital Mailroom
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 xl:text-4xl">
                  Mail and document operations for {companyName}.
                </h1>

                <p className="mt-3 max-w-3xl leading-7 text-slate-500">
                  Receive business mail, track packages, review scanned
                  items, and move important records into a secure
                  company document workflow.
                </p>
              </div>

              <div className="min-w-[300px] rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Registered Mailroom
                </p>
                <p className="mt-2 text-lg font-black text-slate-950">
                  {headquarters?.mailbox ||
                    (headquarters?.office_code
                      ? `Headquarters ${headquarters.office_code}`
                      : "Not Assigned")}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {headquarters?.location ||
                    "No headquarters selected"}
                </p>
              </div>
            </div>
          </header>

          {!hasHeadquarters && (
            <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
              <p className="font-black">
                Headquarters activation required
              </p>
              <p className="mt-1 text-sm">
                Activate a headquarters before receiving physical
                business mail through Firmic.
              </p>
            </div>
          )}

          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Stat
              title="New Mail"
              value={String(newMail)}
              detail="Items awaiting review"
              icon="✉️"
            />
            <Stat
              title="Packages"
              value={String(packages.length)}
              detail="Tracked physical deliveries"
              icon="📦"
            />
            <Stat
              title="Scanned Items"
              value={String(scannedItems.length)}
              detail="Digital copies available"
              icon="📄"
            />
            <Stat
              title="Forwarded"
              value={String(forwarded)}
              detail={`${archived} archived records`}
              icon="🚚"
            />
            <Stat
              title="Mailroom Readiness"
              value={`${readiness}%`}
              detail={
                hasHeadquarters
                  ? "Headquarters connected"
                  : "Awaiting headquarters"
              }
              icon="📬"
            />
          </section>

          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 sm:px-6">
              <div className="flex gap-2 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`whitespace-nowrap border-b-2 px-4 py-4 text-sm font-black transition ${
                      activeTab === tab
                        ? "border-violet-600 text-violet-700"
                        : "border-transparent text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {activeTab === "Overview" ? (
                <Overview
                  mailItems={mailItems}
                  selected={selected}
                  onSelect={setSelectedMailId}
                  onOpenInbox={() => setActiveTab("Incoming Mail")}
                  onOpenVault={() => setActiveTab("Document Vault")}
                />
              ) : (
                <MailWorkspace
                  activeTab={activeTab}
                  items={filteredItems}
                  selected={selected}
                  selectedMailId={selectedMailId}
                  search={search}
                  statusFilter={statusFilter}
                  statuses={statuses}
                  onSearch={setSearch}
                  onStatusFilter={setStatusFilter}
                  onSelect={setSelectedMailId}
                />
              )}
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Overview({
  mailItems,
  selected,
  onSelect,
  onOpenInbox,
  onOpenVault,
}: {
  mailItems: MailItem[];
  selected: MailItem | null;
  onSelect: (id: string) => void;
  onOpenInbox: () => void;
  onOpenVault: () => void;
}) {
  const recent = mailItems.slice(0, 5);

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_390px]">
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-violet-700">
              Mailroom Overview
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Recent incoming items
            </h2>
          </div>

          <button
            type="button"
            onClick={onOpenInbox}
            className="w-fit rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"
          >
            Open Mail Register
          </button>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon="📬"
            title="No mail received"
            description="Mail and packages received for this company will appear here after they are registered by the mailroom."
          />
        ) : (
          <div className="mt-6 space-y-3">
            {recent.map((item) => (
              <MailRow
                key={item.id}
                item={item}
                selected={selected?.id === item.id}
                onClick={() => onSelect(item.id)}
              />
            ))}
          </div>
        )}
      </section>

      <aside className="space-y-5">
        <section className="rounded-3xl bg-slate-950 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
            Selected Mail
          </p>

          {selected ? (
            <>
              <div className="mt-4 flex items-start gap-4">
                <div className="text-4xl">
                  {selected.icon || "✉️"}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-black">
                    {selected.subject ||
                      selected.type ||
                      "Mail item"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">
                    From: {selected.from || "Unknown sender"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <DarkMetric
                  title="Status"
                  value={selected.status || "Unknown"}
                />
                <DarkMetric
                  title="Received"
                  value={
                    selected.receivedAt ||
                    selected.date ||
                    "Not recorded"
                  }
                />
              </div>

              <button
                type="button"
                onClick={onOpenVault}
                className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 font-black hover:bg-violet-700"
              >
                Review Document Workflow
              </button>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Select an incoming item to review its metadata and
              available workflow.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            Processing Workflow
          </p>

          <div className="mt-4 space-y-3">
            <ReadinessRow label="Receive and register" status="Active" />
            <ReadinessRow label="Scan and classify" status="Ready" />
            <ReadinessRow
              label="Forward physical mail"
              status="Integration ready"
            />
            <ReadinessRow
              label="Hermes review"
              status="Available"
            />
          </div>

          <a
            href="/hermes"
            className="mt-4 block rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-center text-sm font-black text-violet-700 hover:bg-violet-100"
          >
            Open Hermes
          </a>
        </section>
      </aside>
    </div>
  );
}

function MailWorkspace({
  activeTab,
  items,
  selected,
  selectedMailId,
  search,
  statusFilter,
  statuses,
  onSearch,
  onStatusFilter,
  onSelect,
}: {
  activeTab: Tab;
  items: MailItem[];
  selected: MailItem | null;
  selectedMailId: string | null;
  search: string;
  statusFilter: string;
  statuses: string[];
  onSearch: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <section>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black text-violet-700">
              {activeTab}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {workspaceTitle(activeTab)}
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search sender, type, tracking..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 sm:w-72"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                onStatusFilter(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-600 outline-none focus:border-violet-500"
            >
              <option value="All">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={emptyIcon(activeTab)}
            title={`No ${activeTab.toLowerCase()} found`}
            description="There are no matching company records in this mailroom view."
          />
        ) : (
          <div className="mt-6 space-y-3">
            {items.map((item) => (
              <MailRow
                key={item.id}
                item={item}
                selected={selectedMailId === item.id}
                onClick={() => onSelect(item.id)}
              />
            ))}
          </div>
        )}
      </section>

      <aside className="2xl:sticky 2xl:top-6 2xl:self-start">
        <SelectedMailPanel item={selected} />
      </aside>
    </div>
  );
}

function SelectedMailPanel({ item }: { item: MailItem | null }) {
  if (!item) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
          Mail Intelligence
        </p>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Select an item to inspect sender, status, tracking,
          scanned-file availability, and document workflow.
        </p>
      </section>
    );
  }

  const hasScan = Boolean(item.fileName || item.fileUrl) ||
    normalize(item.status) === "scanned";

  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="text-3xl">{item.icon || "✉️"}</div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Selected Record
            </p>
            <h3 className="mt-1 truncate text-xl font-black text-slate-950">
              {item.subject || item.type || "Mail item"}
            </h3>
          </div>
        </div>

        <StatusBadge value={item.status} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <MiniMetric
          title="Sender"
          value={item.from || "Unknown"}
        />
        <MiniMetric
          title="Received"
          value={item.receivedAt || item.date || "Unknown"}
        />
        <MiniMetric
          title="Recipient"
          value={item.recipient || "Company"}
        />
        <MiniMetric
          title="Category"
          value={item.category || item.type || "Mail"}
        />
      </div>

      {(item.trackingNumber || item.carrier) && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            Package Tracking
          </p>
          <p className="mt-2 text-sm font-black text-slate-950">
            {item.trackingNumber || "Tracking not recorded"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {item.carrier || "Carrier not recorded"}
          </p>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
          Document Details
        </p>

        <div className="mt-3 space-y-2 text-sm">
          <DetailLine
            label="Digital scan"
            value={hasScan ? "Available" : "Not available"}
          />
          <DetailLine
            label="File"
            value={item.fileName || "Not attached"}
          />
          <DetailLine
            label="Pages"
            value={
              item.pageCount
                ? String(item.pageCount)
                : "Not recorded"
            }
          />
        </div>

        {item.fileUrl ? (
          <a
            href={item.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white hover:bg-slate-800"
          >
            Open Scanned File
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="A scanned file has not been connected to this record."
            className="mt-4 w-full cursor-not-allowed rounded-xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-500"
          >
            Scan Not Available
          </button>
        )}
      </div>

      {(item.summary || item.notes) && (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-violet-700">
            Mailroom Notes
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {item.summary || item.notes}
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled
          title="Requires a mail-action backend endpoint."
          className="cursor-not-allowed rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-400"
        >
          Forward
        </button>
        <button
          type="button"
          disabled
          title="Requires a mail-action backend endpoint."
          className="cursor-not-allowed rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-400"
        >
          Archive
        </button>
      </div>

      <a
        href="/hermes"
        className="mt-3 block rounded-xl bg-violet-600 px-4 py-3 text-center text-sm font-black text-white hover:bg-violet-700"
      >
        Review with Hermes
      </a>
    </section>
  );
}

function MailRow({
  item,
  selected,
  onClick,
}: {
  item: MailItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
        selected
          ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="grid gap-3 md:grid-cols-[50px_1.5fr_1fr_130px_120px] md:items-center">
        <div className="text-3xl">{item.icon || "✉️"}</div>

        <div className="min-w-0">
          <p className="truncate font-black text-slate-950">
            {item.subject || item.type || "Mail item"}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">
            From: {item.from || "Unknown sender"}
          </p>
        </div>

        <p className="truncate text-sm font-bold text-slate-600">
          {item.category || item.type || "Mail"}
        </p>

        <StatusBadge value={item.status} />

        <p className="text-sm text-slate-500">
          {item.receivedAt || item.date || "Not recorded"}
        </p>
      </div>
    </button>
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
      <p className="mt-4 text-sm font-bold text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        {detail}
      </p>
    </div>
  );
}

function DarkMetric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs font-bold text-slate-400">{title}</p>
      <p className="mt-1 truncate text-sm font-black text-white">
        {value}
      </p>
    </div>
  );
}

function MiniMetric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold text-slate-400">{title}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ value }: { value?: string }) {
  const normalized = normalize(value);

  const tone =
    normalized === "new"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : normalized === "scanned"
        ? "border-violet-200 bg-violet-50 text-violet-700"
        : normalized === "forwarded"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : normalized === "archived"
            ? "border-slate-200 bg-slate-100 text-slate-600"
            : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${tone}`}
    >
      {value || "Unknown"}
    </span>
  );
}

function ReadinessRow({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-600">
        {label}
      </span>
      <span className="text-xs font-black text-emerald-600">
        {status}
      </span>
    </div>
  );
}

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[220px] text-right font-bold text-slate-800">
        {value}
      </span>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-3 font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function normalize(value?: string) {
  return String(value || "").trim().toLowerCase();
}

function countStatus(items: MailItem[], status: string) {
  return items.filter(
    (item) => normalize(item.status) === normalize(status)
  ).length;
}

function isPackage(item: MailItem) {
  return [item.type, item.category]
    .filter(Boolean)
    .some((value) => normalize(value).includes("package"));
}

function workspaceTitle(tab: Tab) {
  if (tab === "Incoming Mail") return "Incoming mail register";
  if (tab === "Packages") return "Package tracking register";
  if (tab === "Scanned") return "Scanned mail records";
  if (tab === "Document Vault") return "Mail-derived document vault";
  return "Mailroom records";
}

function emptyIcon(tab: Tab) {
  if (tab === "Packages") return "📦";
  if (tab === "Scanned" || tab === "Document Vault") return "📄";
  return "✉️";
}
