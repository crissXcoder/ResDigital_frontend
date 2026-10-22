import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('OBS-006 — Uniformar colores, jerarquía de botones y estilos interactivos', () => {
  it('renderiza botón primario (default) con branding navy y hover navy-light', () => {
    render(<Button>Guardar cambios</Button>);
    const btn = screen.getByRole('button', { name: 'Guardar cambios' });

    expect(btn.className).toContain('bg-navy');
    expect(btn.className).toContain('text-white');
    expect(btn.className).toContain('hover:bg-navy-light');
    expect(btn.className).toContain('focus-visible:ring-2');
  });

  it('renderiza botón de peligro (destructive) con semántica roja y hover red-700', () => {
    render(<Button variant="destructive">Eliminar registro</Button>);
    const btn = screen.getByRole('button', { name: 'Eliminar registro' });

    expect(btn.className).toContain('bg-danger');
    expect(btn.className).toContain('text-white');
    expect(btn.className).toContain('hover:bg-red-700');
    expect(btn.className).toContain('focus-visible:ring-red-400');
  });

  it('renderiza botón secundario/cancelar (secondary) neutral con borde, sin parecer destructivo', () => {
    render(<Button variant="secondary">Cancelar</Button>);
    const btn = screen.getByRole('button', { name: 'Cancelar' });

    expect(btn.className).toContain('bg-white');
    expect(btn.className).toContain('border-slate-200');
    expect(btn.className).toContain('text-slate-700');
    expect(btn.className).not.toContain('bg-red');
    expect(btn.className).not.toContain('text-red');
  });

  it('renderiza variante destructive-outline para acciones de baja o peligro secundarias', () => {
    render(<Button variant="destructive-outline">Dar de baja</Button>);
    const btn = screen.getByRole('button', { name: 'Dar de baja' });

    expect(btn.className).toContain('border-red-200');
    expect(btn.className).toContain('text-red-600');
    expect(btn.className).toContain('bg-white');
    expect(btn.className).toContain('hover:bg-red-50');
  });

  it('renderiza variante subtle para acciones no intrusivas', () => {
    render(<Button variant="subtle">Vista previa</Button>);
    const btn = screen.getByRole('button', { name: 'Vista previa' });

    expect(btn.className).toContain('bg-slate-100');
    expect(btn.className).toContain('text-slate-700');
    expect(btn.className).toContain('hover:bg-slate-200');
  });

  it('soporta estado de carga (isLoading) con spinner accesible y bloqueo interactivo', () => {
    render(<Button isLoading>Procesando</Button>);
    const btn = screen.getByRole('button');

    expect(btn.getAttribute('disabled')).toBeDefined();
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.querySelector('.animate-spin')).toBeDefined();
  });

  it('aplica estado deshabilitado accesible por defecto', () => {
    render(<Button disabled>No disponible</Button>);
    const btn = screen.getByRole('button');

    expect(btn.className).toContain('disabled:opacity-50');
    expect(btn.className).toContain('disabled:pointer-events-none');
  });
});
