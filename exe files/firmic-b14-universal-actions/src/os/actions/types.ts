import type { LucideIcon } from "lucide-react";

export type ActionRisk = "safe" | "confirm" | "danger";

export type FirmicActionInput = Record<string, unknown>;

export type FirmicActionResult = {
  success: boolean;
  message?: string;
  data?: unknown;
};

export type FirmicActionContext = {
  navigate: (path: string) => Promise<boolean> | boolean;
};

export type FirmicActionDefinition = {
  id: string;
  title: string;
  description?: string;
  category: string;
  keywords?: string[];
  icon?: LucideIcon;
  priority?: number;
  risk?: ActionRisk;
  execute: (
    input: FirmicActionInput,
    context: FirmicActionContext,
  ) => Promise<FirmicActionResult> | FirmicActionResult;
};

export type FirmicActionExecution = {
  id: string;
  actionId: string;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "success" | "error" | "cancelled";
  message?: string;
};
