import { cn } from "@/lib/utils"

export function Input(props: any) {
  return (
    <input
      {...props}
      className={cn(
        "w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      )}
    />
  )
}