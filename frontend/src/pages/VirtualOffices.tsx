import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { getOffices } from "../../services/officeApi";
import { getActiveWorkspace } from "../utils/workspaceContext";

type Office = {
  id: number;
  office_code: string;
  location: string;
  status: string;
  monthly_price_usd: number;
};

const FALLBACK_OFFICES: Office[] = [
  {
    id: 1,
    office_code: "A047",
    location: "Hub71, Abu Dhabi, United Arab Emirates",
    status: "available",
    monthly_price_usd: 99,
  },
  {
    id: 2,
    office_code: "A048",
    location: "Hub71, Abu Dhabi, United Arab Emirates",
    status: "available",
    monthly_price_usd: 129,
  },
  {
    id: 3,
    office_code: "A049",
    location: "Hub71, Abu Dhabi, United Arab Emirates",
    status: "available",
    monthly_price_usd: 149,
  },
];

const PLATFORM_FEATURES = [
  {
    icon: "✦",
    title: "AI Workforce",
    description:
      "Launch with specialized AI employees supporting operations, sales, finance, compliance, and growth.",
  },
  {
    icon: "✉",
    title: "Digital Mailroom",
    description:
      "Receive, organize, and manage your company mail through one secure digital workspace.",
  },
  {
    icon: "☎",
    title: "Business Communications",
    description:
      "Build a professional presence with business calling, VoIP, and communication tools.",
  },
  {
    icon: "◈",
    title: "Customer Hub",
    description:
      "Manage leads, clients, opportunities, and company relationships through Firmic.",
  },
  {
    icon: "⌂",
    title: "Meeting Rooms",
    description:
      "Access bookable business meeting spaces when your company needs a physical presence.",
  },
  {
    icon: "◇",
    title: "Microsoft 365",
    description:
      "Connect your company tools, files, email, and daily workflows from one operating system.",
  },
];

function toAED(usd: number) {
  return Math.round(usd * 3.67);
}

function normalizeOffice(office: Partial<Office>, index: number): Office {
  return {
    id: Number(office.id ?? index + 1),
    office_code: office.office_code || `A${String(index + 47).padStart(3, "0")}`,
    location:
      office.location || "Hub71, Abu Dhabi, United Arab Emirates",
    status: office.status || "available",
    monthly_price_usd: Number(office.monthly_price_usd || 99),
  };
}

