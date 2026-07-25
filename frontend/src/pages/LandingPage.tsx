import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const launchHref = "/create-company";
const loginHref = "/login";

const platformCards = [
  {
    number: "01",
    title: "Abu Dhabi Virtual Headquarters",
    text: "Establish a professional business presence in Abu Dhabi with a digital mailroom, meeting-room access, communications, and a workspace built for modern operations.",
  },
  {
    number: "02",
    title: "AI Workforce from Day One",
    text: "Build an AI-augmented operating team before hiring a full traditional back office. Assign specialists across operations, customer workflows, growth, administration, and compliance.",
  },
  {
    number: "03",
    title: "One Company Operating System",
    text: "Run customers, tasks, documents, meetings, billing, reporting, Microsoft 365, and company intelligence from one connected command center.",
  },
];

const modules = [
  ["Command Center", "Live operational visibility across the company."],
  ["Head Office", "Your Abu Dhabi headquarters and company services."],
  ["AI Workforce", "AI specialists configured around business needs."],
  ["Customer Hub", "Relationships, opportunities, and follow-ups."],
  ["Digital Mailroom", "Centralized business mail and document handling."],
  ["Meeting Center", "Rooms, schedules, and connected collaboration."],
  ["Sonny AI COO", "Executive guidance and coordinated workflows."],
  ["Hermes Compliance", "Structured compliance activity and oversight."],
];

const principles = [
  {
    title: "Launch faster",
    text: "Replace a fragmented setup process with a guided flow that brings business infrastructure into one place.",
  },
  {
    title: "Operate intelligently",
    text: "Give founders a clearer view of priorities, customers, documents, workflows, and company performance.",
  },
  {
    title: "Scale without fragmentation",
    text: "Add tools, services, and AI support without building a disconnected collection of providers and dashboards.",
  },
];

