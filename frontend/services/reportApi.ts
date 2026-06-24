export type ReportItem = {
  id: number;
  name: string;
  date: string;
  type: string;
  content: string;
};

export function buildReportContent(name: string) {
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

export function downloadReport(report: ReportItem) {
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
}