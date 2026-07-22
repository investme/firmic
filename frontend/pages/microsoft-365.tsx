import { useEffect, useMemo, useState } from "react";

import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";

import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";
import {
  readCompanyStorage,
  writeCompanyStorage,
} from "../src/utils/companyStorage";

type Tab =
  | "Overview"
  | "Users"
  | "Licenses"
  | "Mailboxes"
  | "Applications"
  | "Storage";

type MicrosoftUser = {
  id: string;
  name: string;
  email: string;
  status: string;
  license: string;
  storageGb: number;
  role?: string;
  department?: string;
  mailboxStatus?: string;
  teamsEnabled?: boolean;
  oneDriveEnabled?: boolean;
  lastLogin?: string;
};

const tabs: Tab[] = [
  "Overview",
  "Users",
  "Licenses",
  "Mailboxes",
  "Applications",
  "Storage",
];

const applications = [
  { name: "Outlook", icon: "📧", status: "Available" },
  { name: "Teams", icon: "💬", status: "Available" },
  { name: "Word", icon: "📘", status: "Available" },
  { name: "Excel", icon: "📊", status: "Available" },
  { name: "PowerPoint", icon: "📈", status: "Available" },
  { name: "OneDrive", icon: "☁️", status: "Available" },
  { name: "SharePoint", icon: "🗂️", status: "Integration ready" },
  { name: "Planner", icon: "🗓️", status: "Integration ready" },
];

