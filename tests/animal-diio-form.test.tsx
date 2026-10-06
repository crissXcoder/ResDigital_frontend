import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModalEditarAnimal } from '@/components/modals/ModalEditarAnimal';
import * as animalesApi from '@/lib/api/animales';

vi.mock('@/lib/api/animales', () => ({
  updateAnimal: vi.fn(),
  getAnimales: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/api/catalogos', () => ({
  getCatalogosRazas: vi.fn().mockResolvedValue([
    { id: 'raza-1', nombre: 'Brahman' },
    { id: 'raza-2', nombre: 'Otra' },
  ]),
}));

vi.mock('@/lib/api/potreros', () => ({
  getPotreros: vi.fn().mockResolvedValue([]),
}));

describe('Formularios de Identidad y Unicidad DIIO (HATO-T002)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  const animalMock = {
    id: 'animal-123',
    areteInterno: '101',
    nombre: 'Esperanza',
    numeroOficialDiio: 'CR-998877',
    sexo: 'Hembra',
    razaId: 'raza-1',
    categoria: 'Vaca',
    pesoActualKg: 450,
    potreroId: '',
  };

  it('ModalEditarAnimal carga el campo de DIIO con el valor existente del animal', async () => {
    renderWithClient(
      <ModalEditarAnimal
        isOpen={true}
        onClose={vi.fn()}
        animal={animalMock}
      />
    );

    const diioInput = screen.getByPlaceholderText('Ej. CR-12345678') as HTMLInputElement;
    expect(diioInput).toBeDefined();
    expect(diioInput.value).toBe('CR-998877');
  });

  it('ModalEditarAnimal aplica trim al enviar DIIO modificado', async () => {
    const updateSpy = vi.mocked(animalesApi.updateAnimal).mockResolvedValueOnce({} as unknown as animalesApi.Animal);
    const onCloseMock = vi.fn();

    renderWithClient(
      <ModalEditarAnimal
        isOpen={true}
        onClose={onCloseMock}
        animal={animalMock}
      />
    );

    const diioInput = screen.getByPlaceholderText('Ej. CR-12345678');
    fireEvent.change(diioInput, { target: { value: '   CR-554433   ' } });

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'animal-123',
        expect.objectContaining({
          numeroOficialDiio: 'CR-554433',
        })
      );
    });
  });

  it('ModalEditarAnimal envía null si el usuario borra el DIIO dejándolo en blanco', async () => {
    const updateSpy = vi.mocked(animalesApi.updateAnimal).mockResolvedValueOnce({} as unknown as animalesApi.Animal);

    renderWithClient(
      <ModalEditarAnimal
        isOpen={true}
        onClose={vi.fn()}
        animal={animalMock}
      />
    );

    const diioInput = screen.getByPlaceholderText('Ej. CR-12345678');
    fireEvent.change(diioInput, { target: { value: '   ' } });

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'animal-123',
        expect.objectContaining({
          numeroOficialDiio: null,
        })
      );
    });
  });

  it('en caso de error 409 por DIIO duplicado, muestra alerta visible en pantalla y no cierra el modal', async () => {
    const errorMsg = 'Ya existe un animal registrado con el número oficial DIIO "CR-998877" en esta finca.';
    vi.mocked(animalesApi.updateAnimal).mockRejectedValueOnce(new Error(errorMsg));
    const onCloseMock = vi.fn();

    renderWithClient(
      <ModalEditarAnimal
        isOpen={true}
        onClose={onCloseMock}
        animal={animalMock}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeDefined();
    });

    // El modal no debe haberse cerrado
    expect(onCloseMock).not.toHaveBeenCalled();
  });
});
