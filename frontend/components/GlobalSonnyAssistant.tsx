import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import SonnyAssistant from "./SonnyAssistant";
import { getActiveWorkspace } from "../src/utils/workspaceContext";

type ActiveCompany = {
  id: string;
  name: string;
};

const HIDDEN_ROUTES = new Set([
  "/sonny",
  "/companies",
  "/create-company",
  "/onboarding",
  "/checkout",
  "/configure-office",
  "/awaiting-compliance",
  "/compliance-review",
]);

export default function GlobalSonnyAssistant() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState<ActiveCompany | null>(null);

  useEffect(() => {
    const workspace = getActiveWorkspace();

    if (!workspace?.id) {
      setCompany(null);
      return;
    }

    setCompany({
      id: String(workspace.id),
      name: String(workspace.name || "Active Company"),
    });
  }, [router.asPath]);

  useEffect(() => {
    setOpen(false);
  }, [router.pathname]);

  if (!router.isReady) return null;
  if (HIDDEN_ROUTES.has(router.pathname)) return null;
  if (!company?.id) return null;

  return (
    <>
      {open && (
        <div className="fixed bottom-36 left-3 right-3 z-[70] sm:left-auto sm:right-6 sm:w-[420px] xl:bottom-24">
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100">
                  <Image
                    src="/agents/sonny-canonical-v1.png"
                    alt="Sonny"
                    width={40}
                    height={40}
                    unoptimized
                    className="h-full w-full object-cover object-top"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    Ask Sonny
                  </p>

                  <p className="truncate text-[11px] font-semibold text-emerald-600">
                    ● Ready for {company.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Ask Sonny"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                ×
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-4">
              <SonnyAssistant
                workspaceId={company.id}
                companyName={company.name}
                title="What should we work on?"
                subtitle="Company executive & workforce orchestrator"
                storageKey={`firmic_global_sonny_${company.id}`}
                contextText={`You are operating from Firmic's global Ask Sonny interface for ${company.name}. Use company-aware executive context. Help the founder understand priorities, coordinate work, and use only authorized Firmic actions. Do not invent company facts.`}
                quickActions={[
                  {
                    id: "today",
                    label: "Today's priorities",
                    prompt:
                      "Review my company context and tell me the most important priorities requiring my attention today. Do not invent missing facts.",
                  },
                  {
                    id: "risks",
                    label: "Review risks",
                    prompt:
                      "Review available company context and identify the most important current risks, blockers, or unresolved decisions. Do not invent missing facts.",
                  },
                  {
                    id: "delegate",
                    label: "Coordinate workforce",
                    prompt:
                      "Based on available company context, tell me what work should be delegated to my Agentic AI Workforce and which specialist should handle each task. Do not execute anything requiring confirmation without my approval.",
                  },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close Ask Sonny" : "Open Ask Sonny"}
        aria-expanded={open}
        className="fixed bottom-24 right-5 z-[69] flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1.5 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl sm:bottom-24 sm:right-5 sm:py-2 sm:pl-2 sm:pr-4 xl:bottom-6 xl:right-6"
      >
        <span className="h-10 w-10 overflow-hidden rounded-full bg-slate-100">
          <Image
            src="/agents/sonny-canonical-v1.png"
            alt="Sonny"
            width={40}
            height={40}
            unoptimized
            className="h-full w-full object-cover object-top"
          />
        </span>

        <span className="hidden text-left sm:block">
          <span className="block text-xs font-bold text-slate-900">
            Ask Sonny
          </span>

          <span className="block text-[10px] font-semibold text-emerald-600">
            ● Ready
          </span>
        </span>
      </button>
    </>
  );
}
