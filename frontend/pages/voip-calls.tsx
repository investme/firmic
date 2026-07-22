import { useEffect, useMemo, useState } from "react";

import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import SonnyAssistant from "../components/SonnyAssistant";

import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";
import { readCompanyStorage } from "../src/utils/companyStorage";

type Tab = "Overview" | "Calls" | "AI Reception";

type CallRecord = {
  id: string;
  caller: string;
  status: string;
  handledBy: string;
  durationSeconds: number;
  type: string;
  transcript: string;
  time: string;
  summary?: string;
  nextAction?: string;
  phone?: string;
};

const tabs: Tab[] = ["Overview", "Calls", "AI Reception"];

export default function VoipCalls() {
  const [workspace, setWorkspace] = useState(() => getActiveWorkspace());
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const sync = () => setWorkspace(getActiveWorkspace());
    sync();
    window.addEventListener(getWorkspaceChangedEventName(), sync);
    window.addEventListener("firmic-company-data-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(getWorkspaceChangedEventName(), sync);
      window.removeEventListener("firmic-company-data-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    loadCalls();
  }, [workspace?.id]);

  function loadCalls() {
    if (!workspace?.id) {
      setCalls([]);
      setSelectedCallId(null);
      return;
    }
    const stored = readCompanyStorage<CallRecord[]>("call_records", []);
    const safeCalls = Array.isArray(stored) ? stored : [];
    setCalls(safeCalls);
    setSelectedCallId((current) =>
      current && safeCalls.some((call) => call.id === current)
        ? current
        : safeCalls[0]?.id || null
    );
  }

  const headquarters = workspace?.headquarters;
  const companyName = workspace?.name || "Active Company";
  const hasHeadquarters = Boolean(headquarters?.office_code);
  const selectedCall = calls.find((call) => call.id === selectedCallId) || null;

  const answered = calls.filter((call) =>
    ["answered", "qualified", "completed"].includes(
      String(call.status || "").toLowerCase()
    )
  ).length;
  const missed = calls.filter(
    (call) => String(call.status || "").toLowerCase() === "missed"
  ).length;
  const aiHandled = calls.filter((call) =>
    String(call.handledBy || "").toLowerCase().includes("ai")
  ).length;

  const averageDuration = useMemo(() => {
    if (!calls.length) return "00:00";
    const seconds = Math.round(
      calls.reduce(
        (total, call) => total + Number(call.durationSeconds || 0),
        0
      ) / calls.length
    );
    return formatDuration(seconds);
  }, [calls]);

  const filteredCalls = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return calls;
    return calls.filter((call) =>
      [
        call.caller,
        call.phone,
        call.status,
        call.handledBy,
        call.type,
        call.transcript,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [calls, search]);

  const communicationHealth =
    calls.length === 0
      ? 100
      : Math.max(0, Math.round(((calls.length - missed) / calls.length) * 100));

  const assistantContext = buildCommunicationsContext({
    companyName,
    businessNumber: headquarters?.phone || "Not assigned",
    location: headquarters?.location || "No headquarters selected",
    calls,
    selectedCall,
    answered,
    missed,
    aiHandled,
    averageDuration,
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />
        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
            <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-violet-100/70 blur-3xl" />
            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Business Communications
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 xl:text-4xl">
                  Communication command center for {companyName}.
                </h1>
                <p className="mt-3 max-w-3xl leading-7 text-slate-500">
                  Manage calls, AI reception, transcripts, follow-ups, and business communication intelligence from one tenant-isolated workspace.
                </p>
              </div>
              <div className="min-w-[280px] rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Business Number</p>
                <p className="mt-2 text-xl font-black text-slate-950">{headquarters?.phone || "Not Assigned"}</p>
                <p className="mt-1 text-sm text-slate-500">{headquarters?.location || "No headquarters selected"}</p>
              </div>
            </div>
          </header>

          {!hasHeadquarters && (
            <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
              <p className="font-black">Headquarters activation required</p>
              <p className="mt-1 text-sm">Activate a headquarters before enabling a business number and AI reception.</p>
            </div>
          )}

          <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Stat title="Calls Today" value={String(calls.length)} detail="Tenant communication records" icon="☎️" />
            <Stat title="Answered" value={String(answered)} detail="Completed or qualified calls" icon="✅" />
            <Stat title="Handled by AI" value={String(aiHandled)} detail="AI receptionist coverage" icon="🤖" />
            <Stat title="Missed Calls" value={String(missed)} detail="Require review or follow-up" icon="⚠️" />
            <Stat title="Communication Health" value={`${communicationHealth}%`} detail={`Average duration ${averageDuration}`} icon="📡" />
          </section>

          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 sm:px-6">
              <div className="flex gap-2 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`whitespace-nowrap border-b-2 px-4 py-4 text-sm font-black transition ${
                      activeTab === tab
                        ? "border-violet-600 text-violet-700"
                        : "border-transparent text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {activeTab === "Overview" ? (
                <Overview
                  calls={calls}
                  selectedCall={selectedCall}
                  onSelectCall={setSelectedCallId}
                  onOpenCalls={() => setActiveTab("Calls")}
                  onOpenAI={() => setActiveTab("AI Reception")}
                />
              ) : activeTab === "Calls" ? (
                <CallsWorkspace
                  calls={filteredCalls}
                  selectedCall={selectedCall}
                  selectedCallId={selectedCallId}
                  search={search}
                  onSearch={setSearch}
                  onSelectCall={setSelectedCallId}
                />
              ) : (
                <SonnyAssistant
                  workspaceId={workspace?.id || ""}
                  companyName={companyName}
                  title="Sonny AI · Communications"
                  subtitle="Communications executive copilot"
                  storageKey="firmic_communications_sonny"
                  contextText={assistantContext}
                  onRefresh={loadCalls}
                  quickActions={[
                    {
                      id: "summary",
                      label: "Summarize selected call",
                      prompt: "Summarize the selected call, identify decisions, risks, commitments, and missing information. Do not invent facts.",
                    },
                    {
                      id: "follow-up",
                      label: "Draft follow-up",
                      prompt: "Draft a concise professional follow-up email for the selected call with a subject line and one clear next step.",
                    },
                    {
                      id: "task",
                      label: "Create next-action plan",
                      prompt: "Recommend the best next action after the selected call and provide three practical execution steps.",
                    },
                    {
                      id: "meeting",
                      label: "Prepare meeting brief",
                      prompt: "Prepare a meeting brief based only on the selected call transcript, including objective, attendees to confirm, agenda, and open questions.",
                    },
                  ]}
                />
              )}
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Overview({
  calls,
  selectedCall,
  onSelectCall,
  onOpenCalls,
  onOpenAI,
}: {
  calls: CallRecord[];
  selectedCall: CallRecord | null;
  onSelectCall: (id: string) => void;
  onOpenCalls: () => void;
  onOpenAI: () => void;
}) {
  const recent = calls.slice(0, 5);
  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_390px]">
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-violet-700">Live Overview</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Recent communication activity</h2>
          </div>
          <button type="button" onClick={onOpenCalls} className="w-fit rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800">
            Open Call History
          </button>
        </div>

        {recent.length === 0 ? (
          <EmptyState icon="☎️" title="No calls recorded" description="Calls received for this company will appear here with status, handling source, duration, and transcript." />
        ) : (
          <div className="mt-6 space-y-3">
            {recent.map((call) => (
              <CallRow key={call.id} call={call} selected={selectedCall?.id === call.id} onClick={() => onSelectCall(call.id)} />
            ))}
          </div>
        )}
      </section>

      <aside className="space-y-5">
        <section className="rounded-3xl bg-slate-950 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Selected Communication</p>
          {selectedCall ? (
            <>
              <h3 className="mt-3 text-2xl font-black">{selectedCall.caller}</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <DarkMetric title="Status" value={selectedCall.status || "Unknown"} />
                <DarkMetric title="Duration" value={formatDuration(selectedCall.durationSeconds)} />
                <DarkMetric title="Handled By" value={selectedCall.handledBy || "Not recorded"} />
                <DarkMetric title="Type" value={selectedCall.type || "Call"} />
              </div>
              <button type="button" onClick={onOpenAI} className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 font-black hover:bg-violet-700">
                Open Sonny Communications AI
              </button>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-300">Select a call to review transcript intelligence and prepare follow-up actions.</p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">AI Reception Readiness</p>
          <div className="mt-4 space-y-3">
            <ReadinessRow label="Business number" status="Ready" />
            <ReadinessRow label="Call transcription" status="Ready" />
            <ReadinessRow label="Sonny summaries" status="Ready" />
            <ReadinessRow label="External telephony provider" status="Integration ready" />
          </div>
        </section>
      </aside>
    </div>
  );
}

function CallsWorkspace({
  calls,
  selectedCall,
  selectedCallId,
  search,
  onSearch,
  onSelectCall,
}: {
  calls: CallRecord[];
  selectedCall: CallRecord | null;
  selectedCallId: string | null;
  search: string;
  onSearch: (value: string) => void;
  onSelectCall: (id: string) => void;
}) {
  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <section>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-violet-700">Calls</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Company call history</h2>
          </div>
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search caller, status, transcript..."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 lg:w-80"
          />
        </div>

        {calls.length === 0 ? (
          <EmptyState icon="🔎" title="No calls found" description="Change the search or wait for communication records to be added." />
        ) : (
          <div className="mt-6 space-y-3">
            {calls.map((call) => (
              <CallRow key={call.id} call={call} selected={selectedCallId === call.id} onClick={() => onSelectCall(call.id)} />
            ))}
          </div>
        )}
      </section>

      <aside className="2xl:sticky 2xl:top-6 2xl:self-start">
        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Call Intelligence</p>
          {selectedCall ? (
            <>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-950">{selectedCall.caller}</h3>
                  <p className="mt-1 text-sm text-slate-500">{selectedCall.time || "Time not recorded"}</p>
                </div>
                <StatusBadge value={selectedCall.status} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniMetric title="Duration" value={formatDuration(selectedCall.durationSeconds)} />
                <MiniMetric title="Handled By" value={selectedCall.handledBy || "Unknown"} />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Transcript</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedCall.transcript || "No transcript is available for this call."}</p>
              </div>

              {(selectedCall.summary || selectedCall.nextAction) && (
                <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-violet-700">Existing AI Intelligence</p>
                  {selectedCall.summary && <p className="mt-3 text-sm leading-6 text-slate-700">{selectedCall.summary}</p>}
                  {selectedCall.nextAction && <p className="mt-3 text-sm font-bold text-violet-800">Next action: {selectedCall.nextAction}</p>}
                </div>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm leading-6 text-slate-500">Select a call to inspect its transcript and communication metadata.</p>
          )}
        </section>
      </aside>
    </div>
  );
}

function CallRow({ call, selected, onClick }: { call: CallRecord; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
        selected ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 bg-white"
      }`}
    >
      <div className="grid gap-3 md:grid-cols-[1.4fr_130px_150px_100px_100px] md:items-center">
        <div>
          <p className="font-black text-slate-950">{call.caller}</p>
          <p className="mt-1 text-xs text-slate-500">{call.phone || call.time || "Communication record"}</p>
        </div>
        <StatusBadge value={call.status} />
        <p className="text-sm font-bold text-slate-600">{call.handledBy || "Not recorded"}</p>
        <p className="text-sm font-black text-slate-950">{formatDuration(call.durationSeconds)}</p>
        <p className="text-sm text-slate-500">{call.type || "Call"}</p>
      </div>
    </button>
  );
}

function buildCommunicationsContext({
  companyName,
  businessNumber,
  location,
  calls,
  selectedCall,
  answered,
  missed,
  aiHandled,
  averageDuration,
}: {
  companyName: string;
  businessNumber: string;
  location: string;
  calls: CallRecord[];
  selectedCall: CallRecord | null;
  answered: number;
  missed: number;
  aiHandled: number;
  averageDuration: string;
}) {
  const selected = selectedCall
    ? [
        `Caller: ${selectedCall.caller}`,
        `Phone: ${selectedCall.phone || "Not provided"}`,
        `Status: ${selectedCall.status || "Not provided"}`,
        `Handled by: ${selectedCall.handledBy || "Not provided"}`,
        `Duration: ${formatDuration(selectedCall.durationSeconds)}`,
        `Type: ${selectedCall.type || "Not provided"}`,
        `Time: ${selectedCall.time || "Not provided"}`,
        `Transcript: ${selectedCall.transcript || "Not available"}`,
        `Existing summary: ${selectedCall.summary || "Not available"}`,
        `Existing next action: ${selectedCall.nextAction || "Not available"}`,
      ].join("\n")
    : "No call is selected.";

  return [
    "You are Sonny, Firmic's AI Chief Operating Officer, working inside Business Communications.",
    "Use only the supplied company and communication data. Clearly identify missing information and do not invent facts.",
    "",
    `Company: ${companyName}`,
    `Business number: ${businessNumber}`,
    `Location: ${location}`,
    `Total calls: ${calls.length}`,
    `Answered calls: ${answered}`,
    `Calls handled by AI: ${aiHandled}`,
    `Missed calls: ${missed}`,
    `Average duration: ${averageDuration}`,
    "",
    "Selected call:",
    selected,
  ].join("\n");
}

function Stat({ title, value, detail, icon }: { title: string; value: string; detail: string; icon: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="mt-4 text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
  );
}

function DarkMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs font-bold text-slate-400">{title}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function MiniMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold text-slate-400">{title}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function ReadinessRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <span className="text-xs font-black text-emerald-600">{status}</span>
    </div>
  );
}

function StatusBadge({ value }: { value?: string }) {
  const normalized = String(value || "").toLowerCase();
  const tone =
    normalized === "missed"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : ["answered", "qualified", "completed"].includes(normalized)
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-600";
  return <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${tone}`}>{value || "Unknown"}</span>;
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="mt-3 font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}
