import { useContext } from "react";
import { OSContext } from "./OSContext";

export function useOS() {
  const context = useContext(OSContext);

  if (!context) {
    throw new Error("useOS must be used inside OSProvider.");
  }

  return context;
}
