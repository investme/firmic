type VoiceCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
};

function isEnglish(
  voice: SpeechSynthesisVoice,
) {
  return /^en(?:-|_)/i.test(voice.lang || "");
}

function femaleVoiceScore(
  voice: SpeechSynthesisVoice,
) {
  if (!isEnglish(voice)) return -1000;

  const name = voice.name.toLowerCase();
  const lang = (voice.lang || "").toLowerCase();

  let score = 0;

  const femaleNames = [
    "aria",
    "jenny",
    "zira",
    "samantha",
    "victoria",
    "susan",
    "hazel",
    "female",
    "google uk english female",
    "microsoft eva",
    "microsoft michelle",
    "karen",
    "moira",
    "fiona",
    "tessa",
  ];

  const maleNames = [
    "ryan",
    "guy",
    "daniel",
    "david",
    "james",
    "oliver",
    "george",
    "alex",
    "male",
  ];

  if (
    femaleNames.some((token) =>
      name.includes(token),
    )
  ) {
    score += 300;
  }

  if (
    maleNames.some((token) =>
      name.includes(token),
    )
  ) {
    score -= 350;
  }

  if (
    /(natural|online|enhanced|premium)/i.test(
      voice.name,
    )
  ) {
    score += 60;
  }

  if (lang === "en-us") score += 35;
  if (lang === "en-gb") score += 30;

  if (voice.default) score += 5;

  return score;
}

async function loadVoices():
  Promise<SpeechSynthesisVoice[]> {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return [];
  }

  const immediate =
    window.speechSynthesis.getVoices();

  if (immediate.length) {
    return immediate;
  }

  return await new Promise(
    (resolve) => {
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;

        window.speechSynthesis.removeEventListener(
          "voiceschanged",
          finish,
        );

        resolve(
          window.speechSynthesis.getVoices(),
        );
      };

      window.speechSynthesis.addEventListener(
        "voiceschanged",
        finish,
      );

      window.setTimeout(finish, 1400);
    },
  );
}

async function speakHermesText(
  text: string,
  callbacks: VoiceCallbacks = {},
) {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    callbacks.onEnd?.();
    return false;
  }

  const synthesis =
    window.speechSynthesis;

  synthesis.cancel();

  const voices =
    await loadVoices();

  const femaleEnglishVoices =
    voices
      .filter(isEnglish)
      .sort(
        (a, b) =>
          femaleVoiceScore(b) -
          femaleVoiceScore(a),
      );

  const preferred =
    femaleEnglishVoices[0] || null;

  const utterance =
    new SpeechSynthesisUtterance(text);

  utterance.lang =
    preferred?.lang || "en-US";

  if (preferred) {
    utterance.voice = preferred;
  }

  /*
   * Hermes is intentionally distinct from Sonny:
   * slightly higher pitch, calm pace, female-preferred voice.
   */
  utterance.rate = 0.93;
  utterance.pitch = 1.08;
  utterance.volume = 1;

  utterance.onstart = () =>
    callbacks.onStart?.();

  utterance.onend = () =>
    callbacks.onEnd?.();

  utterance.onerror = () => {
    callbacks.onError?.();
    callbacks.onEnd?.();
  };

  synthesis.speak(utterance);

  return true;
}

export async function speakHermesIntro(
  companyName: string,
  callbacks: VoiceCallbacks = {},
) {
  const text =
    `Hello. I'm Hermes, your Firmic Compliance AI. ` +
    `I'll guide you through the compliance requirements for ${companyName}. ` +
    `First, confirm whether the founder or authorized representative is a UAE resident. ` +
    `Then upload every applicable identity, address, licensing, company formation, beneficial ownership, and KYC document shown on this page. ` +
    `When all mandatory documents are supplied, select Submit Compliance Package. ` +
    `I will send the completed package to Firmic Compliance for review. ` +
    `Your Documents area will remain available while the rest of the company workspace stays securely locked until approval.`;

  return speakHermesText(
    text,
    callbacks,
  );
}

export async function speakHermesReview(
  companyName: string,
  callbacks: VoiceCallbacks = {},
) {
  const text =
    `Thank you. I have received the compliance package for ${companyName}. ` +
    `Firmic Compliance is now verifying the submitted identity, company, ownership, licensing, and KYC documents. ` +
    `Most reviews are completed within twenty four hours. ` +
    `I will notify you if the package is approved, rejected, or requires another document. ` +
    `Your Documents area remains available, while operational access stays securely locked during review.`;

  return speakHermesText(
    text,
    callbacks,
  );
}

export type HermesLiveBriefing = {
  companyName: string;
  score: number;
  risk: string;
  documentCount: number;
  pendingTasks: number;
  openAlerts: number;
  status?: string;
};

export async function speakHermesBriefing(
  briefing: HermesLiveBriefing,
  callbacks: VoiceCallbacks = {},
) {
  const {
    companyName,
    score,
    risk,
    documentCount,
    pendingTasks,
    openAlerts,
    status,
  } = briefing;

  const taskLine =
    pendingTasks === 0
      ? "There are no pending compliance tasks at the moment."
      : pendingTasks === 1
        ? "There is one pending compliance task."
        : `There are ${pendingTasks} pending compliance tasks.`;

  const alertLine =
    openAlerts === 0
      ? "I do not see any open compliance alerts requiring immediate attention."
      : openAlerts === 1
        ? "I am currently monitoring one open compliance alert."
        : `I am currently monitoring ${openAlerts} open compliance alerts.`;

  const statusLine = status
    ? `Your current compliance status is ${status}.`
    : "";

  const text =
    `Hello. I'm Hermes, your Firmic Compliance AI. ` +
    `Here is the current compliance briefing for ${companyName}. ` +
    `Your compliance score is ${Math.round(score)} percent, with a ${risk.toLowerCase()} risk level. ` +
    `${statusLine} ` +
    `I am monitoring ${documentCount} compliance documents. ` +
    `${taskLine} ` +
    `${alertLine} ` +
    `I will continue monitoring your company and will notify you if a document, ownership record, licensing item, or regulatory requirement needs attention.`;

  return speakHermesText(
    text.replace(/\s+/g, " ").trim(),
    callbacks,
  );
}

export async function speakHermesResponse(
  text: string,
  callbacks: VoiceCallbacks = {},
) {
  return speakHermesText(
    text,
    callbacks,
  );
}

