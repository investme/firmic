export type AIExecutionStage =
  | "idle"
  | "understanding"
  | "planning"
  | "awaiting_confirmation"
  | "executing"
  | "refreshing"
  | "completed"
  | "failed";

export type AIPendingAction = {
  title: string;
  detail: string;
  execute: () => Promise<void>;
};

export type AIExecutionStep = {
  key: Exclude<AIExecutionStage, "idle" | "failed">;
  label: string;
};

export const DEFAULT_AI_EXECUTION_STEPS: AIExecutionStep[] = [
  { key: "understanding", label: "Understand" },
  { key: "planning", label: "Plan" },
  { key: "awaiting_confirmation", label: "Approve" },
  { key: "executing", label: "Execute" },
  { key: "refreshing", label: "Sync" },
  { key: "completed", label: "Done" },
];
