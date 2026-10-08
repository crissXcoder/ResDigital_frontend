import { describe, it, expect } from 'vitest';
import {
  calcularFechaLiberacion,
  formatearFecha,
  diasRestantesRetiro,
  toCreateTratamientoPayload,
  toDatosTratamientoPayload,
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

describe('payload de tratamiento compatible con la API', () => {
  const animalId = '11111111-1111-4111-8111-111111111111';
  const medicamentoId = '22222222-2222-4222-8222-222222222222';
  const padecimientoId = '33333333-3333-4333-8333-333333333333';

  it('con catálogo envía ids, retiros duales y nunca diasRetiro ni claves extra', () => {
    const payload = toCreateTratamientoPayload(
      {
        medicamentoId,
        farmaco: 'Cefalexina 200 Intramamaria',
        padecimientoId,
        diagnostico: 'Mastitis clínica',
        dosis: '1 jeringa',
        via: 'Intramamaria',
        fecha: '2026-09-17',
        fechaUltimaAdministracion: '2026-09-19',
        veterinario: 'Dra. X',
        diasRetiro: 5,
        dias_retiro_leche: '5',
        diasRetiroLeche: 5,
        diasRetiroCarne: 4,
        documentoUrl: 'https://example.com/doc.pdf',
        customJunk: true,
      },
      animalId,
    );

    expect(payload).toEqual({
      animalId,
      medicamentoId,
      padecimientoId,
      dosis: '1 jeringa',
      via: 'Intramamaria',
      fecha: '2026-09-17',
      fechaUltimaAdministracion: '2026-09-19',
      veterinario: 'Dra. X',
      diasRetiroLeche: 5,
      diasRetiroCarne: 4,
      documentoUrl: 'https://example.com/doc.pdf',
    });
    expect(payload).not.toHaveProperty('diasRetiro');
    expect(payload).not.toHaveProperty('farmaco');
  });

  it('producto personalizado envía farmaco y no medicamentoId', () => {
    const payload = toCreateTratamientoPayload(
      {
        medicamentoId: '',
        farmaco: '  Producto X  ',
        diagnostico: 'Neumonía',
        dosis: '20 ml',
        fecha: '2026-09-17',
        diasRetiroLeche: 7,
        diasRetiroCarne: 28,
      },
      animalId,
    );
    expect(payload.farmaco).toBe('Producto X');
    expect(payload).not.toHaveProperty('medicamentoId');
    expect(payload.diagnostico).toBe('Neumonía');
    expect(payload.diasRetiroLeche).toBe(7);
    expect(payload.diasRetiroCarne).toBe(28);
  });

  it('omite fechaUltimaAdministracion cuando es igual a la fecha de aplicación', () => {
    const payload = toDatosTratamientoPayload({
      farmaco: 'Ivermectina 1%',
      diagnostico: 'Parásitos',
      dosis: '1 ml',
      fecha: '2026-09-17',
      fechaUltimaAdministracion: '2026-09-17',
      diasRetiroLeche: 28,
      diasRetiroCarne: 35,
    });
    expect(payload).not.toHaveProperty('fechaUltimaAdministracion');
    expect(payload).not.toHaveProperty('animalId');
  });
});
