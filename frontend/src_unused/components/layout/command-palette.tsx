"use client"

import { useEffect, useState } from "react"

export function CommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        setOpen(true)
      }
      if (e.key === "Escape") setOpen(false)
    }

    window.addEventListener("keydown", down)
    return () => window.removeEventListener("keydown", down)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-24">
      <div className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-xl p-4 shadow-xl">

        <input
          autoFocus
          placeholder="Search Firmic..."
          className="w-full p-3 bg-transparent outline-none border-b border-neutral-200 dark:border-neutral-800"
        />

        <div className="py-4 text-sm opacity-70">
          Try: “Create company”, “Open marketplace”, “View invoices”
        </div>

      </div>
    </div>
  )
}