import { describe, it, expect } from 'vitest';
import {
  getMockKpis,
  getMockAnimalesEnRetiro,
  getMockProximosEventosReproductivos,
  getMockAlertas,
  buscarAnimalesMock,
} from '@/lib/mock/dashboard-mock';

/**
 * Pruebas unitarias — MOD-04 Dashboard (Karla)
 *
 * Verifican que la lógica de KPIs del mock cumpla las reglas de negocio reales
 * definidas en 05-Modulos/MOD-04-Dashboard-Alertas.md y corrige bugs del wireframe:
 *   - B11: "Vacas en Ordeño" requiere categoria = 'Vaca en Ordeño' Y sin retiro de leche activo.
 *          No basta con "hembra sin retiro".
 *   - B4:  "Gestantes Confirmadas" exige diagnóstico de preñez vigente, no solo un servicio.
 *
 * Estas mismas reglas se van a aplicar cuando se conecten los endpoints reales de
 * Ari (Sanitario) y Cristhian (Reproductivo) — las pruebas deben seguir pasando sin cambios.
 */

// ─── KPIs principales ──────────────────────────────────────────────────────────

describe('getMockKpis', () => {
  const kpis = getMockKpis();

  it('devuelve los cuatro KPIs requeridos con valores numéricos no negativos', () => {
    expect(typeof kpis.totalHatoActivo).toBe('number');
    expect(typeof kpis.vacasEnOrdeno).toBe('number');
    expect(typeof kpis.gestantesConfirmadas).toBe('number');
    expect(typeof kpis.alertasActivas).toBe('number');

    expect(kpis.totalHatoActivo).toBeGreaterThan(0);
    expect(kpis.vacasEnOrdeno).toBeGreaterThanOrEqual(0);
    expect(kpis.gestantesConfirmadas).toBeGreaterThanOrEqual(0);
    expect(kpis.alertasActivas).toBeGreaterThanOrEqual(0);
  });

  // B11 — "Vacas en Ordeño": debe ser ≤ al total del hato y ≤ al número de
  // animales con categoría "Vaca en Ordeño" (porque hay algunas en retiro).
  it('[B11] vacasEnOrdeno es menor o igual al totalHatoActivo', () => {
    expect(kpis.vacasEnOrdeno).toBeLessThanOrEqual(kpis.totalHatoActivo);
  });

  it('[B11] vacasEnOrdeno excluye a las "Vaca en Ordeño" con retiro de leche activo', () => {
    const retiros = getMockAnimalesEnRetiro();
    // ID de animales con retiro de leche activo (diasRestantesLeche > 0)
    const conRetiroLeche = new Set(
      retiros
        .filter((r) => r.diasRestantesLeche !== null && r.diasRestantesLeche > 0)
        .map((r) => r.animalId),
    );
    // vacasEnOrdeno siempre debe ser menor a "total vacas en ordeño sin filtrar retiro"
    // Verificamos que, si hay retiros de leche activos, el KPI refleja la exclusión
    if (conRetiroLeche.size > 0) {
      // Al menos uno fue excluido — vacasEnOrdeno no puede incluir el total crudo
      // Hay 3 "Vaca en Ordeño" en el mock (Canela, Estrella, Paloma):
      // Estrella (a2) tiene retiro de leche → debería haber como máximo 2.
      expect(kpis.vacasEnOrdeno).toBeLessThan(3);
    }
  });

  // B4 — "Gestantes Confirmadas": solo animales con diagnóstico positivo vigente.
  it('[B4] gestantesConfirmadas es mayor a 0 (el mock incluye gestantes)', () => {
    // El mock define gestantesVigentesMock = Set(["a1", "a3"]) → 2 gestantes
    expect(kpis.gestantesConfirmadas).toBe(2);
  });

  it('[B4] gestantesConfirmadas no supera el totalHatoActivo', () => {
    expect(kpis.gestantesConfirmadas).toBeLessThanOrEqual(kpis.totalHatoActivo);
  });

  it('alertasActivas es la suma de retiros + próximos eventos reproductivos', () => {
    const retiros = getMockAnimalesEnRetiro().length;
    const proximos = getMockProximosEventosReproductivos().length;
    expect(kpis.alertasActivas).toBe(retiros + proximos);
  });
});

