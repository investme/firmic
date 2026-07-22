import type { ReactNode } from "react";
export type SidebarMode = "tenant" | "admin";
export type SidebarItemConfig = { id:string; label:string; href:string; icon:ReactNode; badge?:"notifications"; };
export type SidebarSectionConfig = { id:string; title:string; items:SidebarItemConfig[] };
export type SidebarConfig = { mode:SidebarMode; brandEyebrow:string; brandTitle:string; brandSubtitle:string; sections:SidebarSectionConfig[] };
