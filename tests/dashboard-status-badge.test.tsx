import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DashboardStatusBadge,
  variantMap,
  type DashboardStatusVariant,
} from '@/components/dashboard/status-badge';

/**
 * Pruebas unitarias — DashboardStatusBadge (MOD-04 Karla)
 *
 * Criterios de aceptación (design.md §7 + CAMBIOS-PARA-EL-EQUIPO.md punto 25):
 * 1. Mapeo semántico AgTech Status Colors:
 *    - retiro              → Red / danger (crítico)
 *    - por-vencer          → Amber / warning (aviso ≤ 2 días)
 *    - palpacion           → Blue / info (diagnóstico pendiente)
 *    - secado              → Purple / secado (acento reproductivo)
 *    - parto               → Amber / warning (aviso parto FPP-15)
 *    - aviso-parto-urgente → Red / danger (crítico FPP-3)
 * 2. Cero colores crudos hex (#...) en el componente.
 * 3. Renderiza el texto de los children correctamente.
 */

const TODAS_LAS_VARIANTES: DashboardStatusVariant[] = [
  'retiro',
  'por-vencer',
  'palpacion',
  'secado',
  'parto',
  'aviso-parto-urgente',
];

function sinColorHexCrudo(clase: string): boolean {
  return !/#[0-9A-Fa-f]{3,8}/.test(clase);
}

describe('DashboardStatusBadge — Mapeo semántico (design.md §7)', () => {
  it('cada variante mapea a una categoría semántica válida de Badge', () => {
    for (const v of TODAS_LAS_VARIANTES) {
      expect(variantMap[v]).toBeDefined();
    }
  });

  it('retiro y aviso-parto-urgente usan el estado de peligro (danger)', () => {
    expect(variantMap['retiro']).toBe('danger');
    expect(variantMap['aviso-parto-urgente']).toBe('danger');
  });

  it('por-vencer y parto usan el estado de advertencia preventiva (warning)', () => {
    expect(variantMap['por-vencer']).toBe('warning');
    expect(variantMap['parto']).toBe('warning');
  });

  it('palpacion usa el estado informativo (info)', () => {
    expect(variantMap['palpacion']).toBe('info');
  });

  it('secado usa la variante exclusiva de secado reproductivo (secado)', () => {
    expect(variantMap['secado']).toBe('secado');
  });
});

describe('DashboardStatusBadge — Renderizado en DOM', () => {
  it.each(TODAS_LAS_VARIANTES)('renderiza la variante "%s" sin errores', (variante) => {
    const { container } = render(
      <DashboardStatusBadge variant={variante}>
        {variante.toUpperCase()}
      </DashboardStatusBadge>,
    );

    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe(variante.toUpperCase());

    // Cero hex crudo en las clases de Tailwind
    const classList = badge?.className || '';
    expect(sinColorHexCrudo(classList)).toBe(true);
  });

  it('renderiza clases de texto tipográfico estándar de badge', () => {
    render(
      <DashboardStatusBadge variant="retiro">
        BLOQUEADO
      </DashboardStatusBadge>,
    );

    const el = screen.getByText('BLOQUEADO');
    expect(el.className).toContain('uppercase');
    expect(el.className).toContain('font-mono');
  });

  it('combina correctamente clases personalizadas pasadas por className', () => {
    render(
      <DashboardStatusBadge variant="secado" className="custom-test-class">
        EN SECADO
      </DashboardStatusBadge>,
    );

    const el = screen.getByText('EN SECADO');
    expect(el.className).toContain('custom-test-class');
  });
});
