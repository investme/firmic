import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

const launchHref = "/create-company";
const loginHref = "/login";

const departments = [
  {
    name: "FINANCE",
    accent: "#34c759",
    initials: "FA",
    roles: [
      "Invoice Processing Agent",
      "Financial Reporting Agent",
      "Accounting Agent",
    ],
  },
  {
    name: "ENGINEERING",
    accent: "#0071e3",
    initials: "EN",
    roles: [
      "Autonomous Engineer",
      "QA Engineer",
      "DevOps Engineer",
    ],
  },
  {
    name: "DATA",
    accent: "#8e5bd9",
    initials: "DA",
    roles: [
      "Data Analyst",
      "BI Analyst",
      "Research Analyst",
    ],
  },
  {
    name: "OPERATIONS",
    accent: "#ff9500",
    initials: "OP",
    roles: [
      "Operations Analyst",
      "Procurement Agent",
      "Project Coordinator",
    ],
  },
  {
    name: "GROWTH",
    accent: "#8e44cc",
    initials: "JU",
    roles: [
      "Julia · Growth Officer",
      "Sales Agent",
      "SEO Agent",
    ],
  },
  {
    name: "COMPLIANCE",
    accent: "#00a889",
    initials: "HE",
    roles: [
      "Hermes · Compliance Officer",
      "Risk Assessment Agent",
      "Policy & Audit Agent",
    ],
  },
];

const industries = [
  ["↗", "Finance & Accounting"],
  ["</>", "Engineering & Technology"],
  ["♡", "Healthcare"],
  ["◉", "Pharmaceuticals"],
  ["⚖", "Legal"],
  ["▥", "Real Estate"],
  ["•••", "And More"],
];

const infrastructure = [
  ["▣", "Company Formation", "Legal entity & compliance"],
  ["⌖", "Headquarters", "Virtual office & workspace"],
  ["◫", "Communications", "Email, phone & meetings"],
  ["▤", "Documents", "Storage, sharing & collaboration"],
  ["⬡", "Compliance", "Policies, approvals & audit trails"],
  ["▦", "Billing", "Invoices, payments & subscriptions"],
];

const plans = [
  {
    name: "Starter",
    price: "$149",
    description: "For founders building their first AI-native company.",
  },
  {
    name: "Business",
    price: "$399",
    description: "For growing companies that need a broader operating platform, deeper automation and advanced AI capabilities.",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "$999",
    description: "For larger agentic organizations and advanced governance.",
  },
];

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

