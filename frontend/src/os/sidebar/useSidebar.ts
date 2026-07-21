import { useContext } from "react";import { SidebarContext } from "./SidebarContext";
export function useSidebar(){const value=useContext(SidebarContext);if(!value)throw new Error("useSidebar must be used inside SidebarProvider.");return value;}
