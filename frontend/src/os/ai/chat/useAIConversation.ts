import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";

export type AIChatRole = "user" | "sonny" | "system";

export type ChatMessage = {
  id: string;
  role: AIChatRole;
  text: string;
  createdAt: string;
};

type UseAIConversationOptions = {
  storageKey: string | null;
  initialMessages?: ChatMessage[];
  speak?: (text: string) => void | Promise<void>;
  maxStoredMessages?: number;
  streamIntervalMs?: number;
};

type UseAIConversationResult = {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  streamingMessageId: string | null;
  chatEndRef: MutableRefObject<HTMLDivElement | null>;
  addMessage: (role: AIChatRole, text: string) => void;
  reply: (text: string, spoken?: string) => void;
  streamReply: (text: string, spoken?: string) => void;
  stopStreaming: () => void;
  clearConversation: () => void;
};

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is ChatMessage =>
      Boolean(
        item &&
          typeof item === "object" &&
          typeof (item as ChatMessage).id === "string" &&
          typeof (item as ChatMessage).text === "string" &&
          typeof (item as ChatMessage).createdAt === "string" &&
          ["user", "sonny", "system"].includes(
            String((item as ChatMessage).role),
          ),
      ),
  );
}

export function useAIConversation({
  storageKey,
  initialMessages = [],
  speak,
  maxStoredMessages = 80,
  streamIntervalMs = 28,
}: UseAIConversationOptions): UseAIConversationResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingMessageId, setStreamingMessageId] =
    useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const streamTimerRef = useRef<number | null>(null);
  const activeStorageKeyRef = useRef<string | null>(null);

  function stopStreaming() {
    if (
      typeof window !== "undefined" &&
      streamTimerRef.current !== null
    ) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    setStreamingMessageId(null);
  }

  useEffect(() => {
    stopStreaming();
    activeStorageKeyRef.current = storageKey;

    if (!storageKey || typeof window === "undefined") {
      setMessages([]);
      return;
    }

    const stored = window.localStorage.getItem(storageKey);

    if (stored) {
      try {
        const parsed = normalizeMessages(JSON.parse(stored));
        setMessages(parsed.length ? parsed : initialMessages);
        return;
      } catch {
        // Invalid tenant conversation data should not break the AI page.
      }
    }

    setMessages(initialMessages);
  }, [storageKey]);

  useEffect(() => {
    if (
      !storageKey ||
      activeStorageKeyRef.current !== storageKey ||
      typeof window === "undefined"
    ) {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(messages.slice(-maxStoredMessages)),
    );

    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, maxStoredMessages, storageKey]);

  useEffect(() => stopStreaming, []);

  function addMessage(role: AIChatRole, text: string) {
    setMessages((current) => [
      ...current,
      {
        id: createMessageId(),
        role,
        text,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function streamReply(text: string, spoken = text) {
    stopStreaming();

    const id = createMessageId();
    const createdAt = new Date().toISOString();

    setStreamingMessageId(id);
    setMessages((current) => [
      ...current,
      {
        id,
        role: "sonny",
        text: "",
        createdAt,
      },
    ]);

    const chunks = text.match(/\S+\s*/g) || [text];
    let index = 0;

    if (typeof window === "undefined") {
      setMessages((current) =>
        current.map((message) =>
          message.id === id ? { ...message, text } : message,
        ),
      );
      setStreamingMessageId(null);
      void speak?.(spoken);
      return;
    }

    streamTimerRef.current = window.setInterval(() => {
      index += 1;
      const partial = chunks.slice(0, index).join("");

      setMessages((current) =>
        current.map((message) =>
          message.id === id
            ? { ...message, text: partial }
            : message,
        ),
      );

      if (index >= chunks.length) {
        stopStreaming();
        void speak?.(spoken);
      }
    }, streamIntervalMs);
  }

  function reply(text: string, spoken = text) {
    streamReply(text, spoken);
  }

  function clearConversation() {
    stopStreaming();
    setMessages([]);

    if (storageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  }

  return {
    messages,
    setMessages,
    streamingMessageId,
    chatEndRef,
    addMessage,
    reply,
    streamReply,
    stopStreaming,
    clearConversation,
  };
}
