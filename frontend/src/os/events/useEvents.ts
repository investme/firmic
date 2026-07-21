import { useContext } from "react";

import { EventContext } from "./EventContext";

export function useEvents() {
  const context = useContext(EventContext);

  if (!context) {
    throw new Error("useEvents must be used inside EventProvider.");
  }

  return context;
}
