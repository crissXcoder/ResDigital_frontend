import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"
import { Loader2 } from "lucide-react"

/**
 * Button — ResDigital DESIGN.md §5.2 / OBS-006
 * Primary:            bg-navy (#0F2338) → hover:bg-navy-light (#1E3A5F)
 * Secondary:          border border-slate-200 bg-white text-slate-700 → hover:bg-slate-50
 * Destructive:        bg-danger (#DC2626) text-white → hover:bg-red-700
 * Destructive-outline: border border-red-200 text-red-600 bg-white → hover:bg-red-50
 * Subtle:             bg-slate-100 text-slate-700 → hover:bg-slate-200
 * Outline:            border border-slate-200 bg-transparent text-slate-700 → hover:bg-slate-100
 * Ghost:              transparent text-slate-600 → hover:bg-slate-100 hover:text-navy
 * Link:               text-navy underline-offset-4 hover:underline
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navy-light disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Navy principal (#0F2338) → hover navy-light (#1E3A5F) — CTA primario */
        default:
          "bg-navy text-white hover:bg-navy-light shadow-sm focus-visible:ring-navy-light",
        /** Rojo semántico de peligro (#DC2626) → hover red-700 */
        destructive:
          "bg-danger text-white hover:bg-red-700 shadow-sm focus-visible:ring-red-400",
        /** Contorno rojo para acciones de peligro secundarias (ej. dar de baja en expediente) */
        "destructive-outline":
          "border border-red-200 text-red-600 bg-white hover:bg-red-50 shadow-sm focus-visible:ring-red-400",
        /** Secundario neutral blanco con borde (ej. botones «Cancelar» en modales) */
        secondary:
          "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm focus-visible:ring-slate-300",
        /** Sutil gris suave */
        subtle:
          "bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-300",
        /** Borde básico sobre fondo transparente */
        outline:
          "border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-100 hover:text-navy focus-visible:ring-slate-300",
        /** Transparente para filas o acciones compactas */
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-navy focus-visible:ring-slate-300",
        link: "text-navy underline-offset-4 hover:underline focus-visible:ring-navy-light",
      },
      size: {
        /** h-10 px-4 py-2.5 — tamaño estándar interactivo */
        default: "h-10 px-4 py-2.5 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-11 rounded-lg px-6 text-sm font-bold has-[>svg]:px-5",
        /** Ghost table action: h-8 px-3 */
        "table-action": "h-8 px-3 rounded-md text-xs",
        icon: "size-10 rounded-lg",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </Comp>
  )
}

export { Button, buttonVariants }
