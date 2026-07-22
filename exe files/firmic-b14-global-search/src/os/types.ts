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

export type OSSearchItemKind =
  | "command"
  | "company"
  | "document"
  | "task"
  | "contact"
  | "invoice"
  | "meeting"
  | "notification"
  | "recommendation"
  | "agent"
  | "custom";

export type OSSearchItem = {
  id: string;
  providerId: string;
  kind: OSSearchItemKind;
  title: string;
  subtitle?: string;
  category: string;
  keywords?: string[];
  route?: string;
  icon?: LucideIcon;
  action?: () => void | Promise<void>;
  metadata?: Record<string, unknown>;
  priority?: number;
};

export type OSSearchProvider = {
  id: string;
  label: string;
  search: (query: string) => Promise<OSSearchItem[]> | OSSearchItem[];
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

  registerSearchProvider: (provider: OSSearchProvider) => () => void;
  searchFirmic: (query: string) => Promise<OSSearchItem[]>;
  executeSearchItem: (item: OSSearchItem) => Promise<void>;
};
