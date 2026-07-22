import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import FirmicSidebar from "../components/FirmicSidebar";
import ProtectedRoute from "../components/ProtectedRoute";

import {
  createCustomer,
  createCustomerContact,
  createCustomerOpportunity,
  Customer,
  CustomerOpportunity,
  getCompanyCustomers,
  getCustomer,
  getCustomerHubSummary,
  OpportunityStage,
  updateCustomerOpportunity,
} from "../services/customerHubApi";

import {
  getActiveWorkspace,
  getWorkspaceChangedEventName,
} from "../src/utils/workspaceContext";

import { sendSonnyChat } from "../services/sonnyChat";

type Tab =
  | "Overview"
  | "Customers"
  | "Sales Pipeline"
  | "Communications"
  | "Support"
  | "Activity"
  | "Reports"
  | "Sonny AI";

type Summary = {
  company_id?: string;
  customers: number;
  open_opportunities: number;
  pipeline_value: number;
  won_value: number;
  win_rate: number;
  open_tickets: number;
  at_risk_customers: number;
};

type CustomerForm = {
  name: string;
  industry: string;
  email: string;
  phone: string;
  owner: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPosition: string;
};

type OpportunityForm = {
  customerId: string;
  title: string;
  value: string;
  probability: string;
  stage: OpportunityStage;
  owner: string;
  notes: string;
};

const tabs: Tab[] = [
  "Overview",
  "Customers",
  "Sales Pipeline",
  "Communications",
  "Support",
  "Activity",
  "Reports",
  "Sonny AI",
];

const stages: OpportunityStage[] = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

const emptySummary: Summary = {
  customers: 0,
  open_opportunities: 0,
  pipeline_value: 0,
  won_value: 0,
  win_rate: 0,
  open_tickets: 0,
  at_risk_customers: 0,
};

const emptyCustomerForm: CustomerForm = {
  name: "",
  industry: "",
  email: "",
  phone: "",
  owner: "",
  contactFirstName: "",
  contactLastName: "",
  contactEmail: "",
  contactPosition: "",
};

const emptyOpportunityForm: OpportunityForm = {
  customerId: "",
  title: "",
  value: "0",
  probability: "10",
  stage: "lead",
  owner: "",
  notes: "",
};

