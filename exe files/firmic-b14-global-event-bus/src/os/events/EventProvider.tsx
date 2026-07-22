import {
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import { EventBus } from "./EventBus";
import { EventContext } from "./EventContext";
import type {
  EventHistoryFilter,
  FirmicEvent,
  FirmicEventHandler,
  PublishEventInput,
} from "./types";

type Props = {
  children: ReactNode;
  historyLimit?: number;
};

export function EventProvider({
  children,
  historyLimit = 200,
}: Props) {
  const busRef = useRef<EventBus | null>(null);

  if (!busRef.current) {
    busRef.current = new EventBus(historyLimit);
  }

  const [history, setHistory] = useState<FirmicEvent[]>([]);

  const publish = useCallback(
    async <TPayload,>(input: PublishEventInput<TPayload>) => {
      const result = await busRef.current!.publish(input);
      setHistory(busRef.current!.getHistory());
      return result;
    },
    [],
  );

  const subscribe = useCallback(
    <TPayload,>(
      eventType: string,
      handler: FirmicEventHandler<TPayload>,
    ) => busRef.current!.subscribe(eventType, handler),
    [],
  );

  const subscribeAll = useCallback(
    (handler: FirmicEventHandler) =>
      busRef.current!.subscribeAll(handler),
    [],
  );

  const once = useCallback(
    <TPayload,>(
      eventType: string,
      handler: FirmicEventHandler<TPayload>,
    ) => busRef.current!.once(eventType, handler),
    [],
  );

  const getHistory = useCallback(
    (filter?: EventHistoryFilter) =>
      busRef.current!.getHistory(filter),
    [],
  );

  const clearHistory = useCallback(() => {
    busRef.current!.clearHistory();
    setHistory([]);
  }, []);

  const value = useMemo(
    () => ({
      history,
      publish,
      subscribe,
      subscribeAll,
      once,
      getHistory,
      clearHistory,
    }),
    [
      clearHistory,
      getHistory,
      history,
      once,
      publish,
      subscribe,
      subscribeAll,
    ],
  );

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}
