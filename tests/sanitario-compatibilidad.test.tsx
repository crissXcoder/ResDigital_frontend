import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModalTratamiento from '@/components/modals/ModalTratamiento';
import { medicamentoAplica, padecimientoAplica } from '@/lib/sanitario/compatibilidad';
import type { Medicamento, Padecimiento } from '@/lib/api/sanitary';

const medicamentos: Medicamento[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    nombreComercial: 'Cefalexina 200 Intramamaria',
    principioActivo: 'Cefalexina',
    viaAdministracion: 'Intramamaria',
    diasRetiroLecheDefault: 5,
    diasRetiroCarneDefault: 4,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    nombreComercial: 'Ivermectina 1%',
    principioActivo: 'Ivermectina',
    viaAdministracion: 'Subcutánea',
    diasRetiroLecheDefault: 28,
    diasRetiroCarneDefault: 35,
  },
];

const padecimientos: Padecimiento[] = [
  { id: '33333333-3333-4333-8333-333333333331', nombre: 'Mastitis clínica', categoria: 'Ubre', medicamentoSugeridoId: null },
  { id: '33333333-3333-4333-8333-333333333332', nombre: 'Metritis/Endometritis', categoria: 'Reproductivo', medicamentoSugeridoId: null },
  { id: '33333333-3333-4333-8333-333333333333', nombre: 'Parasitosis interna', categoria: 'Parasitario', medicamentoSugeridoId: null },
];

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ storage: {} }) }));
vi.mock('@/lib/api/client', () => ({
  fetchApi: vi.fn(async (endpoint: string) =>
    endpoint === '/catalogos/medicamentos' ? medicamentos : padecimientos,
  ),
}));

afterEach(cleanup);

describe('reglas de compatibilidad por sexo', () => {
  it('oculta a los machos los padecimientos de ubre y reproductivos', () => {
    expect(padecimientos.filter(p => padecimientoAplica(p, 'Macho')).map(p => p.nombre)).toEqual([
      'Parasitosis interna',
    ]);
  });

  it('detecta mastitis aunque la categoría venga vacía', () => {
    expect(padecimientoAplica({ nombre: 'Mastitis subclínica', categoria: null }, 'Macho')).toBe(false);
  });

  it('a las hembras les muestra todo el catálogo actual', () => {
    expect(padecimientos.every(p => padecimientoAplica(p, 'Hembra'))).toBe(true);
    expect(medicamentos.every(m => medicamentoAplica(m, 'Hembra'))).toBe(true);
  });

  it('oculta a los machos los medicamentos intramamarios', () => {
    expect(medicamentos.filter(m => medicamentoAplica(m, 'Macho')).map(m => m.nombreComercial)).toEqual([
      'Ivermectina 1%',
    ]);
  });
});

function abrirModal(animalSexo: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ModalTratamiento isOpen onClose={vi.fn()} onSubmit={vi.fn()} animalSexo={animalSexo} />
    </QueryClientProvider>,
  );
}

describe('ModalTratamiento filtra opciones según el sexo del animal', () => {
  it('para un toro no ofrece mastitis, metritis ni productos intramamarios', async () => {
    abrirModal('Macho');
    await screen.findByRole('option', { name: /Parasitosis interna/ });

    expect(screen.queryByRole('option', { name: /Mastitis/ })).toBeNull();
    expect(screen.queryByRole('option', { name: /Metritis/ })).toBeNull();
    expect(screen.queryByRole('option', { name: /Cefalexina/ })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Intramamaria' })).toBeNull();
  });

  it('para una vaca ofrece todo el catálogo', async () => {
    abrirModal('Hembra');
    await screen.findByRole('option', { name: /Parasitosis interna/ });

    expect(screen.getByRole('option', { name: /Mastitis clínica/ })).toBeDefined();
    expect(screen.getByRole('option', { name: /Metritis/ })).toBeDefined();
    expect(screen.getByRole('option', { name: /Cefalexina/ })).toBeDefined();
  });
});
