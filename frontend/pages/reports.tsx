import { useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";

const reportTypes = [
  {
    title: "Company Health Report",
    desc: "Overall business readiness, office status, documents, tasks, and operational health.",
    icon: "📊",
  },
  {
    title: "Compliance Report",
    desc: "Hermes compliance score, KYB status, missing documents, and risk notes.",
    icon: "🛡️",
  },
  {
    title: "AI Workforce Report",
    desc: "Sonny performance, AI employee activity, tasks completed, and productivity.",
    icon: "🤖",
  },
  {
    title: "Financial Report",
    desc: "Billing summary, subscriptions, monthly spend, taxes, and service usage.",
    icon: "💰",
  },
];

type ReportItem = {
  id: number;
  name: string;
  date: string;
  type: string;
  content: string;
};

const initialReports: ReportItem[] = [
  {
    id: 1,
    name: "Company Health Report",
    date: "Jun 23, 2026",
    type: "TXT",
    content:
      "Firmic Company Health Report\n\nCompany progress: 72%\nCompliance score: 40%\nAI workforce: 7 active agents\nMonthly spend: $723\n\nSummary: Company is operational, but compliance readiness needs improvement.",
  },
  {
    id: 2,
    name: "Compliance Report",
    date: "Jun 22, 2026",
    type: "TXT",
    content:
      "Firmic Compliance Report\n\nHermes score: 40%\nRisk level: Medium\nMissing items: KYB package, beneficial owner review\n\nRecommendation: Upload missing KYB documents and complete owner declaration.",
  },
  {
    id: 3,
    name: "AI Workforce Report",
    date: "Jun 21, 2026",
    type: "TXT",
    content:
      "Firmic AI Workforce Report\n\nActive AI agents: 7\nTasks today: 184\nCalls answered: 142\nUtilization: 91%\n\nSummary: Sonny workforce is active and operating normally.",
  },
  {
    id: 4,
    name: "Financial Report",
    date: "Jun 20, 2026",
    type: "TXT",
    content:
      "Firmic Financial Report\n\nMonthly spend: $723\nOffice rental: $99\nAI workforce: $423\nMailbox + VoIP: $48\nTaxes: 5%\n\nSummary: Subscription stack is active and predictable.",
  },
];

export default function Reports() {
  const [reports, setReports] = useState<ReportItem[]>(initialReports);
  const [activity, setActivity] = useState<string[]>([
    "Hermes generated compliance summary",
    "Sonny created company health snapshot",
    "Billing engine calculated monthly spend",
    "Documents module updated report inputs",
  ]);
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [notice, setNotice] = useState("");

  function todayLabel() {
    return new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function buildReportContent(name: string) {
    return `Firmic ${name}

Generated: ${new Date().toLocaleString()}

Company Snapshot
- Company progress: 72%
- Compliance score: 40%
- AI workforce: 7 active agents
- Monthly spend: $723
- Sonny status: Active
- Hermes status: Monitoring
- Documents: 1 approved
- Tasks: 5 total

Executive Summary
Firmic is monitoring operations, compliance, documents, billing, office infrastructure, and AI workforce activity.

Recommended Next Actions
1. Improve Hermes compliance score.
2. Upload missing KYB documents.
3. Complete pending onboarding tasks.
4. Generate weekly reports.
`;
  }

  function generateReport(name: string) {
    const newReport: ReportItem = {
      id: Date.now(),
      name,
      date: todayLabel(),
      type: "TXT",
      content: buildReportContent(name),
    };

    setReports((current) => [newReport, ...current]);

    setActivity((current) => [
      `${name} generated successfully`,
      ...current,
    ]);

    alert(`${name} generated successfully.`);
  }

  function downloadReport(report: ReportItem) {
    const blob = new Blob([report.content], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${report.name.replaceAll(" ", "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    setNotice(`${report.name} downloaded successfully.`);
    setTimeout(() => setNotice(""), 3000);
  }

  function downloadLatestByName(name: string) {
    const existing = reports.find((report) => report.name === name);

    if (existing) {
      downloadReport(existing);
      return;
    }

    const newReport: ReportItem = {
      id: Date.now(),
      name,
      date: todayLabel(),
      type: "TXT",
      content: buildReportContent(name),
    };

    setReports((current) => [newReport, ...current]);
    downloadReport(newReport);
  }

  function generateMainReport() {
    generateReport("Company Health Report");
  }

  function toggleAutomation() {
    setAutomationEnabled((current) => !current);

    setActivity((current) => [
      !automationEnabled
        ? "Weekly report automation enabled"
        : "Weekly report automation disabled",
      ...current,
    ]);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <FirmicSidebar active="Reports" />

      <main className="flex-1 p-6 xl:p-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Reports</h1>
            <p className="text-slate-500 mt-1">
              Generate company intelligence reports for operations, compliance,
              AI workforce, and billing.
            </p>
          </div>

          <button
            onClick={generateMainReport}
            className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold"
          >
            Generate Report
          </button>
        </header>
        {notice && (
            <div className="mt-6 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 font-bold">
          {notice}
  </div>
)}

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mt-8">
          <Stat title="Compliance Score" value="40%" icon="🛡️" />
          <Stat title="Company Progress" value="72%" icon="📈" />
          <Stat title="AI Workforce" value="7 Active" icon="🤖" />
          <Stat title="Monthly Spend" value="$723" icon="💰" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
          <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Report Types</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                {reportTypes.map((report) => (
                  <div
                    key={report.title}
                    className="bg-slate-50 border border-slate-200 rounded-3xl p-5"
                  >
                    <div className="text-4xl">{report.icon}</div>

                    <h3 className="text-xl font-bold mt-4">{report.title}</h3>

                    <p className="text-sm text-slate-500 mt-2 min-h-[66px]">
                      {report.desc}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mt-5">
                      <button
                        onClick={() => generateReport(report.title)}
                        className="bg-violet-600 text-white rounded-xl py-3 font-bold"
                      >
                        Generate
                      </button>

                      <button
                        onClick={() => downloadLatestByName(report.title)}
                        className="border border-slate-200 bg-white rounded-xl py-3 font-bold"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Recent Reports</h2>

              <div className="mt-5 space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-[1fr_130px_80px_110px] gap-3 items-center"
                  >
                    <div>
                      <p className="font-bold">{report.name}</p>
                      <p className="text-sm text-slate-500">
                        Generated report
                      </p>
                    </div>

                    <p className="text-sm text-slate-500">{report.date}</p>

                    <span className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold w-fit">
                      {report.type}
                    </span>

                    <button
                      onClick={() => downloadReport(report)}
                      className="border border-slate-200 bg-white rounded-xl py-2 font-bold"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Operational Activity</h2>

              <div className="mt-5 space-y-3">
                {activity.map((item, index) => (
                  <Activity key={`${item}-${index}`} text={item} />
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="bg-violet-600 text-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Firmic Intelligence</h2>

              <p className="text-violet-100 text-sm mt-2">
                Reports combine company data from Sonny, Hermes, documents,
                billing, office infrastructure, and AI workforce activity.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <DarkMini title="Reports" value={String(reports.length)} />
                <DarkMini title="Compliance" value="40%" />
                <DarkMini title="AI Agents" value="7" />
                <DarkMini title="Spend" value="$723" />
              </div>
            </div>

            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Recommended Reports</h2>

              <div className="space-y-3 mt-5">
                <Recommendation
                  text="Generate Hub71 Readiness Report"
                  onClick={() => generateReport("Hub71 Readiness Report")}
                />
                <Recommendation
                  text="Generate Compliance Improvement Plan"
                  onClick={() => generateReport("Compliance Improvement Plan")}
                />
                <Recommendation
                  text="Generate AI Workforce Productivity Report"
                  onClick={() =>
                    generateReport("AI Workforce Productivity Report")
                  }
                />
                <Recommendation
                  text="Generate Investor Demo Report"
                  onClick={() => generateReport("Investor Demo Report")}
                />
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold">Report Automation</h2>

              <p className="text-sm text-slate-500 mt-2">
                Schedule weekly reports for founders, operators, investors, and
                compliance reviewers.
              </p>

              <div className="mt-5 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-sm text-slate-500">Status</p>
                <p className="font-bold">
                  {automationEnabled ? "Weekly automation enabled" : "Not configured"}
                </p>
              </div>

              <button
                onClick={toggleAutomation}
                className="mt-5 w-full bg-violet-600 text-white rounded-xl py-3 font-bold"
              >
                {automationEnabled
                  ? "Disable Automation"
                  : "Configure Automation"}
              </button>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ title, value, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-500 mt-3">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function DarkMini({ title, value }: any) {
  return (
    <div className="bg-white/10 rounded-2xl p-4 text-center">
      <p className="text-xs text-violet-100">{title}</p>
      <p className="font-bold text-xl">{value}</p>
    </div>
  );
}

function Activity({ text }: any) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 font-semibold">
      {text}
    </div>
  );
}

function Recommendation({ text, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center text-left"
    >
      <span className="font-semibold">{text}</span>
      <span className="text-violet-700 font-bold">Generate</span>
    </button>
  );
}