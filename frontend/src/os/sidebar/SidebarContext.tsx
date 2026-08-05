import { createContext } from "react";

export type SidebarContextValue = {
  collapsed: boolean;
  mobileOpen: boolean;
  favorites: string[];
  expandedSection: string | null;

  toggleCollapsed: () => void;
  openMobile: () => void;
  closeMobile: () => void;
  toggleFavorite: (id: string) => void;
  toggleSection: (sectionId: string) => void;
  expandSection: (sectionId: string) => void;
};

export const SidebarContext = createContext<SidebarContextValue | null>(null);
