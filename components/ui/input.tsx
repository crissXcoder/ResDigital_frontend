import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Input — ResDigital DESIGN.md §5.3
 * Spec: flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2
 *       text-sm shadow-sm transition-colors placeholder:text-muted-foreground
 *       focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring
 *       disabled:cursor-not-allowed disabled:opacity-50
 * Error state: aria-invalid triggers border-destructive + ring-destructive
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base
        "flex h-10 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
        "transition-colors outline-none",
        // Placeholder
        "placeholder:text-muted-foreground",
        // File inputs
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Focus — DESIGN.md: ring-1 ring-ring
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring",
        // Error state — DESIGN.md: border-destructive ring-destructive
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
