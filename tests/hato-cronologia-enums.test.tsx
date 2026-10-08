import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModalEditarOrigen from '@/components/modals/ModalEditarOrigen';
import { ModalDarBaja } from '@/components/modals/ModalDarBaja';
import { ModalEditarAnimal } from '@/components/modals/ModalEditarAnimal';
import type { Animal } from '@/lib/api/animales';
import { hoyLocal } from '@/lib/reproductivo/fechas';

vi.mock('@/lib/api/animales', () => ({
  getAnimales: vi.fn().mockResolvedValue([]),
  getRazas: vi.fn().mockResolvedValue([]),
  updateAnimal: vi.fn(),
  darDeBajaAnimal: vi.fn(),
}));

vi.mock('@/lib/api/potreros', () => ({
  getPotreros: vi.fn().mockResolvedValue([]),
}));

const mockAnimal: Animal = {
  id: 'animal-1',
  tenantId: 'tenant-1',
  nombre: 'Paloma',
  areteInterno: '105',
  sexo: 'Hembra',
  razaId: 'raza-1',
  categoria: 'Vaca',
  fechaNacimiento: '2024-06-01',
  activo: true,
  origen: 'Externa',
  fechaCompra: '2024-07-01',
  valorCompraCrc: 500000,
  pesoActualKg: 420,
};

function renderConQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('HATO-T004 — Controles de Enums, Cronología y Números no negativos en Frontend', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('ModalEditarOrigen', () => {
    it('el input de fecha de compra contiene max=hoyLocal y min=fechaNacimiento', () => {
      renderConQuery(
        <ModalEditarOrigen
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
          animal={mockAnimal}
        />,
      );

      const inputFechaCompra = screen.getByLabelText(/Fecha de Compra/i) as HTMLInputElement;
      expect(inputFechaCompra).toBeDefined();
      expect(inputFechaCompra.getAttribute('max')).toBe(hoyLocal());
      expect(inputFechaCompra.getAttribute('min')).toBe('2024-06-01');

      const inputValor = screen.getByLabelText(/Valor de Compra/i) as HTMLInputElement;
      expect(inputValor.getAttribute('min')).toBe('0');
    });

    it('bloquea fecha de compra futura y muestra mensaje de error sin enviar el formulario', async () => {
      const mockSubmit = vi.fn();
      renderConQuery(
        <ModalEditarOrigen
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={mockSubmit}
          animal={mockAnimal}
        />,
      );

      const inputFecha = screen.getByLabelText(/Fecha de Compra/i);
      fireEvent.change(inputFecha, { target: { value: '2099-01-01' } });

      const form = inputFecha.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/La fecha de compra no puede ser futura/i)).toBeDefined();
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('bloquea fecha de compra anterior a la fecha de nacimiento y muestra mensaje de error', async () => {
      const mockSubmit = vi.fn();
      renderConQuery(
        <ModalEditarOrigen
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={mockSubmit}
          animal={mockAnimal}
        />,
      );

      // Nacimiento es 2024-06-01, intentamos poner compra en 2024-01-01
      const inputFecha = screen.getByLabelText(/Fecha de Compra/i);
      fireEvent.change(inputFecha, { target: { value: '2024-01-01' } });

      const form = inputFecha.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(
          screen.getByText(/La fecha de compra no puede ser anterior a la fecha de nacimiento/i),
        ).toBeDefined();
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('ModalDarBaja', () => {
    it('el input de peso final tiene atributo min="0"', () => {
      renderConQuery(
        <ModalDarBaja
          isOpen={true}
          onClose={vi.fn()}
          animal={mockAnimal}
        />,
      );

      const inputPesoFinal = screen.getByPlaceholderText(String(mockAnimal.pesoActualKg)) as HTMLInputElement;
      expect(inputPesoFinal).toBeDefined();
      expect(inputPesoFinal.getAttribute('min')).toBe('0');
    });
  });

  describe('ModalEditarAnimal', () => {
    it('el input de peso tiene atributo min="0"', () => {
      renderConQuery(
        <ModalEditarAnimal
          isOpen={true}
          onClose={vi.fn()}
          animal={mockAnimal}
        />,
      );

      const inputPeso = screen.getByPlaceholderText('485') as HTMLInputElement;
      expect(inputPeso).toBeDefined();
      expect(inputPeso.getAttribute('min')).toBe('0');
    });
  });
});
