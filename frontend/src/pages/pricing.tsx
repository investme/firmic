import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

type Plan = {
  name: string;
  monthly: number;
  description: string;
  featured?: boolean;
  cta: string;
  highlights: string[];
};

const plans: Plan[] = [
  {
    name: "Starter",
    monthly: 149,
    description:
      "For founders and smaller companies getting started with Firmic.",
    cta: "Choose Starter",
    highlights: [
      "Firmic company platform",
      "Virtual company services",
      "Sonny access",
      "Core AI capabilities",
      "Included AI execution allowance",
    ],
  },
  {
    name: "Business",
    monthly: 399,
    description:
      "For growing companies that need broader operations, automation, AI capabilities and company services.",
    featured: true,
    cta: "Choose Business",
    highlights: [
      "Everything in Starter",
      "Broader AI capabilities",
      "Advanced workflows",
      "Expanded company operations",
      "Higher AI execution allowance",
    ],
  },
  {
    name: "Enterprise",
    monthly: 999,
    description:
      "For larger organizations that need advanced governance, integrations, scaling and higher usage.",
    cta: "Choose Enterprise",
    highlights: [
      "Everything in Business",
      "Advanced governance",
      "Expanded integrations",
      "Higher usage limits",
      "Enterprise support options",
    ],
  },
];

