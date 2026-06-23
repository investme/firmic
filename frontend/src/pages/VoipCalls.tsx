export default function VoipCalls() {
  const calls = [
    { from: "+971 50 123 8841", handledBy: "Receptionist AI", status: "Answered", duration: "4m 12s" },
    { from: "+971 55 441 9022", handledBy: "Sales AI", status: "Qualified Lead", duration: "7m 08s" },
    { from: "+971 52 808 1188", handledBy: "Receptionist AI", status: "Missed", duration: "0m" },
  ];

  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold">VoIP & Calls</h1>
      <p className="text-slate-500 mt-1">Your Dubai business number, powered by AI call handling.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
        <Stat title="Calls Today" value="14" />
        <Stat title="Answered by AI" value="12" />
        <Stat title="Missed" value="2" />
        <Stat title="Avg Duration" value="3m 14s" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 mt-8 shadow-sm">
        <h2 className="text-xl font-bold">Recent Calls</h2>

        <div className="mt-5 space-y-3">
          {calls.map((call, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="font-bold">{call.from}</p>
              <p className="text-slate-600">{call.handledBy}</p>
              <p className="font-semibold">{call.status}</p>
              <p className="text-slate-500">{call.duration}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <p className="text-slate-500 text-sm">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}