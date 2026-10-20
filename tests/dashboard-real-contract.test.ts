import { describe, it, expect, vi } from 'vitest';
import { construirAlertas } from '@/lib/hooks/use-dashboard-data';
import type { AnimalEnRetiro } from '@/lib/types/dashboard';
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

    expect(alertas).toHaveLength(2);
    expect(alertas[0].categoria).toBe('retiro');
    expect(alertas[0].mensaje).toContain('Estrella (101) sigue en retiro de leche — vence en 5 día(s).');
    expect(alertas[1].categoria).toBe('retiro');
    expect(alertas[1].mensaje).toContain('Margarita (102) sigue en retiro de carne — vence en 5 día(s).');
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
    expect(alertas[1].id).toBe('retiro-anim-1');
  });
});