export default function Microsoft365() {
  const [workspace, setWorkspace] = useState(() =>
    getActiveWorkspace()
  );
  const [users, setUsers] = useState<MicrosoftUser[]>([]);
  const [selectedId, setSelectedId] =
    useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "",
    department: "",
  });

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
    loadUsers();
  }, [workspace?.id]);

  function loadUsers() {
    if (!workspace?.id) {
      setUsers([]);
      setSelectedId(null);
      return;
    }

    const stored = readCompanyStorage<MicrosoftUser[]>(
      "microsoft_users",
      []
    );
    const safeUsers = Array.isArray(stored) ? stored : [];

    setUsers(safeUsers);
    setSelectedId((current) =>
      current && safeUsers.some((user) => user.id === current)
        ? current
        : safeUsers[0]?.id || null
    );
  }

  function addUser() {
    const name = form.name.trim();
    const email = form.email.trim();

    if (!name || !email) return;

    const user: MicrosoftUser = {
      id: crypto.randomUUID(),
      name,
      email,
      status: "Pending",
      license: "Unassigned",
      storageGb: 0,
      role: form.role.trim() || "Member",
      department: form.department.trim() || "General",
      mailboxStatus: "Pending",
      teamsEnabled: false,
      oneDriveEnabled: false,
      lastLogin: "Never",
    };

    const next = [...users, user];

    writeCompanyStorage("microsoft_users", next);
    setUsers(next);
    setSelectedId(user.id);
    setShowForm(false);
    setForm({
      name: "",
      email: "",
      role: "",
      department: "",
    });
  }

  const selected =
    users.find((user) => user.id === selectedId) || null;

  const activeUsers = users.filter(
    (user) => normalize(user.status) === "active"
  ).length;

  const assignedLicenses = users.filter(
    (user) => normalize(user.license) !== "unassigned"
  ).length;

  const mailboxes = users.filter(
    (user) =>
      normalize(user.mailboxStatus) === "active" ||
      normalize(user.status) === "active"
  ).length;

  const totalStorage = useMemo(
    () =>
      users.reduce(
        (sum, user) => sum + Number(user.storageGb || 0),
        0
      ),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return users;

    return users.filter((user) =>
      [
        user.name,
        user.email,
        user.status,
        user.license,
        user.role,
        user.department,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [users, search]);

  const companyName = workspace?.name || "Active Company";
  const headquarters = workspace?.headquarters;
  const domain =
    companyName.toLowerCase().replace(/[^a-z0-9]+/g, "") +
    ".onmicrosoft.com";

  const healthScore =
    users.length === 0
      ? 100
      : Math.round(
          ((activeUsers + assignedLicenses + mailboxes) /
            (users.length * 3)) *
            100
        );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-100/80 blur-3xl" />

            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Microsoft 365 Workspace
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 xl:text-4xl">
                  Enterprise productivity for {companyName}.
                </h1>

                <p className="mt-3 max-w-3xl leading-7 text-slate-500">
                  Manage identities, licenses, mailboxes, storage, and
                  Microsoft application readiness in one tenant-aware
                  company workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="h-fit rounded-xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700"
              >
                + Add Microsoft User
              </button>
            </div>
          </header>

          {showForm && (
            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-blue-700">
                    New Identity
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Add a Microsoft workspace user
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-sm font-black text-slate-400 hover:text-slate-700"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field
                  value={form.name}
                  placeholder="Full name"
                  onChange={(value) =>
                    setForm({ ...form, name: value })
                  }
                />
                <Field
                  value={form.email}
                  placeholder="name@company.com"
                  onChange={(value) =>
                    setForm({ ...form, email: value })
                  }
                />
                <Field
                  value={form.role}
                  placeholder="Role, e.g. Administrator"
                  onChange={(value) =>
                    setForm({ ...form, role: value })
                  }
                />
                <Field
                  value={form.department}
                  placeholder="Department"
                  onChange={(value) =>
                    setForm({ ...form, department: value })
                  }
                />
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={addUser}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700"
                >
                  Add User
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 font-black text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <Stat
              title="Users"
              value={String(users.length)}
              detail={`${activeUsers} active`}
              icon="👥"
            />
            <Stat
              title="Licenses"
              value={String(assignedLicenses)}
              detail={`${users.length - assignedLicenses} unassigned`}
              icon="🔑"
            />
            <Stat
              title="Mailboxes"
              value={String(mailboxes)}
              detail="Workspace mail readiness"
              icon="📧"
            />
            <Stat
              title="Storage Used"
              value={`${totalStorage} GB`}
              detail="Across all users"
              icon="☁️"
            />
            <Stat
              title="Applications"
              value={String(applications.length)}
              detail="Available and integration-ready"
              icon="🧩"
            />
            <Stat
              title="Workspace Health"
              value={`${healthScore}%`}
              detail="Identity and license readiness"
              icon="📡"
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
                        ? "border-blue-600 text-blue-700"
                        : "border-transparent text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {activeTab === "Overview" && (
                <Overview
                  companyName={companyName}
                  domain={domain}
                  headquarters={
                    headquarters?.location ||
                    "No headquarters selected"
                  }
                  users={users}
                  selected={selected}
                  onSelect={setSelectedId}
                  onOpenUsers={() => setActiveTab("Users")}
                />
              )}

              {activeTab === "Users" && (
                <UsersWorkspace
                  users={filteredUsers}
                  selected={selected}
                  selectedId={selectedId}
                  search={search}
                  onSearch={setSearch}
                  onSelect={setSelectedId}
                />
              )}

              {activeTab === "Licenses" && (
                <LicensesWorkspace
                  users={users}
                  onUsersChange={(nextUsers) => {
                    writeCompanyStorage("microsoft_users", nextUsers);
                    setUsers(nextUsers);
                  }}
                />
              )}

              {activeTab === "Mailboxes" && (
                <MailboxesWorkspace users={filteredUsers} />
              )}

              {activeTab === "Applications" && (
                <ApplicationsWorkspace />
              )}

              {activeTab === "Storage" && (
                <StorageWorkspace users={users} />
              )}
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Overview({
  companyName,
  domain,
  headquarters,
  users,
  selected,
  onSelect,
  onOpenUsers,
}: {
  companyName: string;
  domain: string;
  headquarters: string;
  users: MicrosoftUser[];
  selected: MicrosoftUser | null;
  onSelect: (id: string) => void;
  onOpenUsers: () => void;
}) {
  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_390px]">
      <section>
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Organization"
            value={companyName}
            detail="Firmic tenant"
          />
          <InfoCard
            title="Business Domain"
            value={domain}
            detail="Microsoft tenant domain"
          />
          <InfoCard
            title="Headquarters"
            value={headquarters}
            detail="Workspace location"
          />
        </div>

        <div className="mt-7 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-blue-700">
              Identity Overview
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Microsoft users and mailboxes
            </h2>
          </div>

          <button
            type="button"
            onClick={onOpenUsers}
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"
          >
            Manage Users
          </button>
        </div>

        {users.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No Microsoft users yet"
            description="Add the first company user to begin preparing identities, licenses, mailboxes, Teams, and OneDrive."
          />
        ) : (
          <div className="mt-5 space-y-3">
            {users.slice(0, 5).map((user) => (
              <UserRow
                key={user.id}
                user={user}
                selected={selected?.id === user.id}
                onClick={() => onSelect(user.id)}
              />
            ))}
          </div>
        )}
      </section>

      <aside className="space-y-5">
        <SelectedUserPanel user={selected} />

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            Integration Status
          </p>

          <div className="mt-4 space-y-3">
            <ReadinessRow
              label="Firmic identities"
              status="Active"
            />
            <ReadinessRow
              label="License management"
              status="UI ready"
            />
            <ReadinessRow
              label="Microsoft Graph"
              status="Integration ready"
            />
            <ReadinessRow
              label="Azure directory sync"
              status="Integration ready"
            />
          </div>
        </section>
      </aside>
    </div>
  );
}

