import {adminSidebarConfig,SidebarEngine} from "../src/os/sidebar";export default function AdminSidebar({active:_active}:{active?:string}){return <SidebarEngine config={adminSidebarConfig}/>}
