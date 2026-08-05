type ProgressStepperProps = {
  currentStep: number;
};

const steps = [
  {
    number: 1,
    label: "Choose Plan",
  },
  {
    number: 2,
    label: "Company",
  },
  {
    number: 3,
    label: "Review",
  },
];

export default function ProgressStepper({ currentStep }: ProgressStepperProps) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-start">
        {steps.map((step, index) => {
          const complete = currentStep > step.number;
          const active = currentStep === step.number;

          return (
            <div key={step.number} className="flex flex-1 items-start">
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition",
                    complete || active
                      ? "border-violet-600 bg-violet-600 text-white"
                      : "border-slate-300 bg-white text-slate-400",
                  ].join(" ")}
                >
                  {complete ? "✓" : step.number}
                </div>

                <p
                  className={[
                    "mt-2 text-center text-xs font-bold sm:text-sm",
                    complete || active ? "text-violet-700" : "text-slate-400",
                  ].join(" ")}
                >
                  {step.label}
                </p>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={[
                    "mt-5 h-0.5 flex-1",
                    currentStep > step.number
                      ? "bg-violet-600"
                      : "bg-slate-200",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