// ─── Retiros sanitarios ─────────────────────────────────────────────────────────

describe('getMockAnimalesEnRetiro', () => {
  const retiros = getMockAnimalesEnRetiro();

  it('devuelve al menos un animal en retiro', () => {
    expect(retiros.length).toBeGreaterThan(0);
  });

  it('cada retiro tiene los campos requeridos por AnimalEnRetiro', () => {
    for (const r of retiros) {
      expect(r).toHaveProperty('animalId');
      expect(r).toHaveProperty('arete');
      expect(r).toHaveProperty('nombre');
      expect(r).toHaveProperty('fechaLiberacionLeche');
      expect(r).toHaveProperty('fechaLiberacionCarne');
      expect(r).toHaveProperty('diasRestantesLeche');
      expect(r).toHaveProperty('diasRestantesCarne');
    }
  });

  it('los días restantes son null o un número (nunca undefined ni NaN)', () => {
    for (const r of retiros) {
      if (r.diasRestantesLeche !== null) {
        expect(typeof r.diasRestantesLeche).toBe('number');
        expect(Number.isNaN(r.diasRestantesLeche)).toBe(false);
      }
      if (r.diasRestantesCarne !== null) {
        expect(typeof r.diasRestantesCarne).toBe('number');
        expect(Number.isNaN(r.diasRestantesCarne)).toBe(false);
      }
    }
  });

  it('si hay días restantes, la fecha de liberación correspondiente no es null', () => {
    for (const r of retiros) {
      if (r.diasRestantesLeche !== null) {
        expect(r.fechaLiberacionLeche).not.toBeNull();
      }
      if (r.diasRestantesCarne !== null) {
        expect(r.fechaLiberacionCarne).not.toBeNull();
      }
    }
  });

  it('las fechas de liberación tienen formato YYYY-MM-DD', () => {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    for (const r of retiros) {
      if (r.fechaLiberacionLeche) expect(r.fechaLiberacionLeche).toMatch(iso);
      if (r.fechaLiberacionCarne) expect(r.fechaLiberacionCarne).toMatch(iso);
    }
  });
});

// ─── Próximos eventos reproductivos ────────────────────────────────────────────

describe('getMockProximosEventosReproductivos', () => {
  const eventos = getMockProximosEventosReproductivos();
  const TIPOS_VALIDOS = ['Palpación', 'Secado', 'Aviso Parto', 'Aviso Parto Urgente', 'Parto'] as const;

  it('devuelve al menos un evento', () => {
    expect(eventos.length).toBeGreaterThan(0);
  });

  it('cada evento tiene los campos requeridos por ProximoEventoReproductivo', () => {
    for (const e of eventos) {
      expect(e).toHaveProperty('animalId');
      expect(e).toHaveProperty('arete');
      expect(e).toHaveProperty('nombre');
      expect(e).toHaveProperty('tipo');
      expect(e).toHaveProperty('fecha');
      expect(e).toHaveProperty('diasRestantes');
      expect(e).toHaveProperty('urgente');
    }
  });

  it('el campo "tipo" usa los 5 valores válidos de TipoEventoReproductivo', () => {
    for (const e of eventos) {
      expect(TIPOS_VALIDOS).toContain(e.tipo);
    }
  });

  it('diasRestantes es un número no negativo (eventos futuros o de hoy)', () => {
    for (const e of eventos) {
      expect(typeof e.diasRestantes).toBe('number');
      expect(e.diasRestantes).toBeGreaterThanOrEqual(0);
    }
  });

  it('urgente es true solo para "Aviso Parto Urgente"', () => {
    for (const e of eventos) {
      if (e.urgente) {
        expect(e.tipo).toBe('Aviso Parto Urgente');
      }
    }
  });

  it('el campo "fecha" tiene formato YYYY-MM-DD', () => {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    for (const e of eventos) {
      expect(e.fecha).toMatch(iso);
    }
  });
});

