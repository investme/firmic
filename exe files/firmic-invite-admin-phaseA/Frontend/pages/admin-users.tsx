import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AdminSidebar from "../components/AdminSidebar";
import AdminProtectedRoute from "../components/AdminProtectedRoute";

import {
  deleteAdminUser,
  getAdminUsers,
  inviteAdminUser,
} from "../services/adminApi";

type UserRecord = {
  id: string | number;
  full_name?: string;
  email: string;
  role?: string;
  companies_owned?: number;
  created_at?: string | null;
  is_current_user?: boolean;
  can_delete?: boolean;
};

export default function AdminUsers() {
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<UserRecord | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const [inviteResult, setInviteResult] =
    useState<{
      full_name: string;
      email: string;
      temporary_password: string;
    } | null>(null);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers(
    preferredUserId?: string | number
  ) {
    try {
      setLoading(true);
      setError("");

      const result = await getAdminUsers();
      setData(result);

      const users: UserRecord[] = result?.users || [];

      const next =
        users.find(
          (user) =>
            String(user.id) ===
            String(
              preferredUserId ||
                selected?.id ||
                ""
            )
        ) ||
        users[0] ||
        null;

      setSelected(next);
      setLastUpdated(new Date().toLocaleString());
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load Firmic Admin employees."
      );
    } finally {
      setLoading(false);
    }
  }

  function openInviteDialog() {
    setInviteName("");
    setInviteEmail("");
    setInviteResult(null);
    setCopied(false);
    setError("");
    setNotice("");
    setInviteOpen(true);
  }

  function closeInviteDialog() {
    if (inviting) return;

    setInviteOpen(false);
    setInviteResult(null);
    setCopied(false);
  }

  async function submitInvite() {
    const fullName = inviteName.trim();
    const email = inviteEmail.trim().toLowerCase();

    if (fullName.length < 2) {
      setError("Enter the Admin employee's full name.");
      return;
    }

    if (!email || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      setInviting(true);
      setError("");
      setNotice("");
      setCopied(false);

      const result = await inviteAdminUser({
        full_name: fullName,
        email,
      });

      setInviteResult({
        full_name:
          result?.user?.full_name ||
          fullName,
        email:
          result?.user?.email ||
          email,
        temporary_password:
          result?.temporary_password ||
          "",
      });

      setNotice(
        result?.message ||
          "Admin employee invited successfully."
      );

      await loadUsers(
        result?.user?.id
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to invite Admin employee."
      );
    } finally {
      setInviting(false);
    }
  }

  async function copyTemporaryPassword() {
    const password =
      inviteResult?.temporary_password;

    if (!password) return;

    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setError(
        "The browser could not copy the password. Select and copy it manually."
      );
    }
  }

  async function removeAdmin(
    user: UserRecord
  ) {
    if (!user.can_delete) return;

    const confirmed = confirm(
      `Permanently delete ${user.full_name || user.email} from Firmic Admin access?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(String(user.id));
      setError("");
      setNotice("");

      const result = await deleteAdminUser(user.id);

      setNotice(
        result?.message ||
          "Admin employee deleted."
      );

      await loadUsers();
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to delete Admin employee."
      );
    } finally {
      setDeletingId("");
    }
  }

  const users: UserRecord[] =
    data?.users || [];

  const metrics = data?.metrics || {};

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return users;

    return users.filter((user) =>
      [
        user.full_name || "",
        user.email,
        user.id,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [users, search]);

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar active="Admin Users & Roles" />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Firmic Internal
              </p>

              <h1 className="text-3xl font-bold mt-1">
                Admin Employees & Roles
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Internal Firmic employee accounts only. Tenant owners are managed separately through company and tenant administration.
              </p>

              {lastUpdated && (
                <p className="text-xs text-slate-400 mt-2">
                  Last refreshed: {lastUpdated}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => loadUsers(selected?.id)}
                disabled={loading}
                className="border border-slate-200 bg-white px-6 py-3 rounded-xl font-bold disabled:bg-slate-100"
              >
                {loading ? "Refreshing..." : "Refresh Admins"}
              </button>

              <button
                type="button"
                onClick={openInviteDialog}
                className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold"
              >
                + Invite Admin
              </button>
            </div>
          </header>

          {error && (
            <Alert type="error" text={error} />
          )}

          {notice && (
            <Alert type="success" text={notice} />
          )}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat
              title="Admin Employees"
              value={metrics.total_admin_users || 0}
              icon="👥"
            />

            <Stat
              title="Protected Current User"
              value={metrics.protected_current_user || 0}
              icon="🛡️"
            />

            <Stat
              title="Eligible for Deletion"
              value={metrics.deletable_admin_users || 0}
              icon="🗑️"
            />

            <Stat
              title="Tenant Users Shown"
              value="0"
              icon="✅"
            />
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mt-8">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search Admin employee name, email, or user ID..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3"
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 mt-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-w-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">
                    Firmic Employee Directory
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Accounts authorized to enter the internal Admin Console.
                  </p>
                </div>

                <span className="text-xs font-bold bg-violet-100 text-violet-700 px-3 py-1 rounded-full">
                  {filtered.length} shown
                </span>
              </div>

              {loading ? (
                <Empty text="Loading Admin employees..." />
              ) : filtered.length === 0 ? (
                <Empty text="No Admin employees match this search." />
              ) : (
                <div className="space-y-3 mt-5">
                  {filtered.map((user) => (
                    <button
                      type="button"
                      key={user.id}
                      onClick={() => setSelected(user)}
                      className={`w-full text-left border rounded-2xl p-4 transition ${
                        String(selected?.id) === String(user.id)
                          ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                          : "border-slate-200 bg-slate-50 hover:border-violet-300"
                      }`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_150px_140px] gap-4 items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-lg">
                              {user.full_name || "Unnamed Admin"}
                            </p>

                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
                              Administrator
                            </span>

                            {user.is_current_user && (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                Current User
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-slate-500 mt-1 break-all">
                            {user.email}
                          </p>
                        </div>

                        <Info
                          title="Registered"
                          value={formatDate(user.created_at)}
                        />

                        <Info
                          title="User ID"
                          value={String(user.id)}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <aside className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm h-fit xl:sticky xl:top-6">
              <h2 className="text-xl font-bold">
                Selected Admin
              </h2>

              {!selected ? (
                <p className="text-slate-500 mt-5">
                  Select an Admin employee.
                </p>
              ) : (
                <>
                  <div className="mt-5 bg-violet-50 border border-violet-100 rounded-2xl p-5">
                    <p className="text-sm text-violet-700">
                      Firmic Employee Account
                    </p>

                    <p className="text-2xl font-bold mt-1">
                      {selected.full_name || "Unnamed Admin"}
                    </p>

                    <p className="text-sm text-violet-700 mt-2 break-all">
                      {selected.email}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <Mini title="Role" value="Administrator" />
                    <Mini title="User ID" value={selected.id} />
                    <Mini
                      title="Registered"
                      value={formatDate(selected.created_at)}
                    />
                    <Mini
                      title="Companies Owned"
                      value={selected.companies_owned || 0}
                    />
                  </div>

                  {selected.can_delete ? (
                    <button
                      type="button"
                      onClick={() => removeAdmin(selected)}
                      disabled={
                        deletingId === String(selected.id)
                      }
                      className="w-full mt-6 border border-red-200 text-red-600 rounded-xl py-3 font-bold disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      {deletingId === String(selected.id)
                        ? "Deleting..."
                        : "Permanently Delete Admin"}
                    </button>
                  ) : (
                    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <p className="font-bold text-amber-800">
                        Protected account
                      </p>

                      <p className="text-sm text-amber-700 mt-2">
                        {selected.is_current_user
                          ? "You cannot delete the Admin account currently being used."
                          : Number(selected.companies_owned || 0) > 0
                          ? "This account owns company records and cannot be deleted until ownership is transferred."
                          : "This account cannot be deleted because Firmic must retain at least one Admin."}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-sm text-slate-600">
                      Permanent deletion is intended only for departed Firmic employees. Tenant accounts are never exposed or deleted from this page.
                    </p>
                  </div>
                </>
              )}
            </aside>
          </section>
        </main>

        {inviteOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/60 p-4 flex items-center justify-center"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeInviteDialog();
              }
            }}
          >
            <section className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
              <header className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-violet-700">
                    Firmic Internal
                  </p>

                  <h2 className="text-2xl font-bold mt-1">
                    {inviteResult
                      ? "Admin Employee Created"
                      : "Invite Admin Employee"}
                  </h2>

                  <p className="text-sm text-slate-500 mt-2">
                    {inviteResult
                      ? "Copy the temporary password before closing this dialog."
                      : "Create a secure Firmic Admin account without using SQL."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeInviteDialog}
                  disabled={inviting}
                  className="h-10 w-10 rounded-full border border-slate-200 font-bold disabled:opacity-50"
                  aria-label="Close"
                >
                  ×
                </button>
              </header>

              {!inviteResult ? (
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Full Name
                    </label>

                    <input
                      value={inviteName}
                      onChange={(event) =>
                        setInviteName(event.target.value)
                      }
                      placeholder="Sarah Johnson"
                      autoComplete="name"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">
                      Work Email
                    </label>

                    <input
                      value={inviteEmail}
                      onChange={(event) =>
                        setInviteEmail(event.target.value)
                      }
                      placeholder="sarah@firmic.io"
                      type="email"
                      autoComplete="email"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3"
                    />
                  </div>

                  <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
                    <p className="font-bold text-violet-800">
                      Secure temporary password
                    </p>

                    <p className="text-sm text-violet-700 mt-2">
                      The backend will generate a strong temporary password,
                      hash it with bcrypt, and display it only once.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeInviteDialog}
                      disabled={inviting}
                      className="border border-slate-200 px-5 py-3 rounded-xl font-bold"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={submitInvite}
                      disabled={inviting}
                      className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold disabled:bg-slate-300"
                    >
                      {inviting
                        ? "Creating Admin..."
                        : "Invite Employee"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="bg-green-50 border border-green-200 text-green-800 rounded-2xl p-4">
                    <p className="font-bold">
                      Admin access created successfully
                    </p>

                    <p className="text-sm mt-1">
                      {inviteResult.full_name} can now sign in through the
                      Firmic Admin login.
                    </p>
                  </div>

                  <div className="mt-5 border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs text-slate-500">
                      Employee
                    </p>

                    <p className="font-bold text-lg mt-1">
                      {inviteResult.full_name}
                    </p>

                    <p className="text-sm text-slate-500 mt-1 break-all">
                      {inviteResult.email}
                    </p>
                  </div>

                  <div className="mt-4 bg-slate-950 text-white rounded-2xl p-5">
                    <p className="text-xs text-slate-300">
                      One-Time Temporary Password
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                      <code className="text-xl font-bold tracking-wider break-all">
                        {inviteResult.temporary_password}
                      </code>

                      <button
                        type="button"
                        onClick={copyTemporaryPassword}
                        className="bg-white text-slate-950 px-4 py-2 rounded-xl font-bold"
                      >
                        {copied ? "Copied!" : "Copy Password"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="font-bold text-amber-800">
                      Save it now
                    </p>

                    <p className="text-sm text-amber-700 mt-2">
                      Firmic stores only the password hash. This temporary
                      password cannot be retrieved after this dialog closes.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeInviteDialog}
                    className="w-full mt-5 bg-violet-600 text-white rounded-xl py-3 font-bold"
                  >
                    Done
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
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
      <p className="font-bold mt-1 break-words">{value}</p>
    </div>
  );
}

function Mini({ title, value }: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold mt-1 break-words">{value}</p>
    </div>
  );
}

function Alert({ type, text }: any) {
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

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-6 text-slate-500">
      {text}
    </div>
  );
}

function formatDate(value?: string | null) {
  return value
    ? new Date(value).toLocaleDateString()
    : "Not recorded";
}
