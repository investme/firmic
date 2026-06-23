import FirmicSidebar from "../components/FirmicSidebar";

const integrations = [
  {
    name: "OpenAI",
    status: "Connected",
    desc: "Powers Sonny AI workforce.",
  },
  {
    name: "Microsoft 365",
    status: "Connected",
    desc: "Email, calendar and productivity.",
  },
  {
    name: "Zoom",
    status: "Connected",
    desc: "Meeting room connectivity.",
  },
  {
    name: "HubSpot",
    status: "Available",
    desc: "CRM and sales automation.",
  },
  {
    name: "Slack",
    status: "Available",
    desc: "Internal communication.",
  },
  {
    name: "Salesforce",
    status: "Available",
    desc: "Enterprise CRM integration.",
  },
  {
    name: "Google Workspace",
    status: "Available",
    desc: "Docs, Gmail and Drive.",
  },
  {
    name: "QuickBooks",
    status: "Available",
    desc: "Accounting and bookkeeping.",
  },
  {
    name: "Xero",
    status: "Available",
    desc: "Financial management.",
  },
  {
    name: "Claude",
    status: "Available",
    desc: "AI reasoning engine.",
  },
  {
    name: "Gemini",
    status: "Available",
    desc: "Google AI services.",
  },
  {
    name: "Pipedrive",
    status: "Available",
    desc: "Sales pipeline management.",
  },
];

export default function Integrations() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Integrations" />

      <main className="flex-1 p-6 xl:p-8">

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">
              Integrations
            </h1>

            <p className="text-slate-500 mt-1">
              Connect Firmic with your existing business stack.
            </p>
          </div>

          <button className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold">
            Browse Marketplace
          </button>
        </div>

        {/* Stats */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">

          <Stat
            title="Connected"
            value="6"
            icon="🔗"
          />

          <Stat
            title="Available"
            value="25"
            icon="⚡"
          />

          <Stat
            title="Sync Health"
            value="99%"
            icon="✅"
          />

          <Stat
            title="Last Sync"
            value="2 Min"
            icon="🔄"
          />

        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 mt-8">

          {/* Integrations Grid */}

          <div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

              {integrations.map((item) => (
                <div
                  key={item.name}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm"
                >
                  <div className="flex justify-between items-center">

                    <div className="h-14 w-14 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl">
                      ⚙️
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === "Connected"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.status}
                    </span>

                  </div>

                  <h3 className="text-xl font-bold mt-5">
                    {item.name}
                  </h3>

                  <p className="text-slate-500 text-sm mt-2">
                    {item.desc}
                  </p>

                  <button
                    className={`w-full mt-6 py-3 rounded-xl font-bold ${
                      item.status === "Connected"
                        ? "border border-slate-200"
                        : "bg-violet-600 text-white"
                    }`}
                  >
                    {item.status === "Connected"
                      ? "Manage"
                      : "Connect"}
                  </button>

                </div>
              ))}

            </div>

          </div>

          {/* Right Panel */}

          <div className="space-y-6">

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">

              <h2 className="text-xl font-bold">
                Integration Health
              </h2>

              <div className="space-y-4 mt-5">

                <Health
                  name="OpenAI"
                  status="Healthy"
                  color="green"
                />

                <Health
                  name="Microsoft 365"
                  status="Healthy"
                  color="green"
                />

                <Health
                  name="Zoom"
                  status="Healthy"
                  color="green"
                />

                <Health
                  name="Slack"
                  status="Warning"
                  color="yellow"
                />

              </div>

            </div>

            <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm">

              <h2 className="text-xl font-bold">
                Recommended
              </h2>

              <div className="space-y-3 mt-5">

                <Recommendation text="Connect HubSpot CRM" />
                <Recommendation text="Connect Slack" />
                <Recommendation text="Connect QuickBooks" />
                <Recommendation text="Connect Google Workspace" />

              </div>

            </div>

          </div>

        </div>

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
      <p className="text-slate-500 text-sm mt-3">{title}</p>
      <h3 className="text-3xl font-bold mt-1">{value}</h3>
    </div>
  );
}

function Health({
  name,
  status,
  color,
}: {
  name: string;
  status: string;
  color: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span>{name}</span>

      <span
        className={`px-3 py-1 rounded-full text-xs font-bold ${
          color === "green"
            ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

function Recommendation({
  text,
}: {
  text: string;
}) {
  return (
    <div className="bg-white/10 rounded-xl p-3 font-medium">
      ✓ {text}
    </div>
  );
}