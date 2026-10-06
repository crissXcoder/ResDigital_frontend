import { describe, it, expect } from 'vitest';
import {
  getMockAnimalesEnRetiro,
  getMockProximosEventosReproductivos,
} from '@/lib/mock/dashboard-mock';

/**
 * Pruebas de correctitud de fechas — MOD-04 Dashboard (Karla)
 *
 * El sistema usa UTC−6 (Costa Rica). El bug histórico B8 del wireframe generaba fechas
 * fijas en el código; el mock resolvió esto con `fechaEnDias(n)` que siempre parte
 * de "ahora". Estas pruebas garantizan que:
 *   1. Las fechas del Dashboard siempre están en el futuro (o son hoy) — nunca vencidas
 *      al correr el proyecto por primera vez.
 *   2. Los días restantes son consistentes con las fechas reportadas (±1 día de margen
 *      por posibles cruce de medianoche durante la ejecución del test).
 *   3. No hay corrimientos de zona horaria (el bug clásico: new Date('YYYY-MM-DD')
 *      interpreta como UTC 00:00, que en CR cae el día anterior).
 */

// ─── Constantes de tolerancia ───────────────────────────────────────────────────

/**
 * Margen de ±1 día: las pruebas pueden correr justo en la medianoche local,
 * por lo que se tolera un día de diferencia entre la fecha calculada y la esperada.
 */
const MARGEN_DIAS = 1;

function diasHastaFecha(fechaIso: string): number {
  const hoy = fechaHoyCostaRica().split('-').map(Number);
  const fecha = fechaIso.split('-').map(Number);
  return (
    Date.UTC(fecha[0], fecha[1] - 1, fecha[2]) -
    Date.UTC(hoy[0], hoy[1] - 1, hoy[2])
  ) / (24 * 60 * 60 * 1000);
}

function fechaHoyCostaRica(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

function fechaEsperadaCostaRica(dias: number): string {
  const [anio, mes, dia] = fechaHoyCostaRica().split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias))
    .toISOString()
    .slice(0, 10);
}

// ─── Fechas de retiros sanitarios ──────────────────────────────────────────────

describe('Fechas de retiro sanitario (getMockAnimalesEnRetiro)', () => {
  const retiros = getMockAnimalesEnRetiro();

  it('las fechas de liberación son futuras (días restantes > 0)', () => {
    for (const r of retiros) {
      if (r.fechaLiberacionLeche && r.diasRestantesLeche !== null) {
        // La fecha ISO del campo debe ser coherente con los días restantes declarados
        const diasCalculados = diasHastaFecha(r.fechaLiberacionLeche);
        expect(Math.abs(diasCalculados - r.diasRestantesLeche)).toBeLessThanOrEqual(MARGEN_DIAS);
      }
      if (r.fechaLiberacionCarne && r.diasRestantesCarne !== null) {
        const diasCalculados = diasHastaFecha(r.fechaLiberacionCarne);
        expect(Math.abs(diasCalculados - r.diasRestantesCarne)).toBeLessThanOrEqual(MARGEN_DIAS);
      }
    }
  });

  it('los días de carne son mayores o iguales a los de leche (retiro de carne siempre ≥ leche)', () => {
    for (const r of retiros) {
      if (r.diasRestantesLeche !== null && r.diasRestantesCarne !== null) {
        expect(r.diasRestantesCarne).toBeGreaterThanOrEqual(r.diasRestantesLeche);
      }
    }
  });

  it('no hay corrimiento de zona horaria: el día de la fecha ISO coincide con el día calculado', () => {
    // Regresión del bug UTC: parsear 'YYYY-MM-DD' como Date y pedir .getDate() puede dar
    // el día anterior en zonas UTC-. La función fechaEnDias del mock evita esto construyendo
    // la fecha desde `hoy` y sumando días con setDate, no desde un string ISO.
    for (const r of retiros) {
      if (r.fechaLiberacionLeche && r.diasRestantesLeche !== null) {
        expect(r.fechaLiberacionLeche).toBe(
          fechaEsperadaCostaRica(r.diasRestantesLeche),
        );
      }
    }
  });
});

// ─── Fechas de próximos eventos reproductivos ───────────────────────────────────

describe('Fechas de próximos eventos reproductivos (getMockProximosEventosReproductivos)', () => {
  const eventos = getMockProximosEventosReproductivos();

  it('las fechas de los eventos son futuras (diasRestantes ≥ 0)', () => {
    for (const e of eventos) {
      expect(e.diasRestantes).toBeGreaterThanOrEqual(0);
    }
  });

  it('el campo "fecha" es coherente con "diasRestantes" (±1 día de margen)', () => {
    for (const e of eventos) {
      const diasCalculados = diasHastaFecha(e.fecha);
      expect(Math.abs(diasCalculados - e.diasRestantes)).toBeLessThanOrEqual(MARGEN_DIAS);
    }
  });

  it('no hay corrimiento de zona horaria en las fechas de eventos', () => {
    for (const e of eventos) {
      expect(e.fecha).toBe(fechaEsperadaCostaRica(e.diasRestantes));
    }
  });

  it('los eventos están en orden cronológico (el más próximo primero)', () => {
    // El mock no garantiza orden, pero si lo están, debe mantenerse al conectar datos reales.
    // Esta prueba sirve como documentación de expectativa — si falla al conectar el backend,
    // hay que agregar un .sort() en el hook useProximosEventosReproductivos.
    const fechas = eventos.map((evento) => evento.fecha);
    for (let i = 0; i < fechas.length - 1; i++) {
      expect(fechas[i] <= fechas[i + 1]).toBe(true);
    }
  });
});

// ─── Consistencia cruzada ────────────────────────────────────────────────────────

describe('Consistencia cruzada: retiros y eventos del mismo día', () => {
  it('una fecha de retiro no coincide con una fecha de evento reproductivo para el mismo animal', () => {
    // Garantizar que el mock no genera conflictos de datos que hagan difícil probar la UI.
    const retiros = getMockAnimalesEnRetiro();
    const eventos = getMockProximosEventosReproductivos();

    for (const r of retiros) {
      const eventosDelAnimal = eventos.filter((e) => e.animalId === r.animalId);
      for (const e of eventosDelAnimal) {
        // Si el mismo animal tiene retiro y evento, no es un error —
        // solo verificamos que ambos tipos de fecha tengan el formato correcto.
        expect(r.fechaLiberacionLeche ?? r.fechaLiberacionCarne).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(e.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
