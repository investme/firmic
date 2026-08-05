import { useEffect, useMemo, useState } from "react";

export type ProvisioningStep = {
  id: string;
  label: string;
  detail: string;
};

type ProvisioningScreenProps = {
  companyName: string;
  steps?: ProvisioningStep[];
  onComplete: () => void;
};

const defaultSteps: ProvisioningStep[] = [
  {
    id: "company",
    label: "Creating company",
    detail: "Establishing your Firmic company workspace.",
  },
  {
    id: "subscription",
    label: "Activating subscription",
    detail: "Applying your selected plan and billing profile.",
  },
  {
    id: "services",
    label: "Provisioning business services",
    detail: "Enabling the services included in your plan.",
  },
  {
    id: "workforce",
    label: "Preparing AI workforce",
    detail: "Initializing your available AI workforce capacity.",
  },
  {
    id: "sonny",
    label: "Initializing Sonny",
    detail: "Preparing your AI COO and Orchestrator.",
  },
  {
    id: "workspace",
    label: "Preparing workspace",
    detail: "Finalizing your Command Center and Launch Center.",
  },
];

export default function ProvisioningScreen({
  companyName,
  steps = defaultSteps,
  onComplete,
}: ProvisioningScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (steps.length === 0) {
      onComplete();
      return;
    }

    if (activeIndex >= steps.length) {
      const completionTimer = window.setTimeout(onComplete, 700);

      return () => {
        window.clearTimeout(completionTimer);
      };
    }

    const timer = window.setTimeout(() => {
      setActiveIndex((current) => current + 1);
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeIndex, onComplete, steps.length]);

  const progress = useMemo(() => {
    if (steps.length === 0) {
      return 100;
    }

    return Math.min(100, Math.round((activeIndex / steps.length) * 100));
  }, [activeIndex, steps.length]);

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-3xl">
          🚀
        </div>

        <p className="mt-6 text-sm font-bold text-violet-700">
          Firmic Provisioning
        </p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          Launching {companyName}.
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-slate-500">
          Firmic is configuring your company, subscription, business services,
          and AI operating workspace.
        </p>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-slate-700">
            Provisioning progress
          </span>
          <span className="font-bold text-violet-700">{progress}%</span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-violet-600 transition-all duration-500"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {steps.map((step, index) => {
          const complete = index < activeIndex;
          const active = index === activeIndex;
          const waiting = index > activeIndex;

          return (
            <div
              key={step.id}
              className={[
                "flex items-start gap-4 rounded-2xl border p-4 transition",
                complete
                  ? "border-emerald-200 bg-emerald-50"
                  : active
                    ? "border-violet-300 bg-violet-50"
                    : "border-slate-200 bg-white",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  complete
                    ? "bg-emerald-600 text-white"
                    : active
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-400",
                ].join(" ")}
              >
                {complete ? (
                  "✓"
                ) : active ? (
                  <span className="animate-pulse">•</span>
                ) : (
                  index + 1
                )}
              </div>

              <div className="min-w-0">
                <p
                  className={[
                    "font-bold",
                    complete
                      ? "text-emerald-900"
                      : active
                        ? "text-violet-950"
                        : "text-slate-500",
                  ].join(" ")}
                >
                  {step.label}
                </p>

                <p
                  className={[
                    "mt-1 text-sm leading-6",
                    complete
                      ? "text-emerald-700"
                      : active
                        ? "text-violet-700"
                        : "text-slate-400",
                  ].join(" ")}
                >
                  {step.detail}
                </p>

                {active && (
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-violet-600">
                    In progress
                  </p>
                )}

                {waiting && (
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-300">
                    Waiting
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-sm text-slate-400">
        Keep this page open while Firmic prepares your company.
      </p>
    </section>
  );
}
