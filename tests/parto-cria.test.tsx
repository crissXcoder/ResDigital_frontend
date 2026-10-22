import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HistorialReproductivo from '@/components/reproductivo/HistorialReproductivo';
import PartoForm from '@/components/reproductivo/forms/PartoForm';
import { getAnimales } from '@/lib/api/animales';
import { useRegistrarParto } from '@/lib/hooks/use-reproductivo';
import {
  partoAPayload,
  partoSchema,
  type PartoFormValues,
} from '@/lib/reproductivo/schemas';
import type { EventoHistorial } from '@/lib/reproductivo/tipos';

vi.mock('@/lib/hooks/use-reproductivo', () => ({
  useRegistrarParto: vi.fn(),
}));

vi.mock('@/lib/api/animales', () => ({
  getAnimales: vi.fn(),
}));

const CRIA_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const MADRE_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function valores(parcial: Partial<PartoFormValues> = {}): PartoFormValues {
  return {
    fechaEvento: '2026-09-10',
    eventoServicioId: '',
    modalidadCria: 'ninguna',
    criaAnimalId: '',
    areteInterno: '',
    sexo: '',
    pesoNacimientoKg: '',
    facilidadParto: 'Normal',
    observaciones: '',
    ...parcial,
  };
}

function conQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('partoSchema y payload de modalidades', () => {
  it('rechaza fecha de parto futura', () => {
    const res = partoSchema.safeParse(valores({ fechaEvento: '2099-01-01' }));
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toMatch(/futura/i);
    }
  });

  it('rechaza arete vacío en modalidad nueva', () => {
    const res = partoSchema.safeParse(
      valores({ modalidadCria: 'nueva', areteInterno: '   ' }),
    );
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(
        res.error.issues.some((issue) => issue.path[0] === 'areteInterno'),
      ).toBe(true);
    }
  });

  it('el payload de cría nueva incluye nuevaCria.areteInterno y no criaAnimalId', () => {
    const payload = partoAPayload(
      valores({ modalidadCria: 'nueva', areteInterno: 'CR-2026-001' }),
    );
    expect(payload.nuevaCria?.areteInterno).toBe('CR-2026-001');
    expect(payload.criaAnimalId).toBeUndefined();
  });

  it('el payload de cría existente envía criaAnimalId y no nuevaCria', () => {
    const payload = partoAPayload(
      valores({ modalidadCria: 'existente', criaAnimalId: CRIA_ID }),
    );
    expect(payload.criaAnimalId).toBe(CRIA_ID);
    expect(payload.nuevaCria).toBeUndefined();
  });

  it('aborto o sin alta omiten ambos campos de cría', () => {
    const payload = partoAPayload(
      valores({ facilidadParto: 'Aborto', modalidadCria: 'ninguna' }),
    );
    expect(payload.criaAnimalId).toBeUndefined();
    expect(payload.nuevaCria).toBeUndefined();
    expect(payload.facilidadParto).toBe('Aborto');
  });
});

describe('HistorialReproductivo — detalle de parto', () => {
  afterEach(cleanup);

  const evento = (detalle: EventoHistorial['detalle']): EventoHistorial =>
    ({
      eventoId: 'p1',
      tipo: 'PARTO',
      fechaEvento: '2026-09-10',
      fechaRegistro: '2026-09-10T12:00:00.000Z',
      usuarioId: 'u1',
      revertido: false,
      eventoCorrigeId: null,
      notas: null,
      detalle,
    }) as EventoHistorial;

  it('muestra arete o id de cría junto al desenlace', () => {
    render(
      <HistorialReproductivo
        eventos={[
          evento({
            eventoServicioId: null,
            criaAnimalId: CRIA_ID,
            criaAreteInterno: 'CR-001',
            facilidadParto: 'Normal',
            observaciones: null,
          }),
        ]}
      />,
    );
    expect(screen.getByText(/Normal · cría CR-001/)).toBeDefined();
  });

  it('un aborto no inventa cría', () => {
    render(
      <HistorialReproductivo
        eventos={[
          evento({
            eventoServicioId: null,
            criaAnimalId: null,
            criaAreteInterno: null,
            facilidadParto: 'Aborto',
            observaciones: null,
          }),
        ]}
      />,
    );
    expect(screen.getByText('Aborto')).toBeDefined();
    expect(screen.queryByText(/cría/)).toBeNull();
  });
});

describe('PartoForm — modalidades', () => {
  const mutateAsync = vi.fn();

  beforeEach(() => {
    mutateAsync.mockReset();
    vi.mocked(useRegistrarParto).mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useRegistrarParto>);
    vi.mocked(getAnimales).mockResolvedValue([
      {
        id: MADRE_ID,
        tenantId: 't1',
        areteInterno: '101',
        nombre: 'Mariposa',
        sexo: 'Hembra',
        razaId: 'r1',
        categoria: 'Vaca',
        activo: true,
      },
      {
        id: CRIA_ID,
        tenantId: 't1',
        areteInterno: 'CR-001',
        nombre: 'Lucero',
        sexo: 'Hembra',
        razaId: 'r1',
        categoria: 'Ternera',
        activo: true,
      },
    ]);
  });

  afterEach(cleanup);

  it('no pide un UUID crudo como único medio de vincular la cría', async () => {
    conQuery(
      <PartoForm animalId={MADRE_ID} onClose={vi.fn()} />,
    );
    expect(
      screen.queryByPlaceholderText('e1d67412-21d9-482f-870d-f55da282b810'),
    ).toBeNull();
    expect(screen.getByText('Cría nueva')).toBeDefined();
    expect(screen.getByText('Cría existente')).toBeDefined();
  });

  it('al elegir Aborto sugiere modalidad sin alta y omite cría al guardar', async () => {
    const onClose = vi.fn();
    mutateAsync.mockResolvedValue({});
    conQuery(
      <PartoForm animalId={MADRE_ID} onClose={onClose} />,
    );

    fireEvent.change(screen.getByLabelText(/fecha de parto/i), {
      target: { value: '2026-09-10' },
    });
    fireEvent.change(screen.getByLabelText(/desenlace/i), {
      target: { value: 'Aborto' },
    });
    expect(
      (screen.getByRole('radio', { name: /sin alta de cría/i }) as HTMLInputElement)
        .checked,
    ).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /registrar parto/i }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({
      fechaEvento: '2026-09-10',
      facilidadParto: 'Aborto',
    });
    expect(mutateAsync.mock.calls[0][0].criaAnimalId).toBeUndefined();
    expect(mutateAsync.mock.calls[0][0].nuevaCria).toBeUndefined();
  });
});
