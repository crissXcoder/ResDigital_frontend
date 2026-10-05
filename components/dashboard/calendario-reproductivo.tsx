"use client";

import Link from "next/link";
import { AlertCircle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProximosEventosReproductivos } from "@/lib/hooks/use-dashboard-data";
import type { ProximoEventoReproductivo, TipoEventoReproductivo } from "@/lib/types/dashboard";

/** Color del dot según tipo de hito — DESIGN.md §7. */
const dotClass: Record<TipoEventoReproductivo, string> = {
  "Palpación":           "bg-info",
  "Secado":              "bg-accent-secado",
  "Aviso Parto":         "bg-warning",
  "Aviso Parto Urgente": "bg-danger",
  "Parto":               "bg-warning",
};

/** Agrupa la lista plana de hitos por animal, manteniendo el orden original. */
function agruparPorAnimal(
  eventos: ProximoEventoReproductivo[],
): Map<string, ProximoEventoReproductivo[]> {
  const mapa = new Map<string, ProximoEventoReproductivo[]>();
  for (const evento of eventos) {
    const lista = mapa.get(evento.animalId) ?? [];
    lista.push(evento);
    mapa.set(evento.animalId, lista);
  }
  return mapa;
}

/**
 * Convierte una fecha ISO (YYYY-MM-DD) a formato local (DD/MM/YYYY).
 * Usa desplazamiento manual para evitar problemas de zona horaria en UTC.
 */
function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Feed "Calendario Reproductivo" — próximas palpaciones y partos cercanos,
 * consumidos de GET /reproductivo/proximos-eventos.
 * Muestra los hitos agrupados por animal, con enlace a la ficha del expediente.
 */
export function CalendarioReproductivo() {
  const { data, isLoading, isError } = useProximosEventosReproductivos();

  const grupos = data ? agruparPorAnimal(data) : new Map<string, ProximoEventoReproductivo[]>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendario Reproductivo</CardTitle>
        <p className="mt-1 text-sm text-slate-500">Próximas palpaciones y partos</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>No se pudieron cargar los eventos reproductivos desde el servidor.</span>
          </div>
        ) : grupos.size === 0 ? (
          <p className="text-sm text-slate-500">
            No hay palpaciones ni partos próximos en los siguientes días.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {Array.from(grupos.entries()).map(([animalId, hitos]) => {
              const primero = hitos[0];
              return (
                <li key={animalId}>
                  <Link
                    href={`/hato/${animalId}`}
                    className="flex w-full items-center gap-3 py-3 pl-1 pr-2 transition-colors hover:bg-slate-50 rounded-md group"
                  >
                    {/* Avatar inicial */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info-bg text-sm font-bold text-info">
                      {primero.nombre.charAt(0)}
                    </div>

                    {/* Info del animal + hitos */}
                    <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {primero.arete} {primero.nombre}
                      </span>
                      {hitos.map((hito) => (
                        <span key={`${hito.tipo}-${hito.fecha}`} className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass[hito.tipo]}`} />
                          {hito.tipo === "Parto"
                            ? `FPP: ${formatFecha(hito.fecha)} (${hito.diasRestantes}d)`
                            : `${hito.tipo}: ${formatFecha(hito.fecha)} (${hito.diasRestantes}d)`}
                        </span>
                      ))}
                    </div>

                    {/* Flecha de navegación */}
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500"
                      strokeWidth={2}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
