import { useEffect } from "react";

import { FIRMIC_EVENTS } from "../eventTypes";
import { useEvents } from "../useEvents";

type TaskCreatedPayload = {
  id: string;
  title: string;
  assigneeId?: string;
};

export function useTaskEvents() {
  const { publish, subscribe } = useEvents();

  useEffect(() => {
    return subscribe<TaskCreatedPayload>(
      FIRMIC_EVENTS.TASK_CREATED,
      (event) => {
        console.info("Task created:", event.payload);
      },
    );
  }, [subscribe]);

  async function announceTaskCreated(
    task: TaskCreatedPayload,
  ) {
    return publish({
      type: FIRMIC_EVENTS.TASK_CREATED,
      payload: task,
      metadata: {
        source: "tasks-module",
      },
    });
  }

  return {
    announceTaskCreated,
  };
}
