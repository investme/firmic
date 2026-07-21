import {
  DEFAULT_AI_LANGUAGE,
  getFirmicAILanguage,
} from "./language";

const ENGLISH_VOICE_NAME_PRIORITY = [
  "Microsoft Ryan Online",
  "Microsoft Guy Online",
  "Microsoft Aria Online",
  "Microsoft Jenny Online",
  "Google UK English Male",
  "Google UK English Female",
  "Google US English",
  "Daniel",
  "Alex",
  "Samantha",
];

function isEnglishVoice(voice: SpeechSynthesisVoice): boolean {
  return /^en(?:-|_)/i.test(voice.lang || "");
}

function scoreVoice(voice: SpeechSynthesisVoice): number {
  if (!isEnglishVoice(voice)) return -1000;

  let score = 0;
  const normalizedName = voice.name.toLowerCase();
  const normalizedLanguage = (voice.lang || "").toLowerCase();

  if (normalizedLanguage === "en-us") score += 80;
  else if (normalizedLanguage === "en-gb") score += 70;
  else score += 50;

  const preferredIndex = ENGLISH_VOICE_NAME_PRIORITY.findIndex((name) =>
    normalizedName.includes(name.toLowerCase()),
  );

  if (preferredIndex >= 0) {
    score += 100 - preferredIndex;
  }

  if (/(natural|online|enhanced|premium)/i.test(voice.name)) {
    score += 30;
  }

  if (voice.localService) score += 5;
  if (voice.default) score += 2;

  return score;
}

export function selectEnglishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const englishVoices = voices
    .filter(isEnglishVoice)
    .sort((left, right) => scoreVoice(right) - scoreVoice(left));

  return englishVoices[0] || null;
}

export async function loadSpeechVoices(
  timeoutMs = 1500,
): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }

  const immediate = window.speechSynthesis.getVoices();
  if (immediate.length > 0) return immediate;

  return new Promise((resolve) => {
    let resolved = false;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        handleVoicesChanged,
      );
      resolve(window.speechSynthesis.getVoices());
    };

    const handleVoicesChanged = () => finish();

    window.speechSynthesis.addEventListener(
      "voiceschanged",
      handleVoicesChanged,
    );

    window.setTimeout(finish, timeoutMs);
  });
}

export type SpeakEnglishOptions = {
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (event: SpeechSynthesisErrorEvent) => void;
};

export async function speakEnglish(
  text: string,
  options: SpeakEnglishOptions = {},
): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    !text.trim()
  ) {
    return false;
  }

  const language = getFirmicAILanguage();
  const synthesis = window.speechSynthesis;

  synthesis.cancel();

  const voices = await loadSpeechVoices();
  const voice = selectEnglishVoice(voices);

  // Never allow the browser's foreign default voice to speak Sonny.
  if (!voice) {
    console.warn(
      "Firmic AI Voice: No English speech voice is installed. Voice output was skipped.",
    );
    options.onEnd?.();
    return false;
  }

  const utterance = new SpeechSynthesisUtterance(text);

  // This is the critical lock that was missing.
  utterance.lang = language.code || DEFAULT_AI_LANGUAGE.code;
  utterance.voice = voice;
  utterance.rate = options.rate ?? 0.92;
  utterance.pitch = options.pitch ?? 0.96;
  utterance.volume = options.volume ?? 1;

  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = (event) => {
    options.onError?.(event);
    options.onEnd?.();
  };

  synthesis.speak(utterance);
  return true;
}

export function stopFirmicVoice(): void {
  if (typeof window === "undefined") return;
  window.speechSynthesis?.cancel?.();
}
