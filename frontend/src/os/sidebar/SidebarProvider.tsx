import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SidebarContext } from "./SidebarContext";

const COLLAPSED_KEY = "firmic-sidebar-collapsed";
const FAVORITES_KEY = "firmic-sidebar-favorites";
const EXPANDED_SECTION_KEY = "firmic-sidebar-expanded-section";

function readFavorites(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");

    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function readExpandedSection(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(EXPANDED_SECTION_KEY) || "company";
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "company",
  );

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "true");
    setFavorites(readFavorites());
    setExpandedSection(readExpandedSection());
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;

      localStorage.setItem(COLLAPSED_KEY, String(next));

      return next;
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];

      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));

      return next;
    });
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSection((current) => {
      const next = current === sectionId ? null : sectionId;

      if (next) {
        localStorage.setItem(EXPANDED_SECTION_KEY, next);
      } else {
        localStorage.removeItem(EXPANDED_SECTION_KEY);
      }

      return next;
    });
  }, []);

  const expandSection = useCallback((sectionId: string) => {
    setExpandedSection(sectionId);

    localStorage.setItem(EXPANDED_SECTION_KEY, sectionId);
  }, []);

  const value = useMemo(
    () => ({
      collapsed,
      mobileOpen,
      favorites,
      expandedSection,

      toggleCollapsed,
      openMobile: () => setMobileOpen(true),
      closeMobile: () => setMobileOpen(false),
      toggleFavorite,
      toggleSection,
      expandSection,
    }),
    [
      collapsed,
      expandedSection,
      favorites,
      mobileOpen,
      toggleCollapsed,
      toggleFavorite,
      toggleSection,
      expandSection,
    ],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}
