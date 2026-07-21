import { createContext } from "react";

import type {
  EventHistoryFilter,
  FirmicEvent,
  FirmicEventHandler,
  FirmicEventSubscription,
  PublishEventInput,
  PublishEventResult,
} from "./types";

export type EventContextValue = {
  history: FirmicEvent[];
  publish: <TPayload>(
    input: PublishEventInput<TPayload>,
  ) => Promise<PublishEventResult<TPayload>>;
  subscribe: <TPayload = unknown>(
    eventType: string,
    handler: FirmicEventHandler<TPayload>,
  ) => FirmicEventSubscription;
  subscribeAll: (
    handler: FirmicEventHandler,
  ) => FirmicEventSubscription;
  once: <TPayload = unknown>(
    eventType: string,
    handler: FirmicEventHandler<TPayload>,
  ) => FirmicEventSubscription;
  getHistory: (filter?: EventHistoryFilter) => FirmicEvent[];
  clearHistory: () => void;
};

export const EventContext =
  createContext<EventContextValue | null>(null);
