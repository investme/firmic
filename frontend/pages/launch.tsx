import Head from "next/head";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";

import ProtectedRoute from "../components/ProtectedRoute";
import {
  getActiveWorkspace,
  type FirmicWorkspace,
} from "../src/utils/workspaceContext";

type ComplianceStatus =
  | "payment_confirmed"
  | "documents_required"
  | "under_review"
  | "approved"
  | "provisioning"
  | "active";

type JourneyScreen =
  | "loading"
  | "sonny_welcome"
  | "hermes_intro"
  | "under_review"
  | "approved"
  | "provisioning"
  | "active";

type ComplianceState = {
  status?: string;
  subscription_completed?: boolean;
  admin_approved?: boolean;
  infrastructure_provisioned?: boolean;
  company_access_locked?: boolean;
  next_step?: string;
  updated_at?: string;
};

type RequiredDocument = {
  key: string;
  name: string;
  description: string;
  category: string;
  required: true;
  status: "required";
};

const REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    key: "passport",
    name: "Passport",
    description:
      "A clear, valid passport copy for the founder or authorized company representative.",
    category: "Identity",
    required: true,
    status: "required",
  },
  {
    key: "emirates_id",
    name: "Emirates ID",
    description:
      "Required when the founder or authorized representative is a UAE resident.",
    category: "Identity",
    required: true,
    status: "required",
  },
  {
    key: "proof_of_address",
    name: "Proof of Address",
    description:
      "A recent utility bill, bank statement, or accepted residential address document.",
    category: "Identity",
    required: true,
    status: "required",
  },
  {
    key: "trade_license",
    name: "Trade License",
    description:
      "The company trade license or licensing document issued by the relevant authority.",
    category: "Company",
    required: true,
    status: "required",
  },
  {
    key: "incorporation_documents",
    name: "Company Formation Documents",
    description:
      "Certificate of incorporation, memorandum, articles, or equivalent company papers.",
    category: "Company",
    required: true,
    status: "required",
  },
  {
    key: "beneficial_owner",
    name: "Beneficial Owner Declaration",
    description:
      "Ownership and control information for the company and its ultimate beneficial owners.",
    category: "KYC",
    required: true,
    status: "required",
  },
  {
    key: "kyc_questionnaire",
    name: "KYC Questionnaire",
    description:
      "Firmic's company activity, source-of-funds, ownership, and risk questionnaire.",
    category: "KYC",
    required: true,
    status: "required",
  },
];

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeStatus(
  state: ComplianceState | null,
): ComplianceStatus {
  if (state?.status === "active") return "active";
  if (state?.status === "provisioning") return "provisioning";
  if (
    state?.status === "approved" ||
    state?.admin_approved === true
  ) {
    return "approved";
  }

  if (state?.status === "under_review") {
    return "under_review";
  }

  if (state?.status === "documents_required") {
    return "documents_required";
  }

  return "payment_confirmed";
}


function getNarrationForScreen(
  screen: JourneyScreen,
  companyName: string,
): {
  speaker: "Sonny" | "Hermes";
  text: string;
} | null {
  if (screen === "sonny_welcome") {
    return {
      speaker: "Sonny",
      text: `Congratulations. ${companyName} is moving forward. Your payment has been received and your Firmic subscription is confirmed. Before I can activate your company, Firmic must verify its identity, ownership, licensing, and regulatory information. I will now introduce you to Hermes, our compliance specialist.`,
    };
  }

  if (screen === "hermes_intro") {
    return {
      speaker: "Hermes",
      text: `Hello. I am Hermes, and I will verify ${companyName}. Every company using Firmic must complete identity, ownership, company, and KYC verification before operational access can be granted. I will guide you through each required document.`,
    };
  }

  if (screen === "under_review") {
    return {
      speaker: "Hermes",
      text: `${companyName} is under compliance review. Your submitted documents are now being verified by Firmic Compliance. Most reviews are completed within twenty four hours. Your company remains securely locked during this review. I will notify you if the package is approved, rejected, or requires another document, and I will report the result to Sonny.`,
    };
  }

  if (screen === "approved") {
    return {
      speaker: "Sonny",
      text: `Hermes has approved ${companyName}. I can now begin provisioning the headquarters, mailroom, communications, business systems, and AI workforce included in your Firmic plan.`,
    };
  }

  if (screen === "active") {
    return {
      speaker: "Sonny",
      text: `Welcome to ${companyName}. Compliance is approved, Firmic provisioning is complete, and your Company Command Center is now unlocked.`,
    };
  }

  return null;
}

