import { describe, it, expect } from 'vitest';
import {
  calcularFechaLiberacion,
  formatearFecha,
  diasRestantesRetiro,
  toCreateTratamientoPayload,
  toUpdateTratamientoPayload,
} from '../lib/api/sanitary';

describe('Sanitary date and withdrawal calculation utilities', () => {
  it('calculates projected liberation date correctly', () => {
    expect(calcularFechaLiberacion('2026-09-17', 5)).toBe('2026-09-22');
    expect(calcularFechaLiberacion('2026-09-17', 28)).toBe('2026-10-15');
    expect(calcularFechaLiberacion('2026-09-17', 0)).toBe('2026-09-17');
  });

  it('handles month boundary crossings without timezone skew', () => {
    expect(calcularFechaLiberacion('2026-01-30', 3)).toBe('2026-02-02');
    expect(calcularFechaLiberacion('2026-12-28', 10)).toBe('2027-01-07');
  });

  it('formats dates consistently in DD/MM/YYYY format', () => {
    expect(formatearFecha('2026-09-17')).toBe('17/09/2026');
    expect(formatearFecha('2026-09-17T15:30:00.000Z')).toBe('17/09/2026');
    expect(formatearFecha('')).toBe('-');
  });

  it('calculates remaining withdrawal days accurately against a reference date', () => {
    expect(diasRestantesRetiro('2026-09-22', '2026-09-17')).toBe(5);
    expect(diasRestantesRetiro('2026-09-10', '2026-09-17')).toBe(0);
    expect(diasRestantesRetiro('2026-09-17', '2026-09-17')).toBe(0);
  });
});

describe('toCreateTratamientoPayload whitelist', () => {
  const animalId = '11111111-1111-1111-1111-111111111111';

  it('maps dual retiros and strips snake_case / extra keys', () => {
    const payload = toCreateTratamientoPayload(
      {
        farmaco: 'Cefalexina 200 Intramamaria',
        dosis: '1 jeringa',
        via: 'Intramamaria',
        fecha: '2026-09-17',
        diagnostico: 'Mastitis clínica',
        veterinario: 'Dra. X',
        dias_retiro_leche: '5',
        dias_retiro_carne: '4',
        dias_retiro: '5',
        documentoUrl: 'https://example.com/doc.pdf',
        customJunk: true,
        diasRetiroLeche: 5,
        diasRetiroCarne: 4,
      },
      animalId,
    );

    expect(payload).toEqual({
      animalId,
      farmaco: 'Cefalexina 200 Intramamaria',
      dosis: '1 jeringa',
      via: 'Intramamaria',
      fecha: '2026-09-17',
      diagnostico: 'Mastitis clínica',
      veterinario: 'Dra. X',
      diasRetiro: 5,
      diasRetiroLeche: 5,
      diasRetiroCarne: 4,
      documentoUrl: 'https://example.com/doc.pdf',
    });
    expect(payload).not.toHaveProperty('dias_retiro_leche');
    expect(payload).not.toHaveProperty('customJunk');
    expect(payload.diasRetiroLeche).not.toBe(payload.diasRetiroCarne);
  });

  it('preserves distinct leche/carne when already camelCase from modal', () => {
    const payload = toCreateTratamientoPayload(
      {
        farmaco: 'Oxitetraciclina L.A. 20%',
        dosis: '20 ml',
        fecha: '2026-09-17',
        diagnostico: 'Neumonía',
        diasRetiro: 28,
        diasRetiroLeche: 7,
        diasRetiroCarne: 28,
      },
      animalId,
    );
    expect(payload.diasRetiroLeche).toBe(7);
    expect(payload.diasRetiroCarne).toBe(28);
    expect(payload.diasRetiro).toBe(28);
  });

  it('update payload omits animalId', () => {
    const update = toUpdateTratamientoPayload({
      farmaco: 'Ivermectina 1%',
      dosis: '1 ml',
      fecha: '2026-09-17',
      diagnostico: 'Parásitos',
      diasRetiroLeche: 28,
      diasRetiroCarne: 35,
    });
    expect(update).not.toHaveProperty('animalId');
    expect(update.diasRetiroLeche).toBe(28);
    expect(update.diasRetiroCarne).toBe(35);
  });
});