const journey = [
  ["Choose", "Select your Abu Dhabi headquarters."],
  ["Configure", "Add infrastructure, software, and AI workforce."],
  ["Launch", "Activate your company workspace."],
  ["Operate", "Run the business through Firmic."],
];

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModule, setActiveModule] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeModuleContent = useMemo(() => modules[activeModule], [activeModule]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f7f8] text-[#09233d] selection:bg-[#76d5d1] selection:text-[#09233d]">
      <style jsx global>{`
        html { scroll-behavior: smooth; }
        body { background: #f4f7f8; }
        @keyframes floatSlow { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes pulseSoft { 0%,100% { opacity: .5; transform: scale(1); } 50% { opacity: .9; transform: scale(1.08); } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes revealUp { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: translateY(0); } }
        .float-slow { animation: floatSlow 6s ease-in-out infinite; }
        .pulse-soft { animation: pulseSoft 5s ease-in-out infinite; }
        .marquee-track { animation: marquee 26s linear infinite; }
        .reveal-up { animation: revealUp .8s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .float-slow, .pulse-soft, .marquee-track, .reveal-up { animation: none !important; }
          html { scroll-behavior: auto; }
        }
      `}</style>

      <div className="border-b border-white/10 bg-[#09233d] px-5 py-2.5 text-center text-xs font-semibold tracking-[0.12em] text-white/85">
        EARLY ACCESS • BUILT IN ABU DHABI • DESIGNED FOR GLOBAL FOUNDERS
      </div>

      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-[#09233d]/10 bg-[#f4f7f8]/92 shadow-[0_12px_35px_rgba(9,35,61,0.06)] backdrop-blur-xl" : "bg-transparent"}`}>
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="Firmic home">
            <div className="relative h-16 w-44">
              <Image
                src="/firmic-logo.png"
                alt="Firmic Operating System"
                fill
                priority
                sizes="176px"
                className="object-contain object-left"
              />
            </div>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {["Vision", "Platform", "How it works", "Abu Dhabi"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="text-sm font-semibold text-[#31526c] transition hover:text-[#0f8f91]">
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link href={loginHref} className="rounded-full px-5 py-3 text-sm font-bold text-[#31526c] transition hover:bg-white">
              Sign in
            </Link>
            <Link href={launchHref} className="group rounded-full bg-[#09233d] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(9,35,61,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0f8f91]">
              Start building your company <span className="ml-1 inline-block transition group-hover:translate-x-0.5"><ArrowIcon /></span>
            </Link>
          </div>

          <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#09233d]/15 bg-white text-lg lg:hidden" aria-label="Toggle navigation">
            {menuOpen ? "×" : "☰"}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-[#09233d]/10 bg-[#f4f7f8] px-5 py-5 lg:hidden">
            <div className="flex flex-col gap-4">
              {["Vision", "Platform", "How it works", "Abu Dhabi"].map((item) => (
                <a key={item} onClick={() => setMenuOpen(false)} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="font-bold text-[#31526c]">
                  {item}
                </a>
              ))}
              <Link href={loginHref} className="font-bold text-[#31526c]">Sign in</Link>
              <Link href={launchHref} className="rounded-full bg-[#09233d] px-5 py-3 text-center font-bold text-white">Start building your company</Link>
            </div>
          </div>
        )}
      </header>

      <main>
        <section id="vision" className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_20%,rgba(118,213,209,0.28),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(103,177,194,0.22),transparent_27%),linear-gradient(180deg,#f4f7f8_0%,#edf4f5_100%)]" />
          <div className="absolute -left-28 top-32 -z-10 h-72 w-72 rounded-full border-[52px] border-[#0f8f91]/5 pulse-soft" />
          <div className="absolute -right-36 top-12 -z-10 h-[430px] w-[430px] rounded-full bg-[#76d5d1]/15 blur-3xl" />

          <div className="mx-auto grid min-h-[820px] max-w-[1440px] items-center gap-16 px-5 py-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:py-28">
            <div className="reveal-up">
              <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-[#0f8f91]/20 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#0f7477] shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#0f8f91]" />
                A new operating model for business
              </div>

              <h1 className="max-w-4xl text-[3.5rem] font-black leading-[0.92] tracking-[-0.065em] text-[#09233d] sm:text-[5rem] lg:text-[6.15rem]">
                Build the company.
                <span className="mt-2 block text-[#0f8f91]">Firmic runs the operation.</span>
              </h1>

              <p className="mt-8 max-w-2xl text-lg leading-8 text-[#49677d] sm:text-xl">
                Firmic is the operating system for AI-native companies: an Abu Dhabi virtual headquarters, AI workforce, business software, communications, and operational intelligence in one connected platform.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href={launchHref} className="group rounded-full bg-[#09233d] px-8 py-5 text-center text-base font-black text-white shadow-[0_18px_40px_rgba(9,35,61,0.22)] transition hover:-translate-y-1 hover:bg-[#0f8f91]">
                  Start building in Abu Dhabi <span className="ml-2 inline-block transition group-hover:translate-x-1"><ArrowIcon /></span>
                </Link>
                <a href="#platform" className="rounded-full border border-[#09233d]/15 bg-white/75 px-8 py-5 text-center text-base font-black text-[#09233d] transition hover:-translate-y-1 hover:border-[#0f8f91]/40 hover:bg-white">
                  Explore the platform
                </a>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-[#09233d]/10 pt-7">
                {[ ["1", "Company OS"], ["15", "AI specialists"], ["Day one", "Operational start"] ].map(([value,label]) => (
                  <div key={label}>
                    <p className="text-2xl font-black text-[#09233d]">{value}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.11em] text-[#698296]">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative lg:pl-6">
              <div className="absolute -inset-8 rounded-[3rem] bg-[#76d5d1]/20 blur-3xl" />
              <div className="relative float-slow overflow-hidden rounded-[2rem] border border-white/80 bg-white p-2 shadow-[0_40px_100px_rgba(9,35,61,0.22)]">
                <Image src="/firmic-platform.png" alt="Firmic company workspace platform" width={1600} height={950} priority className="h-auto w-full rounded-[1.55rem]" />
              </div>

              <div className="absolute -bottom-9 -left-3 z-10 hidden w-64 rounded-2xl border border-white bg-[#09233d] p-5 text-white shadow-2xl sm:block">
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#76d5d1]">Meet Sonny, your AI COO</p>
                <p className="mt-2 font-black">Welcome to Firmic. I help keep your company moving.</p>
                <p className="mt-2 text-xs leading-5 text-white/60">Operations, customer follow-ups, priorities, and compliance—coordinated from one workspace.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-y border-[#09233d]/10 bg-white py-5">
          <div className="marquee-track flex min-w-max gap-12 whitespace-nowrap px-6 text-sm font-black uppercase tracking-[0.18em] text-[#31526c]/70">
            {[...Array(2)].flatMap((_, pass) => ["Virtual Headquarters", "AI Workforce", "Customer Hub", "Digital Mailroom", "Business Communications", "Sonny AI COO", "Compliance", "Reports"].map((item) => <span key={`${pass}-${item}`}>• {item}</span>))}
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-28 lg:px-10">
          <div className="grid gap-14 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0f8f91]">Why Firmic exists</p>
              <h2 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[#09233d] sm:text-5xl">
                Companies changed. Their infrastructure did not.
              </h2>
              <p className="mt-6 text-lg leading-8 text-[#587286]">
                Modern founders can build globally, hire intelligently, and automate operations from the beginning. Yet launching a company still means stitching together addresses, providers, communication tools, software, documents, and manual workflows.
              </p>
              <p className="mt-5 text-lg font-bold leading-8 text-[#09233d]">
                Firmic turns that fragmentation into one operating system.
              </p>
            </div>

            <div className="space-y-5">
              {platformCards.map((card) => (
                <article key={card.number} className="group grid gap-8 rounded-[2rem] border border-[#09233d]/10 bg-white p-7 shadow-[0_14px_45px_rgba(9,35,61,0.06)] transition hover:-translate-y-1 hover:border-[#0f8f91]/30 hover:shadow-[0_24px_60px_rgba(9,35,61,0.1)] sm:grid-cols-[90px_1fr] sm:p-9">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#dff5f3] text-lg font-black text-[#0f7477] transition group-hover:bg-[#0f8f91] group-hover:text-white">{card.number}</div>
                  <div>
                    <h3 className="text-2xl font-black tracking-[-0.03em] text-[#09233d]">{card.title}</h3>
                    <p className="mt-4 text-base leading-8 text-[#587286]">{card.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="bg-[#09233d] py-28 text-white">
          <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
            <div className="max-w-4xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#76d5d1]">The platform</p>
              <h2 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.05em] sm:text-6xl">A complete company workspace, not another isolated tool.</h2>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/60">Every module is designed around one active company, giving founders a connected view of the work, services, people, customers, and intelligence required to operate.</p>
            </div>

            <div className="mt-14 grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
              <div className="space-y-2">
                {modules.map(([title], index) => (
                  <button key={title} type="button" onClick={() => setActiveModule(index)} className={`w-full rounded-2xl px-5 py-4 text-left font-bold transition ${activeModule === index ? "bg-[#76d5d1] text-[#09233d]" : "bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"}`}>
                    <span className="mr-4 text-xs opacity-60">{String(index + 1).padStart(2, "0")}</span>{title}
                  </button>
                ))}
              </div>

              <div className="relative min-h-[620px] overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.1),rgba(255,255,255,0.03))] p-7 sm:p-10">
                <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#76d5d1]/10 blur-3xl" />
                <p className="relative text-xs font-black uppercase tracking-[0.18em] text-[#76d5d1]">Active module</p>
                <h3 className="relative mt-5 text-4xl font-black tracking-[-0.04em]">{activeModuleContent[0]}</h3>
                <p className="relative mt-5 max-w-xl text-lg leading-8 text-white/60">{activeModuleContent[1]}</p>

                <div className="relative mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {["Live status", "Connected data", "Company context", "AI assistance", "Structured actions", "One workspace"].map((item, index) => (
                    <div key={item} className={`rounded-2xl border p-5 ${index === 0 ? "border-[#76d5d1]/60 bg-[#76d5d1]/15" : "border-white/10 bg-white/5"}`}>
                      <div className="mb-8 h-2 w-2 rounded-full bg-[#76d5d1]" />
                      <p className="text-sm font-black">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/10 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Firmic system status</p>
                    <span className="rounded-full bg-[#76d5d1]/15 px-3 py-1 text-xs font-black text-[#76d5d1]">● Connected</span>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[88%] rounded-full bg-[#76d5d1]" /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-[1440px] px-5 py-28 lg:px-10">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0f8f91]">How it works</p>
            <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-black tracking-[-0.05em] text-[#09233d] sm:text-6xl">From business idea to operating company.</h2>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {journey.map(([title, text], index) => (
              <article key={title} className="relative min-h-[300px] overflow-hidden rounded-[2rem] border border-[#09233d]/10 bg-white p-7 shadow-[0_14px_45px_rgba(9,35,61,0.06)]">
                <span className="absolute -right-3 -top-8 text-[9rem] font-black text-[#edf4f5]">{index + 1}</span>
                <p className="relative text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">Step {index + 1}</p>
                <h3 className="relative mt-28 text-3xl font-black tracking-[-0.04em] text-[#09233d]">{title}</h3>
                <p className="relative mt-4 leading-7 text-[#587286]">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white py-28">
          <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0f8f91]">A better operating model</p>
                <h2 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[#09233d] sm:text-6xl">Built for the company you are becoming.</h2>
              </div>
              <p className="text-lg leading-8 text-[#587286]">Firmic is designed for founders who want to move quickly without losing operational clarity. Start lean, build intelligently, and expand through one connected infrastructure layer.</p>
            </div>

            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {principles.map((item, index) => (
                <article key={item.title} className={`${index === 1 ? "bg-[#0f8f91] text-white" : "bg-[#edf4f5] text-[#09233d]"} rounded-[2rem] p-8 sm:p-10`}>
                  <p className={`text-xs font-black uppercase tracking-[0.17em] ${index === 1 ? "text-[#c8fbf4]" : "text-[#0f8f91]"}`}>0{index + 1}</p>
                  <h3 className="mt-20 text-3xl font-black tracking-[-0.04em]">{item.title}</h3>
                  <p className={`mt-5 leading-8 ${index === 1 ? "text-white/75" : "text-[#587286]"}`}>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="abu-dhabi" className="relative overflow-hidden bg-[#dff5f3] py-28">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[70px] border-white/40" />
          <div className="mx-auto grid max-w-[1440px] gap-14 px-5 lg:grid-cols-[0.88fr_1.12fr] lg:px-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0f7477]">Abu Dhabi foundation</p>
              <h2 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[#09233d] sm:text-6xl">Built in Abu Dhabi. Ready for the world.</h2>
            </div>
            <div>
              <p className="text-xl font-bold leading-9 text-[#1e465e]">Firmic is being built for globally ambitious founders who want a credible Abu Dhabi business presence and an AI-native way to operate from day one.</p>
              <p className="mt-6 text-lg leading-8 text-[#587286]">The platform connects local business infrastructure with a digital workspace that can support distributed teams, international customers, and modern company operations.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                {["Abu Dhabi headquarters", "Global operating model", "AI-native infrastructure", "Founder-first platform"].map((item) => (
                  <span key={item} className="rounded-full border border-[#0f8f91]/20 bg-white/65 px-4 py-2 text-sm font-black text-[#0f7477]">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-28 lg:px-10">
          <div className="mx-auto max-w-[1440px] overflow-hidden rounded-[2.75rem] bg-[#09233d] px-6 py-16 text-white shadow-[0_35px_80px_rgba(9,35,61,0.2)] sm:px-12 lg:px-20 lg:py-20">
            <div className="grid items-center gap-12 lg:grid-cols-[0.72fr_1.28fr]">
              <div className="relative h-56 overflow-hidden rounded-[2rem] bg-white/95 p-6">
                <Image
                  src="/firmic-logo.png"
                  alt="Firmic Operating System"
                  fill
                  sizes="560px"
                  className="object-contain object-center p-6"
                />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#76d5d1]">Your company starts here</p>
                <h2 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.05em] sm:text-6xl">Start building your AI-native company from Abu Dhabi.</h2>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-white/60">Create the foundation, configure the infrastructure, and enter your company workspace through one guided experience.</p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Link href={launchHref} className="rounded-full bg-[#76d5d1] px-8 py-4 text-center font-black text-[#09233d] transition hover:-translate-y-1 hover:bg-white">Start building your company</Link>
                  <a href="mailto:hello@firmic.io" className="rounded-full border border-white/15 bg-white/5 px-8 py-4 text-center font-black text-white transition hover:bg-white/10">Contact Firmic</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#09233d]/10 bg-[#edf4f5]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-10 md:flex-row md:items-center md:justify-between lg:px-10">
          <div>
            <p className="text-xl font-black tracking-[0.13em] text-[#09233d]">FIRMIC</p>
            <p className="mt-2 text-sm text-[#698296]">The operating system for AI-native companies.</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm font-bold text-[#49677d]">
            <a href="#vision" className="hover:text-[#0f8f91]">Vision</a>
            <a href="#platform" className="hover:text-[#0f8f91]">Platform</a>
            <a href="#how-it-works" className="hover:text-[#0f8f91]">How it works</a>
            <a href="#abu-dhabi" className="hover:text-[#0f8f91]">Abu Dhabi</a>
            <Link href="/virtual-offices" className="hover:text-[#0f8f91]">Launch</Link>
            <a href="mailto:hello@firmic.io" className="hover:text-[#0f8f91]">Contact</a>
          </div>
          <p className="text-xs font-semibold text-[#8aa0af]">© {new Date().getFullYear()} Firmic. Abu Dhabi, UAE.</p>
        </div>
      </footer>
    </div>
  );
}
