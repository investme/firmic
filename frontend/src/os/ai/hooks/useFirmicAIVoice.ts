import { useCallback, useEffect, useRef, useState } from "react";
import {
  getFirmicAILanguage,
  speakEnglish,
  stopFirmicVoice,
} from "../index";

type UseFirmicAIVoiceOptions = {
  enabled: boolean;
  onTranscript: (text: string) => void;
  onFinalTranscript: (text: string) => void;
  onWarning: (message: string) => void;
  onBeforeListening?: () => void;
};

const MAX_LISTENING_MS = 12_000;

export function useFirmicAIVoice({
  enabled,
  onTranscript,
  onFinalTranscript,
  onWarning,
  onBeforeListening,
}: UseFirmicAIVoiceOptions) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearListeningTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopVoice = useCallback(() => {
    stopFirmicVoice();
    setSpeaking(false);
  }, []);

  const stopListening = useCallback(() => {
    clearListeningTimeout();

    const recognition = recognitionRef.current;
    recognitionRef.current = null;

    try {
      recognition?.stop?.();
    } catch {
      // The browser may already have ended recognition.
    }

    setListening(false);
  }, [clearListeningTimeout]);

  const speak = useCallback(
    async (text: string) => {
      if (!enabled || !text.trim()) return;

      await speakEnglish(text, {
        rate: 0.92,
        pitch: 0.96,
        volume: 1,
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    },
    [enabled]
  );

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    onBeforeListening?.();
    stopVoice();
    stopListening();

    const Recognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!Recognition) {
      onWarning(
        "Voice recognition is not supported in this browser. Use Chrome or Edge."
      );
      return;
    }

    const recognition = new Recognition();
    recognition.lang = getFirmicAILanguage().speechRecognitionCode;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
      clearListeningTimeout();
      timeoutRef.current = setTimeout(() => {
        stopListening();
        onWarning("Sonny stopped listening because no command was completed. Please try again.");
      }, MAX_LISTENING_MS);
    };

    recognition.onend = () => {
      clearListeningTimeout();
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      setListening(false);
    };

    recognition.onerror = (event: any) => {
      clearListeningTimeout();
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      setListening(false);

      if (event?.error === "aborted") return;
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        onWarning("Microphone access is blocked. Allow microphone permission and try again.");
        return;
      }
      if (event?.error === "no-speech") {
        onWarning("Sonny did not hear a command. Please try again.");
        return;
      }

      onWarning("Sonny could not hear the command. Please try again.");
    };

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        transcript += event.results[index][0].transcript;
      }

      const cleanTranscript = transcript.trim();
      onTranscript(cleanTranscript);

      const latest = event.results[event.results.length - 1];
      if (latest?.isFinal && cleanTranscript) {
        clearListeningTimeout();
        setListening(false);

        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }

        try {
          recognition.stop();
        } catch {
          // Recognition may already be stopping.
        }

        window.setTimeout(() => onFinalTranscript(cleanTranscript), 100);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      onWarning("Sonny could not start the microphone. Please try again.");
    }
  }, [
    clearListeningTimeout,
    onBeforeListening,
    onFinalTranscript,
    onTranscript,
    onWarning,
    stopListening,
    stopVoice,
  ]);

  useEffect(() => {
    return () => {
      clearListeningTimeout();
      stopListening();
      stopFirmicVoice();
    };
  }, [clearListeningTimeout, stopListening]);

  return {
    listening,
    speaking,
    speak,
    startListening,
    stopListening,
    stopVoice,
  };
}
