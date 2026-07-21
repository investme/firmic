import type {
  EventHistoryFilter,
  FirmicEvent,
  FirmicEventHandler,
  FirmicEventSubscription,
  PublishEventInput,
  PublishEventResult,
} from "./types";

const WILDCARD_EVENT = "*";

function createEventId() {
  if (
    typeof globalThis !== "undefined" &&
    "crypto" in globalThis &&
    typeof globalThis.crypto?.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class EventBus {
  private handlers = new Map<string, Set<FirmicEventHandler>>();
  private history: FirmicEvent[] = [];
  private historyLimit: number;

  constructor(historyLimit = 200) {
    this.historyLimit = Math.max(1, historyLimit);
  }

  subscribe<TPayload = unknown>(
    eventType: string,
    handler: FirmicEventHandler<TPayload>,
  ): FirmicEventSubscription {
    const handlers =
      this.handlers.get(eventType) ?? new Set<FirmicEventHandler>();

    handlers.add(handler as FirmicEventHandler);
    this.handlers.set(eventType, handlers);

    return () => {
      const currentHandlers = this.handlers.get(eventType);
      currentHandlers?.delete(handler as FirmicEventHandler);

      if (currentHandlers?.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  subscribeAll(
    handler: FirmicEventHandler,
  ): FirmicEventSubscription {
    return this.subscribe(WILDCARD_EVENT, handler);
  }

  once<TPayload = unknown>(
    eventType: string,
    handler: FirmicEventHandler<TPayload>,
  ): FirmicEventSubscription {
    let unsubscribe = () => undefined;

    unsubscribe = this.subscribe<TPayload>(
      eventType,
      async (event) => {
        unsubscribe();
        await handler(event);
      },
    );

    return unsubscribe;
  }

  async publish<TPayload>(
    input: PublishEventInput<TPayload>,
  ): Promise<PublishEventResult<TPayload>> {
    const event: FirmicEvent<TPayload> = {
      id: createEventId(),
      type: input.type,
      payload: input.payload,
      occurredAt: new Date().toISOString(),
      metadata: input.metadata ?? {},
    };

    this.history = [event, ...this.history].slice(0, this.historyLimit);

    const exactHandlers = Array.from(
      this.handlers.get(event.type) ?? [],
    );

    const wildcardHandlers = Array.from(
      this.handlers.get(WILDCARD_EVENT) ?? [],
    );

    const handlers = [...exactHandlers, ...wildcardHandlers];
    const failures: PublishEventResult<TPayload>["failures"] = [];

    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          failures.push({
            eventId: event.id,
            eventType: event.type,
            message:
              error instanceof Error
                ? error.message
                : "Unknown event handler failure.",
          });
        }
      }),
    );

    return {
      event,
      delivered: handlers.length - failures.length,
      failures,
    };
  }

  getHistory(filter: EventHistoryFilter = {}) {
    const {
      type,
      source,
      workspaceId,
      correlationId,
      limit = this.historyLimit,
    } = filter;

    return this.history
      .filter((event) => {
        if (type && event.type !== type) return false;
        if (source && event.metadata.source !== source) return false;
        if (
          workspaceId &&
          event.metadata.workspaceId !== workspaceId
        ) {
          return false;
        }
        if (
          correlationId &&
          event.metadata.correlationId !== correlationId
        ) {
          return false;
        }

        return true;
      })
      .slice(0, Math.max(0, limit));
  }

  clearHistory() {
    this.history = [];
  }

  listenerCount(eventType?: string) {
    if (eventType) {
      return this.handlers.get(eventType)?.size ?? 0;
    }

    return Array.from(this.handlers.values()).reduce(
      (total, handlers) => total + handlers.size,
      0,
    );
  }
}
