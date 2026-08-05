import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { aiAgents } from "../data/aiAgents";
import { pricing, toAED } from "../data/pricing";
import {
  getActiveWorkspace,
} from "../utils/workspaceContext";
import {
  buildFirmicOrder,
  getConfirmedOrder,
  savePendingOrder,
} from "../utils/orderStorage";
import {
  getPlanEntitlement,
  isAddonIncluded,
} from "../utils/planEntitlements";

type Headquarters = {
  office_id?: string | number | null;
  office_code: string;
  office_name?: string;
  location: string;
  status?: string;
  monthly_price_usd?: number;
};

type Addon = {
  name: string;
  usd: number;
  description: string;
};

type Agent = {
  name: string;
  role?: string;
  description?: string;
  price: number;
};

const addons: Addon[] = [
  {
    name: pricing.mailbox.name,
    usd: pricing.mailbox.usd,
    description: "Digital company mailroom and document intake.",
  },
  {
    name: pricing.voip.name,
    usd: pricing.voip.usd,
    description: "Company number and business communications.",
  },
  {
    name: pricing.meetingRooms.name,
    usd: pricing.meetingRooms.usd,
    description: "Meeting-room access and booking capability.",
  },
  {
    name: pricing.zoom.name,
    usd: pricing.zoom.usd,
    description: "Video meetings for the company and workforce.",
  },
  {
    name: pricing.crm.name,
    usd: pricing.crm.usd,
    description: "Customer and sales relationship management.",
  },
  {
    name: pricing.microsoft365.name,
    usd: pricing.microsoft365.usd,
    description: "Business email and Microsoft productivity tools.",
  },
];

