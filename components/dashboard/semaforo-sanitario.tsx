"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardStatusBadge } from "@/components/dashboard/status-badge";
import { useAnimalesEnRetiro } from "@/lib/hooks/use-dashboard-data";
import type { AnimalEnRetiro } from "@/lib/types/dashboard";

/**
 * Convierte una fecha ISO (YYYY-MM-DD) a formato local (DD/MM/YYYY).
 */
function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Deriva el tipo de retiro ("Ambos", "Leche" o "Carne") a partir de los días restantes.
 * Cuando el endpoint de Ari (MOD-02) esté disponible, este campo vendrá del servidor.
 */
function tipoRetiro(animal: AnimalEnRetiro): "Ambos" | "Leche" | "Carne" {
  if (animal.diasRestantesLeche !== null && animal.diasRestantesCarne !== null) return "Ambos";
  if (animal.diasRestantesLeche !== null) return "Leche";
  return "Carne";
}

/**
 * Días restantes a mostrar: si hay retiro de leche Y carne, se muestra el mayor
 * (el que libera más tarde es el que realmente bloquea al animal).
 */
function diasRestantesMayor(animal: AnimalEnRetiro): number {
  const l = animal.diasRestantesLeche ?? -Infinity;
  const c = animal.diasRestantesCarne ?? -Infinity;
  return Math.max(l, c);
}

/**
 * Fecha de liberación a mostrar: la más tardía entre leche y carne.
 */
function fechaLiberacion(animal: AnimalEnRetiro): string | null {
  if (animal.fechaLiberacionLeche && animal.fechaLiberacionCarne) {
    return animal.fechaLiberacionLeche > animal.fechaLiberacionCarne
      ? animal.fechaLiberacionLeche
      : animal.fechaLiberacionCarne;
  }
  return animal.fechaLiberacionLeche ?? animal.fechaLiberacionCarne;
}

/**
 * Tabla "Semáforo de Retiro Sanitario" — todos los animales con retiro activo hoy,
 * con cuenta regresiva de días y tipo de restricción.
 *
 * Columnas Fármaco y Aplicado se mostrarán cuando Ari (MOD-02) exponga el endpoint
 * de retiros con el detalle del tratamiento que originó la restricción.
 */
export function SemaforoSanitario() {
  const { data, isLoading } = useAnimalesEnRetiro();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Semáforo de Retiro Sanitario</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Animales con restricción activa de leche o carne
          </p>
        </div>
        {!isLoading && data && data.length > 0 && (
          <Badge variant="danger" className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold">
            {data.length} en retiro
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-md bg-muted" />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-slate-500">Ningún animal en retiro sanitario hoy.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="pb-2 text-left">Animal</th>
                  {/* Fármaco y Aplicado: pendiente MOD-02 (Ari) */}
                  <th className="pb-2 text-left">Tipo</th>
                  <th className="pb-2 text-left">Liberación</th>
                  <th className="pb-2 text-right">Días Rest.</th>
                  <th className="pb-2 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((animal) => {
                  const tipo = tipoRetiro(animal);
                  const dias = diasRestantesMayor(animal);
                  const liberacion = fechaLiberacion(animal);
                  const porVencer = dias <= 2;

                  return (
                    <tr key={animal.animalId} className="transition-colors hover:bg-slate-50">
                      {/* Animal */}
                      <td className="py-3 pr-4">
                        <Link
                          href={`/hato/${animal.animalId}`}
                          className="flex items-center gap-2.5 group cursor-pointer"
                          title={`Ver expediente de ${animal.nombre}`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 group-hover:bg-navy group-hover:text-white transition-colors">
                            {animal.nombre.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-navy group-hover:underline transition-colors">
                              {animal.arete}
                            </p>
                            <p className="text-xs text-slate-500">{animal.nombre}</p>
                          </div>
                        </Link>
                      </td>

                      {/* Tipo de retiro */}
                      <td className="py-3 pr-4">
                        <Badge
                          variant={tipo === "Ambos" ? "danger" : tipo === "Carne" ? "warning" : "info"}
                          className="rounded-full text-xs"
                        >
                          {tipo}
                        </Badge>
                      </td>

                      {/* Liberación */}
                      <td className="py-3 pr-4 text-sm text-slate-700">
                        {liberacion ? formatFecha(liberacion) : "—"}
                      </td>

                      {/* Días restantes */}
                      <td className="py-3 pr-4 text-right">
                        <span className={`text-sm font-bold ${porVencer ? "text-danger" : "text-slate-900"}`}>
                          {dias} días
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3 text-right">
                        <DashboardStatusBadge variant={porVencer ? "por-vencer" : "retiro"}>
                          BLOQUEADO
                        </DashboardStatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
