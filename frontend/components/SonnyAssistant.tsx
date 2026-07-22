import { useRef, useState } from "react";
import { useRouter } from "next/router";

import {
  sendSonnyChat,
  SonnyPlan,
} from "../services/sonnyChat";
import {
  executeSonnyActions,
  SonnyAction,
} from "../src/utils/sonnyActionExecutor";
import { useFirmicAIVoice } from "../src/os/ai/hooks";
import { useAIConversation } from "../src/os/ai/chat";

export type SonnyAssistantQuickAction = {
  id: string;
  label: string;
  prompt: string;
};

type SonnyAssistantProps = {
  workspaceId: string;
  companyName: string;
  title?: string;
  subtitle?: string;
  storageKey?: string;
  contextText?: string;
  quickActions?: SonnyAssistantQuickAction[];
  onRefresh?: () => void | Promise<void>;
};

function formatPlanTitle(plan: SonnyPlan | null) {
  if (!plan?.action) return "Executive action";
  return String(plan.action)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPlanDetail(plan: SonnyPlan | null) {
  if (!plan) return "";
  const parameters = plan.parameters || {};
  const values = Object.entries(parameters)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 5)
    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${String(value)}`);

  return values.length
    ? values.join(" · ")
    : String(plan.reason || "Sonny is ready to execute this action.");
}

export default function SonnyAssistant({
  workspaceId,
  companyName,
  title = "Sonny AI",
  subtitle = "AI executive assistant",
  storageKey,
  contextText = "",
  quickActions = [],
  onRefresh,
}: SonnyAssistantProps) {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);

  const [command, setCommand] = useState("");
  const [working, setWorking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [pendingPlan, setPendingPlan] = useState<SonnyPlan | null>(null);

  const {
    listening,
    speaking,
    speak,
    startListening: startVoiceListening,
    stopListening,
    stopVoice,
  } = useFirmicAIVoice({
    enabled: voiceEnabled,
    onTranscript: setCommand,
    onFinalTranscript: (transcript) => {
      void processCommand(transcript);
    },
    onWarning: setWarning,
    onBeforeListening: () => {
      abortRef.current?.abort();
      stopStreaming();
    },
  });

  const {
    messages,
    streamingMessageId,
    chatEndRef,
    addMessage,
    reply,
    stopStreaming,
    clearConversation,
  } = useAIConversation({
    storageKey:
      workspaceId && storageKey
        ? `${storageKey}_${workspaceId}`
        : workspaceId
          ? `firmic_sonny_embedded_${workspaceId}`
          : null,
    initialMessages: workspaceId
      ? [
          {
            id: `sonny-embedded-welcome-${workspaceId}`,
            role: "sonny",
            text: `I am online for ${companyName}. Ask me about the customer portfolio, pipeline, follow-ups, proposals, or the next commercial action.`,
            createdAt: new Date().toISOString(),
          },
        ]
      : [],
    speak,
    maxStoredMessages: 60,
    streamIntervalMs: 28,
  });

  function stopEverything() {
    abortRef.current?.abort();
    abortRef.current = null;
    stopListening();
    stopVoice();
    stopStreaming();
    setWorking(false);
    setNotice("Operation interrupted.");
  }

  function startListening() {
    setWarning("");
    stopStreaming();
    startVoiceListening();
  }

  function buildPrompt(userPrompt: string) {
    return [
      contextText.trim(),
      "",
      "Current user request:",
      userPrompt.trim(),
      "",
      "Respond as Sonny, Firmic's AI Chief Operating Officer.",
      "Be concise, practical, and explicit when required information is missing.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function executePendingPlan() {
    if (!workspaceId || !pendingPlan || working) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setWorking(true);
    setWarning("");
    setNotice("Executing approved action...");

    try {
      const response = await sendSonnyChat(
        workspaceId,
        "Confirm executive action",
        {
          confirmed: true,
          plan: pendingPlan,
          signal: controller.signal,
        }
      );

      setPendingPlan(null);
      setNotice("Executive action completed.");
      reply(response.reply, response.speech || response.reply);
      await onRefresh?.();
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      const message =
        error?.message || "Sonny could not execute the approved action.";
      setWarning(message);
      reply(`I could not complete the action. ${message}`);
    } finally {
      abortRef.current = null;
      setWorking(false);
    }
  }

  async function processCommand(raw?: string) {
    const clean = (raw ?? command).trim();
    if (!clean || !workspaceId || working) return;

    addMessage("user", clean);
    setCommand("");
    setWarning("");
    setNotice("");

    const normalized = clean.toLowerCase();

    if (["confirm", "yes confirm", "proceed"].includes(normalized)) {
      if (pendingPlan) {
        await executePendingPlan();
      } else {
        reply("There is no pending action to confirm.");
      }
      return;
    }

    if (["cancel", "cancel action"].includes(normalized)) {
      setPendingPlan(null);
      setNotice("Pending action cancelled.");
      reply("The pending action has been cancelled.");
      return;
    }

    if (normalized === "clear conversation") {
      clearConversation();
      stopVoice();
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setWorking(true);
    setNotice("Reviewing Customer Hub intelligence...");

    try {
      const response = await sendSonnyChat(
        workspaceId,
        buildPrompt(clean),
        { signal: controller.signal }
      );

      if (response.actions?.length) {
        reply(response.reply, response.speech || response.reply);

        await executeSonnyActions(response.actions as SonnyAction[], {
          router,
          frontendActions: {
            refresh: async () => {
              await onRefresh?.();
            },
            start_listening: startListening,
            stop_speaking: () => {
              stopVoice();
              stopStreaming();
            },
            scroll_to_bottom: () =>
              chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          },
        });

        setNotice("");
        return;
      }

      if (
        response.has_action &&
        response.requires_confirmation &&
        response.plan?.action
      ) {
        setPendingPlan(response.plan);
        setNotice("Sonny prepared an action and is awaiting confirmation.");
      } else {
        setPendingPlan(null);
        setNotice("");
      }

      reply(response.reply, response.speech || response.reply);
      await onRefresh?.();
    } catch (error: any) {
      if (error?.name === "AbortError") {
        setNotice("Request interrupted.");
        return;
      }

      const message =
        error?.message || "Sonny could not complete the request.";
      setWarning(message);
      reply(`I could not complete that request. ${message}`);
    } finally {
      abortRef.current = null;
      setWorking(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="bg-slate-950 p-5 text-white sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-2xl font-black shadow-lg">
              S
              <span
                className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-slate-950 ${
                  listening
                    ? "animate-pulse bg-rose-500"
                    : speaking
                      ? "animate-pulse bg-violet-400"
                      : working
                        ? "animate-pulse bg-amber-400"
                        : "bg-emerald-400"
                }`}
              />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
                {title}
              </p>
              <h2 className="mt-1 text-2xl font-black">{subtitle}</h2>
              <p className="mt-1 text-sm text-slate-300">
                {listening
                  ? "Listening..."
                  : speaking
                    ? "Speaking..."
                    : working
                      ? "Processing..."
                      : `Online for ${companyName}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setVoiceEnabled((value) => !value)}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold transition hover:bg-white/10"
            >
              {voiceEnabled ? "🔊 Voice enabled" : "🔇 Voice muted"}
            </button>

            {(working || listening || speaking || streamingMessageId) && (
              <button
                type="button"
                onClick={stopEverything}
                className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-400/20"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </header>

      {(warning || notice) && (
        <div className="space-y-2 border-b border-slate-200 p-4">
          {warning && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {warning}
            </div>
          )}
          {notice && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700">
              {notice}
            </div>
          )}
        </div>
      )}

      <div className="grid min-h-[560px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            Quick actions
          </p>

          <div className="mt-3 space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => void processCommand(action.prompt)}
                disabled={!workspaceId || working}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              clearConversation();
              stopVoice();
            }}
            className="mt-4 w-full rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Clear conversation
          </button>
        </aside>

        <section className="flex min-w-0 flex-col p-4 sm:p-5">
          <div className="h-[360px] space-y-4 overflow-y-auto pr-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl px-4 py-3 shadow-sm ${
                    message.role === "user"
                      ? "rounded-br-md bg-violet-600 text-white"
                      : message.role === "system"
                        ? "border border-amber-200 bg-amber-50 text-amber-800"
                        : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {message.text}
                    {streamingMessageId === message.id && (
                      <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-full bg-violet-500 align-middle" />
                    )}
                  </p>
                </div>
              </div>
            ))}

            {working && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:120ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:240ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {pendingPlan && (
            <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-violet-700">
                Approval required
              </p>
              <p className="mt-2 font-black text-slate-950">
                {formatPlanTitle(pendingPlan)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {formatPlanDetail(pendingPlan)}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => void executePendingPlan()}
                  disabled={working}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  Confirm and execute
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingPlan(null);
                    setNotice("Pending action cancelled.");
                  }}
                  disabled={working}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <textarea
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void processCommand();
                }
              }}
              placeholder="Ask Sonny about this customer, deal, follow-up, proposal, or next action..."
              className="min-h-[88px] w-full resize-none bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={listening ? stopListening : startListening}
                  disabled={!voiceEnabled || !workspaceId || working}
                  className={`rounded-xl px-4 py-2.5 text-sm font-black transition disabled:opacity-50 ${
                    listening
                      ? "bg-rose-600 text-white hover:bg-rose-700"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700"
                  }`}
                >
                  {listening ? "■ Stop listening" : "🎤 Speak to Sonny"}
                </button>

                {speaking && (
                  <button
                    type="button"
                    onClick={stopVoice}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Stop speaking
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => void processCommand()}
                disabled={!workspaceId || !command.trim() || working}
                className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-violet-700 disabled:bg-slate-300"
              >
                {working ? "Thinking..." : "Send"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
