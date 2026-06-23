import { useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";

const calls = [
  {
    id: 1,
    caller: "+971 50 123 8841",
    status: "Answered",
    handledBy: "Receptionist AI",
    duration: "04:12",
    type: "Sales Inquiry",
    transcript:
      "Caller asked about virtual office pricing and AI receptionist services.",
    time: "10:42 AM",
  },
  {
    id: 2,
    caller: "+971 55 441 9022",
    status: "Qualified",
    handledBy: "Sales AI",
    duration: "07:08",
    type: "New Lead",
    transcript:
      "Caller is interested in renting Office A052 and adding CRM software.",
    time: "10:15 AM",
  },
  {
    id: 3,
    caller: "+971 52 808 1188",
    status: "Missed",
    handledBy: "Call Routing",
    duration: "00:00",
    type: "Missed Call",
    transcript: "No transcript available. Caller did not leave a message.",
    time: "09:58 AM",
  },
  {
    id: 4,
    caller: "+971 58 332 1209",
    status: "Answered",
    handledBy: "Receptionist AI",
    duration: "03:14",
    type: "Support",
    transcript:
      "Caller requested mailbox forwarding and asked about package handling.",
    time: "09:30 AM",
  },
];

export default function VoipCalls() {
  const [selectedCall, setSelectedCall] = useState(calls[0]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="VoIP & Calls" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">VoIP & Calls</h1>
            <p className="text-slate-500 mt-1">
              Manage your Dubai business number, AI receptionist, call routing,
              and transcripts.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm">
            <p className="text-sm text-slate-500">Dubai Business Number</p>
            <p className="font-bold">+971 4 XXX 047</p>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="Calls Today" value="14" icon="☎️" />
          <Stat title="Answered by AI" value="12" icon="✅" />
          <Stat title="Missed Calls" value="2" icon="❌" />
          <Stat title="Avg. Duration" value="03:14" icon="⏱️" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Recent Calls</h2>
              <button className="bg-violet-600 text-white px-4 py-2 rounded-xl font-bold text-sm">
                Change Number
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {calls.map((call) => (
                <button
                  key={call.id}
                  onClick={() => setSelectedCall(call)}
                  className={`w-full text-left rounded-2xl border p-4 transition ${
                    selectedCall.id === call.id
                      ? "border-violet-500 bg-violet-50"
                      : "border-slate-200 bg-slate-50 hover:bg-white"
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                    <div>
                      <p className="font-bold">{call.caller}</p>
                      <p className="text-xs text-slate-500">{call.time}</p>
                    </div>

                    <Badge status={call.status} />

                    <p className="text-sm text-slate-600">{call.handledBy}</p>

                    <p className="text-sm font-bold">{call.duration}</p>

                    <p className="text-sm text-slate-500">{call.type}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">AI Receptionist</h2>

              <div className="mt-5 flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-violet-100 flex items-center justify-center text-3xl">
                  🤖
                </div>

                <div>
                  <p className="font-bold">Receptionist AI</p>
                  <p className="text-sm text-green-600 font-semibold">
                    Online · Handling calls
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <Mini title="Answered" value="12" />
                <Mini title="Leads Routed" value="4" />
                <Mini title="Voicemails" value="2" />
                <Mini title="Satisfaction" value="96%" />
              </div>

              <button className="mt-5 w-full bg-violet-600 text-white py-3 rounded-xl font-bold">
                Configure AI Receptionist
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Call Transcript</h2>

              <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-sm text-slate-500">Selected Call</p>
                <p className="font-bold mt-1">{selectedCall.caller}</p>
                <p className="text-sm text-slate-600 mt-4">
                  {selectedCall.transcript}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button className="border border-slate-200 py-3 rounded-xl font-bold">
                  Download
                </button>
                <button className="bg-violet-600 text-white py-3 rounded-xl font-bold">
                  Create Lead
                </button>
              </div>
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
    <div className="bg-slate-50 rounded-2xl p-3 text-center">
      <p className="text-xs text-slate-500">{title}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const styles =
    status === "Answered"
      ? "bg-green-100 text-green-700"
      : status === "Qualified"
      ? "bg-violet-100 text-violet-700"
      : "bg-red-100 text-red-700";

  return (
    <span className={`w-fit px-3 py-1 rounded-full text-xs font-bold ${styles}`}>
      {status}
    </span>
  );
}