export default function ConfigureOffice() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState(
    () => getActiveWorkspace(),
  );
  const [headquarters, setHeadquarters] =
    useState<Headquarters | null>(null);
  const [selectedAddons, setSelectedAddons] =
    useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] =
    useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const currentWorkspace = getActiveWorkspace();
    setWorkspace(currentWorkspace);

    if (!currentWorkspace?.id) {
      router.replace(
        "/login?next=/configure-office",
      );
      return;
    }

    let selectedHeadquarters =
      currentWorkspace.headquarters as
        | Headquarters
        | null
        | undefined;

    if (!selectedHeadquarters?.office_code) {
      try {
        selectedHeadquarters = JSON.parse(
          localStorage.getItem(
            "firmic_selected_headquarters",
          ) || "null",
        ) as Headquarters | null;
      } catch {
        selectedHeadquarters = null;
      }
    }

    if (!selectedHeadquarters?.office_code) {
      router.replace("/headquarters?onboarding=1");
      return;
    }

    setHeadquarters(selectedHeadquarters);

    const plan = getPlanEntitlement(
      currentWorkspace.plan,
    );

    const initialAddons = addons
      .filter((addon) =>
        plan.includedAddons.includes(addon.name),
      )
      .map((addon) => addon.name);

    const initialAgentCount =
      plan.includedAIWorkers === "unlimited"
        ? aiAgents.length
        : Math.min(
            plan.includedAIWorkers,
            aiAgents.length,
          );

    setSelectedAddons(initialAddons);
    setSelectedAgents(
      aiAgents
        .slice(0, initialAgentCount)
        .map((agent) => agent.name),
    );
    setReady(true);
  }, [router]);

  const plan = useMemo(
    () => getPlanEntitlement(workspace?.plan),
    [workspace?.plan],
  );

  const includedAgentAllowance =
    plan.includedAIWorkers;

  const includedSelectedAgents = useMemo(() => {
    if (includedAgentAllowance === "unlimited") {
      return aiAgents.filter((agent) =>
        selectedAgents.includes(agent.name),
      );
    }

    return aiAgents
      .filter((agent) =>
        selectedAgents.includes(agent.name),
      )
      .slice(0, includedAgentAllowance);
  }, [includedAgentAllowance, selectedAgents]);

  const extraSelectedAgents = useMemo(() => {
    if (includedAgentAllowance === "unlimited") {
      return [];
    }

    return aiAgents
      .filter((agent) =>
        selectedAgents.includes(agent.name),
      )
      .slice(includedAgentAllowance);
  }, [includedAgentAllowance, selectedAgents]);

  const includedSelectedAddons = addons.filter(
    (addon) =>
      selectedAddons.includes(addon.name) &&
      isAddonIncluded(workspace?.plan, addon.name),
  );

  const paidSelectedAddons = addons.filter(
    (addon) =>
      selectedAddons.includes(addon.name) &&
      !isAddonIncluded(workspace?.plan, addon.name),
  );

  const extrasMonthlyUsd =
    paidSelectedAddons.reduce(
      (sum, addon) => sum + addon.usd,
      0,
    ) +
    extraSelectedAgents.reduce(
      (sum, agent) => sum + agent.price,
      0,
    );

  const monthlySubtotalUsd =
    plan.monthlyPriceUsd + extrasMonthlyUsd;

  const vatUsd = Number(
    (monthlySubtotalUsd * 0.05).toFixed(2),
  );

  const monthlyTotalUsd = Number(
    (monthlySubtotalUsd + vatUsd).toFixed(2),
  );

  function toggleAddon(addon: Addon) {
    if (
      isAddonIncluded(workspace?.plan, addon.name)
    ) {
      return;
    }

    setSelectedAddons((current) =>
      current.includes(addon.name)
        ? current.filter(
            (name) => name !== addon.name,
          )
        : [...current, addon.name],
    );
  }

  function toggleAgent(agent: Agent) {
    setSelectedAgents((current) => {
      if (current.includes(agent.name)) {
        return current.filter(
          (name) => name !== agent.name,
        );
      }

      return [...current, agent.name];
    });
  }

  async function continueToCheckout() {
    const currentWorkspace = getActiveWorkspace();

    if (
      !currentWorkspace?.id ||
      !headquarters?.office_code
    ) {
      await router.push(
        "/headquarters?onboarding=1",
      );
      return;
    }

    const previousOrder = getConfirmedOrder(
      String(currentWorkspace.id),
    );

    const order = buildFirmicOrder({
      companyId: String(currentWorkspace.id),
      headquarters,
      planCode: currentWorkspace.plan,
      selectedAddons: paidSelectedAddons,
      selectedAgents: extraSelectedAgents,
      includedAddons: includedSelectedAddons,
      includedAgents: includedSelectedAgents,
      includeHookupFee:
        !currentWorkspace.headquarters?.office_code,
      previousOrder,
    });

    savePendingOrder(order);
    await router.push("/checkout");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f7f8] text-[#09233d]">
        <p className="font-black">
          Preparing company configuration...
        </p>
      </div>
    );
  }

  const includedLabel =
    includedAgentAllowance === "unlimited"
      ? "Unlimited AI workforce included"
      : `${includedAgentAllowance} AI workers included`;

  return (
    <div className="min-h-screen bg-[#f3f7f8] px-5 py-8 text-[#09233d] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1450px]">
        <header className="rounded-[2rem] bg-[#09233d] p-7 text-white shadow-[0_24px_70px_rgba(9,35,61,0.18)] sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.17em] text-[#8de6e2]">
            Firmic Launch Engine
          </p>

          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                Configure {workspace?.name}
              </h1>

              <p className="mt-4 max-w-3xl text-lg leading-8 text-white/65">
                Your headquarters and plan entitlements are
                already included. Add only the optional capacity
                your company needs beyond the selected plan.
              </p>
            </div>

            <div className="rounded-2xl border border-white/12 bg-white/8 px-5 py-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8de6e2]">
                {plan.name} plan
              </p>
              <p className="mt-1 text-2xl font-black">
                ${plan.monthlyPriceUsd}/month
              </p>
              <p className="mt-1 text-sm font-bold text-white/55">
                {includedLabel}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            <section className="rounded-[2rem] border border-[#09233d]/10 bg-white p-6 shadow-[0_18px_55px_rgba(9,35,61,0.06)] sm:p-8">
              <SectionHeader
                eyebrow="Headquarters"
                title={headquarters?.office_code || "Selected"}
                description={
                  headquarters?.location ||
                  "Firmic headquarters"
                }
              />

              <div className="mt-6 rounded-[1.5rem] border border-[#0f8f91]/15 bg-[#0f8f91]/5 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black">
                      Firmic Virtual Headquarters
                    </p>
                    <p className="mt-1 text-sm text-[#60798b]">
                      Business address, company identity and
                      launch infrastructure.
                    </p>
                  </div>

                  <IncludedBadge
                    label={`Included with ${plan.name}`}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#09233d]/10 bg-white p-6 shadow-[0_18px_55px_rgba(9,35,61,0.06)] sm:p-8">
              <SectionHeader
                eyebrow="Business Infrastructure"
                title="Configure company tools"
                description="Business and Enterprise include the full operating stack. Starter pays only for optional tools outside its included package."
              />

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                {addons.map((addon) => {
                  const included = isAddonIncluded(
                    workspace?.plan,
                    addon.name,
                  );
                  const selected =
                    selectedAddons.includes(addon.name);

                  return (
                    <button
                      key={addon.name}
                      type="button"
                      onClick={() => toggleAddon(addon)}
                      disabled={included}
                      className={[
                        "rounded-[1.4rem] border p-5 text-left transition",
                        included
                          ? "cursor-default border-[#0f8f91]/20 bg-[#0f8f91]/5"
                          : selected
                            ? "border-[#0f8f91] bg-[#0f8f91]/5 ring-4 ring-[#0f8f91]/8"
                            : "border-[#09233d]/10 bg-[#f8fbfb] hover:border-[#0f8f91]/40",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black">
                            {addon.name}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[#698296]">
                            {addon.description}
                          </p>
                        </div>

                        {included ? (
                          <IncludedBadge label="Included" />
                        ) : (
                          <span className="text-xl font-black text-[#0f8f91]">
                            {selected ? "✓" : "+"}
                          </span>
                        )}
                      </div>

                      {!included && (
                        <p className="mt-4 text-sm font-black">
                          ${addon.usd}/month
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#09233d]/10 bg-white p-6 shadow-[0_18px_55px_rgba(9,35,61,0.06)] sm:p-8">
              <SectionHeader
                eyebrow="AI Workforce"
                title="Assemble your operating team"
                description={
                  includedAgentAllowance === "unlimited"
                    ? "Every AI worker is included with Enterprise."
                    : `Your first ${includedAgentAllowance} selected AI workers are included. Only workers beyond that allowance add to the monthly price.`
                }
              />

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                {(aiAgents as Agent[]).map(
                  (agent) => {
                    const selected =
                      selectedAgents.includes(agent.name);
                    const selectedPosition =
                      selectedAgents.indexOf(agent.name);
                    const included =
                      selected &&
                      (includedAgentAllowance ===
                        "unlimited" ||
                        selectedPosition <
                          includedAgentAllowance);

                    return (
                      <button
                        key={agent.name}
                        type="button"
                        onClick={() =>
                          toggleAgent(agent)
                        }
                        className={[
                          "rounded-[1.4rem] border p-5 text-left transition",
                          selected
                            ? "border-[#0f8f91] bg-[#0f8f91]/5 ring-4 ring-[#0f8f91]/8"
                            : "border-[#09233d]/10 bg-[#f8fbfb] hover:border-[#0f8f91]/40",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-black">
                              {agent.name}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[#698296]">
                              {agent.description ||
                                agent.role ||
                                "AI employee for company operations."}
                            </p>
                          </div>

                          <span className="text-xl font-black text-[#0f8f91]">
                            {selected ? "✓" : "+"}
                          </span>
                        </div>

                        <div className="mt-4">
                          {included ? (
                            <IncludedBadge label="Included" />
                          ) : selected ? (
                            <p className="text-sm font-black">
                              ${agent.price}/month extra
                            </p>
                          ) : (
                            <p className="text-sm font-bold text-[#698296]">
                              Select to add
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </section>
          </div>

          <aside className="xl:sticky xl:top-8 xl:self-start">
            <div className="rounded-[2rem] bg-[#09233d] p-7 text-white shadow-[0_24px_70px_rgba(9,35,61,0.2)]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8de6e2]">
                Live Total
              </p>

              <div className="mt-6 space-y-5">
                <SummaryRow
                  label={`${plan.name} Plan`}
                  value={`$${plan.monthlyPriceUsd}`}
                />
                <SummaryRow
                  label="Headquarters"
                  value="Included"
                />
                <SummaryRow
                  label="Included AI Workers"
                  value={
                    includedAgentAllowance ===
                    "unlimited"
                      ? "Unlimited"
                      : String(
                          includedSelectedAgents.length,
                        )
                  }
                />
                <SummaryRow
                  label="Paid AI Extras"
                  value={
                    extraSelectedAgents.length
                      ? `$${extraSelectedAgents
                          .reduce(
                            (sum, agent) =>
                              sum + agent.price,
                            0,
                          )
                          .toFixed(2)}`
                      : "$0"
                  }
                />
                <SummaryRow
                  label="Paid Tool Extras"
                  value={
                    paidSelectedAddons.length
                      ? `$${paidSelectedAddons
                          .reduce(
                            (sum, addon) =>
                              sum + addon.usd,
                            0,
                          )
                          .toFixed(2)}`
                      : "$0"
                  }
                />
              </div>

              <div className="mt-6 border-t border-white/10 pt-6">
                <p className="text-sm text-white/55">
                  Monthly subtotal
                </p>
                <p className="mt-1 text-3xl font-black">
                  ${monthlySubtotalUsd.toFixed(2)}
                </p>
                <p className="mt-1 text-sm font-bold text-white/45">
                  AED {toAED(monthlySubtotalUsd)}
                </p>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-white/55">
                    VAT 5%
                  </span>
                  <span className="font-black">
                    ${vatUsd.toFixed(2)}
                  </span>
                </div>

                <div className="mt-5 rounded-2xl bg-white/8 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8de6e2]">
                    Monthly total
                  </p>
                  <p className="mt-2 text-4xl font-black">
                    ${monthlyTotalUsd.toFixed(2)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={continueToCheckout}
                className="mt-6 w-full rounded-2xl bg-[#20b9b5] px-6 py-4 font-black text-[#09233d] transition hover:-translate-y-0.5 hover:bg-[#38cbc7]"
              >
                Continue to Activation Checkout →
              </button>

              <p className="mt-4 text-xs leading-5 text-white/45">
                A one-time $49 hookup fee is added only
                during initial activation.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
        {title}
      </h2>
      <p className="mt-3 max-w-3xl leading-7 text-[#60798b]">
        {description}
      </p>
    </div>
  );
}

function IncludedBadge({
  label,
}: {
  label: string;
}) {
  return (
    <span className="inline-flex shrink-0 rounded-full bg-[#dff7ed] px-3 py-1.5 text-xs font-black text-[#08785b]">
      {label}
    </span>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-white/55">
        {label}
      </span>
      <span className="text-sm font-black">
        {value}
      </span>
    </div>
  );
}
