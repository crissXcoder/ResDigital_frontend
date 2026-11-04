import { describe, expect, it } from 'vitest';
import {
  fechaMinimaDiagnostico,
  fechaMinimaPartoViable,
  puedeQuedarPreniada,
} from '@/lib/reproductivo/edad-preniez';

describe('puedeQuedarPreniada', () => {
  it('permite registrar si el estado no trae el flag (compatibilidad)', () => {
    expect(puedeQuedarPreniada({})).toBe(true);
  });

  it('oculta acciones cuando la hembra aún no cumple 15 meses', () => {
    expect(puedeQuedarPreniada({ aptoParaPreniez: false })).toBe(false);
  });

  it('muestra acciones cuando ya es apta', () => {
    expect(puedeQuedarPreniada({ aptoParaPreniez: true })).toBe(true);
  });
});

describe('ventanas biológicas del ciclo', () => {
  it('la palpación no se registra antes de 35 días post-servicio', () => {
    expect(fechaMinimaDiagnostico('2026-03-01')).toBe('2026-04-05');
  });

  it('un parto viable de Holstein no entra antes del 60 % de gestación', () => {
    expect(fechaMinimaPartoViable('2026-03-01', 281)).toBe('2026-08-16');
  });
});
