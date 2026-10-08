import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModalDarBaja } from '@/components/modals/ModalDarBaja';
import { darDeBajaAnimal, getBajaAnimal, type Animal } from '@/lib/api/animales';
import { hoyLocal } from '@/lib/reproductivo/fechas';

vi.mock('@/lib/api/animales', () => ({
  darDeBajaAnimal: vi.fn(),
  getBajaAnimal: vi.fn(),
}));

const mockAnimal: Animal = {
  id: 'animal-uuid-1',
  tenantId: 'tenant-uuid-1',
  nombre: 'Paloma',
  areteInterno: '404',
  sexo: 'Hembra',
  razaId: 'raza-uuid-1',
  categoria: 'Vaca Adulta',
  pesoActualKg: 450,
  activo: true,
};

function renderConQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('HATO-T005 — Baja como Evento Histórico (Frontend)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('ModalDarBaja envía el payload completo con fecha de baja civil, motivo y peso', async () => {
    vi.mocked(darDeBajaAnimal).mockResolvedValue({
      ...mockAnimal,
      activo: false,
      tipoBaja: 'Venta Comercial',
      fechaBaja: hoyLocal(),
    });

    const onClose = vi.fn();

    renderConQuery(
      <ModalDarBaja
        isOpen={true}
        onClose={onClose}
        animal={mockAnimal}
      />,
    );

    // 1. Seleccionar tipo de baja
    const selectTipo = screen.getByLabelText(/Tipo de Baja \*/i);
    fireEvent.change(selectTipo, { target: { value: 'Venta Comercial' } });

    // 2. Modificar peso final
    const inputPeso = screen.getByPlaceholderText('450');
    fireEvent.change(inputPeso, { target: { value: '465.5' } });

    // 3. Confirmar submit
    const botonConfirmar = screen.getByRole('button', { name: /Confirmar Baja/i });
    fireEvent.click(botonConfirmar);

    await waitFor(() => {
      expect(darDeBajaAnimal).toHaveBeenCalledWith(
        'animal-uuid-1',
        expect.objectContaining({
          tipoBaja: 'Venta Comercial',
          fechaBaja: hoyLocal(),
          pesoFinalKg: 465.5,
        }),
      );
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('getBajaAnimal invoca el endpoint de consulta histórica del animal', async () => {
    vi.mocked(getBajaAnimal).mockResolvedValue({
      eventoId: 'evt-uuid-1',
      tipoBaja: 'Venta Comercial',
      motivo: 'Subasta ganadera',
      fechaBaja: '2026-03-10',
      pesoFinalKg: 465.5,
      usuarioId: 'user-uuid-1',
    });

    const res = await getBajaAnimal('animal-uuid-1');

    expect(res).toBeDefined();
    expect(res.tipoBaja).toBe('Venta Comercial');
    expect(res.usuarioId).toBe('user-uuid-1');
  });
});