// ─── Campana de alertas ─────────────────────────────────────────────────────────

describe('getMockAlertas', () => {
  const alertas = getMockAlertas();
  const CATEGORIAS_VALIDAS = ['retiro', 'palpacion', 'secado', 'parto', 'parto_urgente'] as const;

  it('devuelve alertas cuando hay retiros y próximos eventos', () => {
    expect(alertas.length).toBeGreaterThan(0);
  });

  it('no hay IDs duplicados', () => {
    const ids = alertas.map((a) => a.id);
    const unicos = new Set(ids);
    expect(unicos.size).toBe(ids.length);
  });

  it('todas las categorías pertenecen al conjunto válido de CategoriaAlerta', () => {
    for (const a of alertas) {
      expect(CATEGORIAS_VALIDAS).toContain(a.categoria);
    }
  });

  it('los retiros sanitarios generan alertas con categoría "retiro"', () => {
    const retiros = getMockAnimalesEnRetiro();
    const alertasDeRetiro = alertas.filter((a) => a.categoria === 'retiro');
    expect(alertasDeRetiro.length).toBe(retiros.length);
  });

  it('el mensaje de cada alerta menciona el nombre y el arete del animal', () => {
    const retiros = getMockAnimalesEnRetiro();
    for (const r of retiros) {
      const alerta = alertas.find((a) => a.animalId === r.animalId && a.categoria === 'retiro');
      expect(alerta).toBeDefined();
      // El mensaje debe incluir el nombre del animal
      expect(alerta!.mensaje).toContain(r.nombre);
      // Y el arete
      expect(alerta!.mensaje).toContain(r.arete);
    }
  });

  it('las alertas están ordenadas por proximidad (la más urgente primero)', () => {
    // Verificar que el array esté ordenado de forma que la alerta con fecha
    // más cercana (o más vencida) aparezca antes.
    const hoy = new Date(new Date().toDateString()).getTime();
    const msPorDia = 1000 * 60 * 60 * 24;
    const dias = alertas.map((a) =>
      Math.round((new Date(a.fecha).getTime() - hoy) / msPorDia),
    );
    for (let i = 0; i < dias.length - 1; i++) {
      expect(dias[i]).toBeLessThanOrEqual(dias[i + 1]);
    }
  });
});

// ─── Buscador global de animales ────────────────────────────────────────────────

describe('buscarAnimalesMock', () => {
  it('devuelve resultados cuando el query coincide con un arete', () => {
    const res = buscarAnimalesMock('#104');
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].arete).toBe('#104');
  });

  it('devuelve resultados cuando el query coincide con un nombre (case insensitive)', () => {
    const res = buscarAnimalesMock('canela');
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].nombre).toBe('Canela');
  });

  it('devuelve array vacío para una cadena vacía', () => {
    expect(buscarAnimalesMock('')).toHaveLength(0);
    expect(buscarAnimalesMock('   ')).toHaveLength(0);
  });

  it('devuelve array vacío para un query sin coincidencias', () => {
    expect(buscarAnimalesMock('zzz_no_existe')).toHaveLength(0);
  });

  it('cada resultado tiene los campos requeridos por AnimalBusqueda', () => {
    const res = buscarAnimalesMock('Estrella');
    for (const a of res) {
      expect(a).toHaveProperty('animalId');
      expect(a).toHaveProperty('arete');
      expect(a).toHaveProperty('nombre');
      expect(a).toHaveProperty('categoria');
    }
  });
});
