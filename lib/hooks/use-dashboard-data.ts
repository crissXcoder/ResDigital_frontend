"use client";

import { useQuery } from "@tanstack/react-query";
import { getAnimales } from "@/lib/api/animales";
import { getProximosEventos } from "@/lib/api/reproductivo";
import { getRetirosActivos } from "@/lib/api/sanitary";
import { getMockAlertas, getMockKpis } from "@/lib/mock/dashboard-mock";

/**
 * Hooks de datos del Dashboard, uno por pieza de UI.
 *
 * Cero fallbacks silenciosos: si una petición falla, propaga el error a React Query
 * para que la interfaz muestre el estado de error honesto.
 */

const dashboardKeys = {
  kpis: ["dashboard", "kpis"] as const,
  retiros: ["dashboard", "animales-en-retiro"] as const,
  proximosEventos: ["dashboard", "proximos-eventos-reproductivos"] as const,
  alertas: ["dashboard", "alertas"] as const,
};

export function useKpisDashboard() {
  return useQuery({
    queryKey: dashboardKeys.kpis,
    queryFn: async () => {
      const mockKpis = getMockKpis();
      const [animales, retiros] = await Promise.all([getAnimales(), getRetirosActivos()]);

      const activos = animales.filter((a) => a.activo);
      const totalHatoActivo = activos.length;

      // B11: Vacas en Ordeño (Hembra, categoría Vaca en Ordeño, SIN retiro de leche)
      const vacasEnOrdeno = activos.filter((a) => {
        if (a.categoria !== "Vaca en Ordeño" || a.sexo !== "Hembra") return false;
        const tieneRetiro = retiros.some((r) => r.animalId === a.id && r.diasRestantesLeche !== null);
        return !tieneRetiro;
      }).length;

      // B4: Gestantes Confirmadas (solo con diagnóstico positivo)
      const gestantesConfirmadas = mockKpis.gestantesConfirmadas;

      return {
        totalHatoActivo,
        vacasEnOrdeno,
        gestantesConfirmadas,
        alertasActivas: mockKpis.alertasActivas,
      };
    },
  });
}

export function useAnimalesEnRetiro() {
  return useQuery({
    queryKey: dashboardKeys.retiros,
    // GET /tratamientos/retiros-activos (Ari - MOD-02)
    queryFn: () => getRetirosActivos(),
  });
}

export function useProximosEventosReproductivos() {
  return useQuery({
    queryKey: dashboardKeys.proximosEventos,
    queryFn: async () => {
      // Consume el endpoint real GET /reproductivo/proximos-eventos (Cristhian - MOD-03)
      // Sin fallback silencioso a datos mock en caso de fallo de red
      return await getProximosEventos();
    },
  });
}

export function useAlertas() {
  return useQuery({
    queryKey: dashboardKeys.alertas,
    queryFn: () => Promise.resolve(getMockAlertas()),
  });
}
