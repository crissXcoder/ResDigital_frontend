import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ModalEditarOrigen from '@/components/modals/ModalEditarOrigen';
import type { Animal } from '@/lib/api/animales';
import { getAnimales } from '@/lib/api/animales';

vi.mock('@/lib/api/animales', () => ({
  getAnimales: vi.fn(),
  updateAnimal: vi.fn(),
}));

const animalToro: Animal = {
  id: 'toro-1',
  tenantId: 'finca-1',
  nombre: 'Bravo',
  areteInterno: '101',
  sexo: 'Macho',
  razaId: 'r1',
  categoria: 'Toro',
  activo: true,
  origen: 'Finca',
  padreId: undefined,
  madreId: undefined,
};

const animalVaca: Animal = {
  id: 'vaca-1',
  tenantId: 'finca-1',
  nombre: 'Margarita',
  areteInterno: '102',
  sexo: 'Hembra',
  razaId: 'r1',
  categoria: 'Vaca',
  activo: true,
  origen: 'Finca',
  padreId: undefined,
  madreId: undefined,
};

const animalHijoMacho: Animal = {
  id: 'hijo-1',
  tenantId: 'finca-1',
  nombre: 'Rayito',
  areteInterno: '103',
  sexo: 'Macho',
  razaId: 'r1',
  categoria: 'Ternero',
  activo: true,
  origen: 'Finca',
  padreId: undefined,
  madreId: undefined,
};

const listaAnimalesFinca: Animal[] = [animalToro, animalVaca, animalHijoMacho];

function renderConQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}

describe('Validaciones Genealógicas en ModalEditarOrigen (HATO-T003)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('excluye al propio animal de los selectores de padre y madre', async () => {
    vi.mocked(getAnimales).mockResolvedValue(listaAnimalesFinca);

    // Editamos a animalToro (macho). No debe aparecer en el selector de padre ni madre.
    renderConQuery(
      <ModalEditarOrigen
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        animal={animalToro}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('#103 Rayito')).toBeDefined();
    });

    const selectPadre = screen.getByLabelText(/Toro Padre/i) as HTMLSelectElement;
    const selectMadre = screen.getByLabelText(/Vaca Madre/i) as HTMLSelectElement;

    const opcionesPadre = Array.from(selectPadre.options).map((o) => o.textContent);
    const opcionesMadre = Array.from(selectMadre.options).map((o) => o.textContent);

    // En Toro Padre sólo deben estar machos excepto animalToro: sólo debe estar hijo-1
    expect(opcionesPadre).toContain('-- Seleccionar Toro Padre --');
    expect(opcionesPadre).not.toContain('#101 Bravo'); // Auto-exclusión
    expect(opcionesPadre).toContain('#103 Rayito');

    // En Vaca Madre sólo deben estar hembras excepto animalToro (que es macho de todas formas):
    expect(opcionesMadre).toContain('#102 Margarita');
    expect(opcionesMadre).not.toContain('#101 Bravo');
    expect(opcionesMadre).not.toContain('#103 Rayito');
  });

  it('excluye a la propia vaca de los selectores al editar una hembra', async () => {
    vi.mocked(getAnimales).mockResolvedValue(listaAnimalesFinca);

    // Editamos a animalVaca (hembra). No debe aparecer en el selector de vaca madre.
    renderConQuery(
      <ModalEditarOrigen
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        animal={animalVaca}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('#101 Bravo')).toBeDefined();
    });

    const selectMadre = screen.getByLabelText(/Vaca Madre/i) as HTMLSelectElement;
    const opcionesMadre = Array.from(selectMadre.options).map((o) => o.textContent);

    expect(opcionesMadre).not.toContain('#102 Margarita'); // Auto-exclusión de la madre
  });

  it('previene auto-parentesco defensivamente si el estado inicial tuviera el mismo id', async () => {
    vi.mocked(getAnimales).mockResolvedValue(listaAnimalesFinca);
    const onSubmitMock = vi.fn();

    // Animal que hipotéticamente tuviera padreId apuntando a sí mismo
    const animalCorrupto: Animal = {
      ...animalToro,
      padreId: animalToro.id,
    };

    renderConQuery(
      <ModalEditarOrigen
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmitMock}
        animal={animalCorrupto}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Toro Padre/i)).toBeDefined();
    });

    const submitBtn = screen.getByRole('button', { name: /Guardar Genealogía/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Un animal no puede ser su propio padre.')).toBeDefined();
    });

    expect(onSubmitMock).not.toHaveBeenCalled();
  });

  it('muestra error y no cierra el modal si la API rechaza por ciclo genealógico', async () => {
    vi.mocked(getAnimales).mockResolvedValue(listaAnimalesFinca);

    const onSubmitMock = vi.fn().mockRejectedValue(
      new Error('Ciclo genealógico detectado: el progenitor seleccionado es descendiente del animal.')
    );
    const onCloseMock = vi.fn();

    renderConQuery(
      <ModalEditarOrigen
        isOpen={true}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        animal={animalToro}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('-- Seleccionar Toro Padre --')).toBeDefined();
    });

    const submitBtn = screen.getByRole('button', { name: /Guardar Genealogía/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Ciclo genealógico detectado/i)).toBeDefined();
    });

    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('deshabilita el botón de guardar y muestra spinner durante el guardado asíncrono', async () => {
    vi.mocked(getAnimales).mockResolvedValue(listaAnimalesFinca);

    let resolvePromise: (value?: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    const onSubmitMock = vi.fn().mockReturnValue(promise);
    const onCloseMock = vi.fn();

    renderConQuery(
      <ModalEditarOrigen
        isOpen={true}
        onClose={onCloseMock}
        onSubmit={onSubmitMock}
        animal={animalToro}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('-- Seleccionar Toro Padre --')).toBeDefined();
    });

    const submitBtn = screen.getByRole('button', { name: /Guardar Genealogía/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(false);

    fireEvent.click(submitBtn);

    expect(submitBtn.disabled).toBe(true);
    expect(onSubmitMock).toHaveBeenCalledTimes(1);

    resolvePromise!();
    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});
