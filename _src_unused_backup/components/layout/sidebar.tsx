"use client"

import {
  LayoutDashboard,
  Building2,
  ShoppingBag,
  FileText,
  Settings,
  Bot,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function Sidebar({ open }: { open: boolean }) {
  return (
    <aside
      className={cn(
        "h-screen border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 transition-all duration-200",
        open ? "w-64" : "w-20"
      )}
    >

      {/* BRAND */}
      <div className="h-14 flex items-center px-4 font-bold">
        {open ? "Firmic" : "F"}
      </div>

      {/* NAV */}
      <nav className="px-2 space-y-1">

        <NavItem icon={<LayoutDashboard />} label="Dashboard" open={open} />
        <NavItem icon={<Building2 />} label="Companies" open={open} />
        <NavItem icon={<ShoppingBag />} label="Marketplace" open={open} />
        <NavItem icon={<FileText />} label="Documents" open={open} />
        <NavItem icon={<Bot />} label="Sonny AI" open={open} />

        <div className="mt-6 border-t border-neutral-200 dark:border-neutral-800 pt-2">
          <NavItem icon={<Settings />} label="Settings" open={open} />
        </div>

      </nav>
    </aside>
  )
}

function NavItem({
  icon,
  label,
  open,
}: {
  icon: React.ReactNode
  label: string
  open: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-all">

      {icon}

      {open && (
        <span className="text-sm font-medium">{label}</span>
      )}

    </div>
  )
}