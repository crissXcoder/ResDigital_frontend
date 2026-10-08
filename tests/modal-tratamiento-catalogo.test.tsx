import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModalTratamiento from '@/components/modals/ModalTratamiento';
import type { Medicamento, Padecimiento } from '@/lib/api/sanitary';

const catalogo = vi.hoisted(() => ({
  medicamentos: [] as Medicamento[],
  padecimientos: [] as Padecimiento[],
}));

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ storage: {} }) }));
vi.mock('@/lib/api/client', () => ({
  fetchApi: vi.fn(async (endpoint: string) =>
    endpoint === '/catalogos/medicamentos' ? catalogo.medicamentos : catalogo.padecimientos,
  ),
}));

const MED_REAL_ID = '22222222-2222-4222-8222-222222222222';
const PAD_REAL_ID = '33333333-3333-4333-8333-333333333333';

function medicamento(id: string, referencia?: boolean): Medicamento {
  return {
    id,
    nombreComercial: 'Ivermectina 1%',
    principioActivo: 'Ivermectina',
    viaAdministracion: 'Subcutánea',
    diasRetiroLecheDefault: 28,
    diasRetiroCarneDefault: 35,
    ...(referencia ? { referencia } : {}),
  };
}

function padecimiento(id: string, referencia?: boolean): Padecimiento {
  return {
    id,
    nombre: 'Parasitosis interna',
    categoria: 'Parasitario',
    medicamentoSugeridoId: null,
    ...(referencia ? { referencia } : {}),
  };
}

async function registrar() {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ModalTratamiento isOpen onClose={vi.fn()} onSubmit={onSubmit} />
    </QueryClientProvider>,
  );

  const [selectDiagnostico, selectFarmaco] = screen.getAllByRole('combobox');
  await screen.findAllByRole('option', { name: /Ivermectina 1%/ });
  fireEvent.change(selectDiagnostico, { target: { value: catalogo.padecimientos[0].id } });
  fireEvent.change(selectFarmaco, { target: { value: catalogo.medicamentos[0].id } });
  fireEvent.change(screen.getByPlaceholderText('ej. 20 ml, 1 jeringa'), { target: { value: '5 ml' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar Tratamiento' }));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  return onSubmit.mock.calls[0][0];
}

afterEach(cleanup);

describe('ModalTratamiento y el catálogo sanitario', () => {
  it('con catálogo persistido envía los ids', async () => {
    catalogo.medicamentos = [medicamento(MED_REAL_ID)];
    catalogo.padecimientos = [padecimiento(PAD_REAL_ID)];

    const datos = await registrar();

    expect(datos).toMatchObject({ medicamentoId: MED_REAL_ID, padecimientoId: PAD_REAL_ID });
    expect(datos.farmaco).toBeUndefined();
    expect(datos.diagnostico).toBeUndefined();
  });

  it('con catálogo de referencia envía los nombres y no los ids inventados', async () => {
    catalogo.medicamentos = [medicamento('00000000-0000-0000-0000-000000000003', true)];
    catalogo.padecimientos = [padecimiento('00000000-0000-0000-0000-000000000103', true)];

    const datos = await registrar();

    expect(datos.medicamentoId).toBeUndefined();
    expect(datos.padecimientoId).toBeUndefined();
    expect(datos).toMatchObject({
      farmaco: 'Ivermectina 1%',
      diagnostico: 'Parasitosis interna',
      diasRetiroLeche: 28,
      diasRetiroCarne: 35,
    });
    expect(screen.queryByText(/catálogo de referencia/)).not.toBeNull();
  });
});
