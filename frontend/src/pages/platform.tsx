import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const infrastructure = [
  "Company",
  "Headquarters",
  "Communications",
  "Mail",
  "Documents",
  "Billing",
];

const operations = [
  "Tasks",
  "Workflows",
  "Projects",
  "Automation",
  "Approvals",
  "Execution",
];

const intelligence = [
  "Finance",
  "Engineering",
  "Data",
  "Growth",
  "Compliance",
  "Research",
];

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

function PlatformColumn({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="rounded-[28px] border border-black/[0.06] bg-white p-7 shadow-[0_16px_50px_rgba(0,0,0,.045)]">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4baa36]">
        {title}
      </p>

      <p className="mt-3 min-h-[48px] text-sm leading-6 text-[#747b84]">
        {description}
      </p>

      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center justify-between rounded-xl bg-[#f7f7f5] px-4 py-3"
          >
            <span className="text-sm font-semibold text-[#30343a]">
              {item}
            </span>
            <span className="text-[#4baa36]">✓</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlatformPage() {
  const [sonnyOpen, setSonnyOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <Head>
        <title>Firmic Platform — Create Your Company. Firmic Makes It Work.</title>
        <meta
          name="description"
          content="Firmic brings virtual headquarters, communications, business mail, AI workforce, compliance and company operations together in one platform."
        />
      </Head>

      <main className="min-h-screen bg-[#fbfbfa] text-[#1d1d1f]">
        {/* NAVIGATION */}
        <header className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.06] bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-[64px] max-w-[1440px] items-center justify-between px-4 sm:px-5 md:h-[74px] lg:px-9">
            <Link href="/" className="flex items-center">
              <Image
                src="/firmic-logo-transparent.png"
                alt="Firmic"
                width={128}
                height={48}
                priority
                className="h-8 w-auto object-contain sm:h-9 md:h-10"
              />
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-semibold text-[#545960] md:flex">
              <Link href="/platform" className="text-[#1d1d1f]">
                Platform
              </Link>
              <Link href="/#workforce">Capabilities</Link>
              <Link href="/#solutions">Solutions</Link>
              <Link href="/pricing">Pricing</Link>
            </nav>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-[#1d1d1f] shadow-sm transition hover:bg-[#f5f5f3] md:hidden"
                aria-label="Toggle navigation"
                aria-expanded={mobileMenuOpen}
              >
                <span className="text-xl leading-none">
                  {mobileMenuOpen ? "×" : "☰"}
                </span>
              </button>
              <Link
                href="/login"
                className="hidden text-sm font-semibold text-[#4f555d] sm:block"
              >
                Sign In
              </Link>

              <Link
                href="/create-company"
                className="hidden rounded-md bg-[#4baa36] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#429832] sm:inline-flex"
              >
                Create Your Company <span className="ml-1">→</span>
              </Link>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav className="absolute inset-x-0 top-full z-[60] border-t border-black/[0.06] bg-white shadow-[0_18px_45px_rgba(0,0,0,0.10)] md:hidden">
              <div className="mx-auto flex max-w-[1440px] flex-col px-4 py-1 sm:px-5">
                <Link
                  href="/platform"
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-b border-black/[0.06] py-3 text-[15px] font-semibold text-[#1d1d1f] transition hover:text-[#4baa36]"
                >
                  Platform
                </Link>

                <Link
                  href="/#workforce"
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-b border-black/[0.06] py-3 text-[15px] font-semibold text-[#1d1d1f] transition hover:text-[#4baa36]"
                >
                  Capabilities
                </Link>

                <Link
                  href="/#solutions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-b border-black/[0.06] py-3 text-[15px] font-semibold text-[#1d1d1f] transition hover:text-[#4baa36]"
                >
                  Solutions
                </Link>

                <Link
                  href="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="border-b border-black/[0.06] py-3 text-[15px] font-semibold text-[#1d1d1f] transition hover:text-[#4baa36]"
                >
                  Pricing
                </Link>

                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-3 text-[15px] font-semibold text-[#1d1d1f] transition hover:text-[#4baa36]"
                >
                  Sign In
                </Link>

                <Link
                  href="/create-company"
                  onClick={() => setMobileMenuOpen(false)}
                  className="mb-3 mt-2 rounded-lg bg-[#4baa36] px-5 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-[#429832]"
                >
                  Create Your Company →
                </Link>
              </div>
            </nav>
          )}
        </header>

        {/* HERO */}
        <section className="border-b border-black/[0.06] px-4 pb-14 pt-24 sm:px-5 sm:pb-20 sm:pt-32 lg:px-9 lg:pb-24 lg:pt-36">
          <div className="mx-auto grid max-w-[1420px] items-center gap-9 sm:gap-12 lg:grid-cols-[.92fr_1.08fr]">

            {/* LEFT */}
            <div className="max-w-[680px]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4baa36]">
                The Firmic Platform
              </p>

              <h1 className="mt-4 text-[2.65rem] font-semibold leading-[1.04] tracking-[-0.052em] sm:mt-5 sm:text-[3.8rem] lg:text-[4.25rem]">
                Create Your Company.
                <span className="block text-[#4baa36]">
                  Firmic Makes It Work.
                </span>
              </h1>

              <p className="mt-5 max-w-[640px] text-base leading-7 text-[#6f7680] sm:mt-7 sm:text-lg sm:leading-8">
                Virtual headquarters, communications, business mail,
                AI workforce, compliance and operations — brought together
                through Firmic.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
                <Link
                  href="/create-company"
                  className="rounded-md bg-[#4baa36] px-7 py-3.5 text-center text-sm font-bold text-white transition hover:bg-[#429832]"
                >
                  Create Your Company <span className="ml-2">→</span>
                </Link>

                <a
                  href="#platform-capabilities"
                  className="rounded-md border border-black/[0.09] bg-white px-7 py-3.5 text-center text-sm font-semibold shadow-sm transition hover:bg-[#f5f5f3]"
                >
                  Explore Firmic ↓
                </a>
              </div>
            </div>

            {/* RIGHT / SONNY */}
            <div className="relative min-h-[455px] overflow-hidden rounded-[24px] bg-[#f5f6f4] shadow-[0_18px_55px_rgba(0,0,0,.06)] sm:min-h-[500px] sm:rounded-[32px] lg:min-h-[530px]">

              <div className="absolute bottom-0 left-[-5%] h-[410px] w-[72%] sm:left-[1%] sm:h-[470px] sm:w-[66%] lg:left-[4%] lg:h-[500px] lg:w-[62%]">
                <Image
                  src="/agents/sonny-canonical-v1.png"
                  alt="Sonny, Firmic AI Chief Operating Officer"
                  fill
                  unoptimized
                  sizes="600px"
                  className="object-contain object-bottom"
                />
              </div>

              <div className="absolute right-4 top-8 w-[205px] sm:right-6 sm:top-10 sm:w-[240px] lg:right-8 lg:top-14 lg:w-[260px]">
                <p className="text-xl font-bold text-[#4baa36]">
                  SONNY
                </p>

                <p className="mt-2 text-sm text-[#727982]">
                  AI Chief Operating Officer
                </p>

                <div className="mt-6 flex items-center gap-2 text-sm text-[#50575f]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#43b83b]" />
                  Online & Orchestrating
                </div>
              </div>

              <div className="absolute bottom-10 right-8 w-[245px] rounded-[20px] border border-black/[0.06] bg-white p-5 shadow-[0_14px_40px_rgba(0,0,0,.08)]">
                <h2 className="text-base font-bold leading-6">
                  Your Company, Ready to Operate
                </h2>

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
                      className="flex items-center gap-3 text-sm text-[#555c64]"
                    >
                      <span className="text-[#4baa36]">✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-black/[0.07] pt-4">
                  <p className="text-xs font-bold text-[#4baa36]">
                    Sonny coordinates it all.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PLATFORM CAPABILITIES — PAGE 2 */}
        <section
          id="platform-capabilities"
          className="px-4 py-16 sm:px-5 sm:py-20 lg:px-9 lg:py-28"
        >
          <div className="mx-auto max-w-[1420px]">
            <div className="text-center">
              <h2 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.04em] sm:text-4xl">
                Make Your Company AI-Native with Firmic.
              </h2>

              <p className="mx-auto mt-3 max-w-[800px] text-sm leading-6 text-[#747b84]">
                Workforce, communications, mail, compliance, operations and
                intelligent automation — brought together by Firmic.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:mt-10 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  label: "COMPANY",
                  title: "Company Infrastructure",
                  text: "Company setup, virtual headquarters, documents and the services your business operates on.",
                },
                {
                  label: "WORKFORCE",
                  title: "AI Workforce",
                  text: "Specialized AI workers for finance, engineering, data, growth, compliance and more.",
                },
                {
                  label: "COMMUNICATIONS",
                  title: "Calls & Mail",
                  text: "Business communications, company numbers, digital mail and document handling.",
                },
                {
                  label: "OPERATIONS",
                  title: "Company Operations",
                  text: "Tasks, workflows, projects, approvals and day-to-day company execution.",
                },
                {
                  label: "COMPLIANCE",
                  title: "Compliance",
                  text: "Company requirements, documents, policies and controlled compliance workflows.",
                },
                {
                  label: "AUTOMATION",
                  title: "Intelligent Automation",
                  text: "Connect company work, tools and AI capabilities so Firmic can help move work forward.",
                },
              ].map((item) => (
                <article
                  key={item.title}
                  className="group rounded-[20px] border border-black/[0.07] bg-white p-5 transition hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(0,0,0,.06)] sm:rounded-[24px] sm:p-7"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold tracking-[0.12em] text-[#4baa36]">
                      {item.label}
                    </p>

                    <span className="text-[#4baa36] transition group-hover:translate-x-1">
                      →
                    </span>
                  </div>

                  <h3 className="mt-7 text-[1.35rem] font-semibold tracking-[-0.035em] sm:mt-12 sm:text-2xl">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-[#747b84] sm:mt-4 sm:leading-7">
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* THREE STORIES */}
        <section className="border-y border-black/[0.05] bg-white px-4 py-16 sm:px-5 sm:py-20 lg:px-9 lg:py-24">
          <div className="mx-auto max-w-[1180px]">
            <div className="grid gap-10 sm:gap-12 lg:grid-cols-3 lg:gap-8">
              <div>
                <span className="text-sm font-bold text-[#4baa36]">01</span>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
                  Build your company.
                </h2>
                <p className="mt-5 text-sm leading-7 text-[#747b84]">
                  Bring company setup, headquarters, communications, mail,
                  documents, compliance and billing into one operating
                  environment.
                </p>
              </div>

              <div>
                <span className="text-sm font-bold text-[#4baa36]">02</span>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
                  Give it intelligence.
                </h2>
                <p className="mt-5 text-sm leading-7 text-[#747b84]">
                  Add specialized capabilities across finance, engineering,
                  data, operations, growth, compliance, research and future
                  industries.
                </p>
              </div>

              <div>
                <span className="text-sm font-bold text-[#4baa36]">03</span>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
                  Operate through Sonny.
                </h2>
                <p className="mt-5 text-sm leading-7 text-[#747b84]">
                  Give Sonny the objective. Firmic coordinates the systems,
                  capabilities and workflows required to move the work
                  forward.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST, PRIVACY & SECURITY */}
        <section className="border-y border-black/[0.05] bg-[#f5f6f4] px-4 py-16 sm:px-5 sm:py-20 lg:px-9 lg:py-28">
          <div className="mx-auto max-w-[1180px]">
            <div className="mx-auto max-w-[820px] text-center">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#4baa36]">
                Trust, Privacy & Security
              </p>

              <h2 className="mt-4 text-[2rem] font-semibold leading-[1.08] tracking-[-0.045em] sm:mt-5 sm:text-5xl">
                Your company.
                <span className="block text-[#4baa36]">
                  Your data. Your control.
                </span>
              </h2>

              <p className="mx-auto mt-6 max-w-[720px] text-base leading-7 text-[#6f7680]">
                Firmic is designed so company information, AI capabilities,
                sensitive actions and business access remain governed by the
                company they belong to.
              </p>
            </div>

            <div className="mt-10 grid items-stretch gap-4 sm:mt-12 sm:gap-5 md:grid-cols-2">
              <article className="flex h-full flex-col rounded-[22px] border border-black/[0.06] bg-white p-6 sm:rounded-[28px] sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef7eb] text-xl text-[#4baa36]">
                  🔒
                </div>

                <h3 className="mt-8 text-2xl font-semibold tracking-[-0.03em]">
                  Company Data Boundaries
                </h3>

                <p className="mt-4 max-w-[500px] text-sm leading-7 text-[#707780]">
                  Company data is handled in a tenant-aware environment so
                  information, workflows and company context stay associated
                  with the correct organization.
                </p>
              </article>

              <article className="flex h-full flex-col rounded-[28px] border border-black/[0.06] bg-white p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef7eb] text-xl text-[#4baa36]">
                  🤖
                </div>

                <h3 className="mt-8 text-2xl font-semibold tracking-[-0.03em]">
                  AI Access by Permission
                </h3>

                <p className="mt-4 max-w-[500px] text-sm leading-7 text-[#707780]">
                  AI workers operate with defined permissions, tools and access
                  appropriate to their assigned role. Their capabilities are
                  constrained by the boundaries configured for that work.
                </p>
              </article>

              <article className="flex h-full flex-col rounded-[28px] border border-black/[0.06] bg-white p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef7eb] text-xl text-[#4baa36]">
                  ✓
                </div>

                <h3 className="mt-8 text-2xl font-semibold tracking-[-0.03em]">
                  Human Approval
                </h3>

                <p className="mt-4 max-w-[500px] text-sm leading-7 text-[#707780]">
                  Sensitive company actions can remain subject to approval
                  before execution, keeping founders and authorized team
                  members in control.
                </p>
              </article>

              <article className="flex h-full flex-col rounded-[28px] border border-black/[0.06] bg-white p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef7eb] text-xl text-[#4baa36]">
                  ◉
                </div>

                <h3 className="mt-8 text-2xl font-semibold tracking-[-0.03em]">
                  Activity & Accountability
                </h3>

                <p className="mt-4 max-w-[500px] text-sm leading-7 text-[#707780]">
                  Important requests, approvals and execution events can be
                  recorded so companies maintain visibility into how work moved
                  through Firmic.
                </p>
              </article>
            </div>

            <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-2">
              <article className="flex h-full flex-col rounded-[28px] bg-[#1d1d1f] p-8 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#72c860]">
                  AI Workforce Security
                </p>

                <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
                  An AI worker knows its job — and operates within programmed boundaries.
                </h3>

                <div className="mt-auto pt-8 space-y-3">
                  {[
                    ["Finance AI", "Invoices, reports and approved finance tools"],
                    ["Engineering AI", "Repositories and approved development tools"],
                    ["Hermes", "Compliance documents, requirements and policies"],
                    ["Sonny", "Coordinates work within company permissions and approval rules"],
                  ].map(([name, access]) => (
                    <div
                      key={name}
                      className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 sm:grid-cols-[150px_1fr]"
                    >
                      <p className="text-sm font-semibold text-white">
                        {name}
                      </p>

                      <p className="text-sm leading-6 text-white/50">
                        {access}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="flex h-full flex-col rounded-[28px] border border-black/[0.06] bg-white p-8">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4baa36]">
                  Payments & Sensitive Information
                </p>

                <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
                  Keep payment access separate from AI execution.
                </h3>

                <p className="mt-5 text-sm leading-7 text-[#707780]">
                  Firmic's payment architecture should rely on established
                  payment providers and controlled billing workflows rather
                  than exposing raw payment credentials to AI workers.
                </p>

                <div className="mt-auto pt-8 space-y-3">
                  {[
                    "Controlled billing permissions",
                    "No unrestricted agent payment access",
                    "Founder approval for sensitive actions",
                    "Clear company billing records",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-xl bg-[#f5f6f4] px-4 py-3"
                    >
                      <span className="text-[#4baa36]">✓</span>
                      <span className="text-sm font-semibold text-[#50565e]">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {[
                "Tenant-Aware Access",
                "Agent Permissions",
                "Approval Gates",
                "Auditability",
                "Authentication",
                "Usage Controls",
                "Data Boundaries",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-black/[0.07] bg-white px-4 py-2 text-xs font-semibold text-[#636a72]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* REAL WORKFLOW */}
        <section className="px-4 py-16 sm:px-5 sm:py-20 lg:px-9 lg:py-24">
          <div className="mx-auto max-w-[1000px]">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#4baa36]">
                From Request to Result
              </p>

              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                Tell Sonny what needs to happen.
              </h2>
            </div>

            <div className="mx-auto mt-12 max-w-[780px] rounded-[28px] border border-black/[0.06] bg-white p-7 shadow-[0_18px_55px_rgba(0,0,0,.05)] sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a9098]">
                You
              </p>

              <p className="mt-3 text-xl font-semibold leading-8">
                “Sonny, prepare our monthly financial report and identify
                overdue invoices.”
              </p>

              <div className="my-8 h-px bg-black/[0.07]" />

              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
                {[
                  "You",
                  "Sonny",
                  "Finance",
                  "Company Data",
                  "Execution",
                  "Sonny",
                  "Result",
                ].map((item, index, array) => (
                  <div key={`${item}-${index}`} className="flex items-center gap-2">
                    <span
                      className={
                        item === "Sonny"
                          ? "rounded-full bg-[#4baa36] px-4 py-2 text-white"
                          : "rounded-full bg-[#f2f2f0] px-4 py-2 text-[#565c64]"
                      }
                    >
                      {item}
                    </span>

                    {index < array.length - 1 && (
                      <span className="text-[#a0a5ab]">→</span>
                    )}
                  </div>
                ))}
              </div>

              <p className="mt-8 text-center text-sm leading-6 text-[#747b84]">
                Understand → Plan → Delegate → Execute → Approve → Report
              </p>
            </div>
          </div>
        </section>

        {/* GOVERNED EXECUTION */}
        <section className="bg-[#f3f3f0] px-4 py-16 sm:px-5 sm:py-20 lg:px-9 lg:py-24">
          <div className="mx-auto grid max-w-[1100px] gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#4baa36]">
                Governed Execution
              </p>

              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em]">
                Intelligence with boundaries.
              </h2>

              <p className="mt-6 max-w-[480px] text-sm leading-7 text-[#6f7680]">
                Firmic is designed around company identity, permissions,
                approvals and accountability — so intelligent execution happens
                inside the company's operating environment.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Identity", "Know which company and user the work belongs to."],
                ["Permissions", "Control what systems and information can be used."],
                ["Approvals", "Keep important decisions under human authority."],
                ["Audit", "Maintain visibility into actions and execution."],
              ].map(([title, copy]) => (
                <div
                  key={title}
                  className="rounded-[22px] border border-black/[0.05] bg-white p-6"
                >
                  <p className="font-bold">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#747b84]">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-4 py-20 text-center sm:px-5 sm:py-24 lg:px-9 lg:py-28">
          <div className="mx-auto max-w-[820px]">
            <p className="text-lg font-semibold text-[#747b84]">
              Your company, ready to operate.
            </p>

            <h2 className="mt-5 text-5xl font-semibold tracking-[-0.055em] sm:text-6xl">
              Create Your Company.
              <span className="block text-[#4baa36]">
                Firmic Makes It Work.
              </span>
            </h2>

            <Link
              href="/create-company"
              className="mt-9 inline-flex rounded-md bg-[#4baa36] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#429832]"
            >
              Create Your Company <span className="ml-2"><Arrow /></span>
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

        {/* FLOATING SONNY */}
        <button
          type="button"
          onClick={() => setSonnyOpen((value) => !value)}
          className={`${mobileMenuOpen ? "hidden md:flex" : "flex"} fixed bottom-4 right-3 z-40 items-center gap-2 rounded-full border border-black/[0.07] bg-white py-1.5 pl-1.5 pr-3 shadow-[0_12px_40px_rgba(0,0,0,.14)] sm:bottom-6 sm:right-6 sm:gap-3 sm:py-2 sm:pl-2 sm:pr-5`}
        >
          <span className="h-9 w-9 overflow-hidden rounded-full bg-[#f2f2ef] sm:h-11 sm:w-11">
            <Image
              src="/agents/sonny-canonical-v1.png"
              alt="Sonny"
              width={44}
              height={44}
              unoptimized
              className="h-full w-full object-cover object-top"
            />
          </span>

          <span className="text-left">
            <span className="block text-xs font-bold">Ask Sonny</span>
            <span className="block text-[10px] font-semibold text-[#4baa36]">
              ● Online
            </span>
          </span>
        </button>

        {sonnyOpen && (
          <div className="fixed bottom-20 left-3 right-3 z-40 rounded-[24px] border border-black/[0.07] bg-white p-5 shadow-[0_24px_70px_rgba(0,0,0,.16)] sm:bottom-24 sm:left-auto sm:right-6 sm:w-[330px] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-[#f2f2ef]">
                <Image
                  src="/agents/sonny-canonical-v1.png"
                  alt="Sonny"
                  width={48}
                  height={48}
                  unoptimized
                  className="h-full w-full object-cover object-top"
                />
              </div>

              <div>
                <p className="text-sm font-bold">Sonny</p>
                <p className="text-xs font-semibold text-[#4baa36]">
                  AI Chief Operating Officer
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-[#646b74]">
              I can explain how Firmic brings your company infrastructure,
              operations and intelligent capabilities together.
            </p>

            <Link
              href="/sonny"
              className="mt-5 inline-flex text-sm font-bold text-[#4baa36]"
            >
              Meet Sonny <span className="ml-2">→</span>
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