function UsersWorkspace({
  users,
  selected,
  selectedId,
  search,
  onSearch,
  onSelect,
}: {
  users: MicrosoftUser[];
  selected: MicrosoftUser | null;
  selectedId: string | null;
  search: string;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <section>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-blue-700">
              Users
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Identity and mailbox directory
            </h2>
          </div>

          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search name, email, role..."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:w-80"
          />
        </div>

        {users.length === 0 ? (
          <EmptyState
            icon="🔎"
            title="No users found"
            description="Change the search or add a new Microsoft workspace user."
          />
        ) : (
          <div className="mt-6 space-y-3">
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                selected={selectedId === user.id}
                onClick={() => onSelect(user.id)}
              />
            ))}
          </div>
        )}
      </section>

      <aside className="2xl:sticky 2xl:top-6 2xl:self-start">
        <SelectedUserPanel user={selected} />
      </aside>
    </div>
  );
}

type LicensePlanName =
  | "Business Basic"
  | "Business Premium"
  | "Exchange Online";

type LicensePlanSettings = {
  purchasedSeats: number;
};

type LicenseManagerSettings = Record<
  LicensePlanName,
  LicensePlanSettings
>;

type ExchangeWorkspaceSettings = {
  mailboxSizeGb: number;
  archiveEnabled: boolean;
  retentionYears: number;
  sharedMailboxes: string;
};

type OneDriveWorkspaceSettings = {
  enabled: boolean;
  storageTb: number;
  externalSharing: boolean;
  versionHistory: boolean;
  syncEnabled: boolean;
};

const defaultLicenseManagerSettings: LicenseManagerSettings = {
  "Business Basic": { purchasedSeats: 5 },
  "Business Premium": { purchasedSeats: 5 },
  "Exchange Online": { purchasedSeats: 5 },
};

const defaultExchangeWorkspaceSettings: ExchangeWorkspaceSettings = {
  mailboxSizeGb: 50,
  archiveEnabled: true,
  retentionYears: 7,
  sharedMailboxes: "support@\ninfo@",
};

const defaultOneDriveWorkspaceSettings: OneDriveWorkspaceSettings = {
  enabled: true,
  storageTb: 1,
  externalSharing: false,
  versionHistory: true,
  syncEnabled: true,
};

