export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="flex justify-between items-center px-8 lg:px-20 py-6">
        <h1 className="text-3xl font-bold">Firmic</h1>

        <button className="bg-violet-600 px-5 py-3 rounded-xl font-semibold">
          Open Dashboard
        </button>
      </header>

      <section className="px-8 lg:px-20 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="bg-violet-500/20 text-violet-300 px-4 py-2 rounded-full text-sm">
            Dubai Virtual Offices + AI Workforce
          </span>

          <h2 className="text-5xl lg:text-7xl font-bold mt-6 leading-tight">
            Rent a Virtual Office Staffed by AI Employees
          </h2>

          <p className="text-slate-300 text-lg mt-6 max-w-xl">
            Get a Dubai business address, mailbox, VoIP number, meeting rooms,
            Zoom, CRM, Microsoft 365, and AI employees working for your company.
          </p>

          <div className="flex gap-4 mt-8">
            <button className="bg-violet-600 px-7 py-4 rounded-xl font-bold">
              Rent Office
            </button>

            <button className="border border-slate-600 px-7 py-4 rounded-xl font-bold">
              View Pricing
            </button>
          </div>

          <p className="text-slate-400 mt-6">
            Hookup fee starts at <b>$49 / AED 180</b>
          </p>
        </div>

        <div className="bg-white/10 border border-white/10 rounded-3xl p-6">
          <div className="bg-slate-900 rounded-2xl p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-slate-400">Office</p>
                <h3 className="text-3xl font-bold">A047</h3>
              </div>

              <span className="bg-green-500/20 text-green-300 px-4 py-2 rounded-full h-fit">
                Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <Box title="Dubai Address" value="Active" />
              <Box title="Mailbox" value="3 New" />
              <Box title="VoIP" value="14 Calls" />
              <Box title="AI Staff" value="7 Hired" />
            </div>

            <div className="mt-8 bg-violet-600 rounded-2xl p-5">
              <p className="text-violet-100">Monthly Subscription</p>
              <h3 className="text-4xl font-bold">$525</h3>
              <p className="text-violet-100">AED 1,927/month</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Box({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-2xl p-4">
      <p className="text-slate-400 text-sm">{title}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}