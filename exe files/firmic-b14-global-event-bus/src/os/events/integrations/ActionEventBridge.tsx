import { useEffect, useRef } from "react";

import { useActions } from "../../actions";
import { FIRMIC_EVENTS } from "../eventTypes";
import { useEvents } from "../useEvents";

export function ActionEventBridge() {
  const { executions } = useActions();
  const { publish } = useEvents();
  const knownStatuses = useRef(new Map<string, string>());

  useEffect(() => {
    for (const execution of executions) {
      const previousStatus = knownStatuses.current.get(execution.id);

      if (previousStatus === execution.status) {
        continue;
      }

      knownStatuses.current.set(execution.id, execution.status);

      if (execution.status === "running") {
        void publish({
          type: FIRMIC_EVENTS.ACTION_STARTED,
          payload: execution,
          metadata: {
            source: "action-engine",
            correlationId: execution.id,
          },
        });
      }

      if (execution.status === "success") {
        void publish({
          type: FIRMIC_EVENTS.ACTION_COMPLETED,
          payload: execution,
          metadata: {
            source: "action-engine",
            correlationId: execution.id,
          },
        });
      }

      if (execution.status === "error") {
        void publish({
          type: FIRMIC_EVENTS.ACTION_FAILED,
          payload: execution,
          metadata: {
            source: "action-engine",
            correlationId: execution.id,
          },
        });
      }
    }
  }, [executions, publish]);

  return null;
}
