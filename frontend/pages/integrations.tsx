import { useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";

const initialIntegrations = [
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
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [notice, setNotice] = useState("");

  const connectedCount = integrations.filter(
    (item) => item.status === "Connected"
  ).length;

  const availableCount = integrations.filter(
    (item) => item.status !== "Connected"
  ).length;

  function showNotice(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  }

  function connectIntegration(name: string) {
    setIntegrations((current) =>
      current.map((item) =>
        item.name === name ? { ...item, status: "Connected" } : item
      )
    );

    showNotice(`${name} connected successfully.`);
  }

  function manageIntegration(name: string) {
    showNotice(`${name} integration is active and ready to manage.`);
  }

  function handleIntegrationClick(item: any) {
    if (item.status === "Connected") {
      manageIntegration(item.name);
    } else {
      connectIntegration(item.name);
    }
  }

  function connectRecommended(name: string) {
    connectIntegration(name);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Integrations" />

      <main className="flex-1 p-6 xl:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Integrations</h1>

            <p className="text-slate-500 mt-1">
              Connect Firmic with your existing business stack.
            </p>
          </div>

          <button
            onClick={() => showNotice("Marketplace browsing is enabled for this MVP.")}
            className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            Browse Marketplace
          </button>
        </div>

        {notice && (
          <div className="mt-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 font-bold">
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="Connected" value={String(connectedCount)} icon="🔗" />
          <Stat title="Available" value={String(availableCount)} icon="⚡" />
          <Stat title="Sync Health" value="99%" icon="✅" />
          <Stat title="Last Sync" value="2 Min" icon="🔄" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 mt-8">
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

                  <h3 className="text-xl font-bold mt-5">{item.name}</h3>

                  <p className="text-slate-500 text-sm mt-2 min-h-[40px]">
                    {item.desc}
                  </p>

                  <button
                    onClick={() => handleIntegrationClick(item)}
                    className={`w-full mt-6 py-3 rounded-xl font-bold ${
                      item.status === "Connected"
                        ? "border border-slate-200 bg-white"
                        : "bg-violet-600 text-white"
                    }`}
                  >
                    {item.status === "Connected" ? "Manage" : "Connect"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Integration Health</h2>

              <div className="space-y-4 mt-5">
                {integrations
                  .filter((item) => item.status === "Connected")
                  .slice(0, 6)
                  .map((item) => (
                    <Health
                      key={item.name}
                      name={item.name}
                      status="Healthy"
                      color="green"
                    />
                  ))}

                {connectedCount === 0 && (
                  <p className="text-sm text-slate-500">
                    No connected integrations yet.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Recommended</h2>

              <div className="space-y-3 mt-5">
                <Recommendation
                  text="Connect HubSpot CRM"
                  onClick={() => connectRecommended("HubSpot")}
                />

                <Recommendation
                  text="Connect Slack"
                  onClick={() => connectRecommended("Slack")}
                />

                <Recommendation
                  text="Connect QuickBooks"
                  onClick={() => connectRecommended("QuickBooks")}
                />

                <Recommendation
                  text="Connect Google Workspace"
                  onClick={() => connectRecommended("Google Workspace")}
                />
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
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white/10 rounded-xl p-3 font-medium text-left flex justify-between items-center"
    >
      <span>✓ {text}</span>
      <span className="font-bold">Connect</span>
    </button>
  );
}