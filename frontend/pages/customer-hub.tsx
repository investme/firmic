import { useEffect, useMemo, useState } from "react";
import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";
import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";
import {
  readCompanyStorage,
  writeCompanyStorage,
} from "../src/utils/companyStorage";

type OpportunityStage =
  | "New Lead"
  | "Qualified"
  | "Proposal Sent"
  | "Won";

type Opportunity = {
  id: string;
  name: string;
  company: string;
  stage: OpportunityStage;
  value: number;
};

type Customer = {
  id: string;
  name: string;
  primaryContact: string;
  opportunities: number;
  pipelineValue: number;
  status: "Prospect" | "Active";
};

type Tab =
  | "Overview"
  | "Customers"
  | "Opportunities"
  | "Tickets"
  | "Activity"
  | "Reports";

const stages: OpportunityStage[] = [
  "New Lead",
  "Qualified",
  "Proposal Sent",
  "Won",
];

const tabs: Tab[] = [
  "Overview",
  "Customers",
  "Opportunities",
  "Tickets",
  "Activity",
  "Reports",
];

export default function CustomerHub() {
  const [workspace, setWorkspace] = useState(() =>
    getActiveWorkspace()
  );
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [showOpportunityForm, setShowOpportunityForm] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    company: "",
    value: "0",
  });

  useEffect(() => {
    const sync = () => setWorkspace(getActiveWorkspace());

    sync();
    window.addEventListener(getWorkspaceChangedEventName(), sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(
        getWorkspaceChangedEventName(),
        sync
      );
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const stored = workspace?.id
      ? readCompanyStorage<Opportunity[]>(
          "crm_opportunities",
          []
        )
      : [];

    setOpportunities(stored);
    setSelectedId(stored[0]?.id || null);
  }, [workspace?.id]);

  const selected =
    opportunities.find(
      (opportunity) => opportunity.id === selectedId
    ) || null;

  const pipelineValue = useMemo(
    () =>
      opportunities.reduce(
        (sum, opportunity) => sum + opportunity.value,
        0
      ),
    [opportunities]
  );

  const wonValue = useMemo(
    () =>
      opportunities
        .filter(
          (opportunity) => opportunity.stage === "Won"
        )
        .reduce(
          (sum, opportunity) => sum + opportunity.value,
          0
        ),
    [opportunities]
  );

  const customers = useMemo<Customer[]>(() => {
    const byCompany = new Map<string, Customer>();

    opportunities.forEach((opportunity) => {
      const key = opportunity.company.trim().toLowerCase();
      const existing = byCompany.get(key);

      if (existing) {
        existing.opportunities += 1;
        existing.pipelineValue += opportunity.value;
        if (opportunity.stage === "Won") {
          existing.status = "Active";
        }
        return;
      }

      byCompany.set(key, {
        id: key,
        name: opportunity.company,
        primaryContact: opportunity.name,
        opportunities: 1,
        pipelineValue: opportunity.value,
        status:
          opportunity.stage === "Won" ? "Active" : "Prospect",
      });
    });

    return Array.from(byCompany.values());
  }, [opportunities]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.primaryContact.toLowerCase().includes(query)
    );
  }, [customers, search]);

  const openOpportunities = opportunities.filter(
    (opportunity) => opportunity.stage !== "Won"
  ).length;

  const wonCount = opportunities.filter(
    (opportunity) => opportunity.stage === "Won"
  ).length;

  const winRate =
    opportunities.length > 0
      ? Math.round((wonCount / opportunities.length) * 100)
      : 0;

  function persist(next: Opportunity[]) {
    writeCompanyStorage("crm_opportunities", next);
    setOpportunities(next);
  }

  function addOpportunity() {
    if (!form.name.trim() || !form.company.trim()) return;

    const opportunity: Opportunity = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      company: form.company.trim(),
      stage: "New Lead",
      value: Number(form.value) || 0,
    };

    persist([...opportunities, opportunity]);
    setSelectedId(opportunity.id);
    setForm({
      name: "",
      company: "",
      value: "0",
    });
    setShowOpportunityForm(false);
    setActiveTab("Opportunities");
  }

  function moveOpportunity(
    opportunityId: string,
    stage: OpportunityStage
  ) {
    const next = opportunities.map((opportunity) =>
      opportunity.id === opportunityId
        ? { ...opportunity, stage }
        : opportunity
    );

    persist(next);
  }

  function deleteOpportunity(opportunityId: string) {
    const next = opportunities.filter(
      (opportunity) => opportunity.id !== opportunityId
    );

    persist(next);

    if (selectedId === opportunityId) {
      setSelectedId(next[0]?.id || null);
    }
  }

  const companyName =
    workspace?.name || "Active Company";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        <FirmicSidebar />

        <main className="flex-1 min-w-0 p-6 xl:p-8">
          <header className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Customer Hub
              </div>

              <h1 className="text-3xl xl:text-4xl font-bold text-slate-950 mt-3">
                Customer intelligence for {companyName}.
              </h1>

              <p className="text-slate-500 mt-3 max-w-3xl">
                Manage customer relationships, communications,
                opportunities, and AI-assisted support from one
                intelligent workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("Customers")}
                className="border border-slate-200 bg-white text-slate-700 px-5 py-3 rounded-xl font-bold hover:border-violet-300 hover:text-violet-700 transition"
              >
                + New Customer
              </button>

              <button
                type="button"
                onClick={() => setShowOpportunityForm(true)}
                className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-violet-700 transition"
              >
                + New Opportunity
              </button>
            </div>
          </header>

          {showOpportunityForm && (
            <section className="mt-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-violet-700">
                    New Opportunity
                  </p>
                  <h2 className="text-xl font-bold text-slate-950 mt-1">
                    Add a customer opportunity
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowOpportunityForm(false)}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Close opportunity form"
                >
                  ✕
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-5">
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="Primary contact"
                  className="border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />

                <input
                  value={form.company}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      company: event.target.value,
                    })
                  }
                  placeholder="Customer company"
                  className="border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />

                <input
                  type="number"
                  min="0"
                  value={form.value}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      value: event.target.value,
                    })
                  }
                  placeholder="Deal value"
                  className="border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
              </div>

              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  type="button"
                  onClick={addOpportunity}
                  className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-violet-700 transition"
                >
                  Save Opportunity
                </button>

                <button
                  type="button"
                  onClick={() => setShowOpportunityForm(false)}
                  className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mt-8">
            <Stat
              title="Customers"
              value={String(customers.length)}
              detail="Unique customer accounts"
              icon="👥"
            />
            <Stat
              title="Open Opportunities"
              value={String(openOpportunities)}
              detail="Across the active pipeline"
              icon="📈"
            />
            <Stat
              title="Pipeline Value"
              value={money(pipelineValue)}
              detail="Total opportunity value"
              icon="💰"
            />
            <Stat
              title="Closed Revenue"
              value={money(wonValue)}
              detail="Recorded won revenue"
              icon="🏆"
            />
            <Stat
              title="Win Rate"
              value={`${winRate}%`}
              detail="Current conversion rate"
              icon="🎯"
            />
            <Stat
              title="AI Actions Today"
              value="0"
              detail="Sonny recommendations"
              icon="🤖"
            />
          </section>

          <section className="mt-8 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="border-b border-slate-200 px-4 sm:px-6">
              <div className="flex gap-2 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition ${
                      activeTab === tab
                        ? "border-violet-600 text-violet-700"
                        : "border-transparent text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="p-5 sm:p-6 min-w-0">
                {activeTab === "Overview" && (
                  <Overview
                    opportunities={opportunities}
                    customers={customers}
                    pipelineValue={pipelineValue}
                    wonValue={wonValue}
                    onOpenCustomers={() =>
                      setActiveTab("Customers")
                    }
                    onOpenOpportunities={() =>
                      setActiveTab("Opportunities")
                    }
                  />
                )}

                {activeTab === "Customers" && (
                  <CustomersView
                    customers={filteredCustomers}
                    search={search}
                    onSearch={setSearch}
                  />
                )}

                {activeTab === "Opportunities" && (
                  <OpportunityBoard
                    opportunities={opportunities}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                )}

                {activeTab === "Tickets" && (
                  <EmptyModule
                    icon="🎫"
                    title="No support tickets"
                    description="Support ticket management will be connected in the next Customer Hub sprint."
                    action="Create First Ticket"
                  />
                )}

                {activeTab === "Activity" && (
                  <ActivityView
                    opportunities={opportunities}
                  />
                )}

                {activeTab === "Reports" && (
                  <ReportsView
                    customers={customers.length}
                    opportunities={opportunities.length}
                    pipelineValue={pipelineValue}
                    wonValue={wonValue}
                    winRate={winRate}
                  />
                )}
              </div>

              <aside className="border-t 2xl:border-t-0 2xl:border-l border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                <SonnyPanel
                  companyName={companyName}
                  selected={selected}
                  openOpportunities={openOpportunities}
                  pipelineValue={pipelineValue}
                  winRate={winRate}
                  onMove={moveOpportunity}
                  onDelete={deleteOpportunity}
                />
              </aside>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Overview({
  opportunities,
  customers,
  pipelineValue,
  wonValue,
  onOpenCustomers,
  onOpenOpportunities,
}: {
  opportunities: Opportunity[];
  customers: Customer[];
  pipelineValue: number;
  wonValue: number;
  onOpenCustomers: () => void;
  onOpenOpportunities: () => void;
}) {
  const recent = [...opportunities].slice(-4).reverse();

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-violet-700">
            Executive Overview
          </p>
          <h2 className="text-2xl font-bold text-slate-950 mt-1">
            Customer operations at a glance
          </h2>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onOpenCustomers}
            className="border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50"
          >
            View Customers
          </button>
          <button
            type="button"
            onClick={onOpenOpportunities}
            className="bg-slate-950 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800"
          >
            Open Pipeline
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mt-6">
        <InsightCard
          title="Customer Base"
          value={String(customers.length)}
          detail={
            customers.length
              ? "Customer accounts are connected to active opportunities."
              : "Create your first customer opportunity to begin."
          }
        />
        <InsightCard
          title="Pipeline"
          value={money(pipelineValue)}
          detail={`${opportunities.length} total opportunities recorded.`}
        />
        <InsightCard
          title="Won Revenue"
          value={money(wonValue)}
          detail="Revenue from opportunities marked as won."
        />
      </div>

      <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-950">
            Recent Customer Activity
          </h3>
        </div>

        {recent.length === 0 ? (
          <div className="p-6 text-slate-500">
            No customer activity has been recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {recent.map((opportunity) => (
              <div
                key={opportunity.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <p className="font-bold text-slate-950">
                    {opportunity.company}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {opportunity.name} · {opportunity.stage}
                  </p>
                </div>
                <p className="font-bold text-slate-950">
                  {money(opportunity.value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CustomersView({
  customers,
  search,
  onSearch,
}: {
  customers: Customer[];
  search: string;
  onSearch: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-violet-700">
            Customers
          </p>
          <h2 className="text-2xl font-bold text-slate-950 mt-1">
            Customer accounts
          </h2>
        </div>

        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search customers..."
          className="w-full lg:w-72 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.5fr_1fr_120px_140px_110px] gap-4 px-5 py-3 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
          <span>Customer</span>
          <span>Primary Contact</span>
          <span>Opportunities</span>
          <span>Pipeline</span>
          <span>Status</span>
        </div>

        {customers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl">👥</div>
            <h3 className="font-bold text-slate-950 mt-3">
              No customers found
            </h3>
            <p className="text-slate-500 mt-2">
              Add an opportunity to create the first customer account.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_120px_140px_110px] gap-3 md:gap-4 px-5 py-4 items-center"
              >
                <div>
                  <p className="font-bold text-slate-950">
                    {customer.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Customer workspace
                  </p>
                </div>
                <p className="text-sm text-slate-600">
                  {customer.primaryContact}
                </p>
                <p className="font-bold text-slate-900">
                  {customer.opportunities}
                </p>
                <p className="font-bold text-slate-900">
                  {money(customer.pipelineValue)}
                </p>
                <StatusBadge status={customer.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OpportunityBoard({
  opportunities,
  selectedId,
  onSelect,
}: {
  opportunities: Opportunity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div>
        <p className="text-sm font-bold text-violet-700">
          Opportunities
        </p>
        <h2 className="text-2xl font-bold text-slate-950 mt-1">
          Revenue pipeline
        </h2>
        <p className="text-slate-500 mt-2">
          Select an opportunity to manage it from the Sonny
          Customer Assistant panel.
        </p>
      </div>

      {opportunities.length === 0 ? (
        <div className="mt-6">
          <EmptyModule
            icon="📈"
            title="No opportunities yet"
            description="Add your first opportunity to start building the customer pipeline."
            action="Use New Opportunity"
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
          {stages.map((stage) => {
            const items = opportunities.filter(
              (opportunity) => opportunity.stage === stage
            );

            return (
              <section
                key={stage}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[280px]"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">
                    {stage}
                  </h3>
                  <span className="rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-500">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-3 mt-4">
                  {items.map((opportunity) => (
                    <button
                      key={opportunity.id}
                      type="button"
                      onClick={() => onSelect(opportunity.id)}
                      className={`w-full text-left bg-white border rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${
                        selectedId === opportunity.id
                          ? "border-violet-500 ring-2 ring-violet-100"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-950">
                            {opportunity.company}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {opportunity.name}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400">
                          •••
                        </span>
                      </div>

                      <p className="text-lg font-bold text-slate-950 mt-4">
                        {money(opportunity.value)}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActivityView({
  opportunities,
}: {
  opportunities: Opportunity[];
}) {
  const items = [...opportunities].reverse();

  return (
    <div>
      <p className="text-sm font-bold text-violet-700">
        Activity
      </p>
      <h2 className="text-2xl font-bold text-slate-950 mt-1">
        Customer timeline
      </h2>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyModule
            icon="🕒"
            title="No customer activity"
            description="Customer and opportunity events will appear here."
            action="Activity Ready"
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((opportunity, index) => (
            <div
              key={opportunity.id}
              className="border border-slate-200 rounded-2xl p-5 flex gap-4"
            >
              <div className="h-10 w-10 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                {index + 1}
              </div>
              <div>
                <p className="font-bold text-slate-950">
                  {opportunity.company} opportunity
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {opportunity.name} · {opportunity.stage} ·{" "}
                  {money(opportunity.value)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsView({
  customers,
  opportunities,
  pipelineValue,
  wonValue,
  winRate,
}: {
  customers: number;
  opportunities: number;
  pipelineValue: number;
  wonValue: number;
  winRate: number;
}) {
  const averageDeal =
    opportunities > 0 ? pipelineValue / opportunities : 0;

  return (
    <div>
      <p className="text-sm font-bold text-violet-700">
        Reports
      </p>
      <h2 className="text-2xl font-bold text-slate-950 mt-1">
        Customer performance
      </h2>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
        <InsightCard
          title="Customer Growth Base"
          value={String(customers)}
          detail="Unique customer accounts in this workspace."
        />
        <InsightCard
          title="Average Deal Size"
          value={money(averageDeal)}
          detail="Average value across all opportunities."
        />
        <InsightCard
          title="Win Rate"
          value={`${winRate}%`}
          detail={`${money(wonValue)} in recorded won revenue.`}
        />
      </div>
    </div>
  );
}

function SonnyPanel({
  companyName,
  selected,
  openOpportunities,
  pipelineValue,
  winRate,
  onMove,
  onDelete,
}: {
  companyName: string;
  selected: Opportunity | null;
  openOpportunities: number;
  pipelineValue: number;
  winRate: number;
  onMove: (
    opportunityId: string,
    stage: OpportunityStage
  ) => void;
  onDelete: (opportunityId: string) => void;
}) {
  return (
    <div className="2xl:sticky 2xl:top-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-violet-600 text-white flex items-center justify-center text-xl shadow-sm">
          S
        </div>
        <div>
          <p className="font-bold text-slate-950">
            Sonny Customer Assistant
          </p>
          <p className="text-xs text-emerald-600 font-bold mt-0.5">
            ● Online for {companyName}
          </p>
        </div>
      </div>

      <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Executive Insight
        </p>
        <p className="text-sm text-slate-600 leading-6 mt-3">
          {openOpportunities > 0
            ? `${openOpportunities} open opportunities represent ${money(
                pipelineValue
              )} in total pipeline value. The current recorded win rate is ${winRate}%.`
            : "No active customer opportunities require attention. Create an opportunity to begin customer intelligence."}
        </p>
      </div>

      <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Selected Opportunity
        </p>

        {selected ? (
          <>
            <h3 className="text-xl font-bold text-slate-950 mt-3">
              {selected.company}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {selected.name}
            </p>
            <p className="text-2xl font-bold text-slate-950 mt-4">
              {money(selected.value)}
            </p>

            <label className="block text-xs font-bold text-slate-500 mt-5">
              Pipeline Stage
            </label>
            <select
              value={selected.stage}
              onChange={(event) =>
                onMove(
                  selected.id,
                  event.target.value as OpportunityStage
                )
              }
              className="w-full mt-2 border border-slate-200 rounded-xl px-3 py-3 bg-white outline-none focus:border-violet-500"
            >
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => onDelete(selected.id)}
              className="w-full mt-3 border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 rounded-xl font-bold hover:bg-rose-100 transition"
            >
              Delete Opportunity
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-500 mt-3">
            Select an opportunity from the pipeline to review and
            manage it here.
          </p>
        )}
      </div>

      <div className="mt-4 bg-slate-950 text-white rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-300">
          AI Quick Actions
        </p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          {[
            "Summarize",
            "Draft Email",
            "Next Action",
            "Proposal",
          ].map((action) => (
            <button
              key={action}
              type="button"
              className="rounded-xl bg-white/10 px-3 py-3 text-xs font-bold hover:bg-white/15 transition"
            >
              {action}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 leading-5 mt-4">
          These actions are prepared for Sonny backend integration
          in the AI sprint.
        </p>
      </div>
    </div>
  );
}

function EmptyModule({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <div className="border border-dashed border-slate-300 rounded-2xl p-8 text-center">
      <div className="text-4xl">{icon}</div>
      <h3 className="font-bold text-slate-950 mt-3">
        {title}
      </h3>
      <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">
        {description}
      </p>
      <span className="inline-flex mt-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
        {action}
      </span>
    </div>
  );
}

function Stat({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: string;
}) {
  return (
    <article className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-xl">
          {icon}
        </div>
        <span className="text-xs font-bold text-emerald-600">
          Live
        </span>
      </div>
      <p className="text-sm text-slate-500 mt-4">
        {title}
      </p>
      <p className="text-2xl font-bold text-slate-950 mt-1">
        {value}
      </p>
      <p className="text-xs text-slate-400 mt-2">
        {detail}
      </p>
    </article>
  );
}

function InsightCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="border border-slate-200 rounded-2xl p-5">
      <p className="text-sm font-bold text-slate-500">
        {title}
      </p>
      <p className="text-2xl font-bold text-slate-950 mt-2">
        {value}
      </p>
      <p className="text-sm text-slate-500 leading-6 mt-2">
        {detail}
      </p>
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status: Customer["status"];
}) {
  const tone =
    status === "Active"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : "bg-amber-50 border-amber-200 text-amber-700";

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}
    >
      {status}
    </span>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
