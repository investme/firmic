import { cn } from "@/lib/utils"

type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  children: React.ReactNode
  onClick?: () => void
}

export function Button({
  variant = "primary",
  children,
  onClick,
}: ButtonProps) {
  const base =
    "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150"

  const variants = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700",
    secondary:
      "border border-neutral-300 dark:border-neutral-700",
    ghost:
      "bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800",
    danger: "bg-red-500 text-white hover:bg-red-600",
  }

  return (
    <button
      onClick={onClick}
      className={cn(base, variants[variant])}
    >
      {children}
    </button>
  )
}