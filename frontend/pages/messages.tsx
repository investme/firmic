import { useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";

const messages = [
  {
    id: 1,
    channel: "VoIP",
    title: "New sales inquiry answered",
    from: "Receptionist AI",
    time: "10:42 AM",
    status: "Action Needed",
    body: "Caller asked about virtual office pricing and wants a proposal for Office A052 with Sales AI and CRM.",
  },
  {
    id: 2,
    channel: "CRM",
    title: "Lead follow-up scheduled",
    from: "Sales AI",
    time: "10:15 AM",
    status: "Scheduled",
    body: "Sales AI scheduled a follow-up with NovaCart for tomorrow at 2:00 PM.",
  },
  {
    id: 3,
    channel: "Mailbox",
    title: "New package received",
    from: "Mailbox Desk",
    time: "09:58 AM",
    status: "New",
    body: "A DHL package was received for Office A047 and is ready for pickup or forwarding.",
  },
  {
    id: 4,
    channel: "Hermes",
    title: "KYB document package missing one file",
    from: "Hermes Compliance",
    time: "09:45 AM",
    status: "Action Needed",
    body: "Hermes detected that the KYB document package is missing one required document. Upload the missing file to improve compliance readiness.",
  },
  {
    id: 5,
    channel: "Sonny",
    title: "Company progress summary generated",
    from: "Sonny AI",
    time: "09:38 AM",
    status: "New",
    body: "Sonny generated a summary of company progress, documents, tasks, office status, and AI workforce activity.",
  },
  {
    id: 6,
    channel: "Meeting Rooms",
    title: "Room booking confirmed",
    from: "Firmic Rooms",
    time: "09:30 AM",
    status: "Confirmed",
    body: "Business Bay Room B has been booked with Zoom enabled for tomorrow.",
  },
];

export default function Messages() {
  const [selected, setSelected] = useState(messages[0]);
  const [search, setSearch] = useState("");

  const filteredMessages = messages.filter((msg) => {
    const text = `${msg.channel} ${msg.title} ${msg.from} ${msg.status}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const unreadCount = messages.filter(
    (msg) => msg.status === "New" || msg.status === "Action Needed"
  ).length;

  const actionNeeded = messages.filter(
    (msg) => msg.status === "Action Needed"
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Messages" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              Communications Center
            </h1>
            <p className="text-slate-500 mt-1">
              All VoIP, CRM, mailbox, meeting, Sonny, and Hermes messages in one place.
            </p>
          </div>

          <button className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold">
            New Message
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="Unread" value={String(unreadCount)} icon="🔔" />
          <Stat title="AI Alerts" value="12" icon="🤖" />
          <Stat title="Customer Messages" value="18" icon="💬" />
          <Stat title="Actions Needed" value={String(actionNeeded)} icon="⚡" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 mt-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold">Unified Inbox</h2>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages..."
                className="border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
              />
            </div>

            <div className="mt-5 space-y-3">
              {filteredMessages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => setSelected(msg)}
                  className={`w-full text-left rounded-2xl border p-4 ${
                    selected.id === msg.id
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 bg-slate-50 hover:bg-white"
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-[110px_1fr_100px_110px] gap-3 items-center">
                    <Badge text={msg.channel} />

                    <div>
                      <p className="font-bold">{msg.title}</p>
                      <p className="text-sm text-slate-500">From: {msg.from}</p>
                    </div>

                    <p className="text-sm text-slate-500">{msg.time}</p>

                    <Status text={msg.status} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Selected Message</h2>

              <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <Badge text={selected.channel} />

                <h3 className="text-xl font-bold mt-4">{selected.title}</h3>

                <p className="text-sm text-slate-500 mt-1">
                  {selected.from} · {selected.time}
                </p>

                <p className="text-slate-600 mt-5">{selected.body}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button className="bg-violet-600 text-white py-3 rounded-xl font-bold">
                  Create Task
                </button>

                <button className="border border-slate-200 py-3 rounded-xl font-bold">
                  Reply
                </button>

                <button className="border border-slate-200 py-3 rounded-xl font-bold">
                  Assign to AI
                </button>

                <button className="border border-slate-200 py-3 rounded-xl font-bold">
                  Archive
                </button>
              </div>
            </div>

            <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">AI Message Routing</h2>

              <p className="text-violet-100 text-sm mt-2">
                Firmic routes calls, mail, CRM updates, compliance alerts, and meeting notifications
                to the right AI employee.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <Mini title="Routing" value="Active" />
                <Mini title="AI Agents" value="7" />
                <Mini title="Channels" value="6" />
                <Mini title="Alerts" value={String(actionNeeded)} />
              </div>

              <button className="mt-5 w-full bg-white text-violet-700 py-3 rounded-xl font-bold">
                Configure Routing
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
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

function Badge({ text }: { text: string }) {
  return (
    <span className="w-fit bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold">
      {text}
    </span>
  );
}

function Status({ text }: { text: string }) {
  const style =
    text === "Action Needed"
      ? "bg-red-100 text-red-700"
      : text === "New"
      ? "bg-green-100 text-green-700"
      : text === "Scheduled"
      ? "bg-violet-100 text-violet-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span className={`w-fit px-3 py-1 rounded-full text-xs font-bold ${style}`}>
      {text}
    </span>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 text-center">
      <p className="text-xs text-violet-100">{title}</p>
      <p className="font-bold text-lg">{value}</p>
    </div>
  );
}