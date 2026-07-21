import { useRouter } from "next/router";
import {
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import { ActionContext } from "./ActionContext";
import type {
  FirmicActionDefinition,
  FirmicActionExecution,
  FirmicActionInput,
  FirmicActionResult,
} from "./types";

type Props = {
  children: ReactNode;
};

function createExecutionId() {
  return `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ActionProvider({ children }: Props) {
  const router = useRouter();
  const actionsRef = useRef(new Map<string, FirmicActionDefinition>());
  const [actions, setActions] = useState<FirmicActionDefinition[]>([]);
  const [executions, setExecutions] = useState<FirmicActionExecution[]>([]);

  const registerAction = useCallback((action: FirmicActionDefinition) => {
    actionsRef.current.set(action.id, action);
    setActions(Array.from(actionsRef.current.values()));

    return () => {
      actionsRef.current.delete(action.id);
      setActions(Array.from(actionsRef.current.values()));
    };
  }, []);

  const getAction = useCallback((actionId: string) => {
    return actionsRef.current.get(actionId);
  }, []);

  const executeAction = useCallback(
    async (
      actionId: string,
      input: FirmicActionInput = {},
    ): Promise<FirmicActionResult> => {
      const action = actionsRef.current.get(actionId);

      if (!action) {
        return {
          success: false,
          message: `Action "${actionId}" is not registered.`,
        };
      }

      const executionId = createExecutionId();

      setExecutions((current) => [
        {
          id: executionId,
          actionId,
          startedAt: new Date().toISOString(),
          status: "running" as const,
        },
        ...current,
      ].slice(0, 30));

      try {
        const result = await action.execute(input, {
          navigate: (path) => router.push(path),
        });

        setExecutions((current) =>
          current.map((execution) =>
            execution.id === executionId
              ? {
                  ...execution,
                  finishedAt: new Date().toISOString(),
                  status: result.success ? "success" : "error",
                  message: result.message,
                }
              : execution,
          ),
        );

        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Action execution failed.";

        setExecutions((current) =>
          current.map((execution) =>
            execution.id === executionId
              ? {
                  ...execution,
                  finishedAt: new Date().toISOString(),
                  status: "error",
                  message,
                }
              : execution,
          ),
        );

        return {
          success: false,
          message,
        };
      }
    },
    [router],
  );

  const value = useMemo(
    () => ({
      actions,
      executions,
      registerAction,
      executeAction,
      getAction,
    }),
    [actions, executions, executeAction, getAction, registerAction],
  );

  return (
    <ActionContext.Provider value={value}>
      {children}
    </ActionContext.Provider>
  );
}