const comparisonGroups = [
  {
    title: "Company Infrastructure",
    items: [
      "Virtual headquarters",
      "Business mail",
      "Communications",
      "Documents",
      "Company services",
    ],
  },
  {
    title: "AI & Automation",
    items: [
      "Sonny",
      "Specialized AI capabilities",
      "Workflows",
      "Automation",
      "Integrations",
    ],
  },
  {
    title: "Governance & Control",
    items: [
      "Permissions",
      "Approval workflows",
      "Auditability",
      "Usage controls",
      "Company-level access boundaries",
    ],
  },
];

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PricingPage() {
  const [annualBilling, setAnnualBilling] = useState(false);

  function getPricing(plan: Plan) {
    if (!annualBilling) {
      return {
        headline: formatMoney(plan.monthly),
        suffix: "/month",
        detail: "",
      };
    }

    const discountedMonthly = plan.monthly * 0.8;
    const annualTotal = discountedMonthly * 12;

    return {
      headline: formatMoney(discountedMonthly),
      suffix: "/month equivalent",
      detail: `${formatMoney(annualTotal)} billed yearly`,
    };
  }

  return (
    <>
      <Head>
        <title>Firmic Pricing</title>
        <meta
          name="description"
          content="Choose a Firmic plan with monthly flexibility or save 20% with annual billing."
        />
      </Head>

      <main className="min-h-screen bg-[#fbfbfa] text-[#1d1d1f]">
        {/* NAV */}
        <header className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.06] bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-5 lg:px-9">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4baa36] text-lg font-black text-white">
                F
              </div>

              <span className="text-[1.35rem] font-black tracking-[-0.04em]">
                FIRMIC
              </span>
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-semibold text-[#555b63] md:flex">
              <Link href="/platform">Platform</Link>
              <Link href="/#workforce">Capabilities</Link>
              <Link href="/#solutions">Solutions</Link>
              <Link href="/pricing" className="text-[#1d1d1f]">
                Pricing
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="hidden text-sm font-semibold text-[#4f555d] sm:block"
              >
                Sign In
              </Link>

              <Link
                href="/create-company"
                className="rounded-md bg-[#4baa36] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#429832]"
              >
                Create Your Company
              </Link>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="px-5 pb-16 pt-36 lg:px-9 lg:pb-20 lg:pt-40">
          <div className="mx-auto max-w-[1180px]">
            <div className="max-w-[760px]">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#4baa36]">
                Pricing
              </p>

              <h1 className="mt-5 text-[3rem] font-semibold leading-[1.04] tracking-[-0.052em] sm:text-[3.8rem] lg:text-[4.4rem]">
                Choose the plan that fits
                <span className="block text-[#4baa36]">
                  your company.
                </span>
              </h1>

              <p className="mt-6 max-w-[680px] text-lg leading-8 text-[#6f7680]">
                Keep monthly flexibility or save 20% with annual billing.
                Every plan includes Firmic company services and an AI execution
                allowance.
              </p>
            </div>

            {/* BILLING TOGGLE */}
            <div className="mt-9 inline-flex rounded-full border border-black/[0.07] bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setAnnualBilling(false)}
                className={`rounded-full px-5 py-2.5 text-xs font-semibold transition ${
                  !annualBilling
                    ? "bg-[#1d1d1f] text-white"
                    : "text-[#686e76] hover:text-black"
                }`}
              >
                Monthly
              </button>

              <button
                type="button"
                onClick={() => setAnnualBilling(true)}
                className={`rounded-full px-5 py-2.5 text-xs font-semibold transition ${
                  annualBilling
                    ? "bg-[#4baa36] text-white"
                    : "text-[#686e76] hover:text-black"
                }`}
              >
                Yearly · Save 20%
              </button>
            </div>
          </div>
        </section>

        {/* PLAN CARDS */}
        <section className="px-5 pb-24 lg:px-9">
          <div className="mx-auto grid max-w-[1180px] gap-5 lg:grid-cols-3">
            {plans.map((plan) => {
              const pricing = getPricing(plan);

              return (
                <article
                  key={plan.name}
                  className={`relative flex h-full flex-col rounded-[28px] p-8 ${
                    plan.featured
                      ? "border-2 border-[#4baa36] bg-white shadow-[0_20px_55px_rgba(75,170,54,.11)]"
                      : "border border-black/[0.07] bg-white"
                  }`}
                >
                  {plan.featured && (
                    <span className="absolute right-6 top-6 rounded-full bg-[#4baa36] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                      Most Popular
                    </span>
                  )}

                  <p className="text-sm font-bold">{plan.name}</p>

                  <div className="mt-7 flex items-end gap-2">
                    <p className="text-5xl font-semibold tracking-[-0.05em]">
                      {pricing.headline}
                    </p>
                    <span className="pb-1 text-xs text-[#7b8189]">
                      {pricing.suffix}
                    </span>
                  </div>

                  {pricing.detail && (
                    <p className="mt-2 text-xs font-semibold text-[#4baa36]">
                      {pricing.detail}
                    </p>
                  )}

                  <p className="mt-6 min-h-[72px] text-sm leading-7 text-[#6f7680]">
                    {plan.description}
                  </p>

                  <div className="my-7 h-px bg-black/[0.07]" />

                  <div className="space-y-3">
                    {plan.highlights.map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 text-sm text-[#4f555d]"
                      >
                        <span className="mt-[2px] text-[#4baa36]">✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/create-company"
                    className={`mt-auto block rounded-lg px-5 py-3.5 text-center text-sm font-bold transition ${
                      plan.featured
                        ? "bg-[#4baa36] text-white hover:bg-[#429832]"
                        : "bg-[#f4f5f3] text-[#2e3338] hover:bg-[#eceeeb]"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </article>
              );
            })}
          </div>

          <div className="mx-auto mt-7 max-w-[1180px] rounded-[20px] border border-black/[0.06] bg-[#f5f6f4] px-6 py-5 text-center">
            <p className="text-sm font-semibold text-[#3e444a]">
              $79 one-time Company Launch Fee
            </p>

            <p className="mt-2 text-xs leading-5 text-[#777e86]">
              Company setup and provisioning are charged once. AI execution
              allowance is included with each plan; additional usage may be
              metered.
            </p>
          </div>
        </section>

        {/* WHAT'S INCLUDED */}
        <section className="border-y border-black/[0.05] bg-white px-5 py-24 lg:px-9">
          <div className="mx-auto max-w-[1180px]">
            <div className="max-w-[720px]">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#4baa36]">
                Included with Firmic
              </p>

              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                More than a subscription.
              </h2>

              <p className="mt-5 max-w-[640px] text-base leading-7 text-[#707780]">
                Firmic combines the company services, AI capabilities and
                controls needed to operate an AI-native business.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {comparisonGroups.map((group) => (
                <article
                  key={group.title}
                  className="rounded-[24px] border border-black/[0.07] bg-[#fbfbfa] p-7"
                >
                  <h3 className="text-xl font-semibold tracking-[-0.03em]">
                    {group.title}
                  </h3>

                  <div className="mt-7 space-y-3">
                    {group.items.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 rounded-xl bg-white px-4 py-3"
                      >
                        <span className="text-[#4baa36]">✓</span>
                        <span className="text-sm font-semibold text-[#555b63]">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* BILLING CLARITY */}
        <section className="px-5 py-24 lg:px-9">
          <div className="mx-auto grid max-w-[1100px] gap-8 lg:grid-cols-2">
            <article className="rounded-[28px] border border-black/[0.07] bg-white p-8">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4baa36]">
                Monthly
              </p>

              <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
                Flexibility first.
              </h3>

              <p className="mt-5 text-sm leading-7 text-[#707780]">
                Pay month to month and keep the freedom to adjust your Firmic
                plan as your company changes.
              </p>
            </article>

            <article className="rounded-[28px] border border-[#4baa36]/30 bg-[#f2f8ef] p-8">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4baa36]">
                Yearly
              </p>

              <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
                Save 20%.
              </h3>

              <p className="mt-5 text-sm leading-7 text-[#707780]">
                Commit annually and receive a 20% discount on the plan
                subscription while keeping the same Firmic company environment.
              </p>
            </article>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-black/[0.05] bg-[#f5f6f4] px-5 py-24 text-center lg:px-9">
          <div className="mx-auto max-w-[760px]">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#4baa36]">
              Firmic
            </p>

            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Create Your Company.
              <span className="block text-[#4baa36]">
                Firmic Makes It Work.
              </span>
            </h2>

            <Link
              href="/create-company"
              className="mt-8 inline-flex rounded-md bg-[#4baa36] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#429832]"
            >
              Create Your Company →
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-black/[0.06] bg-white px-5 py-10 lg:px-9">
          <div className="mx-auto flex max-w-[1180px] flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <Link href="/" className="font-black tracking-[-0.04em]">
              FIRMIC
            </Link>

            <p className="text-xs text-[#8b9097]">
              Create Your Company. Firmic Makes It Work.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
