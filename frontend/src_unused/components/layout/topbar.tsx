"use client"

import { Menu, Search, Bell, Plus } from "lucide-react"

export function TopBar({
  onToggleSidebar,
}: {
  onToggleSidebar: () => void
}) {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">

      {/* LEFT */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <Menu size={18} />
        </button>

        <div className="font-semibold">Firmic</div>
      </div>

      {/* CENTER SEARCH */}
      <div className="hidden md:flex flex-1 max-w-xl mx-6">
        <div className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <Search size={16} className="opacity-60" />
          <input
            placeholder="Search companies, documents, services..."
            className="bg-transparent w-full outline-none text-sm"
          />
          <span className="text-xs opacity-60">⌘K</span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2">

        <button className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800">
          <Plus size={18} />
        </button>

        <button className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

      </div>

    </header>
  )
}