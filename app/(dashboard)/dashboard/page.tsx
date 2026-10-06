import { AccionesRapidas } from "@/components/dashboard/acciones-rapidas";
import { CalendarioReproductivo } from "@/components/dashboard/calendario-reproductivo";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { SemaforoSanitario } from "@/components/dashboard/semaforo-sanitario";

/**
 * MOD-04 — Dashboard + Motor de Alertas (responsable: Karla).
 * Hoy corre 100% con datos de prueba (lib/mock/dashboard-mock.ts) — no depende de que
 * ningún otro módulo esté terminado. Se conecta a datos reales endpoint por endpoint,
 * a medida que Ari y Cristhian publiquen los suyos (ver lib/hooks/use-dashboard-data.ts).
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {/* H1 — DESIGN.md: text-3xl font-bold tracking-tight text-slate-900 */}
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          {/* Body muted — DESIGN.md: text-sm text-slate-500 */}
          <p className="text-sm text-slate-500 mt-1">
            Vistazo rápido del estado del hato y las alertas activas.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlobalSearch />
          <NotificationBell />
        </div>
      </header>

      <KpiRow />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <SemaforoSanitario />
        <CalendarioReproductivo />
      </div>

      <AccionesRapidas />
    </div>
  );
}
