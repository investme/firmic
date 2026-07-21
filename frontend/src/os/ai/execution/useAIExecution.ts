import {
  MutableRefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AIPendingAction,
  AIExecutionStage,
} from "./executionTypes";

type UseAIExecutionOptions = {
  onReply?: (text: string) => void;
  onWarning?: (text: string) => void;
  onNotice?: (text: string) => void;
  onRefresh?: () => Promise<void> | void;
};

type RunActionOptions = {
  key: string;
  action: () => Promise<unknown>;
  success: string;
  failurePrefix?: string;
  refresh?: boolean;
};

type UseAIExecutionResult<TPlan> = {
  working: string;
  pendingAction: AIPendingAction | null;
  pendingPlan: TPlan | null;
  executionStage: AIExecutionStage;
  requestAbortRef: MutableRefObject<AbortController | null>;
  setWorking: (value: string) => void;
  setPendingPlan: (plan: TPlan | null) => void;
  setExecutionStage: (
    value:
      | AIExecutionStage
      | ((current: AIExecutionStage) => AIExecutionStage)
  ) => void;
  beginRequest: (
    key: string,
    stage?: AIExecutionStage,
    notice?: string
  ) => AbortController;
  finishRequest: () => void;
  interruptRequest: (notice?: string) => void;
  askConfirmation: (
    title: string,
    detail: string,
    execute: () => Promise<void>
  ) => void;
  executePendingAction: () => Promise<boolean>;
  clearPendingAction: () => void;
  cancelPendingAction: (message?: string) => void;
  cancelPendingPlan: (message?: string) => void;
  resetExecution: () => void;
  runAction: (options: RunActionOptions) => Promise<void>;
};

export function useAIExecution<TPlan = unknown>({
  onReply,
  onWarning,
  onNotice,
  onRefresh,
}: UseAIExecutionOptions = {}): UseAIExecutionResult<TPlan> {
  const [working, setWorking] = useState("");
  const [pendingAction, setPendingAction] =
    useState<AIPendingAction | null>(null);
  const [pendingPlan, setPendingPlan] = useState<TPlan | null>(null);
  const [executionStage, setExecutionStage] =
    useState<AIExecutionStage>("idle");

  const requestAbortRef = useRef<AbortController | null>(null);

  function beginRequest(
    key: string,
    stage: AIExecutionStage = "understanding",
    notice = ""
  ) {
    requestAbortRef.current?.abort();

    const controller = new AbortController();
    requestAbortRef.current = controller;

    setWorking(key);
    setExecutionStage(stage);
    onWarning?.("");
    if (notice) onNotice?.(notice);

    return controller;
  }

  function finishRequest() {
    requestAbortRef.current = null;
    setWorking("");
  }

  function interruptRequest(notice = "Request interrupted.") {
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    setWorking("");
    setExecutionStage("idle");
    onNotice?.(notice);
  }

  function askConfirmation(
    title: string,
    detail: string,
    execute: () => Promise<void>
  ) {
    setPendingAction({ title, detail, execute });
    setExecutionStage("awaiting_confirmation");
    onReply?.(`${detail} Please confirm before I proceed.`);
  }

  async function executePendingAction(): Promise<boolean> {
    if (!pendingAction || working) return false;

    const action = pendingAction;
    setPendingAction(null);

    await action.execute();
    return true;
  }

  function clearPendingAction() {
    setPendingAction(null);
  }

  function cancelPendingAction(
    message = "The pending action has been cancelled."
  ) {
    setPendingAction(null);
    setExecutionStage("idle");
    onNotice?.("");
    onReply?.(message);
  }

  function cancelPendingPlan(
    message = "The pending executive action has been cancelled."
  ) {
    setPendingPlan(null);
    setExecutionStage("idle");
    onNotice?.("");
    onReply?.(message);
  }

  function resetExecution() {
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    setWorking("");
    setPendingAction(null);
    setPendingPlan(null);
    setExecutionStage("idle");
    onNotice?.("");
  }

  async function runAction({
    key,
    action,
    success,
    failurePrefix = "I could not complete that action.",
    refresh = true,
  }: RunActionOptions) {
    try {
      setWorking(key);
      onWarning?.("");
      await action();
      onReply?.(success);
      if (refresh) {
        await onRefresh?.();
      }
    } catch (error: any) {
      const message =
        error?.message || "The action could not be completed.";
      onWarning?.(message);
      onReply?.(`${failurePrefix} ${message}`);
    } finally {
      setWorking("");
    }
  }

  useEffect(() => {
    return () => {
      requestAbortRef.current?.abort();
    };
  }, []);

  return {
    working,
    pendingAction,
    pendingPlan,
    executionStage,
    requestAbortRef,
    setWorking,
    setPendingPlan,
    setExecutionStage,
    beginRequest,
    finishRequest,
    interruptRequest,
    askConfirmation,
    executePendingAction,
    clearPendingAction,
    cancelPendingAction,
    cancelPendingPlan,
    resetExecution,
    runAction,
  };
}
