import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatearFecha,
  diferenciaDiasCivil,
  hoyLocal,
  normalizarFechaCivil,
  sumarDiasCivil,
  textoDiasRestantes,
} from '@/lib/reproductivo/fechas';

afterEach(() => {
  vi.useRealTimers();
});

describe('formatearFecha', () => {
  it('convierte YYYY-MM-DD a DD/MM/YYYY sin corrimiento de zona horaria', () => {
    // Regresión concreta: new Date('2026-09-16') se interpreta como
    // medianoche UTC, y en Costa Rica (UTC-6) toLocaleDateString() imprimía
    // 15/09/2026 en vez de 16/09/2026.
    expect(formatearFecha('2026-09-16')).toBe('16/09/2026');
  });

  it('formatea el primer día del año sin retroceder de año', () => {
    expect(formatearFecha('2027-01-01')).toBe('01/01/2027');
  });

  it('devuelve un guion para valores ausentes', () => {
    expect(formatearFecha(undefined)).toBe('—');
    expect(formatearFecha(null)).toBe('—');
    expect(formatearFecha('')).toBe('—');
  });

  it('rechaza fechas de calendario imposibles', () => {
    expect(formatearFecha('2026-02-30')).toBe('—');
    expect(normalizarFechaCivil('2026-13-01')).toBeNull();
    expect(formatearFecha('no-es-fecha')).toBe('—');
  });

  it('conserva límites de mes, año y día bisiesto', () => {
    expect(formatearFecha('2024-02-29')).toBe('29/02/2024');
    expect(formatearFecha('2025-12-31')).toBe('31/12/2025');
    expect(formatearFecha('2026-01-01')).toBe('01/01/2026');
  });

  it('conserva fechas civiles aunque timestamp UTC caiga el día anterior en Costa Rica', () => {
    expect(normalizarFechaCivil('2026-09-18')).toBe('2026-09-18');
    expect(normalizarFechaCivil('2026-09-18T00:00:00.000Z')).toBe('2026-09-17');
  });
});

describe('hoyLocal', () => {
  it('usa día civil de Costa Rica a las 17:59', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-18T23:59:00.000Z'));
    expect(hoyLocal()).toBe('2026-09-18');
    vi.useRealTimers();
  });

  it('usa día civil de Costa Rica a las 18:00', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T00:00:00.000Z'));
    expect(hoyLocal()).toBe('2026-09-18');
    vi.useRealTimers();
  });
});

describe('aritmética de fechas civiles', () => {
  it('suma días por calendario al cruzar mes, año y bisiesto', () => {
    expect(sumarDiasCivil('2024-02-28', 1)).toBe('2024-02-29');
    expect(sumarDiasCivil('2024-02-29', 1)).toBe('2024-03-01');
    expect(sumarDiasCivil('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('resta diferencias civiles sin depender del huso del navegador', () => {
    expect(diferenciaDiasCivil('2026-09-18', '2026-09-19')).toBe(1);
    expect(diferenciaDiasCivil('2026-09-19', '2026-09-18')).toBe(-1);
  });

  it('rechaza fechas inválidas y cantidades no enteras', () => {
    expect(sumarDiasCivil('2026-02-30', 1)).toBeNull();
    expect(sumarDiasCivil('2026-02-28', 1.5)).toBeNull();
    expect(diferenciaDiasCivil('2026-02-30', '2026-03-01')).toBeNull();
  });
});

describe('textoDiasRestantes', () => {
  it('dice "hoy" cuando faltan 0 días', () => {
    expect(textoDiasRestantes(0)).toBe('hoy');
  });

  it('dice "en N días" para un valor positivo', () => {
    expect(textoDiasRestantes(12)).toBe('en 12 días');
  });

  it('usa singular para 1 día', () => {
    expect(textoDiasRestantes(1)).toBe('en 1 día');
  });

  it('dice "vencido hace N días" para un valor negativo', () => {
    expect(textoDiasRestantes(-3)).toBe('vencido hace 3 días');
  });
});
