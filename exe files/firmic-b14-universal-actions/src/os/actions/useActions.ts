import { useContext } from "react";

import { ActionContext } from "./ActionContext";

export function useActions() {
  const context = useContext(ActionContext);

  if (!context) {
    throw new Error("useActions must be used inside ActionProvider.");
  }

  return context;
}
