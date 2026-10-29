"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAlertas } from "@/lib/hooks/use-dashboard-data";

/**
 * Campana de notificaciones — card flotante con las alertas activas del sistema.
 * Diseño idéntico al Figma:
 * - Header limpio con "Alertas activas" y enlace "Cerrar"
 * - Card blanco con esquinas redondeadas (rounded-2xl) y sombra suave
 * - Items con indicador rojo (dot) a la izquierda y el mensaje de texto que usa el sistema
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data, isError } = useAlertas();
  const total = data?.length ?? 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label="Notificaciones"
        >
          <Bell className="size-4" strokeWidth={1.5} />
          {isError ? (
            <Badge
              variant="danger"
              aria-label="Error al cargar alertas"
              className="absolute -right-1.5 -top-1.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]"
            >
              <AlertTriangle className="size-2.5" />
            </Badge>
          ) : (
            total > 0 && (
              <Badge
                variant="danger"
                className="absolute -right-1.5 -top-1.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] font-mono"
              >
                {total}
              </Badge>
            )
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[340px] sm:w-[380px] rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-3">
          <h3 className="text-sm font-semibold text-slate-900">Alertas activas</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
          >
            Cerrar
          </button>
        </div>

        {isError ? (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <span>No se pudieron cargar las alertas desde el servidor.</span>
          </div>
        ) : total === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">
            Sin alertas por el momento
          </p>
        ) : (
          <ul className="flex max-h-[380px] flex-col gap-3.5 overflow-y-auto pr-1">
            {data!.map((alerta) => (
              <li key={alerta.id} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                <div className="flex-1 text-[13px] leading-snug text-slate-700">
                  {alerta.animalId ? (
                    <Link
                      href={`/hato/${alerta.animalId}`}
                      onClick={() => setOpen(false)}
                      className="transition-colors hover:text-slate-900"
                    >
                      {alerta.mensaje}
                    </Link>
                  ) : (
                    <span>{alerta.mensaje}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
