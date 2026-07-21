import {
  SidebarEngine,
  tenantSidebarConfig,
} from "../src/os/sidebar";

export default function FirmicSidebar() {
  return <SidebarEngine config={tenantSidebarConfig} />;
}