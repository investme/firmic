"use client"

import { Sidebar } from "./sidebar"
import { TopBar } from "./topbar"
import { useState } from "react"

export function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="h-screen flex bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">

      {/* SIDEBAR */}
      <Sidebar open={sidebarOpen} />

      {/* MAIN AREA */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* TOP BAR */}
        <TopBar onToggleSidebar={() => setSidebarOpen(v => !v)} />

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>

      </div>
    </div>
  )
}