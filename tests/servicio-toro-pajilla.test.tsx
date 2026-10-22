import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ServicioForm from '@/components/reproductivo/forms/ServicioForm';
import { getAnimales } from '@/lib/api/animales';
import { useRegistrarServicio } from '@/lib/hooks/use-reproductivo';
import {
  esMachoReproductor,
  etiquetaToro,
} from '@/lib/reproductivo/machos-reproductores';

vi.mock('@/lib/hooks/use-reproductivo', () => ({
  useRegistrarServicio: vi.fn(),
}));

vi.mock('@/lib/api/animales', () => ({
  getAnimales: vi.fn(),
}));

const MADRE_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function conQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('esMachoReproductor', () => {
  it('acepta toro o semental activo y rechaza ternero o inactivo', () => {
    expect(
      esMachoReproductor({
        sexo: 'Macho',
        activo: true,
        categoria: 'Semental/Reproductor',
      }),
    ).toBe(true);
    expect(
      esMachoReproductor({ sexo: 'Macho', activo: true, categoria: 'Toro' }),
    ).toBe(true);
    expect(
      esMachoReproductor({ sexo: 'Macho', activo: true, categoria: 'Ternero' }),
    ).toBe(false);
    expect(
      esMachoReproductor({
        sexo: 'Macho',
        activo: false,
        categoria: 'Toro',
      }),
    ).toBe(false);
    expect(
      esMachoReproductor({
        sexo: 'Hembra',
        activo: true,
        categoria: 'Toro',
      }),
    ).toBe(false);
  });

  it('etiqueta el arete y el nombre', () => {
    expect(etiquetaToro({ areteInterno: '103', nombre: 'Toro Max' })).toBe(
      '103 · Toro Max',
    );
  });
});

describe('ServicioForm — pajilla o toro según tipo', () => {
  const mutateAsync = vi.fn();

  beforeEach(() => {
    mutateAsync.mockReset();
    vi.mocked(useRegistrarServicio).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useRegistrarServicio>);
    vi.mocked(getAnimales).mockResolvedValue([
      {
        id: 'ac941741-a2d8-4f72-888d-78a03d1ced22',
        tenantId: 't',
        nombre: 'Toro Max',
        areteInterno: '103',
        sexo: 'Macho',
        razaId: 'r',
        categoria: 'Semental/Reproductor',
        activo: true,
      },
      {
        id: '8b34150d-0169-45a1-bb68-605f870dfb8a',
        tenantId: 't',
        nombre: 'Ernesto',
        areteInterno: '698',
        sexo: 'Macho',
        razaId: 'r',
        categoria: 'Torete',
        activo: true,
      },
    ]);
  });

  afterEach(cleanup);

  it('en IA pide solo el ID de pajilla', () => {
    conQuery(<ServicioForm animalId={MADRE_ID} onClose={() => undefined} />);
    expect(screen.getByLabelText('ID pajilla *')).toBeDefined();
    expect(screen.queryByLabelText('Toro *')).toBeNull();
  });

  it('en monta natural lista solo machos reproductores con arete', async () => {
    conQuery(<ServicioForm animalId={MADRE_ID} onClose={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Tipo de servicio'), {
      target: { value: 'Monta Natural' },
    });
    expect(await screen.findByLabelText('Toro *')).toBeDefined();
    expect(screen.queryByLabelText('ID pajilla *')).toBeNull();
    await waitFor(() => {
      expect(screen.getByRole('option', { name: '103 · Toro Max' })).toBeDefined();
    });
    expect(screen.queryByRole('option', { name: /Ernesto/ })).toBeNull();
  });
});
