import type { LucideIcon } from "lucide-react";

export type OSCommandCategory =
  | "Pages"
  | "AI"
  | "Actions"
  | "Finance"
  | "Company"
  | "Settings";

export type OSCommand = {
  id: string;
  title: string;
  subtitle?: string;
  category: OSCommandCategory;
  keywords: string[];
  route?: string;
  icon?: LucideIcon;
  action?: () => void | Promise<void>;
};

export type OSContextValue = {
  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  navigate: (route: string) => Promise<boolean>;
  commands: OSCommand[];
  registerCommands: (commands: OSCommand[]) => () => void;
  executeCommand: (command: OSCommand) => Promise<void>;
};
