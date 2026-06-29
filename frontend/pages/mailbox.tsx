import { useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";

const mailItems = [
  {
    id: 1,
    type: "Letter",
    from: "Dubai Economy",
    status: "Scanned",
    date: "Today",
    action: "Download PDF",
    icon: "✉️",
  },
  {
    id: 2,
    type: "Package",
    from: "DHL Express",
    status: "Ready for Pickup",
    date: "Yesterday",
    action: "Forward Package",
    icon: "📦",
  },
  {
    id: 3,
    type: "Bank Notice",
    from: "Emirates NBD",
    status: "Forwarded",
    date: "Jun 1",
    action: "View Details",
    icon: "🏦",
  },
  {
    id: 4,
    type: "Government Mail",
    from: "Dubai Chamber",
    status: "Archived",
    date: "May 28",
    action: "Restore",
    icon: "🏛️",
  },
];

export default function Mailbox() {
  const [selectedMail, setSelectedMail] = useState(mailItems[0]);

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Mailbox" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Mailbox</h1>
            <p className="text-slate-500 mt-1">
              Receive, scan, forward, archive, and manage physical business mail.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
            <p className="text-sm text-slate-500">Mailbox Address</p>
            <p className="font-bold">Office A047 · Business Bay, Dubai</p>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="New Mail" value="2" icon="✉️" />
          <Stat title="Packages" value="1" icon="📦" />
          <Stat title="Scanned" value="8" icon="📄" />
          <Stat title="Forwarded" value="3" icon="🚚" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Incoming Mail</h2>

              <button className="bg-violet-600 text-white px-4 py-2 rounded-xl font-bold text-sm">
                Request Mail Forwarding
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {mailItems.map((mail) => (
                <button
                  key={mail.id}
                  onClick={() => setSelectedMail(mail)}
                  className={`w-full text-left rounded-2xl border p-4 transition ${
                    selectedMail.id === mail.id
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 bg-slate-50 hover:bg-white"
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl">
                        {mail.icon}
                      </div>

                      <div>
                        <p className="font-bold">{mail.type}</p>
                        <p className="text-xs text-slate-500">From: {mail.from}</p>
                      </div>
                    </div>

                    <Badge status={mail.status} />

                    <p className="text-sm text-slate-600">{mail.date}</p>

                    <p className="text-sm font-semibold">{mail.action}</p>

                    <span className="text-right text-slate-400">›</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Selected Mail</h2>

              <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="text-4xl">{selectedMail.icon}</div>

                <h3 className="text-lg font-bold mt-4">{selectedMail.type}</h3>

                <p className="text-sm text-slate-500 mt-1">
                  From: {selectedMail.from}
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  Received: {selectedMail.date}
                </p>

                <div className="mt-4">
                  <Badge status={selectedMail.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button className="border border-slate-200 py-3 rounded-xl font-bold">
                  Scan Mail
                </button>

                <button className="bg-violet-600 text-white py-3 rounded-xl font-bold">
                  Forward
                </button>

                <button className="border border-slate-200 py-3 rounded-xl font-bold">
                  Download PDF
                </button>

                <button className="border border-slate-200 py-3 rounded-xl font-bold">
                  Archive
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Mailbox Service</h2>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <Mini title="Plan" value="Premium" />
                <Mini title="Monthly" value="$19 / AED 70" />
                <Mini title="Scans" value="Unlimited" />
                <Mini title="Forwarding" value="Enabled" />
              </div>

              <button className="mt-5 w-full bg-violet-600 text-white py-3 rounded-xl font-bold">
                Manage Mailbox Plan
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
    </ProtectedRoute>
  );
}


function Stat({ title, value, icon }: { title: string; value: string; icon: string }) {
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
    <div className="bg-slate-50 rounded-2xl p-3 text-center">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const styles =
    status === "Scanned"
      ? "bg-green-100 text-green-700"
      : status === "Ready for Pickup"
      ? "bg-yellow-100 text-yellow-700"
      : status === "Forwarded"
      ? "bg-violet-100 text-violet-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span className={`w-fit px-3 py-1 rounded-full text-xs font-bold ${styles}`}>
      {status}
    </span>
  );
}