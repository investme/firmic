import { createContext } from "react";

import type {
  FirmicActionDefinition,
  FirmicActionExecution,
  FirmicActionInput,
  FirmicActionResult,
} from "./types";

export type ActionContextValue = {
  actions: FirmicActionDefinition[];
  executions: FirmicActionExecution[];
  registerAction: (action: FirmicActionDefinition) => () => void;
  executeAction: (
    actionId: string,
    input?: FirmicActionInput,
  ) => Promise<FirmicActionResult>;
  getAction: (actionId: string) => FirmicActionDefinition | undefined;
};

export const ActionContext = createContext<ActionContextValue | null>(null);
