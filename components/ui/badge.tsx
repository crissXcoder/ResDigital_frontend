import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/**
 * Badge — ResDigital DESIGN.md §7
 * Variants map directly to AgTech semantic colors:
 *   success   → Green   (Sano / Activo / bg-success-bg text-success)
 *   warning   → Amber   (Enfermo / En tratamiento / bg-warning-bg text-warning)
 *   danger    → Red     (Muerto / Vendido / bg-danger-bg text-danger)
 *   info      → Blue    (Palpación / Informativo / bg-info-bg text-info)
 *   secado    → Purple  (Secado reproductivo / bg-accent-secado-bg text-accent-secado)
 *   neutral   → Slate   (Categoría / Sexo)
 *   female    → Fuchsia (Hembras en filtros y árboles de pedigrí)
 *   male      → Blue    (Machos en filtros y árboles de pedigrí)
 */
const badgeVariants = cva(
  // Base — DESIGN.md: inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        /** Primary brand badge */
        default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        /** Slate-800 background */
        secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        /** Red: disease alerts, mortality, destructive status */
        destructive:
          "border-transparent bg-danger-bg text-danger focus-visible:ring-red-500/20 [a&]:hover:bg-red-200",
        /** Slate outline: category / neutral */
        outline:
          "border-border bg-slate-100 text-slate-900 [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        /** Slate ghost */
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        /** Link style */
        link: "border-transparent text-primary underline-offset-4 [a&]:hover:underline",

        /* ─── AgTech Semantic (design.md §7) ─── */
        /** Green: Sano / Activo / success */
        success: "border-transparent bg-success-bg text-success",
        /** Amber: Pending vaccination, in heat, missing pedigree */
        warning: "border-transparent bg-warning-bg text-warning",
        /** Red: Disease alert, mortality, sold */
        danger: "border-transparent bg-danger-bg text-danger",
        /** Blue: Palpación, info general */
        info: "border-transparent bg-info-bg text-info",
        /** Purple: Secado reproductivo */
        secado: "border-transparent bg-accent-secado-bg text-accent-secado",
        /** Slate: Category / Sex neutral */
        neutral: "border-border bg-slate-100 text-slate-900",

        /* ─── Sex Category Filters ─── */
        /** Fuchsia: Hembras */
        female: "border-transparent bg-fuchsia-100 text-fuchsia-800",
        /** Blue: Machos */
        male: "border-transparent bg-blue-100 text-blue-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
