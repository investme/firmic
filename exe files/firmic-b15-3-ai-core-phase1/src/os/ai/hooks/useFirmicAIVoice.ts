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

  const stopVoice = useCallback(() => {
    stopFirmicVoice();
    setSpeaking(false);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setListening(false);
  }, []);

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

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
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
        setListening(false);
        window.setTimeout(
          () => onFinalTranscript(cleanTranscript),
          100
        );
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [
    onBeforeListening,
    onFinalTranscript,
    onTranscript,
    onWarning,
    stopListening,
    stopVoice,
  ]);

  useEffect(() => {
    return () => {
      stopListening();
      stopFirmicVoice();
    };
  }, [stopListening]);

  return {
    listening,
    speaking,
    speak,
    startListening,
    stopListening,
    stopVoice,
  };
}