function ProfessorPortrait({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden border border-black/[0.06] bg-[#f7f7f5] shadow-[0_16px_40px_rgba(0,0,0,.08)] ${
        compact
          ? "h-12 w-12 rounded-full"
          : "h-[420px] w-[360px] rounded-[180px_180px_40px_40px] sm:h-[500px] sm:w-[420px]"
      }`}
    >
      <Image
        src="/agents/sonny-canonical-v1.png"
        alt="Sonny, Firmic AI Chief Operating Officer"
        fill
        unoptimized
        priority={!compact}
        sizes={compact ? "48px" : "(max-width: 640px) 192px, 280px"}
        className={
          compact
            ? "object-cover object-top"
            : "object-contain object-bottom"
        }
      />
    </div>
  );
}

function EmployeePortrait({
  initials,
}: {
  initials: string;
}) {
  return (
    <div className="relative mx-auto h-[145px] w-[120px]">
      <div className="absolute left-1/2 top-1 h-[70px] w-[70px] -translate-x-1/2 rounded-full bg-[linear-gradient(145deg,#c7a180,#edc5a2)]" />
      <div className="absolute bottom-0 left-1/2 h-[90px] w-[112px] -translate-x-1/2 rounded-t-[55px] bg-[linear-gradient(160deg,#f4f4f4,#d9dde1)]" />
      <div className="absolute left-1/2 top-[42px] -translate-x-1/2 text-[10px] font-black text-black/30">
        {initials}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [sonnyOpen, setSonnyOpen] = useState(false);
  const [visitorQuestion, setVisitorQuestion] = useState("");
  const [annualBilling, setAnnualBilling] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);

    onScroll();
    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function submitSonny(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const question = String(formData.get("question") || "").trim();

    if (!question) return;

    setVisitorQuestion(question);
    form.reset();
  }

  function displayPlanPrice(price: string) {
    const monthly = Number(price.replace("$", ""));

    if (!annualBilling) {
      return {
        price: `$${monthly}`,
        suffix: "/month",
        detail: "",
      };
    }

    const discountedMonthly = monthly * 0.8;
    const annualTotal = monthly * 12 * 0.8;

    return {
      price: `$${discountedMonthly.toFixed(2)}`,
      suffix: "/month equivalent",
      detail: `$${annualTotal.toFixed(2)} billed yearly`,
    };
  }

  const navigation = [
    ["Platform", "#platform"],
    ["Capabilities", "#workforce"],
    ["Solutions", "#solutions"],
    ["Pricing", "/pricing"],
  ];

  return (
    <div className="min-h-screen bg-white text-[#16181b] selection:bg-[#48a936] selection:text-white">
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        body {
          background: #fff;
        }

        @keyframes softFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }

        .soft-float {
          animation: softFloat 7s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }

          .soft-float {
            animation: none !important;
          }
        }
      `}</style>

      <header
        className={`fixed inset-x-0 top-0 z-50 transition ${
          scrolled
            ? "border-b border-black/[0.07] bg-white/90 backdrop-blur-xl"
            : "bg-white"
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-[1420px] items-center justify-between px-5 lg:px-9">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#4ead3b] text-sm font-black text-[#4ead3b]">
              F
            </div>

            <span className="text-xl font-black tracking-[0.08em]">
              FIRMIC
            </span>
          </Link>

          <nav className="hidden items-center gap-9 lg:flex">
            {navigation.map(([title, id]) => (
              <a
                key={id}
                href={id}
                className="text-[13px] font-medium text-[#36383c] transition hover:text-[#49a838]"
              >
                {title}
              </a>
            ))}

            <a
              href="#platform"
              className="text-[13px] font-medium text-[#36383c]"
            >
              Resources⌄
            </a>
          </nav>

          <div className="hidden items-center gap-6 lg:flex">
            <Link href={loginHref} className="text-[13px] font-medium">
              Sign in
            </Link>

            <Link
              href={launchHref}
              className="rounded-md bg-[#4baa36] px-6 py-3 text-[13px] font-bold text-white shadow-[0_7px_18px_rgba(75,170,54,.22)] transition hover:bg-[#439b30]"
            >
              Build Your Company
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f6f7] lg:hidden"
          >
            {menuOpen ? "×" : "☰"}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-black/[0.06] bg-white p-5 lg:hidden">
            <div className="flex flex-col gap-5">
              {navigation.map(([title, id]) => (
                <a
                  key={id}
                  href={id}
                  onClick={() => setMenuOpen(false)}
                  className="font-semibold"
                >
                  {title}
                </a>
              ))}

              <Link href={loginHref}>Sign in</Link>

              <Link
                href={launchHref}
                className="rounded-lg bg-[#4baa36] px-5 py-3 text-center font-semibold text-white"
              >
                Build Your Company
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* HERO */}
        <section className="border-b border-black/[0.06] px-5 pb-12 pt-36 lg:px-9 lg:pb-14 lg:pt-40">
          <div className="mx-auto grid max-w-[1420px] items-center gap-10 lg:grid-cols-[.92fr_1.08fr]">
            <div className="py-8 lg:py-14">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#48a737]">
                The Agentic Company OS
              </p>

              <h1 className="mt-5 max-w-[650px] text-[2.9rem] font-semibold leading-[1.06] tracking-[-0.05em] sm:text-[3.7rem] lg:text-[4rem]">
                Create Your Company.
                <span className="block text-[#4baa36]">
                  Firmic Makes It Work.
                </span>
              </h1>

              <p className="mt-6 max-w-[620px] text-lg leading-8 text-[#667080]">
                From workforce and communications to mail, compliance,
                operations and intelligent automation, Firmic gives your
                company what it needs to operate and grow.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={launchHref}
                  className="rounded-md bg-[#4baa36] px-7 py-3.5 text-center text-sm font-bold text-white transition hover:bg-[#439b30]"
                >
                  Create Your Company <span className="ml-2"><Arrow /></span>
                </Link>

                <button
                  type="button"
                  onClick={() => setSonnyOpen(true)}
                  className="rounded-md border border-black/[0.11] bg-white px-7 py-3.5 text-sm font-semibold shadow-sm transition hover:bg-[#f7f7f8]"
                >
                  Meet Sonny　▶
                </button>
              </div>

              <div className="mt-9">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#8b919a]">
                  Trusted by innovative companies
                </p>

                <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#737a85]">
                  <span>🚀 Startups</span>
                  <span>▥ Scaleups</span>
                  <span>▤ Enterprises</span>
                  <span>♙ Agencies</span>
                </div>
              </div>
            </div>

            <div className="relative min-h-[520px] overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_40%_40%,#ffffff_0%,#f7f8f8_55%,#eff1f2_100%)] shadow-[0_18px_45px_rgba(0,0,0,.08)]">
              <div className="absolute inset-y-0 left-[4%] flex items-end pb-3">
                <ProfessorPortrait />
              </div>

              <div className="absolute right-10 top-16">
                <p className="text-xl font-bold text-[#4baa36]">
                  SONNY
                </p>
                <p className="mt-2 text-sm text-[#7a8088]">
                  AI Chief Operating Officer
                </p>

                <div className="mt-6 flex items-center gap-2 text-sm text-[#535b64]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#43b83b]" />
                  Online & Orchestrating
                </div>
              </div>

              <div className="absolute bottom-10 right-8 w-[225px] rounded-[18px] border border-black/[0.07] bg-white/95 p-5 shadow-[0_12px_36px_rgba(0,0,0,.09)]">
                <p className="text-base font-semibold">
                  Your Company, Ready to Operate
                </p>

                <div className="mt-5 space-y-3">
                  {[
                    "Employ Your Workforce",
                    "Get Your Calls",
                    "Receive Your Mail",
                    "Run Your Operations",
                    "Stay Compliant",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 text-sm text-[#525963]"
                    >
                      <span className="text-[#48a737]">✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-black/[0.08] pt-4">
                  <p className="text-xs font-semibold text-[#48a737]">
                    Sonny coordinates it all.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFORCE */}
        <section
          id="workforce"
          className="px-5 py-14 lg:px-9 lg:py-16"
        >
          <div className="mx-auto max-w-[1420px]">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-[-0.035em]">
                Make Your Company AI-Native with Firmic.
              </h2>
              <p className="mt-2 text-sm text-[#777e88]">
                Workforce, communications, mail, compliance, operations and intelligent automation — brought together by Firmic.
              </p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {departments.map((department) => (
                <article
                  key={department.name}
                  className="min-h-[330px] rounded-[16px] border border-black/[0.08] bg-white p-5 transition hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(0,0,0,.07)]"
                >
                  <p
                    className="text-xs font-bold"
                    style={{ color: department.accent }}
                  >
                    {department.name}
                  </p>

                  <EmployeePortrait initials={department.initials} />

                  <div className="mt-3 space-y-2">
                    {department.roles.map((role) => (
                      <div
                        key={role}
                        className="flex gap-2 text-[11px] leading-5 text-[#41484f]"
                      >
                        <span style={{ color: department.accent }}>•</span>
                        <span>{role}</span>
                      </div>
                    ))}
                  </div>

                  <div
                    className="mt-3 text-right text-xl"
                    style={{ color: department.accent }}
                  >
                    →
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-7 text-center">
              <a
                href="#platform"
                className="text-sm font-medium text-[#4baa36]"
              >
                Explore Firmic Capabilities　→
              </a>
            </div>
          </div>
        </section>

        {/* HOW */}
        <section className="border-y border-black/[0.05] px-5 py-14 lg:px-9">
          <div className="mx-auto max-w-[1140px]">
            <h2 className="text-center text-3xl font-semibold">
              How Firmic Works
            </h2>

            <div className="mt-10 grid gap-8 md:grid-cols-4">
              {[
                ["🚀", "1. Launch", "Form your company and set up your headquarters in minutes."],
                ["👥", "2. Build Workforce", "Select AI employees from our catalog and build your departments."],
                ["🔗", "3. Connect Tools", "Connect your data, apps, and systems. Firmic handles the integration."],
                ["⚡", "4. Sonny Coordinates", "Sonny orchestrates your workforce to run and grow your business."],
              ].map(([icon, title, text]) => (
                <article key={title} className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f7f8f8] text-2xl shadow-[0_10px_24px_rgba(0,0,0,.06)]">
                    {icon}
                  </div>

                  <h3 className="mt-5 text-sm font-semibold">{title}</h3>

                  <p className="mx-auto mt-3 max-w-[210px] text-xs leading-5 text-[#747b84]">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* INFRASTRUCTURE */}
        <section
          id="platform"
          className="px-5 py-12 lg:px-9"
        >
          <div className="mx-auto max-w-[1220px] text-center">
            <h2 className="text-3xl font-semibold">
              Built on a Complete Company Infrastructure
            </h2>

            <p className="mt-2 text-sm text-[#7c838c]">
              Everything your company needs. All in one platform.
            </p>

            <div className="mt-9 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {infrastructure.map(([icon, title, text]) => (
                <article key={title} className="px-3">
                  <div className="text-2xl text-[#4baa36]">{icon}</div>
                  <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-[#777e88]">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* INDUSTRIES */}
        <section
          id="solutions"
          className="border-t border-black/[0.05] px-5 py-12 lg:px-9"
        >
          <div className="mx-auto max-w-[1220px]">
            <h2 className="text-center text-3xl font-semibold">
              Built for Every Industry
            </h2>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
              {industries.map(([icon, name]) => (
                <article
                  key={name}
                  className="rounded-[14px] border border-black/[0.08] p-5 text-center"
                >
                  <div className="text-2xl text-[#4baa36]">{icon}</div>
                  <p className="mt-4 text-xs font-semibold">{name}</p>
                </article>
              ))}
            </div>

            <p className="mx-auto mt-5 max-w-[860px] text-center text-[10px] leading-5 text-[#9499a0]">
              Healthcare and pharmaceutical workflows are intended for
              administrative, analytical, research, documentation and
              appropriately supervised applications — not autonomous diagnosis,
              prescribing, or independent clinical decisions.
            </p>
          </div>
        </section>

        {/* PRICING */}
        <section
          id="pricing"
          className="bg-[#f6f7f7] px-5 py-16 lg:px-9"
        >
          <div className="mx-auto max-w-[1080px]">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#4baa36]">
                Pricing
              </p>

              <h2 className="mt-3 text-3xl font-semibold">
                Choose the plan that fits your company.
              </h2>

              <p className="mx-auto mt-3 max-w-[650px] text-sm leading-6 text-[#747b84]">
                Choose monthly flexibility or save 20% with annual billing.
                Every plan includes an AI execution allowance, with additional
                usage controlled and metered.
              </p>

              <div className="mt-7 flex justify-center">
                <div className="inline-flex rounded-full border border-black/[0.07] bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setAnnualBilling(false)}
                    className={`rounded-full px-5 py-2.5 text-xs font-semibold transition ${
                      !annualBilling
                        ? "bg-[#1d1d1f] text-white"
                        : "text-[#6f7680] hover:text-black"
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
                        : "text-[#6f7680] hover:text-black"
                    }`}
                  >
                    Yearly · Save 20%
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className={`relative rounded-[20px] p-7 ${
                    plan.featured
                      ? "border-2 border-[#4baa36] bg-white shadow-[0_16px_40px_rgba(75,170,54,.10)]"
                      : "border border-black/[0.08] bg-white"
                  }`}
                >
                  {plan.featured && (
                    <span className="absolute right-5 top-5 rounded-full bg-[#4baa36] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-white">
                      Most Popular
                    </span>
                  )}

                  <p className="text-sm font-semibold">{plan.name}</p>

                  {(() => {
                    const pricing = displayPlanPrice(plan.price);

                    return (
                      <>
                        <div className="mt-6 flex items-end gap-2">
                          <p className="text-4xl font-semibold">
                            {pricing.price}
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
                      </>
                    );
                  })()}

                  <p className="mt-5 min-h-[48px] text-sm leading-6 text-[#6f7680]">
                    {plan.description}
                  </p>

                  <Link
                    href={launchHref}
                    className={`mt-7 block rounded-lg px-5 py-3 text-center text-sm font-semibold ${
                      plan.featured
                        ? "bg-[#4baa36] text-white"
                        : "bg-[#f4f5f5] text-[#34383d]"
                    }`}
                  >
                    Choose {plan.name}
                  </Link>
                </article>
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-[#838991]">
              $79 one-time Company Launch Fee · AI execution allowance included
              · Additional AI usage may be metered
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/[0.06] px-5 py-9 lg:px-9">
        <div className="mx-auto flex max-w-[1220px] flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-black tracking-[0.1em]">FIRMIC</p>
            <p className="mt-1 text-xs text-[#81868d]">
              The operating system for agentic companies.
            </p>
          </div>

          <div className="flex flex-wrap gap-6 text-xs text-[#697079]">
            <a href="#platform">Platform</a>
            <a href="#workforce">AI Workforce</a>
            <a href="#solutions">Solutions</a>
            <a href="#pricing">Pricing</a>
            <Link href={loginHref}>Sign in</Link>
          </div>

          <p className="text-xs text-[#92979d]">
            © {new Date().getFullYear()} Firmic · Abu Dhabi, UAE
          </p>
        </div>
      </footer>

      {/* Public Sonny presentation layer only */}
      <div className="fixed bottom-5 right-5 z-[80] sm:bottom-7 sm:right-7">
        {sonnyOpen && (
          <div className="mb-3 w-[calc(100vw-40px)] max-w-[330px] overflow-hidden rounded-[20px] border border-black/[0.08] bg-white shadow-[0_22px_65px_rgba(0,0,0,.16)]">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <ProfessorPortrait compact />

                <div>
                  <p className="text-sm font-bold text-[#4baa36]">
                    SONNY
                  </p>
                  <p className="text-[10px] text-[#777d85]">
                    AI COO · <span className="text-[#3fa536]">● Online</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSonnyOpen(false)}
                className="h-7 w-7 rounded-full bg-[#f4f5f5] text-[#747a82]"
              >
                ×
              </button>
            </div>

            <div className="px-4 pb-4">
              <div className="rounded-[14px] border border-black/[0.07] p-4">
                <p className="text-xs leading-5 text-[#464c53]">
                  Hi! I’m Sonny, your AI COO. How can I help you build your
                  AI-powered company?
                </p>
              </div>

              {visitorQuestion && (
                <>
                  <div className="mt-3 rounded-[14px] bg-[#4baa36] p-3 text-white">
                    <p className="text-xs leading-5">
                      {visitorQuestion}
                    </p>
                  </div>

                  <div className="mt-3 rounded-[14px] bg-[#f5f6f6] p-3">
                    <p className="text-xs leading-5 text-[#525960]">
                      I’ll be connected to Firmic’s public product intelligence
                      next. Your tenant/company data will remain isolated.
                    </p>
                  </div>
                </>
              )}

              <div className="mt-3 space-y-2">
                {[
                  "What is Firmic?",
                  "What AI employees do you have?",
                  "How does pricing work?",
                  "Which plan is right for me?",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setVisitorQuestion(prompt)}
                    className="w-full rounded-[12px] border border-black/[0.07] bg-[#fafafa] px-4 py-3 text-left text-[11px] text-[#42484f]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={submitSonny}
              className="border-t border-black/[0.06] p-4"
            >
              <div className="flex gap-2 rounded-[12px] bg-[#f6f7f7] p-1.5">
                <input
                  name="question"
                  placeholder="Ask Sonny..."
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-xs outline-none"
                />

                <button
                  type="submit"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4baa36] text-white"
                >
                  ↗
                </button>
              </div>
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={() => setSonnyOpen((value) => !value)}
          className="flex items-center gap-3 rounded-full border-4 border-[#5bad44] bg-white p-1.5 pr-4 shadow-[0_14px_42px_rgba(0,0,0,.14)]"
        >
          <ProfessorPortrait compact />

          <span className="hidden text-xs font-semibold text-[#4a5057] sm:block">
            Ask Sonny
          </span>
        </button>
      </div>
    </div>
  );
}