function speakNarration(
  narration: { speaker: "Sonny" | "Hermes"; text: string },
) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return false;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(
    narration.text,
  );

  const voices = window.speechSynthesis.getVoices();

  const preferredVoice =
    voices.find((voice) =>
      narration.speaker === "Sonny"
        ? /male|daniel|david|alex|mark/i.test(voice.name)
        : /male|george|thomas|james|oliver/i.test(voice.name),
    ) ||
    voices.find((voice) =>
      /^en(-|_)/i.test(voice.lang),
    ) ||
    voices[0];

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.rate = 0.96;
  utterance.pitch =
    narration.speaker === "Sonny" ? 1 : 0.9;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
  return true;
}

export default function LaunchJourneyPage() {
  const router = useRouter();

  const [workspace, setWorkspace] =
    useState<FirmicWorkspace | null>(null);

  const [screen, setScreen] =
    useState<JourneyScreen>("loading");

  const [complianceStatus, setComplianceStatus] =
    useState<ComplianceStatus>("payment_confirmed");

  const [voiceEnabled, setVoiceEnabled] =
    useState(true);

  const [isSpeaking, setIsSpeaking] =
    useState(false);

  const lastNarratedScreen =
    useRef<JourneyScreen | null>(null);

  useEffect(() => {
    const currentWorkspace = getActiveWorkspace();

    if (!currentWorkspace?.id) {
      void router.replace(
        "/login?next=/launch",
      );
      return;
    }

    setWorkspace(currentWorkspace);

    const compliance = readJson<ComplianceState>(
      `firmic_compliance_status:${currentWorkspace.id}`,
    );

    const status = normalizeStatus(compliance);
    setComplianceStatus(status);

    if (status === "active") {
      setScreen("active");
      return;
    }

    if (status === "provisioning") {
      setScreen("provisioning");
      return;
    }

    if (status === "approved") {
      setScreen("approved");
      return;
    }

    if (status === "under_review") {
      setScreen("under_review");
      return;
    }

    const handoff = readJson<{
      sonnyIntroducedHermes?: boolean;
    }>("firmic_sonny_handoff");

    setScreen(
      handoff?.sonnyIntroducedHermes
        ? "hermes_intro"
        : "sonny_welcome",
    );
  }, [router]);


  useEffect(() => {
    if (
      !workspace?.name ||
      screen === "loading" ||
      !voiceEnabled ||
      lastNarratedScreen.current === screen
    ) {
      return;
    }

    const narration = getNarrationForScreen(
      screen,
      workspace.name,
    );

    if (!narration) {
      return;
    }

    const timer = window.setTimeout(() => {
      const started = speakNarration(narration);

      if (started) {
        setIsSpeaking(true);
        lastNarratedScreen.current = screen;

        const estimatedDuration = Math.max(
          2500,
          narration.text.split(" ").length * 420,
        );

        window.setTimeout(() => {
          setIsSpeaking(false);
        }, estimatedDuration);
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
    };
  }, [screen, voiceEnabled, workspace?.name]);

  useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function replayVoice() {
    if (!workspace?.name) return;

    const narration = getNarrationForScreen(
      screen,
      workspace.name,
    );

    if (!narration) return;

    const started = speakNarration(narration);

    if (started) {
      setIsSpeaking(true);
    }
  }

  const companyName =
    workspace?.name || "your company";

  const planName =
    workspace?.plan || "Firmic";

  const progress = useMemo(() => {
    if (screen === "sonny_welcome") return 48;
    if (screen === "hermes_intro") return 52;
    if (screen === "under_review") return 64;
    if (screen === "approved") return 76;
    if (screen === "provisioning") return 88;
    if (screen === "active") return 100;
    return 45;
  }, [screen]);

  function introduceHermes() {
    writeJson("firmic_sonny_handoff", {
      companyId: workspace?.id,
      from: "sonny",
      to: "hermes",
      status: "hermes_introduction",
      sonnyIntroducedHermes: true,
      createdAt: new Date().toISOString(),
    });

    setScreen("hermes_intro");
  }

  async function beginCompliance() {
    if (!workspace?.id) return;

    writeJson(
      `firmic_required_documents:${workspace.id}`,
      REQUIRED_DOCUMENTS,
    );

    writeJson(
      `firmic_compliance_status:${workspace.id}`,
      {
        status: "documents_required",
        subscription_completed: true,
        admin_approved: false,
        infrastructure_provisioned: false,
        company_access_locked: true,
        next_step: "passport",
        updated_at: new Date().toISOString(),
      },
    );

    await router.push(
      "/documents?onboarding=1&source=hermes",
    );
  }

  async function enterCommandCenter() {
    await router.replace("/dashboard");
  }

  if (screen === "loading") {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen items-center justify-center bg-[#f3f7f8] text-[#09233d]">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#0f8f91]/20 border-t-[#0f8f91]" />
            <p className="mt-5 font-black">
              Sonny is reading the Launch Engine...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Head>
        <title>Company Launch | Firmic</title>
        <meta
          name="description"
          content="Continue your company activation journey through Sonny, Hermes, compliance, and Firmic provisioning."
        />
      </Head>

      <div className="min-h-screen bg-[#f3f7f8] px-5 py-6 text-[#09233d] sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xl font-black tracking-[0.16em]">
              FIRMIC
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (voiceEnabled) {
                    window.speechSynthesis?.cancel();
                    setIsSpeaking(false);
                  }

                  setVoiceEnabled((current) => !current);
                }}
                className="rounded-full border border-[#09233d]/10 bg-white px-4 py-2 text-xs font-black text-[#49677d] transition hover:border-[#0f8f91]/30 hover:text-[#0f8f91]"
              >
                {voiceEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
              </button>

              <button
                type="button"
                onClick={replayVoice}
                disabled={!voiceEnabled}
                className="rounded-full border border-[#09233d]/10 bg-white px-4 py-2 text-xs font-black text-[#49677d] transition hover:border-[#0f8f91]/30 hover:text-[#0f8f91] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSpeaking ? "Speaking..." : "Replay Voice"}
              </button>

              <div className="rounded-full border border-[#0f8f91]/15 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#0f7779]">
                {planName} · Company Launch
              </div>
            </div>
          </header>

          <LaunchProgress
            progress={progress}
            screen={screen}
          />

          <main
            key={screen}
            className="mt-7 animate-[firmicJourneyEnter_500ms_ease-out]"
          >
            {screen === "sonny_welcome" && (
              <SonnyWelcome
                companyName={companyName}
                onContinue={introduceHermes}
              />
            )}

            {screen === "hermes_intro" && (
              <HermesIntroduction
                companyName={companyName}
                onContinue={() =>
                  void beginCompliance()
                }
              />
            )}

            {screen === "under_review" && (
              <HermesReview
                companyName={companyName}
              />
            )}

            {screen === "approved" && (
              <SonnyApproved
                companyName={companyName}
                onContinue={() =>
                  setScreen("provisioning")
                }
              />
            )}

            {screen === "provisioning" && (
              <Provisioning
                companyName={companyName}
              />
            )}

            {screen === "active" && (
              <CompanyActive
                companyName={companyName}
                onContinue={() =>
                  void enterCommandCenter()
                }
              />
            )}
          </main>
        </div>

        <style jsx global>{`
          @keyframes firmicJourneyEnter {
            from {
              opacity: 0;
              transform: translateY(18px) scale(0.992);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}

function LaunchProgress({
  progress,
  screen,
}: {
  progress: number;
  screen: JourneyScreen;
}) {
  const status =
    screen === "sonny_welcome"
      ? "Payment confirmed"
      : screen === "hermes_intro"
        ? "Compliance introduction"
        : screen === "under_review"
          ? "Compliance review"
          : screen === "approved"
            ? "Compliance approved"
            : screen === "provisioning"
              ? "Infrastructure provisioning"
              : "Company active";

  return (
    <section className="mt-6 rounded-[1.6rem] border border-[#09233d]/10 bg-white px-5 py-4 shadow-[0_14px_40px_rgba(9,35,61,0.05)] sm:px-6">
      <div className="flex items-center justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f8f91]">
            Launch Engine
          </p>
          <p className="mt-1 text-sm font-bold text-[#698296]">
            {status}
          </p>
        </div>

        <p className="text-xl font-black">
          {progress}%
        </p>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#dce8eb]">
        <div
          className="h-full rounded-full bg-[#0f8f91] transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );
}

function SonnyWelcome({
  companyName,
  onContinue,
}: {
  companyName: string;
  onContinue: () => void;
}) {
  return (
    <JourneyCard
      accent="sonny"
      badge="Sonny · AI Chief Operating Officer"
      initial="S"
      title={`Congratulations. ${companyName} is moving forward.`}
      body={[
        "Your payment has been received and your Firmic subscription is confirmed.",
        "Your company headquarters has been reserved, but your office, AI workforce, communications, and operating systems remain securely locked.",
        "Before I can activate the company, Firmic must verify its identity, ownership, licensing, and regulatory information.",
      ]}
      actionLabel="Meet Hermes"
      onAction={onContinue}
      sideTitle="What happens next"
      sideItems={[
        "Sonny introduces Hermes",
        "Hermes requests mandatory documents",
        "Firmic Admin verifies the compliance package",
        "Sonny provisions and activates the company",
      ]}
    />
  );
}

function HermesIntroduction({
  companyName,
  onContinue,
}: {
  companyName: string;
  onContinue: () => void;
}) {
  return (
    <JourneyCard
      accent="hermes"
      badge="Hermes · Firmic Compliance"
      initial="H"
      title={`Hello. I’m Hermes, and I’ll verify ${companyName}.`}
      body={[
        "Every company using Firmic must complete identity, ownership, company, and KYC verification before operational access can be granted.",
        "I will guide you through each required document. Uploaded documents remain pending until Firmic Admin verifies them.",
        "Nothing will be activated until the mandatory compliance package is complete and approved.",
      ]}
      actionLabel="Begin Compliance"
      onAction={onContinue}
      sideTitle="Required package"
      sideItems={REQUIRED_DOCUMENTS.map(
        (document) => document.name,
      )}
    />
  );
}

function HermesReview({
  companyName,
}: {
  companyName: string;
}) {
  return (
    <JourneyCard
      accent="hermes"
      badge="Hermes · Compliance Review"
      initial="H"
      title={`${companyName} is under compliance review.`}
      body={[
        "Your submitted documents are now being verified by Firmic Compliance.",
        "Most compliance reviews are completed within 24 hours. The company remains securely locked while identity, ownership, licensing, and KYC checks are completed.",
        "I will notify you if the package is approved, rejected, or requires another document, and I will report the result to Sonny.",
      ]}
      actionLabel="Review Submitted Documents"
      onAction={() => {
        window.location.href = "/documents";
      }}
      sideTitle="Current status"
      sideItems={[
        "Payment confirmed",
        "Documents submitted",
        "Firmic Admin review pending",
        "Operational access locked",
      ]}
    />
  );
}

function SonnyApproved({
  companyName,
  onContinue,
}: {
  companyName: string;
  onContinue: () => void;
}) {
  return (
    <JourneyCard
      accent="sonny"
      badge="Sonny · Compliance Approved"
      initial="S"
      title={`Hermes has approved ${companyName}.`}
      body={[
        "Your compliance package has passed review.",
        "I can now begin provisioning the headquarters, mailroom, communications, business systems, and AI workforce included in your Firmic plan.",
        "The Command Center will unlock only when provisioning is complete.",
      ]}
      actionLabel="Begin Provisioning"
      onAction={onContinue}
      sideTitle="Provisioning sequence"
      sideItems={[
        "Headquarters",
        "Business number",
        "Mailroom",
        "Microsoft 365",
        "Communications",
        "AI Workforce",
      ]}
    />
  );
}

function Provisioning({
  companyName,
}: {
  companyName: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[2.3rem] bg-[#09233d] px-6 py-12 text-white shadow-[0_30px_90px_rgba(9,35,61,0.22)] sm:px-10 lg:px-16 lg:py-16">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#20b9b5]/20 blur-3xl" />

      <div className="relative mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.8rem] bg-[#20b9b5] text-3xl font-black text-[#09233d]">
          S
        </div>

        <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-[#8de6e2]">
          Sonny · Provisioning
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
          Activating {companyName}.
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/65">
          I am coordinating every Firmic service and
          specialist required to make the company operational.
        </p>

        <div className="mx-auto mt-9 grid max-w-2xl gap-3 sm:grid-cols-2">
          {[
            "Headquarters provisioning",
            "Business number assignment",
            "Mailroom activation",
            "Microsoft 365 connection",
            "Communications activation",
            "AI workforce provisioning",
          ].map((item, index) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#20b9b5] text-xs font-black text-[#8de6e2]">
                {index + 1}
              </span>
              <span className="text-sm font-bold">
                {item}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm font-bold text-white/45">
          Provisioning status is controlled by the Launch Engine.
        </p>
      </div>
    </section>
  );
}

function CompanyActive({
  companyName,
  onContinue,
}: {
  companyName: string;
  onContinue: () => void;
}) {
  return (
    <JourneyCard
      accent="sonny"
      badge="Sonny · Company Active"
      initial="✓"
      title={`Welcome to ${companyName}.`}
      body={[
        "Compliance is approved and Firmic provisioning is complete.",
        "Your company headquarters, operating systems, communications, and AI workforce are now ready.",
        "The Company Command Center is unlocked.",
      ]}
      actionLabel="Enter Command Center"
      onAction={onContinue}
      sideTitle="Company status"
      sideItems={[
        "Compliance approved",
        "Infrastructure provisioned",
        "Company active",
        "Operational access unlocked",
      ]}
    />
  );
}

function JourneyCard({
  accent,
  badge,
  initial,
  title,
  body,
  actionLabel,
  onAction,
  sideTitle,
  sideItems,
}: {
  accent: "sonny" | "hermes";
  badge: string;
  initial: string;
  title: string;
  body: string[];
  actionLabel: string;
  onAction: () => void;
  sideTitle: string;
  sideItems: string[];
}) {
  const isSonny = accent === "sonny";

  return (
    <section className="relative overflow-hidden rounded-[2.3rem] bg-[#09233d] px-6 py-10 text-white shadow-[0_30px_90px_rgba(9,35,61,0.22)] sm:px-10 lg:px-14 lg:py-14">
      <div
        className={[
          "absolute -right-24 -top-24 h-80 w-80 rounded-full blur-3xl",
          isSonny
            ? "bg-[#20b9b5]/20"
            : "bg-violet-500/25",
        ].join(" ")}
      />

      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
        <div>
          <div
            className={[
              "flex h-16 w-16 items-center justify-center rounded-[1.4rem] text-2xl font-black",
              isSonny
                ? "bg-[#20b9b5] text-[#09233d]"
                : "bg-violet-500 text-white",
            ].join(" ")}
          >
            {initial}
          </div>

          <p
            className={[
              "mt-7 text-xs font-black uppercase tracking-[0.18em]",
              isSonny
                ? "text-[#8de6e2]"
                : "text-violet-300",
            ].join(" ")}
          >
            {badge}
          </p>

          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            {title}
          </h1>

          <div className="mt-7 max-w-3xl space-y-4 text-lg leading-8 text-white/68">
            {body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <button
            type="button"
            onClick={onAction}
            className={[
              "mt-9 inline-flex min-h-[58px] items-center justify-center rounded-2xl px-8 py-4 text-base font-black transition hover:-translate-y-0.5",
              isSonny
                ? "bg-[#20b9b5] text-[#09233d] hover:bg-[#38cbc7]"
                : "bg-violet-500 text-white hover:bg-violet-400",
            ].join(" ")}
          >
            {actionLabel}
            <span className="ml-3 text-xl">→</span>
          </button>
        </div>

        <aside className="rounded-[2rem] border border-white/12 bg-white/8 p-6 backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-white/50">
            {sideTitle}
          </p>

          <div className="mt-5 space-y-3">
            {sideItems.map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5"
              >
                <span
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black",
                    isSonny
                      ? "bg-[#20b9b5]/15 text-[#8de6e2]"
                      : "bg-violet-500/15 text-violet-300",
                  ].join(" ")}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <p className="text-sm font-bold text-white/75">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
