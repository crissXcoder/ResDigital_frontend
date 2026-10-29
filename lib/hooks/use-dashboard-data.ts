"use client";

import { useQuery } from "@tanstack/react-query";
import { getAnimales } from "@/lib/api/animales";
import { getProximosEventos, type ProximoEvento } from "@/lib/api/reproductivo";
import { getRetirosActivos } from "@/lib/api/sanitary";
import { getHembrasEnLactancia, type HembraEnLactancia } from "@/lib/api/produccion";
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
 * - KPIs: GET /animales + GET /tratamientos/retiros-activos
 * - Vacas en ordeño: GET /lactancia/activas (Danny - MOD-05), excluyendo retiro de leche
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
 * Cuenta vacas en ordeño según lactancia real (GET /lactancia/activas),
 * no según la categoría del animal (que puede quedar desactualizada si no
 * se cierra lactancia al dar de baja o registrar el fin).
 *
 * B11: requiere lactancia activa Y animal activo Y sin retiro de leche vigente.
 */
export function calcularVacasEnOrdeno(
  lactanciasActivas: HembraEnLactancia[],
  animalesActivosIds: Set<string>,
  retiros: AnimalEnRetiro[],
): number {
  const conRetiroLeche = new Set(
    retiros.filter((r) => r.diasRestantesLeche !== null).map((r) => r.animalId),
  );

  return lactanciasActivas.filter(
    (l) => animalesActivosIds.has(l.animalId) && !conRetiroLeche.has(l.animalId),
  ).length;
}

/**
 * Construye la lista unificada y accionable de alertas activas del hato
 * a partir de retiros sanitarios vigentes y próximos eventos reproductivos.
 */
export function construirAlertas(
  retiros: AnimalEnRetiro[],
  eventos: ProximoEvento[],
): AlertaNotificacion[] {
  // Un animal puede tener retiro de leche Y de carne a la vez, con fechas de
  // liberación independientes (RF-032: evita "cifras contradictorias" entre
  // la campana y el Semáforo — antes solo se reportaba uno de los dos y el
  // otro quedaba invisible en las alertas).
  const alertasRetiro: AlertaNotificacion[] = retiros.flatMap((r) => {
    const items: AlertaNotificacion[] = [];
    if (r.diasRestantesLeche !== null) {
      items.push({
        id: `retiro-leche-${r.animalId}`,
        categoria: "retiro" as CategoriaAlerta,
        animalId: r.animalId,
        fecha: r.fechaLiberacionLeche ?? hoyLocal(),
        mensaje: `${r.nombre} (${r.arete}) sigue en retiro de leche — vence en ${r.diasRestantesLeche} día(s).`,
      });
    }
    if (r.diasRestantesCarne !== null) {
      items.push({
        id: `retiro-carne-${r.animalId}`,
        categoria: "retiro" as CategoriaAlerta,
        animalId: r.animalId,
        fecha: r.fechaLiberacionCarne ?? hoyLocal(),
        mensaje: `${r.nombre} (${r.arete}) sigue en retiro de carne — vence en ${r.diasRestantesCarne} día(s).`,
      });
    }
    return items;
  });

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
      const [animales, retiros, eventosVentana, lactanciasActivas] = await Promise.all([
        getAnimales(),
        getRetirosActivos(),
        getProximosEventos(),
        getHembrasEnLactancia(),
      ]);

      const activos = animales.filter((a) => a.activo);
      const totalHatoActivo = activos.length;
      const activosIds = new Set(activos.map((a) => a.id));

      // B11: Vacas en Ordeño según lactancia real (no la categoría del animal,
      // que puede quedar desactualizada), excluyendo retiro de leche vigente.
      const vacasEnOrdeno = calcularVacasEnOrdeno(lactanciasActivas, activosIds, retiros);

      const gestantesConfirmadas = activos.filter((animal) => animal.estadoReproductivo === 'Preñada' || animal.estadoReproductivo === 'En Secado').length;

      // Alertas Activas en ventana: debe contar lo mismo que muestra la campana
      // de notificaciones (construirAlertas) — un animal en retiro de leche Y
      // carne genera dos alertas, no una, o el KPI y la campana se contradicen.
      const alertasActivas = construirAlertas(retiros, eventosVentana).length;

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
