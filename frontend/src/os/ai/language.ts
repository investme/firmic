export const FIRMIC_AI_LANGUAGE_STORAGE_KEY = "firmic_ai_language";

export type FirmicAILanguage = {
  code: "en-US";
  speechRecognitionCode: "en-US";
  label: "English";
};

export const DEFAULT_AI_LANGUAGE: FirmicAILanguage = {
  code: "en-US",
  speechRecognitionCode: "en-US",
  label: "English",
};

export function getFirmicAILanguage(): FirmicAILanguage {
  // B15.2 intentionally locks the MVP to English.
  return DEFAULT_AI_LANGUAGE;
}

export function saveFirmicAILanguage(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    FIRMIC_AI_LANGUAGE_STORAGE_KEY,
    DEFAULT_AI_LANGUAGE.code,
  );
}
