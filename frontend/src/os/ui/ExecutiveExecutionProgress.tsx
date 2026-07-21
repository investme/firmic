import {
  AIExecutionStage,
  AIExecutionStep,
} from "../ai/execution";

export function ExecutiveExecutionProgress({
  steps,
  stage,
}: {
  steps: AIExecutionStep[];
  stage: AIExecutionStage;
}) {
  const activeIndex = steps.findIndex(
    (step) => step.key === stage
  );

  return (
    <div className="mt-5 overflow-x-auto pb-1">
      <div className="flex min-w-[620px] items-start">
        {steps.map((step, index) => {
          const complete =
            stage === "completed" ||
            (activeIndex >= 0 && index < activeIndex);

          const active = step.key === stage;

          return (
            <div
              key={step.key}
              className="relative flex flex-1 flex-col items-center"
            >
              {index > 0 && (
                <div
                  className={`absolute right-1/2 top-[11px] h-[2px] w-full transition-all duration-500 ${
                    complete || active
                      ? "bg-violet-500"
                      : "bg-slate-200"
                  }`}
                />
              )}

              <div
                className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                  complete
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : active
                    ? "border-violet-600 bg-white shadow-[0_0_0_5px_rgba(124,58,237,0.12)]"
                    : "border-slate-300 bg-white"
                }`}
              >
                {complete ? (
                  <span className="text-[10px] font-black">
                    ✓
                  </span>
                ) : active ? (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-violet-600" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-slate-200" />
                )}
              </div>

              <p
                className={`mt-3 text-center text-[10px] font-black uppercase tracking-[0.12em] ${
                  active
                    ? "text-violet-700"
                    : complete
                    ? "text-emerald-700"
                    : "text-slate-400"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}