export default function VirtualOffices({ workspaceMode = false }: { workspaceMode?: boolean }) {
  const router = useRouter();

  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [continuingId, setContinuingId] = useState<number | null>(null);
  const [showingFallback, setShowingFallback] = useState(false);

  useEffect(() => {
    void loadOffices();
  }, []);

  async function loadOffices() {
    try {
      setLoading(true);
      setShowingFallback(false);

      const response = await getOffices();

      const receivedOffices = Array.isArray(response)
        ? response
        : Array.isArray(response?.offices)
          ? response.offices
          : [];

      const normalizedOffices = receivedOffices
        .map((office: Partial<Office>, index: number) =>
          normalizeOffice(office, index)
        )
        .filter(
          (office: Office) =>
            office.status.toLowerCase() === "available"
        );

      if (normalizedOffices.length === 0) {
        setOffices(FALLBACK_OFFICES);
        setShowingFallback(true);
        return;
      }

      setOffices(normalizedOffices.slice(0, 12));
    } catch (error) {
      console.error("Unable to load public headquarters:", error);

      // The public page remains usable during backend downtime.
      setOffices(FALLBACK_OFFICES);
      setShowingFallback(true);
    } finally {
      setLoading(false);
    }
  }

  const startingPrice = useMemo(() => {
    if (offices.length === 0) {
      return 99;
    }

    return Math.min(
      ...offices.map((office) => office.monthly_price_usd || 99)
    );
  }, [offices]);

  function selectHeadquarters(office: Office) {
    try {
      setContinuingId(office.id);

      const workspace = getActiveWorkspace();
      if (workspace?.headquarters?.office_code) {
        localStorage.removeItem("firmic_selected_headquarters");
        void router.push("/configure-office");
        return;
      }

      const selectedHeadquarters = {
        office_id: office.id,
        office_code: office.office_code,
        office_name: "Premium Hub71 Virtual Headquarters",
        location:
          office.location || "Hub71, Abu Dhabi, United Arab Emirates",
        status: "Selected",
        monthly_price_usd: office.monthly_price_usd || 99,
        selected_at: new Date().toISOString(),
      };

      localStorage.setItem(
        "firmic_selected_headquarters",
        JSON.stringify(selectedHeadquarters)
      );

      const onboardingMode =
        workspaceMode ||
        router.query.onboarding === "1" ||
        Boolean(getActiveWorkspace());

      void router.push(onboardingMode ? "/configure-office" : "/create-company");
    } catch (error) {
      console.error("Unable to save headquarters selection:", error);
      setContinuingId(null);
      alert("We could not save your selection. Please try again.");
    }
  }

  return (
    <>
      <Head>
        <title>Virtual Headquarters in Abu Dhabi | Firmic</title>

        <meta
          name="description"
          content="Launch your AI-native company with a premium virtual headquarters in Abu Dhabi and Firmic's complete business operating system."
        />
      </Head>

      <div className="min-h-screen overflow-hidden bg-[#07111f] text-white">
        <PublicNavigation />

        <main>
          <section className="relative isolate overflow-hidden px-6 pb-24 pt-20 sm:pt-28 lg:px-8 lg:pb-32">
            <div className="absolute inset-0 -z-20 bg-[#07111f]" />

            <div className="absolute left-1/2 top-0 -z-10 h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[150px]" />

            <div className="absolute -left-44 top-48 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />

            <div className="mx-auto max-w-7xl">
              <div className="mx-auto max-w-4xl text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-cyan-100 backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-cyan-300" />
                  Hub71 · Abu Dhabi
                </div>

                <h1 className="mt-8 text-5xl font-semibold tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
                  Your headquarters for an
                  <span className="block bg-gradient-to-r from-cyan-200 via-teal-300 to-blue-300 bg-clip-text text-transparent">
                    AI-native company.
                  </span>
                </h1>

                <p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
                  Establish your company presence in Abu Dhabi and operate it
                  through one intelligent platform for infrastructure,
                  communications, customers, and AI employees.
                </p>

                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <a
                    href="#headquarters"
                    className="inline-flex min-h-14 items-center justify-center rounded-full bg-cyan-300 px-7 text-base font-bold text-[#07111f] transition hover:-translate-y-0.5 hover:bg-cyan-200"
                  >
                    Explore Headquarters
                    <span className="ml-2">→</span>
                  </a>

                  <Link
                    href="/login"
                    className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-7 text-base font-semibold text-white backdrop-blur transition hover:border-white/30 hover:bg-white/[0.08]"
                  >
                    Access Your Workspace
                  </Link>
                </div>
              </div>

              <div className="mx-auto mt-20 grid max-w-5xl grid-cols-2 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl md:grid-cols-4">
                <HeroMetric
                  value="Abu Dhabi"
                  label="Business presence"
                />

                <HeroMetric
                  value={`${offices.length || "40"}+`}
                  label="Headquarters"
                />

                <HeroMetric value="15" label="AI specialists" />

                <HeroMetric
                  value={`$${startingPrice}`}
                  label="Starting monthly"
                  last
                />
              </div>
            </div>
          </section>

          <section className="border-y border-white/10 bg-white/[0.025] px-6 py-24 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">
                    More than an address
                  </p>

                  <h2 className="mt-5 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
                    Business infrastructure from day one.
                  </h2>

                  <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                    Firmic combines your company headquarters with the
                    operational systems needed to launch, manage, and scale an
                    AI-native business.
                  </p>

                  <div className="mt-9 rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/10 to-blue-400/5 p-6">
                    <p className="text-sm font-semibold text-cyan-200">
                      The Firmic advantage
                    </p>

                    <p className="mt-3 text-xl font-semibold leading-8 text-white">
                      Instead of assembling disconnected providers, your
                      company launches into one unified operating environment.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {PLATFORM_FEATURES.slice(0, 4).map((feature) => (
                    <FeatureCard
                      key={feature.title}
                      icon={feature.icon}
                      title={feature.title}
                      description={feature.description}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section
            id="headquarters"
            className="scroll-mt-24 bg-[#f5f8fb] px-6 py-24 text-[#07111f] lg:px-8 lg:py-32"
          >
            <div className="mx-auto max-w-7xl">
              <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-700">
                    Headquarters collection
                  </p>

                  <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                    Choose your Abu Dhabi headquarters.
                  </h2>

                  <p className="mt-5 text-lg leading-8 text-slate-600">
                    Select the headquarters that will become the foundation of
                    your Firmic company workspace.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadOffices()}
                  disabled={loading}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Loading..." : "Refresh Availability"}
                </button>
              </div>

              {showingFallback && !loading && (
                <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
                  Live availability is temporarily unavailable. The
                  headquarters below are preview options and will be confirmed
                  during onboarding.
                </div>
              )}

              {loading ? (
                <HeadquartersSkeleton />
              ) : (
                <div className="mt-12 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
                  {offices.map((office, index) => (
                    <HeadquartersCard
                      key={office.id}
                      office={office}
                      featured={index === 0}
                      continuing={continuingId === office.id}
                      onSelect={() => selectHeadquarters(office)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="bg-white px-6 py-24 text-[#07111f] lg:px-8 lg:py-32">
            <div className="mx-auto max-w-7xl">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-700">
                  Your operating system
                </p>

                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                  Everything your company needs to operate.
                </h2>

                <p className="mt-5 text-lg leading-8 text-slate-600">
                  Your headquarters connects to Firmic’s complete company
                  infrastructure, replacing a collection of fragmented tools
                  with one intelligent platform.
                </p>
              </div>

              <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {PLATFORM_FEATURES.map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-7 transition hover:-translate-y-1 hover:border-teal-200 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#07111f] text-xl text-cyan-300">
                      {feature.icon}
                    </div>

                    <h3 className="mt-6 text-xl font-bold">{feature.title}</h3>

                    <p className="mt-3 leading-7 text-slate-600">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden bg-[#07111f] px-6 py-24 lg:px-8 lg:py-32">
            <div className="absolute left-1/2 top-1/2 h-96 w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-[130px]" />

            <div className="relative mx-auto max-w-5xl rounded-[2.5rem] border border-white/10 bg-white/[0.055] px-7 py-14 text-center backdrop-blur-xl sm:px-12 lg:px-20 lg:py-20">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">
                Launch with Firmic
              </p>

              <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Build your company on infrastructure designed for the AI era.
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Select your headquarters, create your company, configure your
                services, and enter the Firmic Command Center.
              </p>

              <a
                href="#headquarters"
                className="mt-9 inline-flex min-h-14 items-center justify-center rounded-full bg-cyan-300 px-8 font-bold text-[#07111f] transition hover:-translate-y-0.5 hover:bg-cyan-200"
              >
                Choose Your Headquarters
                <span className="ml-2">→</span>
              </a>
            </div>
          </section>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}

function PublicNavigation() {
  return (
    <header className="relative z-50 border-b border-white/10 bg-[#07111f]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
  <Link href="/" className="flex items-center gap-3">
    <div className="relative h-12 w-32">
      <Image
       src="/firmic-logo-transparent.png"
       alt="Firmic"
       fill
       sizes="128px"
       className="object-contain object-left"
       priority
      />
    </div>
  </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-300 md:flex">
          <Link href="/#platform" className="transition hover:text-white">
            Platform
          </Link>

          <a href="#headquarters" className="transition hover:text-white">
            Headquarters
          </a>

          <Link href="/login" className="transition hover:text-white">
            Sign in
          </Link>
        </nav>

        <a
          href="#headquarters"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-bold text-[#07111f] transition hover:bg-cyan-200"
        >
          Launch Company
        </a>
      </div>
    </header>
  );
}

function HeroMetric({
  value,
  label,
  last = false,
}: {
  value: string;
  label: string;
  last?: boolean;
}) {
  return (
    <div
      className={`px-5 py-7 text-center ${
        last ? "" : "border-r border-white/10"
      }`}
    >
      <p className="text-xl font-bold text-white sm:text-2xl">{value}</p>
      <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur transition hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.07]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10 text-xl text-cyan-200">
        {icon}
      </div>

      <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </article>
  );
}

function HeadquartersCard({
  office,
  featured,
  continuing,
  onSelect,
}: {
  office: Office;
  featured: boolean;
  continuing: boolean;
  onSelect: () => void;
}) {
  const monthlyPrice = office.monthly_price_usd || 99;

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-300/50 ${
        featured ? "border-teal-300" : "border-slate-200"
      }`}
    >
      {featured && (
        <div className="absolute right-5 top-5 z-10 rounded-full bg-cyan-300 px-3 py-1.5 text-xs font-bold text-[#07111f]">
          Recommended
        </div>
      )}

      <div className="relative h-52 overflow-hidden bg-[#07111f]">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-cyan-200">
            Firmic Headquarters
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {office.office_code}
          </p>

          <p className="mt-2 text-sm text-slate-300">
            Hub71 · Abu Dhabi
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-teal-700">
              Premium Virtual Headquarters
            </p>

            <h3 className="mt-2 text-2xl font-bold tracking-[-0.025em]">
              Headquarters {office.office_code}
            </h3>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            Available
          </span>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          {office.location || "Hub71, Abu Dhabi, United Arab Emirates"}
        </p>

        <div className="mt-6 rounded-2xl bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-500">Monthly plan</p>

          <div className="mt-2 flex items-end gap-2">
            <p className="text-3xl font-bold tracking-tight">
              ${monthlyPrice}
            </p>

            <p className="pb-1 text-sm text-slate-500">USD / month</p>
          </div>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Approximately AED {toAED(monthlyPrice)} / month
          </p>
        </div>

        <ul className="mt-6 space-y-3 text-sm text-slate-700">
          <IncludedItem text="Abu Dhabi company headquarters" />
          <IncludedItem text="Digital mailroom compatibility" />
          <IncludedItem text="Business communications ready" />
          <IncludedItem text="AI workforce and Customer Hub access" />
        </ul>

        <button
          type="button"
          onClick={onSelect}
          disabled={continuing}
          className="mt-8 inline-flex min-h-13 w-full items-center justify-center rounded-full bg-[#07111f] px-5 font-bold text-white transition hover:bg-teal-900 disabled:cursor-wait disabled:bg-slate-400"
        >
          {continuing ? "Preparing Your Company..." : "Select Headquarters"}
          {!continuing && <span className="ml-2">→</span>}
        </button>
      </div>
    </article>
  );
}

function IncludedItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-700">
        ✓
      </span>

      <span>{text}</span>
    </li>
  );
}

function HeadquartersSkeleton() {
  return (
    <div className="mt-12 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white"
        >
          <div className="h-52 animate-pulse bg-slate-200" />

          <div className="space-y-5 p-7">
            <div className="h-5 w-2/5 animate-pulse rounded bg-slate-200" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-12 animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#050c16] px-6 py-10 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-white">Firmic</p>
          <p className="mt-1">The Operating System for AI-Native Companies.</p>
        </div>

        <div className="flex flex-wrap gap-6">
          <Link href="/" className="transition hover:text-white">
            Home
          </Link>

          <Link href="/login" className="transition hover:text-white">
            Sign in
          </Link>

          <Link href="/signup" className="transition hover:text-white">
            Create account
          </Link>
        </div>
      </div>
    </footer>
  );
}