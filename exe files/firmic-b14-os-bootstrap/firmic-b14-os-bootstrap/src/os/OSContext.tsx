import { createContext } from "react";
import type { OSContextValue } from "./types";

export const OSContext = createContext<OSContextValue | null>(null);
