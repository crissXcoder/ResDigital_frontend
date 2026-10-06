import { describe, expect, it } from 'vitest';
import {
  CLASES_ESTADO,
  CLASES_EVENTO,
  CLASES_HITO,
  CLASES_REVERTIDO,
} from '@/lib/reproductivo/estado-colores';
import type { EstadoReproductivo, TipoEvento, TipoHito } from '@/lib/reproductivo/tipos';

const ESTADOS: EstadoReproductivo[] = ['Vacía', 'Servida', 'Preñada', 'En Secado'];
const HITOS: TipoHito[] = [
  'Palpación',
  'Secado',
  'Aviso Parto',
  'Aviso Parto Urgente',
  'Parto FPP',
];
const TIPOS_EVENTO: TipoEvento[] = ['SERVICIO', 'DIAGNOSTICO', 'PARTO', 'SECADO'];

/** Criterio de aceptación del plan convertido en prueba: cero hex, cero clases arbitrarias. */
function sinColorCrudo(clase: string): boolean {
  return !/#[0-9A-Fa-f]{3,8}/.test(clase) && !clase.includes('[');
}

describe('CLASES_ESTADO', () => {
  it.each(ESTADOS)('define clases para el estado "%s"', (estado) => {
    expect(CLASES_ESTADO[estado]).toBeTruthy();
    expect(sinColorCrudo(CLASES_ESTADO[estado])).toBe(true);
  });

  it('usa un token más tenue para Servida que para Preñada', () => {
    expect(CLASES_ESTADO.Servida).toContain('info-bg-soft');
    expect(CLASES_ESTADO['Preñada']).toContain('info-bg');
    expect(CLASES_ESTADO['Preñada']).not.toContain('info-bg-soft');
  });
});

describe('CLASES_HITO', () => {
  it.each(HITOS)('define clases para el hito "%s"', (hito) => {
    expect(CLASES_HITO[hito]).toBeTruthy();
    expect(sinColorCrudo(CLASES_HITO[hito])).toBe(true);
  });

  it('solo el aviso de parto urgente usa el color de peligro', () => {
    expect(CLASES_HITO['Aviso Parto Urgente']).toContain('danger');
    expect(CLASES_HITO['Aviso Parto']).not.toContain('danger');
  });

  it('el hito Secado usa el acento exclusivo, no reutilizado por otros estados', () => {
    expect(CLASES_HITO.Secado).toContain('accent-secado');
    for (const hito of HITOS) {
      if (hito !== 'Secado') {
        expect(CLASES_HITO[hito]).not.toContain('accent-secado');
      }
    }
  });
});

describe('CLASES_EVENTO', () => {
  it.each(TIPOS_EVENTO)('define clases para el evento "%s"', (tipo) => {
    expect(CLASES_EVENTO[tipo]).toBeTruthy();
    expect(sinColorCrudo(CLASES_EVENTO[tipo])).toBe(true);
  });
});

describe('CLASES_REVERTIDO', () => {
  it('usa el neutro del sistema, sin color crudo', () => {
    expect(CLASES_REVERTIDO).toContain('slate');
    expect(sinColorCrudo(CLASES_REVERTIDO)).toBe(true);
  });
});
