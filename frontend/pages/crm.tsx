import { useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";

const leads = [
  {
    id: 1,
    name: "Dubai Real Estate Founder",
    company: "PrimeStay Properties",
    source: "VoIP Call",
    stage: "New Lead",
    value: 2400,
    owner: "Sales AI",
    nextAction: "Send proposal",
    notes: "Interested in Office A052 with Sales AI and CRM.",
  },
  {
    id: 2,
    name: "E-commerce Startup",
    company: "NovaCart",
    source: "Website Chat",
    stage: "Qualified",
    value: 1800,
    owner: "Sales AI",
    nextAction: "Book demo",
    notes: "Needs virtual office, mailbox, Microsoft 365, and support AI.",
  },
  {
    id: 3,
    name: "Consulting Firm",
    company: "Atlas Advisory",
    source: "Referral",
    stage: "Proposal Sent",
    value: 3200,
    owner: "Executive Assistant AI",
    nextAction: "Follow up tomorrow",
    notes: "Wants meeting rooms and AI receptionist included.",
  },
  {
    id: 4,
    name: "Fintech Founder",
    company: "PayBridge Labs",
    source: "LinkedIn",
    stage: "Won",
    value: 5200,
    owner: "Sales AI",
    nextAction: "Onboard company",
    notes: "Signed premium plan with 7 AI employees.",
  },
];

const stages = ["New Lead", "Qualified", "Proposal Sent", "Won"];

export default function CRM() {
  const [selectedLead, setSelectedLead] = useState(leads[0]);

  const pipelineValue = leads.reduce((sum, lead) => sum + lead.value, 0);
  const wonValue = leads
    .filter((lead) => lead.stage === "Won")
    .reduce((sum, lead) => sum + lead.value, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="CRM" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">CRM</h1>
            <p className="text-slate-500 mt-1">
              Manage leads, sales pipeline, AI follow-ups, and customer records.
            </p>
          </div>

          <button className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold">
            + Add Lead
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="Total Leads" value={String(leads.length)} icon="👥" />
          <Stat title="Pipeline Value" value={`$${pipelineValue}`} icon="💰" />
          <Stat title="Won Revenue" value={`$${wonValue}`} icon="🏆" />
          <Stat title="AI Follow-ups" value="18" icon="🤖" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Sales Pipeline</h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
                {stages.map((stage) => (
                  <div key={stage} className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <h3 className="font-bold text-sm">{stage}</h3>

                    <div className="mt-4 space-y-3">
                      {leads
                        .filter((lead) => lead.stage === stage)
                        .map((lead) => (
                          <button
                            key={lead.id}
                            onClick={() => setSelectedLead(lead)}
                            className={`w-full text-left bg-white rounded-2xl border p-4 ${
                              selectedLead.id === lead.id
                                ? "border-violet-500"
                                : "border-slate-200"
                            }`}
                          >
                            <p className="font-bold text-sm">{lead.company}</p>
                            <p className="text-xs text-slate-500 mt-1">{lead.name}</p>
                            <p className="text-sm font-bold mt-3">${lead.value}</p>
                            <p className="text-xs text-violet-700 mt-1">{lead.owner}</p>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Lead Activity</h2>

              <div className="mt-5 space-y-3">
                <Activity text="Sales AI created lead from VoIP call" time="10:42 AM" />
                <Activity text="Executive Assistant AI booked demo meeting" time="10:15 AM" />
                <Activity text="Sales AI sent proposal to Atlas Advisory" time="09:58 AM" />
                <Activity text="Support AI answered product question from NovaCart" time="09:30 AM" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Selected Lead</h2>

              <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <p className="text-sm text-slate-500">Company</p>
                <h3 className="text-xl font-bold mt-1">{selectedLead.company}</h3>

                <p className="text-sm text-slate-500 mt-4">Contact</p>
                <p className="font-bold">{selectedLead.name}</p>

                <p className="text-sm text-slate-500 mt-4">Stage</p>
                <Badge stage={selectedLead.stage} />

                <p className="text-sm text-slate-500 mt-4">Deal Value</p>
                <p className="font-bold">${selectedLead.value}</p>

                <p className="text-sm text-slate-500 mt-4">Notes</p>
                <p className="text-sm text-slate-600">{selectedLead.notes}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button className="bg-violet-600 text-white py-3 rounded-xl font-bold">
                  AI Follow-up
                </button>

                <button className="border border-slate-200 py-3 rounded-xl font-bold">
                  Book Meeting
                </button>

                <button className="border border-slate-200 py-3 rounded-xl font-bold">
                  Send Proposal
                </button>

                <button className="border border-slate-200 py-3 rounded-xl font-bold">
                  Mark Won
                </button>
              </div>
            </div>

            <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Sales AI</h2>
              <p className="text-sm text-violet-100 mt-2">
                Sales AI is monitoring calls, website chats, and CRM pipeline.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <Mini title="Leads Created" value="38" />
                <Mini title="Meetings Booked" value="23" />
                <Mini title="Follow-ups" value="112" />
                <Mini title="Win Rate" value="31%" />
              </div>

              <button className="mt-5 w-full bg-white text-violet-700 py-3 rounded-xl font-bold">
                Configure Sales AI
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

function Activity({ text, time }: { text: string; time: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between">
      <p className="font-semibold text-sm">{text}</p>
      <p className="text-sm text-slate-500">{time}</p>
    </div>
  );
}

function Badge({ stage }: { stage: string }) {
  const styles =
    stage === "Won"
      ? "bg-green-100 text-green-700"
      : stage === "Proposal Sent"
      ? "bg-blue-100 text-blue-700"
      : stage === "Qualified"
      ? "bg-violet-100 text-violet-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${styles}`}>
      {stage}
    </span>
  );
}

function Mini({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-2xl p-3 text-center">
      <p className="text-xs text-violet-100">{title}</p>
      <p className="font-bold text-xl">{value}</p>
    </div>
  );
}