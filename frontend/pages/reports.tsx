import FirmicSidebar from "../components/FirmicSidebar";

const aiProductivity = [
  ["Receptionist AI", "142 calls answered", "+18%"],
  ["Sales AI", "23 meetings booked", "+27%"],
  ["Support AI", "87 tickets resolved", "+15%"],
  ["Finance AI", "16 invoices prepared", "+11%"],
];

const activity = [
  "VoIP calls increased by 18% this month",
  "CRM pipeline reached $12,600",
  "AI Workforce completed 1,842 tasks",
  "Mailbox received 22 scanned documents",
  "Meeting rooms generated $75 in usage",
];

export default function Reports() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Reports" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Reports</h1>
            <p className="text-slate-500 mt-1">
              CEO dashboard for revenue, operations, AI workforce, and company activity.
            </p>
          </div>

          <button className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold">
            Export Report
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="Monthly Revenue" value="$5,200" sub="AED 19,084" icon="💰" />
          <Stat title="Monthly Spend" value="$723" sub="AED 2,654" icon="💳" />
          <Stat title="AI Tasks" value="1,842" sub="+21%" icon="🤖" />
          <Stat title="Leads Created" value="38" sub="+31%" icon="📈" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Company Performance</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                <Metric title="Calls Answered" value="142" change="+18%" icon="☎️" />
                <Metric title="Meetings Booked" value="23" change="+27%" icon="📅" />
                <Metric title="Mail Pieces" value="16" change="+11%" icon="📬" />
                <Metric title="CRM Pipeline" value="$12,600" change="+34%" icon="📊" />
                <Metric title="Invoices Paid" value="9" change="+12%" icon="✅" />
                <Metric title="Room Hours" value="3" change="+8%" icon="🏛️" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">AI Workforce Productivity</h2>

              <div className="mt-5 space-y-3">
                {aiProductivity.map(([agent, output, change]) => (
                  <div
                    key={agent}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold">{agent}</p>
                      <p className="text-sm text-slate-500">{output}</p>
                    </div>

                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                      {change}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Operational Activity</h2>

              <div className="mt-5 space-y-3">
                {activity.map((item) => (
                  <div
                    key={item}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-semibold"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Executive Summary</h2>

              <p className="text-violet-100 mt-3 text-sm">
                Firmic operations are healthy. AI workforce productivity is up,
                CRM pipeline is growing, and communications activity increased
                across VoIP, mailbox, and meeting rooms.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <Mini title="Health" value="94%" />
                <Mini title="Growth" value="+21%" />
                <Mini title="MRR" value="$723" />
                <Mini title="Pipeline" value="$12.6k" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Revenue Breakdown</h2>

              <div className="mt-5 space-y-3">
                <Row name="Office Rental" value="$99" />
                <Row name="AI Workforce" value="$423" />
                <Row name="Mailbox + VoIP" value="$48" />
                <Row name="Meeting Rooms" value="$75" />
                <Row name="CRM + Microsoft 365" value="$44" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">AI Recommendation</h2>
              <p className="text-sm text-slate-500 mt-3">
                Add HR AI and Operations AI next. Based on current workload,
                Firmic can reduce manual admin tasks by another 18%.
              </p>

              <button className="mt-5 w-full bg-violet-600 text-white py-3 rounded-xl font-bold">
                Apply Recommendation
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ title, value, sub, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-sm text-slate-500">{sub}</p>
    </div>
  );
}

function Metric({ title, value, change, icon }: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-green-600 text-sm font-bold">{change}</p>
    </div>
  );
}

function Mini({ title, value }: any) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 text-center">
      <p className="text-xs text-violet-100">{title}</p>
      <p className="font-bold text-xl">{value}</p>
    </div>
  );
}

function Row({ name, value }: any) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-3 text-sm">
      <span>{name}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}