import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AdminSidebar from "../components/AdminSidebar";
import AdminProtectedRoute from "../components/AdminProtectedRoute";

import {
  getAdminUsers,
} from "../services/adminApi";

type UserRecord = {
  id: string | number;
  full_name?: string;
  email: string;
  role?: string;
  companies_owned?: number;
  created_at?: string | null;
};

export default function AdminUsers() {
  const [data, setData] =
    useState<any>(null);

  const [selected, setSelected] =
    useState<UserRecord | null>(
      null
    );

  const [search, setSearch] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState("all");

  const [ownershipFilter, setOwnershipFilter] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState("");

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers(
    preferredUserId?: string | number
  ) {
    try {
      setLoading(true);
      setError("");

      const result =
        await getAdminUsers();

      setData(result);

      const users: UserRecord[] =
        result?.users || [];

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

      setLastUpdated(
        new Date().toLocaleString()
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load Admin Users & Roles."
      );
    } finally {
      setLoading(false);
    }
  }

  const users: UserRecord[] =
    data?.users || [];

  const metrics =
    data?.metrics || {};

  const filtered = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return users.filter(
      (user) => {
        const normalizedRole =
          normalizeRole(
            user.role
          );

        const searchable = [
          user.full_name || "",
          user.email,
          normalizedRole,
          user.id,
          user.companies_owned || 0,
        ]
          .join(" ")
          .toLowerCase();

        const ownership =
          Number(
            user.companies_owned ||
              0
          );

        return (
          (!query ||
            searchable.includes(
              query
            )) &&
          (roleFilter === "all" ||
            normalizedRole ===
              roleFilter) &&
          (ownershipFilter ===
            "all" ||
            (ownershipFilter ===
              "with_companies" &&
              ownership > 0) ||
            (ownershipFilter ===
              "without_companies" &&
              ownership === 0))
        );
      }
    );
  }, [
    users,
    search,
    roleFilter,
    ownershipFilter,
  ]);

  const roles = useMemo(
    () =>
      Array.from(
        new Set(
          users.map(
            (user) =>
              normalizeRole(
                user.role
              )
          )
        )
      ).sort(),
    [users]
  );

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <AdminSidebar
          active="Admin Users & Roles"
        />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-violet-700">
                Firmic Admin
              </p>

              <h1 className="text-3xl font-bold mt-1">
                Users & Roles
              </h1>

              <p className="text-slate-500 mt-2 max-w-3xl">
                Live authentication accounts, platform roles, company ownership,
                and registration history from PostgreSQL.
              </p>

              {lastUpdated && (
                <p className="text-xs text-slate-400 mt-2">
                  Last refreshed:{" "}
                  {lastUpdated}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                loadUsers(
                  selected?.id
                )
              }
              disabled={loading}
              className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold disabled:bg-slate-300"
            >
              {loading
                ? "Refreshing..."
                : "Refresh Users"}
            </button>
          </header>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
              {error}
            </div>
          )}

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
            <Stat
              title="Total Users"
              value={
                metrics.total_users ||
                0
              }
              icon="👥"
            />

            <Stat
              title="Admin Users"
              value={
                metrics.admin_users ||
                0
              }
              icon="🛡️"
            />

            <Stat
              title="Tenant Owners"
              value={
                metrics.tenant_users ||
                0
              }
              icon="🏢"
            />

            <Stat
              title="Users With Companies"
              value={
                metrics.users_with_companies ||
                0
              }
              icon="✅"
            />
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_190px_230px] gap-4">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search name, email, role, user ID, or company count..."
                className="border border-slate-200 rounded-xl px-4 py-3"
              />

              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    event.target.value
                  )
                }
                className="border border-slate-200 rounded-xl px-4 py-3"
              >
                <option value="all">
                  All Roles
                </option>

                {roles.map(
                  (role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {formatRole(
                        role
                      )}
                    </option>
                  )
                )}
              </select>

              <select
                value={ownershipFilter}
                onChange={(event) =>
                  setOwnershipFilter(
                    event.target.value
                  )
                }
                className="border border-slate-200 rounded-xl px-4 py-3"
              >
                <option value="all">
                  All Ownership States
                </option>

                <option value="with_companies">
                  With Companies
                </option>

                <option value="without_companies">
                  Without Companies
                </option>
              </select>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 mt-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm min-w-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">
                    Authentication Directory
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Real registered accounts and ownership relationships.
                  </p>
                </div>

                <span className="text-xs font-bold bg-violet-100 text-violet-700 px-3 py-1 rounded-full">
                  {filtered.length} shown
                </span>
              </div>

              {loading ? (
                <Empty text="Loading users..." />
              ) : filtered.length ===
                0 ? (
                <Empty text="No users match these filters." />
              ) : (
                <div className="space-y-3 mt-5">
                  {filtered.map(
                    (user) => (
                      <button
                        type="button"
                        key={
                          user.id
                        }
                        onClick={() =>
                          setSelected(
                            user
                          )
                        }
                        className={`w-full text-left border rounded-2xl p-4 transition ${
                          String(
                            selected?.id
                          ) ===
                          String(user.id)
                            ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                            : "border-slate-200 bg-slate-50 hover:border-violet-300"
                        }`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_170px_120px_150px] gap-4 items-center">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-lg">
                                {user.full_name ||
                                  "Unnamed User"}
                              </p>

                              <RoleBadge
                                value={
                                  user.role
                                }
                              />
                            </div>

                            <p className="text-sm text-slate-500 mt-1 break-all">
                              {
                                user.email
                              }
                            </p>
                          </div>

                          <Info
                            title="Registered"
                            value={formatDate(
                              user.created_at
                            )}
                          />

                          <Info
                            title="Companies"
                            value={String(
                              user.companies_owned ||
                                0
                            )}
                          />

                          <Info
                            title="User ID"
                            value={String(
                              user.id
                            )}
                          />
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm xl:sticky xl:top-6">
                <h2 className="text-xl font-bold">
                  Selected User
                </h2>

                {!selected ? (
                  <p className="text-slate-500 mt-5">
                    Select a user to inspect its role and company ownership.
                  </p>
                ) : (
                  <>
                    <div className="mt-5 bg-violet-50 border border-violet-100 rounded-2xl p-5">
                      <p className="text-sm text-violet-700">
                        Authentication Account
                      </p>

                      <p className="text-2xl font-bold mt-1">
                        {selected.full_name ||
                          "Unnamed User"}
                      </p>

                      <p className="text-sm text-violet-700 mt-2 break-all">
                        {
                          selected.email
                        }
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <Mini
                        title="Role"
                        value={formatRole(
                          normalizeRole(
                            selected.role
                          )
                        )}
                      />

                      <Mini
                        title="Companies"
                        value={
                          selected.companies_owned ||
                          0
                        }
                      />

                      <Mini
                        title="Account Type"
                        value={
                          normalizeRole(
                            selected.role
                          ) ===
                          "admin"
                            ? "Firmic Admin"
                            : "Tenant User"
                        }
                      />

                      <Mini
                        title="Registered"
                        value={formatDate(
                          selected.created_at
                        )}
                      />
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-5">
                      <Detail
                        title="User ID"
                        value={String(
                          selected.id
                        )}
                      />

                      <Detail
                        title="Email"
                        value={
                          selected.email
                        }
                      />

                      <Detail
                        title="Role"
                        value={formatRole(
                          normalizeRole(
                            selected.role
                          )
                        )}
                      />

                      <Detail
                        title="Company Ownership"
                        value={
                          Number(
                            selected.companies_owned ||
                              0
                          ) > 0
                            ? `${selected.companies_owned} company record(s)`
                            : "No company records"
                        }
                      />
                    </div>

                    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <p className="font-bold text-amber-800">
                        Current security capability
                      </p>

                      <p className="text-sm text-amber-700 mt-2">
                        The current User table stores role but does not yet store
                        account status, suspension state, invitation state, or
                        fine-grained permissions. Those controls are intentionally
                        not simulated on this page.
                      </p>
                    </div>

                    <div className="mt-4 bg-violet-50 border border-violet-200 rounded-2xl p-4">
                      <p className="font-bold text-violet-800">
                        Next controlled upgrade
                      </p>

                      <p className="text-sm text-violet-700 mt-2">
                        Add persistent account status, role-change audit history,
                        and permission groups through one database migration before
                        enabling suspend, invite, or role-edit actions.
                      </p>
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
    <div className="min-w-0">
      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="font-bold mt-1 break-words">
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

function Detail({
  title,
  value,
}: any) {
  return (
    <div className="py-3 border-b border-slate-100 last:border-b-0">
      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="font-bold mt-1 break-all">
        {value}
      </p>
    </div>
  );
}

function RoleBadge({
  value,
}: {
  value?: string;
}) {
  const role =
    normalizeRole(value);

  const style =
    role === "admin"
      ? "bg-violet-100 text-violet-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold ${style}`}
    >
      {formatRole(role)}
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

function normalizeRole(
  value?: string
) {
  const normalized =
    String(
      value || "owner"
    ).toLowerCase();

  return normalized ===
    "admin"
    ? "admin"
    : "owner";
}

function formatRole(
  value: string
) {
  return value ===
    "admin"
    ? "Administrator"
    : "Tenant Owner";
}

function formatDate(
  value?: string | null
) {
  return value
    ? new Date(
        value
      ).toLocaleDateString()
    : "Not recorded";
}
