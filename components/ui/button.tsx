import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/**
 * Button — ResDigital DESIGN.md §5.2
 * Primary:    bg-primary (blue-600) → hover:bg-blue-700
 * Secondary:  bg-secondary (slate-800) → hover:bg-slate-700
 * Outline:    border border-input bg-background → hover:bg-accent
 * Ghost:      transparent → hover:bg-accent (table action rows, h-8 px-3)
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Blue-600, hover blue-700 — DESIGN.md primary CTA */
        default:
          "bg-primary text-primary-foreground hover:bg-blue-700 focus-visible:ring-ring",
        /** Red destructive */
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
        /** Border + slate background — DESIGN.md outline */
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        /** Slate-800 — DESIGN.md secondary */
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-slate-700",
        /** Transparent — DESIGN.md ghost (table action rows) h-8 px-3 */
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        /** h-10 px-4 py-2 — DESIGN.md default */
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-md px-8 has-[>svg]:px-6",
        /** Ghost table action: h-8 px-3 — DESIGN.md */
        "table-action": "h-8 px-3 rounded-md text-xs",
        icon: "size-10",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
