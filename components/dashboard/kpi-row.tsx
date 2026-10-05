"use client";

import { AlertTriangle, Baby, Milk, Users } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { useKpisDashboard } from "@/lib/hooks/use-dashboard-data";

/**
 * Los 4 KPIs principales del Dashboard (ver MOD-04-Dashboard-Alertas.md).
 * "Vacas en Ordeño" y "Gestantes Confirmadas" ya usan la definición corregida
 * (categoría real / diagnóstico positivo vigente), no la del wireframe (bugs B11 y B4).
 */
export function KpiRow() {
  const { data, isLoading, isError } = useKpisDashboard();

  return (
    <div className="flex flex-col gap-3">
      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>Error al sincronizar indicadores del hato con el servidor.</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total de hato activo"
          value={data?.totalHatoActivo ?? 0}
          icon={Users}
          loading={isLoading}
          href="/hato"
        />
      <KpiCard
        label="Vacas en ordeño"
        value={data?.vacasEnOrdeno ?? 0}
        icon={Milk}
        loading={isLoading}
        href="/hato"
      />
      <KpiCard
        label="Gestantes confirmadas"
        value={data?.gestantesConfirmadas ?? 0}
        icon={Baby}
        loading={isLoading}
        href="/reproductivo"
      />
      <KpiCard
        label="Alertas activas"
        value={data?.alertasActivas ?? 0}
        icon={AlertTriangle}
        loading={isLoading}
        tone="danger"
      />
    </div>
  </div>
  );
}
