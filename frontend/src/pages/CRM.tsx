export default function CRM() {
  const deals = [
    { name: "Real Estate Client", stage: "Qualified", value: "$2,400" },
    { name: "Consulting Lead", stage: "Proposal Sent", value: "$1,200" },
    { name: "E-commerce Founder", stage: "New Lead", value: "$800" },
  ];

  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold">CRM Software</h1>
      <p className="text-slate-500 mt-1">Manage leads, deals, follow-ups, and AI sales activity.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
        <Stat title="Leads" value="38" />
        <Stat title="Deals" value="12" />
        <Stat title="Pipeline" value="$18.4k" />
        <Stat title="Won This Month" value="$4.2k" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 mt-8 shadow-sm">
        <h2 className="text-xl font-bold">Pipeline</h2>

        <div className="mt-5 space-y-3">
          {deals.map((deal) => (
            <div key={deal.name} className="flex justify-between bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div>
                <p className="font-bold">{deal.name}</p>
                <p className="text-sm text-slate-500">{deal.stage}</p>
              </div>
              <p className="font-bold">{deal.value}</p>
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