export default function CustomerHub() {
  const [workspace, setWorkspace] = useState(() =>
    getActiveWorkspace()
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [selectedCustomerId, setSelectedCustomerId] =
    useState<string | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] =
    useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [search, setSearch] = useState("");

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showOpportunityForm, setShowOpportunityForm] =
    useState(false);

  const [customerForm, setCustomerForm] =
    useState<CustomerForm>(emptyCustomerForm);
  const [opportunityForm, setOpportunityForm] =
    useState<OpportunityForm>(emptyOpportunityForm);

  const [loading, setLoading] = useState(true);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savingOpportunity, setSavingOpportunity] =
    useState(false);
  const [updatingOpportunityId, setUpdatingOpportunityId] =
    useState<string | null>(null);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

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

  const loadCustomerHub = useCallback(async () => {
    if (!workspace?.id) {
      setCustomers([]);
      setSummary(emptySummary);
      setSelectedCustomerId(null);
      setSelectedOpportunityId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [customerRows, summaryData] = await Promise.all([
        getCompanyCustomers(String(workspace.id)),
        getCustomerHubSummary(String(workspace.id)),
      ]);

      const expandedResults = await Promise.allSettled(
        customerRows.map((customer) => getCustomer(customer.id))
      );

      const expandedCustomers = expandedResults.map(
        (result, index) =>
          result.status === "fulfilled"
            ? result.value
            : customerRows[index]
      );

      setCustomers(expandedCustomers);
      setSummary({
        ...emptySummary,
        ...(summaryData || {}),
      });

      setSelectedCustomerId((current) => {
        if (
          current &&
          expandedCustomers.some(
            (customer) => customer.id === current
          )
        ) {
          return current;
        }

        return expandedCustomers[0]?.id || null;
      });

      setSelectedOpportunityId((current) => {
        const allOpportunities = expandedCustomers.flatMap(
          (customer) => customer.opportunities || []
        );

        if (
          current &&
          allOpportunities.some(
            (opportunity) => opportunity.id === current
          )
        ) {
          return current;
        }

        return allOpportunities[0]?.id || null;
      });

      if (
        expandedResults.some(
          (result) => result.status === "rejected"
        )
      ) {
        setError(
          "Some customer details could not be expanded. Available Customer Hub data is still shown."
        );
      }
    } catch (err: any) {
      setCustomers([]);
      setSummary(emptySummary);
      setError(
        err?.message ||
          "Customer Hub data could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  useEffect(() => {
    void loadCustomerHub();
  }, [loadCustomerHub]);

  const opportunities = useMemo(
    () =>
      customers.flatMap((customer) =>
        (customer.opportunities || []).map((opportunity) => ({
          ...opportunity,
          customer,
        }))
      ),
    [customers]
  );

  const selectedCustomer =
    customers.find(
      (customer) => customer.id === selectedCustomerId
    ) || null;

  const selectedOpportunity =
    opportunities.find(
      (opportunity) =>
        opportunity.id === selectedOpportunityId
    ) || null;

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) => {
      const primaryContact = getPrimaryContactName(customer);

      return [
        customer.name,
        customer.industry,
        customer.email,
        customer.owner,
        primaryContact,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        );
    });
  }, [customers, search]);

  const companyName =
    workspace?.name || "Active Company";

  async function handleCreateCustomer() {
    if (!workspace?.id || !customerForm.name.trim()) {
      setError("Customer name is required.");
      return;
    }

    try {
      setSavingCustomer(true);
      setError("");
      setNotice("");

      const created = await createCustomer({
        company_id: String(workspace.id),
        name: customerForm.name.trim(),
        industry: customerForm.industry.trim() || undefined,
        email: customerForm.email.trim() || undefined,
        phone: customerForm.phone.trim() || undefined,
        owner: customerForm.owner.trim() || undefined,
        status: "prospect",
        health: "healthy",
        relationship_score: 50,
        tags: [],
      });

      if (customerForm.contactFirstName.trim()) {
        await createCustomerContact(created.id, {
          first_name:
            customerForm.contactFirstName.trim(),
          last_name:
            customerForm.contactLastName.trim() || undefined,
          email:
            customerForm.contactEmail.trim() || undefined,
          position:
            customerForm.contactPosition.trim() || undefined,
          is_primary: true,
        });
      }

      setCustomerForm(emptyCustomerForm);
      setShowCustomerForm(false);
      setNotice(`${created.name} was added to Customer Hub.`);
      setActiveTab("Customers");
      setSelectedCustomerId(created.id);

      await loadCustomerHub();
    } catch (err: any) {
      setError(
        err?.message || "The customer could not be created."
      );
    } finally {
      setSavingCustomer(false);
    }
  }

  async function handleCreateOpportunity() {
    if (
      !opportunityForm.customerId ||
      !opportunityForm.title.trim()
    ) {
      setError(
        "Select a customer and enter an opportunity title."
      );
      return;
    }

    try {
      setSavingOpportunity(true);
      setError("");
      setNotice("");

      const created = await createCustomerOpportunity(
        opportunityForm.customerId,
        {
          title: opportunityForm.title.trim(),
          value: Number(opportunityForm.value) || 0,
          probability:
            Number(opportunityForm.probability) || 0,
          stage: opportunityForm.stage,
          owner: opportunityForm.owner.trim() || undefined,
          notes: opportunityForm.notes.trim() || undefined,
        }
      );

      setOpportunityForm(emptyOpportunityForm);
      setShowOpportunityForm(false);
      setNotice(
        `${created.title} was added to the opportunity pipeline.`
      );
      setActiveTab("Sales Pipeline");
      setSelectedOpportunityId(created.id);

      await loadCustomerHub();
    } catch (err: any) {
      setError(
        err?.message ||
          "The opportunity could not be created."
      );
    } finally {
      setSavingOpportunity(false);
    }
  }

  async function handleMoveOpportunity(
    opportunityId: string,
    stage: OpportunityStage
  ) {
    try {
      setUpdatingOpportunityId(opportunityId);
      setError("");
      setNotice("");

      await updateCustomerOpportunity(opportunityId, {
        stage,
      });

      setNotice(
        `Opportunity moved to ${formatLabel(stage)}.`
      );

      await loadCustomerHub();
    } catch (err: any) {
      setError(
        err?.message ||
          "The opportunity stage could not be updated."
      );
    } finally {
      setUpdatingOpportunityId(null);
    }
  }

  function openOpportunityForCustomer(customerId?: string) {
    setOpportunityForm({
      ...emptyOpportunityForm,
      customerId: customerId || "",
    });
    setShowOpportunityForm(true);
  }

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
                onClick={() => setShowCustomerForm(true)}
                disabled={!workspace?.id}
                className="border border-slate-200 bg-white text-slate-700 px-5 py-3 rounded-xl font-bold hover:border-violet-300 hover:text-violet-700 disabled:bg-slate-100 disabled:text-slate-400 transition"
              >
                + New Customer
              </button>

              <button
                type="button"
                onClick={() =>
                  openOpportunityForCustomer(
                    selectedCustomer?.id
                  )
                }
                disabled={!workspace?.id || customers.length === 0}
                className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-violet-700 disabled:bg-slate-300 transition"
              >
                + New Opportunity
              </button>

              <button
                type="button"
                onClick={() => void loadCustomerHub()}
                disabled={loading || !workspace?.id}
                className="border border-slate-200 bg-white text-slate-700 px-5 py-3 rounded-xl font-bold hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 transition"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </header>

          {notice && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              {notice}
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
              {error}
            </div>
          )}

          {showCustomerForm && (
            <CustomerFormPanel
              form={customerForm}
              saving={savingCustomer}
              onChange={setCustomerForm}
              onSave={handleCreateCustomer}
              onClose={() => {
                setShowCustomerForm(false);
                setCustomerForm(emptyCustomerForm);
              }}
            />
          )}

          {showOpportunityForm && (
            <OpportunityFormPanel
              form={opportunityForm}
              customers={customers}
              saving={savingOpportunity}
              onChange={setOpportunityForm}
              onSave={handleCreateOpportunity}
              onClose={() => {
                setShowOpportunityForm(false);
                setOpportunityForm(emptyOpportunityForm);
              }}
            />
          )}

          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mt-8">
            <Stat
              title="Customers"
              value={String(summary.customers)}
              detail="Live PostgreSQL records"
              icon="👥"
            />
            <Stat
              title="Open Opportunities"
              value={String(summary.open_opportunities)}
              detail="Active pipeline opportunities"
              icon="📈"
            />
            <Stat
              title="Pipeline Value"
              value={money(summary.pipeline_value)}
              detail="Total non-lost opportunity value"
              icon="💰"
            />
            <Stat
              title="Closed Revenue"
              value={money(summary.won_value)}
              detail="Recorded won opportunity value"
              icon="🏆"
            />
            <Stat
              title="Win Rate"
              value={`${summary.win_rate}%`}
              detail="Won opportunities versus total"
              icon="🎯"
            />
            <Stat
              title="Open Tickets"
              value={String(summary.open_tickets)}
              detail={`${summary.at_risk_customers} customers at risk`}
              icon="🎫"
            />
          </section>

          <ExecutivePipeline
            opportunities={opportunities}
            onOpenPipeline={() => setActiveTab("Sales Pipeline")}
          />

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

            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="p-5 sm:p-6 min-w-0">
                {loading ? (
                  <LoadingState />
                ) : activeTab === "Overview" ? (
                  <Overview
                    customers={customers}
                    opportunities={opportunities}
                    summary={summary}
                    onOpenCustomers={() =>
                      setActiveTab("Customers")
                    }
                    onOpenOpportunities={() =>
                      setActiveTab("Sales Pipeline")
                    }
                  />
                ) : activeTab === "Customers" ? (
                  <CustomersView
                    customers={filteredCustomers}
                    search={search}
                    selectedCustomerId={selectedCustomerId}
                    onSearch={setSearch}
                    onSelect={(customerId) => {
                      setSelectedCustomerId(customerId);
                    }}
                    onCreateOpportunity={(customerId) =>
                      openOpportunityForCustomer(customerId)
                    }
                  />
                ) : activeTab === "Sales Pipeline" ? (
                  <OpportunityBoard
                    opportunities={opportunities}
                    selectedOpportunityId={
                      selectedOpportunityId
                    }
                    updatingOpportunityId={
                      updatingOpportunityId
                    }
                    onSelect={setSelectedOpportunityId}
                    onMove={handleMoveOpportunity}
                  />
                ) : activeTab === "Communications" ? (
                  <CommunicationsView customers={customers} />
                ) : activeTab === "Support" ? (
                  <TicketsView customers={customers} />
                ) : activeTab === "Activity" ? (
                  <ActivityView customers={customers} />
                ) : activeTab === "Reports" ? (
                  <ReportsView summary={summary} />
                ) : (
                  <SonnyWorkspace
                    workspaceId={workspace?.id || ""}
                    companyName={companyName}
                    selectedCustomer={selectedCustomer}
                    selectedOpportunity={selectedOpportunity}
                    summary={summary}
                  />
                )}
              </div>

              <aside className="border-t 2xl:border-t-0 2xl:border-l border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                <CustomerIntelligencePanel
                  workspaceId={workspace?.id || ""}
                  companyName={companyName}
                  selectedCustomer={selectedCustomer}
                  selectedOpportunity={selectedOpportunity}
                  summary={summary}
                  updatingOpportunityId={
                    updatingOpportunityId
                  }
                  onSelectCustomer={setSelectedCustomerId}
                  onMove={handleMoveOpportunity}
                  onCreateOpportunity={() =>
                    openOpportunityForCustomer(
                      selectedCustomer?.id
                    )
                  }
                />
              </aside>
            </div>
          </section>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function CustomerFormPanel({
  form,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  form: CustomerForm;
  saving: boolean;
  onChange: (form: CustomerForm) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <section className="mt-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-violet-700">
            New Customer
          </p>
          <h2 className="text-xl font-bold text-slate-950 mt-1">
            Create a PostgreSQL customer record
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Primary contact fields are optional and will create a
            linked contact automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700"
          aria-label="Close customer form"
        >
          ✕
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4 mt-5">
        <Field
          value={form.name}
          placeholder="Customer company *"
          onChange={(value) =>
            onChange({ ...form, name: value })
          }
        />
        <Field
          value={form.industry}
          placeholder="Industry"
          onChange={(value) =>
            onChange({ ...form, industry: value })
          }
        />
        <Field
          value={form.email}
          placeholder="Company email"
          onChange={(value) =>
            onChange({ ...form, email: value })
          }
        />
        <Field
          value={form.phone}
          placeholder="Company phone"
          onChange={(value) =>
            onChange({ ...form, phone: value })
          }
        />
        <Field
          value={form.owner}
          placeholder="Relationship owner"
          onChange={(value) =>
            onChange({ ...form, owner: value })
          }
        />
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Optional primary contact
        </p>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-3">
          <Field
            value={form.contactFirstName}
            placeholder="First name"
            onChange={(value) =>
              onChange({
                ...form,
                contactFirstName: value,
              })
            }
          />
          <Field
            value={form.contactLastName}
            placeholder="Last name"
            onChange={(value) =>
              onChange({
                ...form,
                contactLastName: value,
              })
            }
          />
          <Field
            value={form.contactEmail}
            placeholder="Contact email"
            onChange={(value) =>
              onChange({
                ...form,
                contactEmail: value,
              })
            }
          />
          <Field
            value={form.contactPosition}
            placeholder="Position"
            onChange={(value) =>
              onChange({
                ...form,
                contactPosition: value,
              })
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-5">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-violet-700 disabled:bg-slate-300 transition"
        >
          {saving ? "Creating..." : "Create Customer"}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50 disabled:text-slate-400 transition"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}

function OpportunityFormPanel({
  form,
  customers,
  saving,
  onChange,
  onSave,
  onClose,
}: {
  form: OpportunityForm;
  customers: Customer[];
  saving: boolean;
  onChange: (form: OpportunityForm) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <section className="mt-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-violet-700">
            New Opportunity
          </p>
          <h2 className="text-xl font-bold text-slate-950 mt-1">
            Add a linked revenue opportunity
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700"
          aria-label="Close opportunity form"
        >
          ✕
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
        <select
          value={form.customerId}
          onChange={(event) =>
            onChange({
              ...form,
              customerId: event.target.value,
            })
          }
          className="border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        >
          <option value="">Select customer *</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>

        <Field
          value={form.title}
          placeholder="Opportunity title *"
          onChange={(value) =>
            onChange({ ...form, title: value })
          }
        />

        <Field
          type="number"
          value={form.value}
          placeholder="Deal value"
          onChange={(value) =>
            onChange({ ...form, value })
          }
        />

        <Field
          type="number"
          value={form.probability}
          placeholder="Probability %"
          onChange={(value) =>
            onChange({ ...form, probability: value })
          }
        />

        <select
          value={form.stage}
          onChange={(event) =>
            onChange({
              ...form,
              stage: event.target.value as OpportunityStage,
            })
          }
          className="border border-slate-200 rounded-xl px-4 py-3 bg-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        >
          {stages.map((stage) => (
            <option key={stage} value={stage}>
              {formatLabel(stage)}
            </option>
          ))}
        </select>

        <Field
          value={form.owner}
          placeholder="Opportunity owner"
          onChange={(value) =>
            onChange({ ...form, owner: value })
          }
        />

        <textarea
          value={form.notes}
          onChange={(event) =>
            onChange({
              ...form,
              notes: event.target.value,
            })
          }
          placeholder="Opportunity notes"
          className="md:col-span-2 border border-slate-200 rounded-xl px-4 py-3 min-h-12 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div className="flex flex-wrap gap-3 mt-5">
        <button
          type="button"
          onClick={onSave}
          disabled={
            saving ||
            !form.customerId ||
            !form.title.trim()
          }
          className="bg-violet-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-violet-700 disabled:bg-slate-300 transition"
        >
          {saving ? "Creating..." : "Create Opportunity"}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="border border-slate-200 bg-white px-5 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50 disabled:text-slate-400 transition"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}

function Overview({
  customers,
  opportunities,
  summary,
  onOpenCustomers,
  onOpenOpportunities,
}: {
  customers: Customer[];
  opportunities: Array<
    CustomerOpportunity & { customer: Customer }
  >;
  summary: Summary;
  onOpenCustomers: () => void;
  onOpenOpportunities: () => void;
}) {
  const recentCustomers = customers.slice(0, 4);
  const topOpportunity = [...opportunities].sort(
    (a, b) => Number(b.value) - Number(a.value)
  )[0];

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
          value={String(summary.customers)}
          detail={
            summary.customers
              ? "Live customer accounts are connected to PostgreSQL."
              : "Create your first customer to begin."
          }
        />

        <InsightCard
          title="Pipeline"
          value={money(summary.pipeline_value)}
          detail={`${summary.open_opportunities} opportunities are currently open.`}
        />

        <InsightCard
          title="Largest Opportunity"
          value={
            topOpportunity
              ? money(topOpportunity.value)
              : money(0)
          }
          detail={
            topOpportunity
              ? `${topOpportunity.customer.name} · ${topOpportunity.title}`
              : "No customer opportunities have been created."
          }
        />
      </div>

      <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-950">
            Customer Portfolio
          </h3>
          <span className="text-xs font-bold text-slate-400">
            {customers.length} records
          </span>
        </div>

        {recentCustomers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No customers have been added yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {recentCustomers.map((customer) => (
              <div
                key={customer.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <p className="font-bold text-slate-950">
                    {customer.name}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {customer.industry || "Industry not set"} ·{" "}
                    {getPrimaryContactName(customer) ||
                      "No primary contact"}
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <p className="font-bold text-slate-950">
                    {money(
                      customer.metrics?.pipeline_value || 0
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {customer.metrics?.opportunities || 0}{" "}
                    opportunities
                  </p>
                </div>
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
  selectedCustomerId,
  onSearch,
  onSelect,
  onCreateOpportunity,
}: {
  customers: Customer[];
  search: string;
  selectedCustomerId: string | null;
  onSearch: (value: string) => void;
  onSelect: (customerId: string) => void;
  onCreateOpportunity: (customerId: string) => void;
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
        <div className="hidden lg:grid grid-cols-[1.5fr_1fr_120px_140px_110px_120px] gap-4 px-5 py-3 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
          <span>Customer</span>
          <span>Primary Contact</span>
          <span>Opportunities</span>
          <span>Pipeline</span>
          <span>Health</span>
          <span>Action</span>
        </div>

        {customers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl">👥</div>
            <h3 className="font-bold text-slate-950 mt-3">
              No customers found
            </h3>
            <p className="text-slate-500 mt-2">
              Create the first customer account or change your
              search.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className={`grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_120px_140px_110px_120px] gap-3 lg:gap-4 px-5 py-4 items-center transition ${
                  selectedCustomerId === customer.id
                    ? "bg-violet-50/60"
                    : "hover:bg-slate-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(customer.id)}
                  className="text-left"
                >
                  <p className="font-bold text-slate-950">
                    {customer.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {customer.industry || "Industry not set"}
                  </p>
                </button>

                <p className="text-sm text-slate-600">
                  {getPrimaryContactName(customer) ||
                    "No primary contact"}
                </p>

                <p className="font-bold text-slate-900">
                  {customer.metrics?.opportunities || 0}
                </p>

                <p className="font-bold text-slate-900">
                  {money(
                    customer.metrics?.pipeline_value || 0
                  )}
                </p>

                <HealthBadge health={customer.health} />

                <button
                  type="button"
                  onClick={() =>
                    onCreateOpportunity(customer.id)
                  }
                  className="border border-slate-200 bg-white px-3 py-2 rounded-xl text-xs font-bold hover:border-violet-300 hover:text-violet-700"
                >
                  Add Deal
                </button>
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
  selectedOpportunityId,
  updatingOpportunityId,
  onSelect,
  onMove,
}: {
  opportunities: Array<
    CustomerOpportunity & { customer: Customer }
  >;
  selectedOpportunityId: string | null;
  updatingOpportunityId: string | null;
  onSelect: (opportunityId: string) => void;
  onMove: (
    opportunityId: string,
    stage: OpportunityStage
  ) => void;
}) {
  return (
    <div>
      <div>
        <p className="text-sm font-bold text-violet-700">
          Sales Pipeline
        </p>
        <h2 className="text-2xl font-bold text-slate-950 mt-1">
          Revenue pipeline
        </h2>
        <p className="text-slate-500 mt-2">
          Stage changes are saved directly to PostgreSQL.
        </p>
      </div>

      {opportunities.length === 0 ? (
        <div className="mt-6">
          <EmptyModule
            icon="📈"
            title="No opportunities yet"
            description="Add an opportunity to an existing customer to begin the live pipeline."
            action="PostgreSQL Ready"
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-6 gap-4 mt-6">
          {stages.map((stage) => {
            const items = opportunities.filter(
              (opportunity) =>
                opportunity.stage === stage
            );

            return (
              <section
                key={stage}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 min-h-[280px]"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900">
                    {formatLabel(stage)}
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
                      onClick={() =>
                        onSelect(opportunity.id)
                      }
                      className={`w-full text-left bg-white border rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${
                        selectedOpportunityId ===
                        opportunity.id
                          ? "border-violet-500 ring-2 ring-violet-100"
                          : "border-slate-200"
                      }`}
                    >
                      <p className="font-bold text-slate-950">
                        {opportunity.customer.name}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        {opportunity.title}
                      </p>

                      <p className="text-lg font-bold text-slate-950 mt-4">
                        {money(opportunity.value)}
                      </p>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs font-bold text-slate-400">
                          {opportunity.probability}% probability
                        </span>

                        {updatingOpportunityId ===
                          opportunity.id && (
                          <span className="text-xs font-bold text-violet-600">
                            Saving...
                          </span>
                        )}
                      </div>
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


function ExecutivePipeline({
  opportunities,
  onOpenPipeline,
}: {
  opportunities: Array<
    CustomerOpportunity & { customer: Customer }
  >;
  onOpenPipeline: () => void;
}) {
  const activeStages: OpportunityStage[] = [
    "lead",
    "qualified",
    "proposal",
    "negotiation",
    "won",
  ];

  const stageTotals = activeStages.map((stage) => {
    const records = opportunities.filter(
      (opportunity) => opportunity.stage === stage
    );

    return {
      stage,
      count: records.length,
      value: records.reduce(
        (total, opportunity) =>
          total + Number(opportunity.value || 0),
        0
      ),
    };
  });

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
            Executive Pipeline
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">
            Lead to revenue progression
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            A live view of customer opportunities across the commercial journey.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenPipeline}
          className="w-fit rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Manage Pipeline
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-5">
        {stageTotals.map((item, index) => (
          <div key={item.stage} className="relative">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-extrabold text-violet-700 shadow-sm">
                  {index + 1}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {item.count} deals
                </span>
              </div>
              <p className="mt-4 text-sm font-bold text-slate-900">
                {formatLabel(item.stage)}
              </p>
              <p className="mt-1 text-lg font-bold text-slate-950">
                {money(item.value)}
              </p>
            </div>

            {index < stageTotals.length - 1 && (
              <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-slate-300 md:block">
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CommunicationsView({
  customers,
}: {
  customers: Customer[];
}) {
  const communications = customers
    .flatMap((customer) =>
      ((customer as any).communications || []).map(
        (communication: any) => ({
          ...communication,
          customerName: customer.name,
        })
      )
    )
    .sort(
      (a, b) =>
        new Date(b.created_at || b.sent_at || 0).getTime() -
        new Date(a.created_at || a.sent_at || 0).getTime()
    );

  return (
    <div>
      <p className="text-sm font-bold text-violet-700">
        Communications
      </p>
      <h2 className="mt-1 text-2xl font-bold text-slate-950">
        Unified customer conversations
      </h2>
      <p className="mt-2 text-slate-500">
        Email, call, meeting, and message history connected to each customer.
      </p>

      {communications.length === 0 ? (
        <div className="mt-6">
          <EmptyModule
            icon="💬"
            title="No customer communications yet"
            description="Customer emails, calls, meetings, and messages will appear here when communication records are connected."
            action="Communication Workspace Ready"
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {communications.map((communication: any) => (
            <article
              key={communication.id}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <SimpleBadge
                    value={
                      communication.channel ||
                      communication.type ||
                      "communication"
                    }
                  />
                  <span className="text-xs font-bold text-slate-400">
                    {communication.customerName}
                  </span>
                </div>
                <p className="mt-3 font-bold text-slate-950">
                  {communication.subject ||
                    communication.title ||
                    "Customer communication"}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {communication.summary ||
                    communication.body ||
                    communication.notes ||
                    "No communication summary available."}
                </p>
              </div>

              <p className="shrink-0 text-xs font-bold text-slate-400">
                {formatDate(
                  communication.created_at ||
                    communication.sent_at
                )}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

type CustomerSonnyAction =
  | "summary"
  | "follow_up"
  | "next_action"
  | "proposal"
  | "custom";

function buildCustomerSonnyPrompt({
  action,
  customPrompt,
  companyName,
  customer,
  opportunity,
  summary,
}: {
  action: CustomerSonnyAction;
  customPrompt?: string;
  companyName: string;
  customer: Customer | null;
  opportunity:
    | (CustomerOpportunity & { customer: Customer })
    | null;
  summary: Summary;
}) {
  const actionInstruction: Record<CustomerSonnyAction, string> = {
    summary:
      "Create a concise executive customer summary. Include relationship health, commercial position, risks, and immediate priorities.",
    follow_up:
      "Draft a professional follow-up email. Include a clear subject line, concise body, and one specific next step. Do not invent facts.",
    next_action:
      "Recommend the single best next commercial action, explain why it matters, and provide three short execution steps.",
    proposal:
      "Create a concise proposal outline using only the available context. Include objective, proposed scope, value, next step, and any missing information.",
    custom:
      customPrompt?.trim() ||
      "Review the customer context and provide the most useful executive response.",
  };

  const customerContext = customer
    ? [
        `Customer name: ${customer.name}`,
        `Industry: ${customer.industry || "Not provided"}`,
        `Health: ${customer.health || "Not provided"}`,
        `Relationship score: ${
          customer.relationship_score ?? "Not provided"
        }`,
        `Customer pipeline value: ${money(
          customer.metrics?.pipeline_value || 0
        )}`,
        `Contacts: ${customer.metrics?.contacts || 0}`,
        `Open tickets: ${customer.metrics?.open_tickets || 0}`,
        `Primary contact: ${
          getPrimaryContactName(customer) || "Not provided"
        }`,
      ].join("\\n")
    : "No customer is selected.";

  const opportunityContext = opportunity
    ? [
        `Opportunity: ${opportunity.title}`,
        `Opportunity customer: ${opportunity.customer.name}`,
        `Value: ${money(opportunity.value)}`,
        `Stage: ${formatLabel(opportunity.stage)}`,
        `Probability: ${opportunity.probability}%`,
        `Owner: ${opportunity.owner || "Not provided"}`,
        `Notes: ${(opportunity as any).notes || "Not provided"}`,
      ].join("\\n")
    : "No opportunity is selected.";

  return [
    "You are Sonny, Firmic's AI Chief Operating Officer, working inside Customer Hub.",
    "Use only the supplied Customer Hub data. Clearly state when information is missing.",
    "",
    `Company: ${companyName}`,
    "",
    "Customer Hub summary:",
    `Customers: ${summary.customers}`,
    `Open opportunities: ${summary.open_opportunities}`,
    `Pipeline value: ${money(summary.pipeline_value)}`,
    `Won value: ${money(summary.won_value)}`,
    `Win rate: ${summary.win_rate}%`,
    `Open tickets: ${summary.open_tickets}`,
    `At-risk customers: ${summary.at_risk_customers}`,
    "",
    "Selected customer:",
    customerContext,
    "",
    "Selected opportunity:",
    opportunityContext,
    "",
    "Requested task:",
    actionInstruction[action],
  ].join("\\n");
}

function SonnyWorkspace({
  workspaceId,
  companyName,
  selectedCustomer,
  selectedOpportunity,
  summary,
}: {
  workspaceId: string;
  companyName: string;
  selectedCustomer: Customer | null;
  selectedOpportunity:
    | (CustomerOpportunity & { customer: Customer })
    | null;
  summary: Summary;
}) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState<CustomerSonnyAction | null>(
    null
  );

  const recommendedActions = [
    summary.open_opportunities > 0
      ? `Review ${summary.open_opportunities} open opportunities`
      : "Create the first customer opportunity",
    selectedCustomer
      ? `Prepare a relationship brief for ${selectedCustomer.name}`
      : "Select a customer for relationship intelligence",
    selectedOpportunity
      ? `Draft the next action for ${selectedOpportunity.title}`
      : "Select a deal for pipeline coaching",
    summary.open_tickets > 0
      ? `Prioritize ${summary.open_tickets} open support tickets`
      : "Customer support is currently clear",
  ];

  async function runSonny(
    action: CustomerSonnyAction,
    customPrompt?: string
  ) {
    if (!workspaceId || working) return;

    setWorking(action);
    setError("");

    try {
      const result = await sendSonnyChat(
        workspaceId,
        buildCustomerSonnyPrompt({
          action,
          customPrompt,
          companyName,
          customer: selectedCustomer,
          opportunity: selectedOpportunity,
          summary,
        })
      );

      setResponse(result.reply);
    } catch (requestError: any) {
      setError(
        requestError?.message ||
          "Sonny could not complete the Customer Hub request."
      );
    } finally {
      setWorking(null);
    }
  }

  return (
    <div>
      <div className="rounded-3xl bg-slate-950 p-6 text-white">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-2xl font-bold shadow-lg shadow-violet-950/30">
              S
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                Sonny AI
              </p>
              <h2 className="mt-1 text-2xl font-bold">
                Customer executive copilot
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Connected to Sonny for {companyName}
              </p>
            </div>
          </div>

          <span className="w-fit rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
            ● Live Sonny connection
          </span>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Executive Brief
          </p>
          <p className="mt-3 leading-7 text-slate-100">
            {summary.open_opportunities > 0
              ? `${companyName} currently has ${summary.open_opportunities} open opportunities worth ${money(
                  summary.pipeline_value
                )}. Recorded won revenue is ${money(
                  summary.won_value
                )}, with a ${summary.win_rate}% win rate.`
              : `${companyName} has no active opportunities yet. Sonny can help structure the first customer follow-up and revenue action plan.`}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Recommended Actions
          </p>

          <div className="mt-4 space-y-3">
            {recommendedActions.map((action, index) => (
              <div
                key={action}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                  {index + 1}
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {action}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => runSonny("summary")}
              disabled={!workspaceId || working !== null}
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
            >
              {working === "summary" ? "Summarizing..." : "Summarize Customer"}
            </button>
            <button
              type="button"
              onClick={() => runSonny("next_action")}
              disabled={!workspaceId || working !== null}
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
            >
              {working === "next_action"
                ? "Reviewing..."
                : "Recommend Next Action"}
            </button>
            <button
              type="button"
              onClick={() => runSonny("follow_up")}
              disabled={!workspaceId || working !== null}
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
            >
              {working === "follow_up"
                ? "Drafting..."
                : "Draft Follow-up Email"}
            </button>
            <button
              type="button"
              onClick={() => runSonny("proposal")}
              disabled={!workspaceId || working !== null}
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
            >
              {working === "proposal"
                ? "Preparing..."
                : "Generate Proposal Outline"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Ask Sonny
          </p>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask about the selected customer, deal, support risk, follow-up, or revenue opportunity..."
            className="mt-4 min-h-36 w-full resize-none rounded-2xl border border-slate-200 p-4 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          />

          <button
            type="button"
            onClick={() => runSonny("custom", prompt)}
            disabled={
              !workspaceId || !prompt.trim() || working !== null
            }
            className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-3 font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {working === "custom"
              ? "Sonny is analyzing..."
              : "Run Sonny Analysis"}
          </button>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {response && (
            <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                Sonny Response
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {response}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TicketsView({
  customers,
}: {
  customers: Customer[];
}) {
  const tickets = customers.flatMap((customer) =>
    (customer.support_tickets || []).map((ticket) => ({
      ...ticket,
      customerName: customer.name,
    }))
  );

  return (
    <div>
      <p className="text-sm font-bold text-violet-700">
        Support Tickets
      </p>
      <h2 className="text-2xl font-bold text-slate-950 mt-1">
        Customer support queue
      </h2>

      {tickets.length === 0 ? (
        <div className="mt-6">
          <EmptyModule
            icon="🎫"
            title="No support tickets"
            description="Ticket records will appear here as they are created through Customer Hub."
            action="Backend Connected"
          />
        </div>
      ) : (
        <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <p className="font-bold text-slate-950">
                  {ticket.title}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {ticket.customerName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <SimpleBadge value={ticket.priority} />
                <SimpleBadge value={ticket.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityView({
  customers,
}: {
  customers: Customer[];
}) {
  const activity = customers
    .flatMap((customer) =>
      (customer.activity || []).map((item: any) => ({
        ...item,
        customerName: customer.name,
      }))
    )
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );

  return (
    <div>
      <p className="text-sm font-bold text-violet-700">
        Activity
      </p>
      <h2 className="text-2xl font-bold text-slate-950 mt-1">
        Customer timeline
      </h2>

      {activity.length === 0 ? (
        <div className="mt-6">
          <EmptyModule
            icon="🕒"
            title="No customer activity"
            description="Customer, contact, opportunity, communication, and ticket events will appear here."
            action="Activity Engine Ready"
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {activity.map((item: any) => (
            <div
              key={item.id}
              className="border border-slate-200 rounded-2xl p-5 flex gap-4"
            >
              <div className="h-10 w-10 shrink-0 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                AI
              </div>

              <div className="min-w-0">
                <p className="font-bold text-slate-950">
                  {item.title}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {item.customerName}
                  {item.description
                    ? ` · ${item.description}`
                    : ""}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {formatDate(item.created_at)}
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
  summary,
}: {
  summary: Summary;
}) {
  const averagePipelineValue =
    summary.open_opportunities > 0
      ? summary.pipeline_value /
        summary.open_opportunities
      : 0;

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
          title="Customer Portfolio"
          value={String(summary.customers)}
          detail="Live customer records in this tenant workspace."
        />

        <InsightCard
          title="Average Open Deal"
          value={money(averagePipelineValue)}
          detail="Average value across currently open opportunities."
        />

        <InsightCard
          title="Win Rate"
          value={`${summary.win_rate}%`}
          detail={`${money(
            summary.won_value
          )} in recorded won revenue.`}
        />

        <InsightCard
          title="Open Support"
          value={String(summary.open_tickets)}
          detail="Support tickets that are not resolved or closed."
        />

        <InsightCard
          title="At-Risk Customers"
          value={String(summary.at_risk_customers)}
          detail="Customers marked at risk or critical."
        />

        <InsightCard
          title="Pipeline Coverage"
          value={money(summary.pipeline_value)}
          detail={`${summary.open_opportunities} active opportunities.`}
        />
      </div>
    </div>
  );
}

function CustomerIntelligencePanel({
  workspaceId,
  companyName,
  selectedCustomer,
  selectedOpportunity,
  summary,
  updatingOpportunityId,
  onSelectCustomer,
  onMove,
  onCreateOpportunity,
}: {
  workspaceId: string;
  companyName: string;
  selectedCustomer: Customer | null;
  selectedOpportunity:
    | (CustomerOpportunity & { customer: Customer })
    | null;
  summary: Summary;
  updatingOpportunityId: string | null;
  onSelectCustomer: (customerId: string) => void;
  onMove: (
    opportunityId: string,
    stage: OpportunityStage
  ) => void;
  onCreateOpportunity: () => void;
}) {
  const [sonnyResponse, setSonnyResponse] = useState("");
  const [sonnyError, setSonnyError] = useState("");
  const [sonnyWorking, setSonnyWorking] =
    useState<CustomerSonnyAction | null>(null);

  async function runQuickAction(action: CustomerSonnyAction) {
    if (!workspaceId || sonnyWorking) return;

    setSonnyWorking(action);
    setSonnyError("");

    try {
      const result = await sendSonnyChat(
        workspaceId,
        buildCustomerSonnyPrompt({
          action,
          companyName,
          customer: selectedCustomer,
          opportunity: selectedOpportunity,
          summary,
        })
      );
      setSonnyResponse(result.reply);
    } catch (requestError: any) {
      setSonnyError(
        requestError?.message ||
          "Sonny could not complete the Customer Hub request."
      );
    } finally {
      setSonnyWorking(null);
    }
  }

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
          {summary.open_opportunities > 0
            ? `${summary.open_opportunities} open opportunities represent ${money(
                summary.pipeline_value
              )} in active pipeline value. The current win rate is ${summary.win_rate}%.`
            : "No active customer opportunities require attention. Create an opportunity to begin customer intelligence."}
        </p>
      </div>

      <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Selected Customer
        </p>

        {selectedCustomer ? (
          <>
            <div className="flex items-start justify-between gap-3 mt-3">
              <div>
                <h3 className="text-xl font-bold text-slate-950">
                  {selectedCustomer.name}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedCustomer.industry ||
                    "Industry not set"}
                </p>
              </div>

              <HealthBadge
                health={selectedCustomer.health}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <MiniMetric
                title="Relationship"
                value={`${selectedCustomer.relationship_score}/100`}
              />
              <MiniMetric
                title="Pipeline"
                value={money(
                  selectedCustomer.metrics?.pipeline_value || 0
                )}
              />
              <MiniMetric
                title="Contacts"
                value={String(
                  selectedCustomer.metrics?.contacts || 0
                )}
              />
              <MiniMetric
                title="Open Tickets"
                value={String(
                  selectedCustomer.metrics?.open_tickets || 0
                )}
              />
            </div>

            <p className="text-xs font-bold text-slate-400 mt-5">
              Primary Contact
            </p>
            <p className="text-sm font-bold text-slate-900 mt-1">
              {getPrimaryContactName(selectedCustomer) ||
                "No primary contact"}
            </p>

            <button
              type="button"
              onClick={onCreateOpportunity}
              className="w-full mt-4 bg-violet-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-violet-700 transition"
            >
              Add Opportunity
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-500 mt-3">
            Select a customer to review its live profile.
          </p>
        )}
      </div>

      <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Selected Opportunity
        </p>

        {selectedOpportunity ? (
          <>
            <button
              type="button"
              onClick={() =>
                onSelectCustomer(
                  selectedOpportunity.customer.id
                )
              }
              className="text-left"
            >
              <h3 className="text-lg font-bold text-slate-950 mt-3">
                {selectedOpportunity.title}
              </h3>
              <p className="text-sm text-violet-700 font-bold mt-1">
                {selectedOpportunity.customer.name}
              </p>
            </button>

            <p className="text-2xl font-bold text-slate-950 mt-4">
              {money(selectedOpportunity.value)}
            </p>

            <label className="block text-xs font-bold text-slate-500 mt-5">
              Pipeline Stage
            </label>

            <select
              value={selectedOpportunity.stage}
              disabled={
                updatingOpportunityId ===
                selectedOpportunity.id
              }
              onChange={(event) =>
                onMove(
                  selectedOpportunity.id,
                  event.target.value as OpportunityStage
                )
              }
              className="w-full mt-2 border border-slate-200 rounded-xl px-3 py-3 bg-white outline-none focus:border-violet-500 disabled:bg-slate-100"
            >
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {formatLabel(stage)}
                </option>
              ))}
            </select>

            <p className="text-xs text-slate-500 mt-3">
              {selectedOpportunity.probability}% probability
              {selectedOpportunity.owner
                ? ` · Owner: ${selectedOpportunity.owner}`
                : ""}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500 mt-3">
            Select an opportunity from the pipeline to manage
            it here.
          </p>
        )}
      </div>

      <div className="mt-4 bg-slate-950 text-white rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-300">
          AI Quick Actions
        </p>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {[
            { label: "Summarize", action: "summary" },
            { label: "Draft Email", action: "follow_up" },
            { label: "Next Action", action: "next_action" },
            { label: "Proposal", action: "proposal" },
          ].map((item) => (
            <button
              key={item.action}
              type="button"
              onClick={() =>
                runQuickAction(item.action as CustomerSonnyAction)
              }
              disabled={!workspaceId || sonnyWorking !== null}
              className="rounded-xl bg-white/10 px-3 py-3 text-xs font-bold hover:bg-white/15 transition disabled:opacity-50"
            >
              {sonnyWorking === item.action
                ? "Working..."
                : item.label}
            </button>
          ))}
        </div>

        {sonnyError && (
          <p className="mt-4 rounded-xl bg-rose-500/15 p-3 text-xs leading-5 text-rose-200">
            {sonnyError}
          </p>
        )}

        {sonnyResponse && (
          <div className="mt-4 rounded-xl bg-white/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-300">
              Sonny Response
            </p>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-200">
              {sonnyResponse}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-[360px] flex items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-violet-600 animate-spin mx-auto" />
        <p className="font-bold text-slate-950 mt-4">
          Loading Customer Hub
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Reading live PostgreSQL customer intelligence...
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

function Field({
  value,
  placeholder,
  onChange,
  type = "text",
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
    />
  );
}

function MiniMetric({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-400">
        {title}
      </p>
      <p className="font-bold text-slate-950 mt-1">
        {value}
      </p>
    </div>
  );
}

function HealthBadge({
  health,
}: {
  health: Customer["health"];
}) {
  const tone =
    health === "excellent"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : health === "healthy"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : health === "attention"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}
    >
      {formatLabel(health)}
    </span>
  );
}

function SimpleBadge({
  value,
}: {
  value: string;
}) {
  return (
    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
      {formatLabel(value)}
    </span>
  );
}

function getPrimaryContactName(customer: Customer) {
  const contacts = customer.contacts || [];
  const contact =
    contacts.find((item) => item.is_primary) ||
    contacts[0];

  if (!contact) return "";

  return [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(" ");
}

function formatLabel(value?: string | null) {
  if (!value) return "Not Set";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(value?: string | null) {
  if (!value) return "Date unavailable";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}
