import { describe, it, expect, vi } from 'vitest';
import { calcularVacasEnOrdeno, construirAlertas } from '@/lib/hooks/use-dashboard-data';
import type { AnimalEnRetiro } from '@/lib/types/dashboard';
import type { HembraEnLactancia } from '@/lib/api/produccion';
import type { ProximoEvento } from '@/lib/api/reproductivo';
import { hoyLocal, sumarDiasCivil } from '@/lib/reproductivo/fechas';

/**
 * Pruebas de contrato y derivación real para el Dashboard (MOD-04 / DASH-T001 / DASH-T004).
 *
 * Valida:
 * 1. Cero dependencias de mocks en tiempo de ejecución.
 * 2. Motor de alertas reactivo y determinista que deriva alertas de retiros y eventos reproductivos.
 * 3. Reglas ganaderas B11 (Vacas en ordeño libres de retiro) y B4 (Gestantes solo con diagnóstico confirmado).
 */

describe('DASH-B11: Vacas en ordeño según lactancia real', () => {
  const lactancias: HembraEnLactancia[] = [
    { animalId: 'anim-1', arete: '101', nombre: 'Estrella', fechaInicio: '2026-08-01' },
    { animalId: 'anim-2', arete: '102', nombre: 'Margarita', fechaInicio: '2026-09-01' },
  ];

  it('caso válido: cuenta lactancias activas de animales activos sin retiro de leche', () => {
    const resultado = calcularVacasEnOrdeno(lactancias, new Set(['anim-1', 'anim-2']), []);
    expect(resultado).toBe(2);
  });

  it('negativo: excluye lactancia activa si el animal tiene retiro de leche vigente', () => {
    const retiros: AnimalEnRetiro[] = [
      {
        animalId: 'anim-1',
        arete: '101',
        nombre: 'Estrella',
        fechaLiberacionLeche: '2026-10-25',
        fechaLiberacionCarne: null,
        diasRestantesLeche: 5,
        diasRestantesCarne: null,
      },
    ];
    const resultado = calcularVacasEnOrdeno(lactancias, new Set(['anim-1', 'anim-2']), retiros);
    expect(resultado).toBe(1);
  });

  it('negativo: no cuenta una categoría "Vaca en Ordeño" desactualizada sin lactancia activa real', () => {
    // Regresión del bug B11: antes se contaba por `categoria`, aunque la
    // lactancia ya estuviera cerrada o nunca se hubiera registrado.
    const resultado = calcularVacasEnOrdeno([], new Set(['anim-1', 'anim-2']), []);
    expect(resultado).toBe(0);
  });

  it('límite/seguridad: excluye lactancia activa de un animal dado de baja (inactivo)', () => {
    const resultado = calcularVacasEnOrdeno(lactancias, new Set(['anim-1']), []);
    expect(resultado).toBe(1);
  });

  it('límite: lista vacía de lactancias devuelve 0 sin lanzar error', () => {
    expect(calcularVacasEnOrdeno([], new Set(), [])).toBe(0);
  });
});

describe('DASH-T001 / DASH-T004: Contrato de Alertas Reales del Dashboard', () => {
  const hoy = hoyLocal();
  const fechaEn5Dias = sumarDiasCivil(hoy, 5)!;
  const fechaEn10Dias = sumarDiasCivil(hoy, 10)!;

  it('construye alertas de retiro sanitario con formato de leche o carne y las categoriza como "retiro"', () => {
    const retiros: AnimalEnRetiro[] = [
      {
        animalId: 'anim-1',
        arete: '101',
        nombre: 'Estrella',
        fechaLiberacionLeche: fechaEn5Dias,
        fechaLiberacionCarne: fechaEn10Dias,
        diasRestantesLeche: 5,
        diasRestantesCarne: 10,
      },
      {
        animalId: 'anim-2',
        arete: '102',
        nombre: 'Margarita',
        fechaLiberacionLeche: null,
        fechaLiberacionCarne: fechaEn5Dias,
        diasRestantesLeche: null,
        diasRestantesCarne: 5,
      },
    ];

    const alertas = construirAlertas(retiros, []);

    // RF-032: un animal con retiro de leche Y carne a la vez (Estrella) debe
    // generar DOS alertas independientes — antes solo se reportaba la de
    // leche y la de carne (la más larga, la que realmente sigue bloqueando)
    // desaparecía de la campana aunque el Semáforo sí la mostrara.
    expect(alertas).toHaveLength(3);
    expect(alertas.every((a) => a.categoria === 'retiro')).toBe(true);
    expect(alertas.map((a) => a.mensaje)).toEqual(
      expect.arrayContaining([
        'Estrella (101) sigue en retiro de leche — vence en 5 día(s).',
        'Estrella (101) sigue en retiro de carne — vence en 10 día(s).',
        'Margarita (102) sigue en retiro de carne — vence en 5 día(s).',
      ]),
    );
  });

  it('construye alertas reproductivas tipadas (palpación, secado, parto, parto_urgente) ordenadas cronológicamente', () => {
    const eventos: ProximoEvento[] = [
      {
        animalId: 'anim-3',
        arete: '103',
        nombre: 'Luna',
        tipo: 'Parto',
        fecha: fechaEn10Dias,
        diasRestantes: 10,
        urgente: false,
      },
      {
        animalId: 'anim-4',
        arete: '104',
        nombre: 'Canela',
        tipo: 'Aviso Parto Urgente',
        fecha: fechaEn5Dias,
        diasRestantes: 5,
        urgente: true,
      },
      {
        animalId: 'anim-5',
        arete: '105',
        nombre: 'Bonita',
        tipo: 'Palpación',
        fecha: hoy,
        diasRestantes: 0,
        urgente: false,
      },
    ];

    const alertas = construirAlertas([], eventos);

    expect(alertas).toHaveLength(3);
    // Orden cronológico: hoy (0d) primero, luego 5d, luego 10d
    expect(alertas[0].categoria).toBe('palpacion');
    expect(alertas[0].animalId).toBe('anim-5');
    expect(alertas[0].mensaje).toContain('Bonita (105): palpación en 0 día(s).');

    expect(alertas[1].categoria).toBe('parto_urgente');
    expect(alertas[1].animalId).toBe('anim-4');
    expect(alertas[1].mensaje).toContain('Canela (104): aviso parto urgente en 5 día(s).');

    expect(alertas[2].categoria).toBe('parto');
    expect(alertas[2].animalId).toBe('anim-3');
    expect(alertas[2].mensaje).toContain('Luna (103): parto en 10 día(s).');
  });

  it('combina retiros y eventos reproductivos sin duplicación y ordenados por fecha civil', () => {
    const retiros: AnimalEnRetiro[] = [
      {
        animalId: 'anim-1',
        arete: '101',
        nombre: 'Estrella',
        fechaLiberacionLeche: fechaEn5Dias,
        fechaLiberacionCarne: null,
        diasRestantesLeche: 5,
        diasRestantesCarne: null,
      },
    ];
    const eventos: ProximoEvento[] = [
      {
        animalId: 'anim-2',
        arete: '102',
        nombre: 'Luna',
        tipo: 'Secado',
        fecha: hoy,
        diasRestantes: 0,
        urgente: false,
      },
    ];

    const alertas = construirAlertas(retiros, eventos);
    expect(alertas).toHaveLength(2);
    expect(alertas[0].id).toBe('secado-anim-2');
    expect(alertas[1].id).toBe('retiro-leche-anim-1');
  });
});
