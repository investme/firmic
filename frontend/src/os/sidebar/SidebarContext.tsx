import { createContext } from "react";
export type SidebarContextValue={collapsed:boolean;mobileOpen:boolean;favorites:string[];toggleCollapsed:()=>void;openMobile:()=>void;closeMobile:()=>void;toggleFavorite:(id:string)=>void};
export const SidebarContext=createContext<SidebarContextValue|null>(null);
