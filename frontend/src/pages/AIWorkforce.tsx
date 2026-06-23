import AgentCard from "../components/AgentCard";
import { aiAgents } from "../data/aiAgents";

export default function AIWorkforce() {
  return (
    <div className="p-6 lg:p-10 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold">AI Workforce</h1>
      <p className="text-slate-500 mt-1">
        Hire AI employees to run your virtual office.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mt-8">
        {aiAgents.map((agent, index) => (
          <AgentCard
            key={agent.name}
            name={agent.name}
            price={agent.price}
            desc={agent.desc}
            active={index < 7}
          />
        ))}
      </div>
    </div>
  );
}