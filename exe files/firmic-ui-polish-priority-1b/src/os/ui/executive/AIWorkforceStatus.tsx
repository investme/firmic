export type WorkforceAgentCard = {
  id: string;
  name: string;
  role: string;
  status: "Online" | "Ready" | "Busy" | "Offline";
  activity: string;
};

function statusClasses(status: WorkforceAgentCard["status"]) {
  if (status === "Online" || status === "Ready") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "Busy") {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-slate-100 text-slate-500";
}

export function AIWorkforceStatus({
  agents,
}: {
  agents: WorkforceAgentCard[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
            AI Workforce
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-900">
            Workforce Status
          </h3>
        </div>

        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
          {agents.length} Active
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {agents.map((agent) => (
          <article
            key={agent.id}
            className="group rounded-2xl border border-slate-200 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-black text-slate-900">{agent.name}</h4>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {agent.role}
                </p>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${statusClasses(
                  agent.status
                )}`}
              >
                {agent.status}
              </span>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-600">
              {agent.activity}
            </p>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-3/4 rounded-full bg-violet-500 transition-all duration-500 group-hover:w-full" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
