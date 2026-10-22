import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DescendenciaRegistrada from '@/app/(dashboard)/hato/components/DescendenciaRegistrada';
import { getDescendenciaAnimal } from '@/lib/api/animales';

vi.mock('@/lib/api/animales', () => ({ getDescendenciaAnimal: vi.fn() }));

function renderComponente() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DescendenciaRegistrada animalId="animal-padre" />
    </QueryClientProvider>,
  );
}

describe('DescendenciaRegistrada (RF-005)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('muestra las crías reales y conserva el acceso a sus expedientes', async () => {
    vi.mocked(getDescendenciaAnimal).mockResolvedValue([{
      id: 'cria-1',
      areteInterno: 'C-10',
      nombre: 'Luna',
      sexo: 'Hembra',
      categoria: 'Ternera',
      fechaNacimiento: '2026-01-10',
      activo: false,
    }]);

    renderComponente();

    expect(await screen.findByText('#C-10 Luna')).toBeDefined();
    expect(screen.getByText('Registro histórico')).toBeDefined();
    expect(screen.getByRole('link', { name: /#C-10 Luna/ }).getAttribute('href')).toBe('/hato/cria-1');
    expect(screen.getByText('1')).toBeDefined();
  });

  it('muestra un estado de carga y distingue un historial vacío', async () => {
    let resolver!: (value: []) => void;
    vi.mocked(getDescendenciaAnimal).mockReturnValue(new Promise((resolve) => { resolver = resolve; }));

    renderComponente();
    expect(screen.getByRole('status').textContent).toContain('Cargando');

    resolver([]);
    expect(await screen.findByText('No se registran crías para este animal.')).toBeDefined();
    expect(screen.getByText('0')).toBeDefined();
  });

  it('muestra error visible si no se puede consultar la descendencia', async () => {
    vi.mocked(getDescendenciaAnimal).mockRejectedValue(new Error('fallo de red'));

    renderComponente();

    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.getByText('!')).toBeDefined();
  });
});
