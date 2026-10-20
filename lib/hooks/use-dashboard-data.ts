"use client";

import { useQuery } from "@tanstack/react-query";
import { getAnimales } from "@/lib/api/animales";
import { getProximosEventos, type ProximoEvento } from "@/lib/api/reproductivo";
import { getRetirosActivos } from "@/lib/api/sanitary";
import { diferenciaDiasCivil, hoyLocal } from "@/lib/reproductivo/fechas";
import type {
  AlertaNotificacion,
  AnimalEnRetiro,
  CategoriaAlerta,
  KpisDashboard,
  ProximoEventoReproductivo,
} from "@/lib/types/dashboard";

/**
 * Hooks de datos del Dashboard, uno por pieza de UI (MOD-04, Karla).
 *
 * Conectado 100% a la API real sin mocks:
 * - KPIs y Vacas en ordeño: GET /animales + GET /tratamientos/retiros-activos
 * - Gestantes confirmadas: GET /reproductivo/proximos-eventos (365 días)
 * - Retiros sanitarios: GET /tratamientos/retiros-activos (Ari - MOD-02)
 * - Calendario reproductivo: GET /reproductivo/proximos-eventos (Cristhian - MOD-03)
 * - Motor de alertas: Retiros sanitarios + Hitos reproductivos en ventana activa
 *
 * Cero fallbacks silenciosos: si una petición falla, propaga el error a React Query
 * para que la interfaz muestre el estado de error honesto.
 */

export const dashboardKeys = {
  kpis: ["dashboard", "kpis"] as const,
  retiros: ["dashboard", "animales-en-retiro"] as const,
  proximosEventos: ["dashboard", "proximos-eventos-reproductivos"] as const,
  alertas: ["dashboard", "alertas"] as const,
};

/**
 * Construye la lista unificada y accionable de alertas activas del hato
 * a partir de retiros sanitarios vigentes y próximos eventos reproductivos.
 */
export function construirAlertas(
  retiros: AnimalEnRetiro[],
  eventos: ProximoEvento[],
): AlertaNotificacion[] {
  const alertasRetiro: AlertaNotificacion[] = retiros.map((r) => ({
    id: `retiro-${r.animalId}`,
    categoria: "retiro" as CategoriaAlerta,
    animalId: r.animalId,
    fecha: r.fechaLiberacionLeche ?? r.fechaLiberacionCarne ?? hoyLocal(),
    mensaje:
      r.diasRestantesLeche !== null
        ? `${r.nombre} (${r.arete}) sigue en retiro de leche — vence en ${r.diasRestantesLeche} día(s).`
        : `${r.nombre} (${r.arete}) sigue en retiro de carne — vence en ${r.diasRestantesCarne} día(s).`,
  }));

  const alertasReproductivas: AlertaNotificacion[] = eventos.map((e) => {
    let categoria: CategoriaAlerta = "parto";
    if (e.tipo === "Palpación") {
      categoria = "palpacion";
    } else if (e.tipo === "Secado") {
      categoria = "secado";
    } else if (e.tipo === "Aviso Parto Urgente") {
      categoria = "parto_urgente";
    }

    return {
      id: `${e.tipo.toLowerCase().replace(/\s+/g, "-")}-${e.animalId}`,
      categoria,
      animalId: e.animalId,
      fecha: e.fecha,
      mensaje: `${e.nombre} (${e.arete}): ${e.tipo.toLowerCase()} en ${e.diasRestantes} día(s).`,
    };
  });

  return [...alertasRetiro, ...alertasReproductivas].sort((a, b) => {
    const diasA = diferenciaDiasCivil(hoyLocal(), a.fecha) ?? 0;
    const diasB = diferenciaDiasCivil(hoyLocal(), b.fecha) ?? 0;
    return diasA - diasB;
  });
}

export function useKpisDashboard() {
  return useQuery<KpisDashboard>({
    queryKey: dashboardKeys.kpis,
    queryFn: async () => {
      const [animales, retiros, eventos365, eventosVentana] = await Promise.all([
        getAnimales(),
        getRetirosActivos(),
        getProximosEventos(365),
        getProximosEventos(),
      ]);

      const activos = animales.filter((a) => a.activo);
      const totalHatoActivo = activos.length;

      // B11: Vacas en Ordeño (Hembra, categoría Vaca en Ordeño, SIN retiro de leche)
      const vacasEnOrdeno = activos.filter((a) => {
        if (a.categoria !== "Vaca en Ordeño" || a.sexo !== "Hembra") return false;
        const tieneRetiro = retiros.some((r) => r.animalId === a.id && r.diasRestantesLeche !== null);
        return !tieneRetiro;
      }).length;

      // B4: Gestantes Confirmadas (solo con diagnóstico positivo vigente)
      // En la máquina de estados reproductivos, toda hembra 'Preñada' o 'En Secado'
      // tiene hitos de Parto/Secado/Avisos programados dentro de su gestación (365 días).
      // Hembras sólo 'Servidas' únicamente emiten 'Palpación'.
      const gestantesIds = new Set(
        eventos365
          .filter((e) =>
            ["Parto", "Secado", "Aviso Parto", "Aviso Parto Urgente"].includes(e.tipo),
          )
          .map((e) => e.animalId),
      );
      const gestantesConfirmadas = gestantesIds.size;

      // Alertas Activas en ventana: total de retiros sanitarios + hitos reproductivos
      const alertasActivas = retiros.length + eventosVentana.length;

      return {
        totalHatoActivo,
        vacasEnOrdeno,
        gestantesConfirmadas,
        alertasActivas,
      };
    },
  });
}

export function useAnimalesEnRetiro() {
  return useQuery<AnimalEnRetiro[]>({
    queryKey: dashboardKeys.retiros,
    // GET /tratamientos/retiros-activos (Ari - MOD-02)
    queryFn: () => getRetirosActivos(),
  });
}

export function useProximosEventosReproductivos() {
  return useQuery<ProximoEventoReproductivo[]>({
    queryKey: dashboardKeys.proximosEventos,
    // Consume el endpoint real GET /reproductivo/proximos-eventos (Cristhian - MOD-03)
    queryFn: () => getProximosEventos(),
  });
}

export function useAlertas() {
  return useQuery<AlertaNotificacion[]>({
    queryKey: dashboardKeys.alertas,
    queryFn: async () => {
      const [retiros, eventos] = await Promise.all([
        getRetirosActivos(),
        getProximosEventos(),
      ]);
      return construirAlertas(retiros, eventos);
    },
  });
}
