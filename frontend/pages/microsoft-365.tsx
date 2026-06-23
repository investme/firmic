import { useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";

const users = [
  {
    id: 1,
    name: "Matar Al Yafi",
    email: "matar@acme.ae",
    role: "Founder",
    license: "Business Premium",
    status: "Active",
    storage: "42 GB",
  },
  {
    id: 2,
    name: "Receptionist AI",
    email: "receptionist-ai@acme.ae",
    role: "AI Employee",
    license: "Business Standard",
    status: "Active",
    storage: "8 GB",
  },
  {
    id: 3,
    name: "Sales AI",
    email: "sales-ai@acme.ae",
    role: "AI Employee",
    license: "Business Standard",
    status: "Active",
    storage: "16 GB",
  },
  {
    id: 4,
    name: "Support AI",
    email: "support-ai@acme.ae",
    role: "AI Employee",
    license: "Business Standard",
    status: "Active",
    storage: "12 GB",
  },
  {
    id: 5,
    name: "Finance AI",
    email: "finance-ai@acme.ae",
    role: "AI Employee",
    license: "Business Premium",
    status: "Active",
    storage: "22 GB",
  },
];

const licenses = [
  {
    name: "Microsoft 365 Business Basic",
    price: 8,
    users: 2,
  },
  {
    name: "Microsoft 365 Business Standard",
    price: 12,
    users: 7,
  },
  {
    name: "Microsoft 365 Business Premium",
    price: 22,
    users: 3,
  },
];

const teams = [
  "Executive Team",
  "Sales Team",
  "Support Team",
  "Finance Team",
  "AI Workforce Team",
];

export default function Microsoft365() {
  const [selectedUser, setSelectedUser] = useState(users[0]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Microsoft 365" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Microsoft 365</h1>
            <p className="text-slate-500 mt-1">
              Manage users, email accounts, licenses, Teams, storage, and AI
              employee mailboxes.
            </p>
          </div>

          <button className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold">
            + Add User
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="Active Users" value="12" icon="👥" />
          <Stat title="Licenses" value="12" icon="🔑" />
          <Stat title="Storage Used" value="142 GB" icon="☁️" />
          <Stat title="Mailboxes" value="12" icon="📧" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Users & Mailboxes</h2>
                <button className="border border-slate-200 px-4 py-2 rounded-xl font-bold text-sm">
                  Sync Microsoft
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full text-left rounded-2xl border p-4 transition ${
                      selectedUser.id === user.id
                        ? "border-violet-500 bg-violet-50"
                        : "border-slate-200 bg-slate-50 hover:bg-white"
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                      <div>
                        <p className="font-bold">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>

                      <Badge text={user.role} />

                      <p className="text-sm text-slate-600">{user.license}</p>

                      <p className="text-sm font-bold">{user.storage}</p>

                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold w-fit">
                        {user.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Licenses</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                {licenses.map((license) => (
                  <div
                    key={license.name}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-5"
                  >
                    <h3 className="font-bold">{license.name}</h3>
                    <p className="text-sm text-slate-500 mt-2">
                      {license.users} users assigned
                    </p>
                    <p className="text-xl font-bold mt-4">
                      ${license.price}/user
                    </p>
                    <p className="text-sm text-slate-500">monthly</p>

                    <button className="mt-5 w-full bg-violet-600 text-white py-3 rounded-xl font-bold">
                      Manage
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Teams</h2>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-5">
                {teams.map((team) => (
                  <div
                    key={team}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center"
                  >
                    <div className="text-3xl">💬</div>
                    <p className="font-bold text-sm mt-3">{team}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Selected User</h2>

              <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="h-16 w-16 rounded-2xl bg-violet-100 flex items-center justify-center text-3xl">
                  {selectedUser.role === "AI Employee" ? "🤖" : "👤"}
                </div>

                <h3 className="text-xl font-bold mt-4">{selectedUser.name}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedUser.email}
                </p>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <Mini title="Role" value={selectedUser.role} />
                  <Mini title="Storage" value={selectedUser.storage} />
                  <Mini title="License" value={selectedUser.license} />
                  <Mini title="Status" value={selectedUser.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button className="bg-violet-600 text-white py-3 rounded-xl font-bold">
                  Assign License
                </button>

                <button className="border border-slate-200 py-3 rounded-xl font-bold">
                  Reset Password
                </button>

                <button className="border border-slate-200 py-3 rounded-xl font-bold">
                  Open Mailbox
                </button>

                <button className="border border-slate-200 py-3 rounded-xl font-bold">
                  Disable User
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Microsoft Health</h2>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <Mini title="Users Online" value="11" />
                <Mini title="Emails Today" value="248" />
                <Mini title="Storage Used" value="142 GB" />
                <Mini title="Security Score" value="96%" />
              </div>
            </div>

            <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">AI + Microsoft 365</h2>

              <p className="text-sm text-violet-100 mt-2">
                Give every AI employee a real company email, calendar, storage,
                and collaboration workspace.
              </p>

              <button className="mt-5 w-full bg-white text-violet-700 py-3 rounded-xl font-bold">
                Create AI Mailbox
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 text-center">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold text-sm mt-1">{value}</p>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  const styles =
    text === "AI Employee"
      ? "bg-violet-100 text-violet-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span className={`w-fit px-3 py-1 rounded-full text-xs font-bold ${styles}`}>
      {text}
    </span>
  );
}