function LicensesWorkspace({
  users,
  onUsersChange,
}: {
  users: MicrosoftUser[];
  onUsersChange: (users: MicrosoftUser[]) => void;
}) {
  const [settings, setSettings] = useState<LicenseManagerSettings>(
    () => {
      const stored = readCompanyStorage<Partial<LicenseManagerSettings>>(
        "microsoft_license_manager",
        {}
      );

      return {
        "Business Basic": {
          ...defaultLicenseManagerSettings["Business Basic"],
          ...(stored["Business Basic"] || {}),
        },
        "Business Premium": {
          ...defaultLicenseManagerSettings["Business Premium"],
          ...(stored["Business Premium"] || {}),
        },
        "Exchange Online": {
          ...defaultLicenseManagerSettings["Exchange Online"],
          ...(stored["Exchange Online"] || {}),
        },
      };
    }
  );
  const [exchangeSettings, setExchangeSettings] =
    useState<ExchangeWorkspaceSettings>(() => ({
      ...defaultExchangeWorkspaceSettings,
      ...readCompanyStorage<Partial<ExchangeWorkspaceSettings>>(
        "microsoft_exchange_settings",
        {}
      ),
    }));
  const [oneDriveSettings, setOneDriveSettings] =
    useState<OneDriveWorkspaceSettings>(() => ({
      ...defaultOneDriveWorkspaceSettings,
      ...readCompanyStorage<Partial<OneDriveWorkspaceSettings>>(
        "microsoft_onedrive_settings",
        {}
      ),
    }));
  const [selectedPlan, setSelectedPlan] =
    useState<LicensePlanName | null>(null);
  const [showOneDrive, setShowOneDrive] = useState(false);
  const [draftSeats, setDraftSeats] = useState(5);
  const [draftAssignedIds, setDraftAssignedIds] = useState<string[]>(
    []
  );
  const [draftExchange, setDraftExchange] =
    useState<ExchangeWorkspaceSettings>(
      defaultExchangeWorkspaceSettings
    );
  const [draftOneDrive, setDraftOneDrive] =
    useState<OneDriveWorkspaceSettings>(
      defaultOneDriveWorkspaceSettings
    );
  const [savedMessage, setSavedMessage] = useState("");

  const counts = {
    "Business Basic": users.filter(
      (user) => normalize(user.license) === "business basic"
    ).length,
    "Business Premium": users.filter(
      (user) => normalize(user.license) === "business premium"
    ).length,
    "Exchange Online": users.filter(
      (user) => normalize(user.license) === "exchange online"
    ).length,
  };

  const assignedTotal = Object.values(counts).reduce(
    (sum, value) => sum + value,
    0
  );
  const unassigned = users.filter(
    (user) => normalize(user.license) === "unassigned"
  ).length;

  function openPlan(plan: LicensePlanName) {
    setSelectedPlan(plan);
    setDraftSeats(settings[plan].purchasedSeats);
    setDraftAssignedIds(
      users
        .filter((user) => normalize(user.license) === normalize(plan))
        .map((user) => user.id)
    );
    setDraftExchange({ ...exchangeSettings });
    setSavedMessage("");
  }

  function toggleUser(userId: string) {
    setDraftAssignedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  }

  function savePlan() {
    if (!selectedPlan) return;

    const safeSeats = Math.max(
      draftAssignedIds.length,
      Math.max(0, Number(draftSeats) || 0)
    );

    const nextSettings: LicenseManagerSettings = {
      ...settings,
      [selectedPlan]: { purchasedSeats: safeSeats },
    };

    const nextUsers = users.map((user) => {
      const hasSelectedPlan =
        normalize(user.license) === normalize(selectedPlan);
      const shouldHaveSelectedPlan = draftAssignedIds.includes(
        user.id
      );

      if (shouldHaveSelectedPlan) {
        return {
          ...user,
          license: selectedPlan,
          status:
            normalize(user.status) === "pending"
              ? "Active"
              : user.status,
          mailboxStatus:
            selectedPlan === "Exchange Online"
              ? "Active"
              : user.mailboxStatus,
        };
      }

      if (hasSelectedPlan) {
        return {
          ...user,
          license: "Unassigned",
          mailboxStatus:
            selectedPlan === "Exchange Online"
              ? "Pending"
              : user.mailboxStatus,
        };
      }

      return user;
    });

    writeCompanyStorage(
      "microsoft_license_manager",
      nextSettings
    );
    setSettings(nextSettings);
    onUsersChange(nextUsers);

    if (selectedPlan === "Exchange Online") {
      writeCompanyStorage(
        "microsoft_exchange_settings",
        draftExchange
      );
      setExchangeSettings(draftExchange);
    }

    setSavedMessage("License configuration saved.");
  }

  function saveOneDrive() {
    writeCompanyStorage(
      "microsoft_onedrive_settings",
      draftOneDrive
    );
    setOneDriveSettings(draftOneDrive);
    setSavedMessage("OneDrive configuration saved.");
  }

  const oneDriveUsers = users.filter(
    (user) => user.oneDriveEnabled
  ).length;

  return (
    <div>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-black text-blue-700">
            Licenses
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Firmic license manager
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Plan seats, assign users, and save Microsoft workspace
            configuration per tenant. Microsoft Graph can synchronize
            this saved state after authorization.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <LicenseSummaryMetric
            label="Workspace users"
            value={users.length}
          />
          <LicenseSummaryMetric
            label="Assigned"
            value={assignedTotal}
          />
          <LicenseSummaryMetric
            label="Unassigned"
            value={unassigned}
          />
        </div>
      </div>

      <div className="mt-6 grid items-stretch gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {(
          [
            "Business Basic",
            "Business Premium",
            "Exchange Online",
          ] as LicensePlanName[]
        ).map((plan) => (
          <ManagedLicenseCard
            key={plan}
            title={plan}
            purchased={settings[plan].purchasedSeats}
            assigned={counts[plan]}
            onManage={() => openPlan(plan)}
          />
        ))}

        <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex min-h-[58px] items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">
                OneDrive
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Storage and sharing
              </p>
            </div>
            <StatusBadge
              value={oneDriveSettings.enabled ? "Enabled" : "Disabled"}
            />
          </div>

          <div className="mt-5 flex-1 space-y-3">
            <DetailLine
              label="Enabled users"
              value={String(oneDriveUsers)}
            />
            <DetailLine
              label="Storage"
              value={`${oneDriveSettings.storageTb} TB`}
            />
            <DetailLine
              label="External sharing"
              value={
                oneDriveSettings.externalSharing
                  ? "Enabled"
                  : "Restricted"
              }
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setDraftOneDrive({ ...oneDriveSettings });
              setSavedMessage("");
              setShowOneDrive(true);
            }}
            className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
          >
            Manage OneDrive
          </button>
        </div>
      </div>

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
            Firmic Workspace Status
          </p>
          <h3 className="mt-2 text-xl font-black text-emerald-950">
            License management is active
          </h3>
          <p className="mt-2 text-sm leading-6 text-emerald-800">
            Tenant assignments, purchased-seat planning, Exchange
            preferences, and OneDrive settings are saved inside the
            active Firmic workspace.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <WorkspaceStatus
              label="License manager"
              value="Active"
              active
            />
            <WorkspaceStatus
              label="Tenant persistence"
              value="Active"
              active
            />
            <WorkspaceStatus
              label="Configuration"
              value="Saved locally"
              active
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Microsoft Graph
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-slate-300" />
            <p className="font-black text-slate-950">
              Not connected
            </p>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Authorization will synchronize Firmic&apos;s saved plan
            with Microsoft purchasing, assignment, removal, and billing
            services.
          </p>
          <button
            type="button"
            onClick={() =>
              window.alert(
                "Microsoft Graph authorization is integration-ready and will be connected in a later deployment."
              )
            }
            className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            View Integration Status
          </button>
        </div>
      </div>

      {selectedPlan && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPlan(null);
            }
          }}
        >
          <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-slate-200 bg-white p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-700">
                  License Management
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  {selectedPlan}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Assign seats inside this Firmic tenant.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-500 hover:bg-slate-50"
              >
                Close
              </button>
            </header>

            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-black text-slate-700">
                    Purchased seats
                  </label>
                  <input
                    type="number"
                    min={draftAssignedIds.length}
                    value={draftSeats}
                    onChange={(event) =>
                      setDraftSeats(
                        Math.max(
                          0,
                          Number(event.target.value) || 0
                        )
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <LicenseModalMetric
                  label="Assigned"
                  value={draftAssignedIds.length}
                />
                <LicenseModalMetric
                  label="Available"
                  value={Math.max(
                    0,
                    draftSeats - draftAssignedIds.length
                  )}
                />
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black text-slate-950">
                      Assigned users
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Each user can hold one primary license in this
                      MVP manager.
                    </p>
                  </div>
                  <p className="text-sm font-black text-blue-700">
                    {draftAssignedIds.length} selected
                  </p>
                </div>

                {users.length === 0 ? (
                  <EmptyState
                    icon="👤"
                    title="No workspace users"
                    description="Add a Microsoft user before assigning licenses."
                  />
                ) : (
                  <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {users.map((user) => {
                      const checked = draftAssignedIds.includes(
                        user.id
                      );
                      const otherLicense =
                        normalize(user.license) !== "unassigned" &&
                        normalize(user.license) !==
                          normalize(selectedPlan);

                      return (
                        <label
                          key={user.id}
                          className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${
                            checked
                              ? "border-blue-400 bg-blue-50"
                              : "border-slate-200 hover:border-blue-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleUser(user.id)}
                            disabled={
                              !checked &&
                              draftAssignedIds.length >= draftSeats
                            }
                            className="h-5 w-5 rounded border-slate-300"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-black text-slate-950">
                              {user.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {user.email}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-slate-400">
                            {otherLicense
                              ? `Currently ${user.license}`
                              : checked
                              ? "Assigned"
                              : "Available"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedPlan === "Exchange Online" && (
                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h4 className="font-black text-slate-950">
                    Exchange configuration
                  </h4>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <NumberField
                      label="Mailbox size (GB)"
                      value={draftExchange.mailboxSizeGb}
                      min={1}
                      onChange={(mailboxSizeGb) =>
                        setDraftExchange({
                          ...draftExchange,
                          mailboxSizeGb,
                        })
                      }
                    />
                    <NumberField
                      label="Retention (years)"
                      value={draftExchange.retentionYears}
                      min={0}
                      onChange={(retentionYears) =>
                        setDraftExchange({
                          ...draftExchange,
                          retentionYears,
                        })
                      }
                    />
                    <SettingCard
                      title="Online archive"
                      description="Prepare archive mailbox support."
                      enabled={draftExchange.archiveEnabled}
                      onChange={(archiveEnabled) =>
                        setDraftExchange({
                          ...draftExchange,
                          archiveEnabled,
                        })
                      }
                    />
                    <div>
                      <label className="text-sm font-black text-slate-700">
                        Shared mailboxes
                      </label>
                      <textarea
                        rows={4}
                        value={draftExchange.sharedMailboxes}
                        onChange={(event) =>
                          setDraftExchange({
                            ...draftExchange,
                            sharedMailboxes: event.target.value,
                          })
                        }
                        placeholder={"support@\ninfo@"}
                        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {savedMessage && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                  {savedMessage}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="rounded-xl border border-slate-200 px-5 py-3 font-black text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={savePlan}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700"
                >
                  Save License Plan
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {showOneDrive && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowOneDrive(false);
            }
          }}
        >
          <section className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-5 border-b border-slate-200 p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-blue-700">
                  Storage Management
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  OneDrive
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOneDrive(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-500"
              >
                Close
              </button>
            </header>

            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingCard
                  title="OneDrive enabled"
                  description="Enable tenant OneDrive configuration."
                  enabled={draftOneDrive.enabled}
                  onChange={(enabled) =>
                    setDraftOneDrive({
                      ...draftOneDrive,
                      enabled,
                    })
                  }
                />
                <NumberField
                  label="Storage allocation (TB)"
                  value={draftOneDrive.storageTb}
                  min={0}
                  onChange={(storageTb) =>
                    setDraftOneDrive({
                      ...draftOneDrive,
                      storageTb,
                    })
                  }
                />
                <SettingCard
                  title="External sharing"
                  description="Allow links outside the tenant."
                  enabled={draftOneDrive.externalSharing}
                  onChange={(externalSharing) =>
                    setDraftOneDrive({
                      ...draftOneDrive,
                      externalSharing,
                    })
                  }
                />
                <SettingCard
                  title="Version history"
                  description="Preserve previous file versions."
                  enabled={draftOneDrive.versionHistory}
                  onChange={(versionHistory) =>
                    setDraftOneDrive({
                      ...draftOneDrive,
                      versionHistory,
                    })
                  }
                />
                <SettingCard
                  title="Desktop sync"
                  description="Prepare OneDrive sync support."
                  enabled={draftOneDrive.syncEnabled}
                  onChange={(syncEnabled) =>
                    setDraftOneDrive({
                      ...draftOneDrive,
                      syncEnabled,
                    })
                  }
                />
              </div>

              {savedMessage && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                  {savedMessage}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowOneDrive(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 font-black text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveOneDrive}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700"
                >
                  Save OneDrive
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ManagedLicenseCard({
  title,
  purchased,
  assigned,
  onManage,
}: {
  title: LicensePlanName;
  purchased: number;
  assigned: number;
  onManage: () => void;
}) {
  const available = Math.max(0, purchased - assigned);
  const percentage = Math.min(
    100,
    Math.round((assigned / Math.max(purchased, 1)) * 100)
  );

  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex min-h-[58px] items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="max-w-[150px] text-sm font-black leading-5 text-slate-950">
            {title}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tenant license plan
          </p>
        </div>
        <StatusBadge value={available > 0 ? "Available" : "Allocated"} />
      </div>

      <div className="mt-5 flex-1 space-y-3">
        <DetailLine label="Purchased" value={`${purchased} seats`} />
        <DetailLine label="Assigned" value={String(assigned)} />
        <DetailLine label="Available" value={String(available)} />
      </div>

      <div className="mt-5">
        <ProgressBar value={percentage} />
      </div>

      <button
        type="button"
        onClick={onManage}
        className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
      >
        Manage Licenses
      </button>
    </div>
  );
}

function LicenseSummaryMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function LicenseModalMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="text-sm font-black text-slate-700">
        {label}
      </label>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) =>
          onChange(Math.max(min, Number(event.target.value) || 0))
        }
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function WorkspaceStatus({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white/70 p-4">
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            active ? "bg-emerald-500" : "bg-slate-300"
          }`}
        />
        <p className="text-xs font-black text-slate-950">{label}</p>
      </div>
      <p className="mt-2 text-xs font-bold text-slate-500">{value}</p>
    </div>
  );
}

function MailboxesWorkspace({
  users,
}: {
  users: MicrosoftUser[];
}) {
  return (
    <div>
      <p className="text-sm font-black text-blue-700">
        Mailboxes
      </p>
      <h2 className="mt-1 text-2xl font-black text-slate-950">
        Company mailbox readiness
      </h2>

      {users.length === 0 ? (
        <EmptyState
          icon="📧"
          title="No mailboxes found"
          description="Microsoft users will appear here with mailbox and license readiness."
        />
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-black text-slate-950">
                    {user.email}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {user.name}
                  </p>
                </div>
                <StatusBadge
                  value={
                    user.mailboxStatus ||
                    (normalize(user.status) === "active"
                      ? "Active"
                      : "Pending")
                  }
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniMetric
                  title="License"
                  value={user.license || "Unassigned"}
                />
                <MiniMetric
                  title="Storage"
                  value={`${Number(user.storageGb || 0)} GB`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type ApplicationSettings = {
  enabled: boolean;
  webAccess: boolean;
  desktopAccess: boolean;
  externalSharing: boolean;
  notifications: boolean;
  retentionEnabled: boolean;
  notes: string;
};

type ApplicationSettingsMap = Record<string, ApplicationSettings>;

const defaultApplicationSettings: ApplicationSettings = {
  enabled: false,
  webAccess: true,
  desktopAccess: false,
  externalSharing: false,
  notifications: true,
  retentionEnabled: false,
  notes: "",
};

function ApplicationsWorkspace() {
  const [settings, setSettings] = useState<ApplicationSettingsMap>(
    () =>
      readCompanyStorage<ApplicationSettingsMap>(
        "microsoft_application_settings",
        {}
      )
  );
  const [selectedAppName, setSelectedAppName] =
    useState<string | null>(null);
  const [draft, setDraft] = useState<ApplicationSettings>(
    defaultApplicationSettings
  );
  const [savedMessage, setSavedMessage] = useState("");

  const selectedApp =
    applications.find((app) => app.name === selectedAppName) ||
    null;

  function openApplication(appName: string) {
    const current =
      settings[appName] || defaultApplicationSettings;

    setSelectedAppName(appName);
    setDraft({ ...current });
    setSavedMessage("");
  }

  function closeApplication() {
    setSelectedAppName(null);
    setSavedMessage("");
  }

  function saveApplication() {
    if (!selectedAppName) return;

    const next = {
      ...settings,
      [selectedAppName]: { ...draft },
    };

    writeCompanyStorage(
      "microsoft_application_settings",
      next
    );
    setSettings(next);
    setSavedMessage("Settings saved for this workspace.");
  }

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black text-blue-700">
            Applications
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Microsoft application catalog
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Configure tenant-level application preferences. These
            settings are stored in Firmic until Microsoft Graph is
            connected.
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
          {Object.values(settings).filter((item) => item.enabled).length}{" "}
          applications enabled
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {applications.map((app) => {
          const appSettings =
            settings[app.name] || defaultApplicationSettings;

          return (
            <div
              key={app.name}
              className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-4xl">{app.icon}</div>
                <StatusBadge
                  value={
                    appSettings.enabled ? "Enabled" : app.status
                  }
                />
              </div>

              <h3 className="mt-4 text-lg font-black text-slate-950">
                {app.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {appSettings.enabled
                  ? "Configured in this Firmic workspace"
                  : app.status}
              </p>

              <button
                type="button"
                onClick={() => openApplication(app.name)}
                className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
              >
                Manage
              </button>
            </div>
          );
        })}
      </div>

      {selectedApp && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeApplication();
            }
          }}
        >
          <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-slate-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{selectedApp.icon}</div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                    Application Management
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">
                    {selectedApp.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Firmic tenant configuration
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeApplication}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-500 hover:bg-slate-50"
              >
                Close
              </button>
            </header>

            <div className="p-6">
              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black text-blue-950">
                      Application status
                    </p>
                    <p className="mt-1 text-sm text-blue-800">
                      Enable this application inside the Firmic
                      workspace.
                    </p>
                  </div>

                  <Toggle
                    enabled={draft.enabled}
                    onChange={(enabled) =>
                      setDraft({ ...draft, enabled })
                    }
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <SettingCard
                  title="Web access"
                  description="Allow browser-based access."
                  enabled={draft.webAccess}
                  onChange={(webAccess) =>
                    setDraft({ ...draft, webAccess })
                  }
                />
                <SettingCard
                  title="Desktop access"
                  description="Prepare desktop application access."
                  enabled={draft.desktopAccess}
                  onChange={(desktopAccess) =>
                    setDraft({ ...draft, desktopAccess })
                  }
                />
                <SettingCard
                  title="External sharing"
                  description="Allow external collaboration."
                  enabled={draft.externalSharing}
                  onChange={(externalSharing) =>
                    setDraft({ ...draft, externalSharing })
                  }
                />
                <SettingCard
                  title="Notifications"
                  description="Enable application notifications."
                  enabled={draft.notifications}
                  onChange={(notifications) =>
                    setDraft({ ...draft, notifications })
                  }
                />
                <SettingCard
                  title="Retention"
                  description="Prepare retention controls."
                  enabled={draft.retentionEnabled}
                  onChange={(retentionEnabled) =>
                    setDraft({ ...draft, retentionEnabled })
                  }
                />
              </div>

              <div className="mt-5">
                <label className="text-sm font-black text-slate-700">
                  Workspace notes
                </label>
                <textarea
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      notes: event.target.value,
                    })
                  }
                  rows={4}
                  placeholder={`Add configuration notes for ${selectedApp.name}...`}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Integration Status
                </p>
                <div className="mt-3 space-y-2">
                  <DetailLine
                    label="Firmic configuration"
                    value="Active"
                  />
                  <DetailLine
                    label="Tenant persistence"
                    value="Active"
                  />
                  <DetailLine
                    label="Microsoft Graph sync"
                    value="Integration ready"
                  />
                </div>
              </div>

              {savedMessage && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                  {savedMessage}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeApplication}
                  className="rounded-xl border border-slate-200 px-5 py-3 font-black text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveApplication}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SettingCard({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-black text-slate-950">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
        <Toggle enabled={enabled} onChange={onChange} />
      </div>
    </div>
  );
}

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${
        enabled ? "bg-blue-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
          enabled ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function StorageWorkspace({
  users,
}: {
  users: MicrosoftUser[];
}) {
  const total = users.reduce(
    (sum, user) => sum + Number(user.storageGb || 0),
    0
  );
  const capacity = Math.max(100, users.length * 50);
  const usage = Math.min(100, Math.round((total / capacity) * 100));

  return (
    <div>
      <p className="text-sm font-black text-blue-700">
        Storage
      </p>
      <h2 className="mt-1 text-2xl font-black text-slate-950">
        Organization storage overview
      </h2>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <StorageCard
          title="Mailbox Storage"
          value={`${total} GB`}
          percentage={usage}
        />
        <StorageCard
          title="OneDrive Readiness"
          value={`${users.filter((u) => u.oneDriveEnabled).length} users`}
          percentage={
            users.length
              ? Math.round(
                  (users.filter((u) => u.oneDriveEnabled).length /
                    users.length) *
                    100
                )
              : 0
          }
        />
        <StorageCard
          title="SharePoint"
          value="Integration ready"
          percentage={0}
        />
      </div>

      <div className="mt-7 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="font-black text-slate-950">
          User storage allocation
        </h3>

        {users.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No user storage records are available.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-black text-slate-950">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {user.email}
                  </p>
                </div>
                <p className="font-black text-slate-700">
                  {Number(user.storageGb || 0)} GB
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SelectedUserPanel({
  user,
}: {
  user: MicrosoftUser | null;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        Selected User
      </p>

      {user ? (
        <>
          <div className="mt-4">
            <h3 className="text-xl font-black text-slate-950">
              {user.name}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {user.email}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniMetric
              title="Status"
              value={user.status || "Unknown"}
            />
            <MiniMetric
              title="License"
              value={user.license || "Unassigned"}
            />
            <MiniMetric
              title="Role"
              value={user.role || "Member"}
            />
            <MiniMetric
              title="Department"
              value={user.department || "General"}
            />
            <MiniMetric
              title="Storage"
              value={`${Number(user.storageGb || 0)} GB`}
            />
            <MiniMetric
              title="Last Login"
              value={user.lastLogin || "Not recorded"}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Services
            </p>
            <div className="mt-3 space-y-2">
              <DetailLine
                label="Mailbox"
                value={
                  user.mailboxStatus ||
                  (normalize(user.status) === "active"
                    ? "Active"
                    : "Pending")
                }
              />
              <DetailLine
                label="Teams"
                value={
                  user.teamsEnabled ? "Enabled" : "Not enabled"
                }
              />
              <DetailLine
                label="OneDrive"
                value={
                  user.oneDriveEnabled ? "Enabled" : "Not enabled"
                }
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <DisabledAction label="Assign License" />
            <DisabledAction label="Reset Password" />
            <DisabledAction label="Suspend User" />
            <DisabledAction label="Delete User" />
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-500">
          Select a Microsoft workspace user to inspect identity,
          license, mailbox, and storage details.
        </p>
      )}
    </section>
  );
}

function UserRow({
  user,
  selected,
  onClick,
}: {
  user: MicrosoftUser;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
        selected
          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_150px_120px_100px] md:items-center">
        <div className="min-w-0">
          <p className="truncate font-black text-slate-950">
            {user.name}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {user.email}
          </p>
        </div>

        <p className="truncate text-sm font-bold text-slate-600">
          {user.role || "Member"}
        </p>

        <p className="truncate text-sm font-bold text-slate-600">
          {user.license || "Unassigned"}
        </p>

        <StatusBadge value={user.status} />

        <p className="text-sm font-black text-slate-950">
          {Number(user.storageGb || 0)} GB
        </p>
      </div>
    </button>
  );
}

function StorageCard({
  title,
  value,
  percentage,
}: {
  title: string;
  value: string;
  percentage: number;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">
        {value}
      </p>
      <ProgressBar value={percentage} />
      <p className="mt-2 text-xs text-slate-400">
        {percentage}% of configured readiness or capacity
      </p>
    </div>
  );
}

function InfoCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <p className="mt-2 break-words font-black text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
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

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-black text-slate-800">
        {value}
      </span>
    </div>
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

function IntegrationNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-7 rounded-3xl border border-blue-200 bg-blue-50 p-6">
      <p className="font-black text-blue-900">{title}</p>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-blue-800">
        {description}
      </p>
    </div>
  );
}

function DisabledAction({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      title="Requires Microsoft Graph or Azure integration."
      className="cursor-not-allowed rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-400"
    >
      {label}
    </button>
  );
}

function ProgressBar({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, value));

  return (
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-blue-600"
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

function StatusBadge({ value }: { value?: string }) {
  const normalized = normalize(value);

  const tone =
    normalized === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : normalized === "pending"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : normalized === "suspended"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${tone}`}
    >
      {value || "Unknown"}
    </span>
  );
}

function Field({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />
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
