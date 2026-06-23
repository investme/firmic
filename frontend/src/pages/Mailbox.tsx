export default function Mailbox() {
  const mail = [
    { type: "Letter", from: "Dubai Economy", status: "Scanned", date: "Today" },
    { type: "Package", from: "DHL", status: "Ready for pickup", date: "Yesterday" },
    { type: "Letter", from: "Bank Notice", status: "Forwarded", date: "Jun 1" },
  ];

  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold">Mailbox</h1>
      <p className="text-slate-500 mt-1">
        Manage incoming mail, packages, scanning, and forwarding.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
        <Stat title="New Mail" value="2" />
        <Stat title="Packages" value="1" />
        <Stat title="Scanned" value="8" />
        <Stat title="Forwarded" value="3" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 mt-8 shadow-sm">
        <h2 className="text-xl font-bold">Incoming Mail</h2>

        <div className="mt-5 space-y-3">
          {mail.map((item, i) => (
            <div key={i} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div>
                <p className="font-bold">{item.type}</p>
                <p className="text-sm text-slate-500">From: {item.from}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{item.status}</p>
                <p className="text-sm text-slate-500">{item.date}</p>
              </div>
            </div>
          ))}
        </div>

        <button className="mt-6 bg-violet-600 text-white px-5 py-3 rounded-xl font-semibold">
          Forward Mail
        </button>
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