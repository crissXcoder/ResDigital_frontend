import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModalEditarAnimal } from '@/components/modals/ModalEditarAnimal';
import * as animalesApi from '@/lib/api/animales';
import {
  CATEGORIAS_HEMBRA,
  CATEGORIAS_MACHO,
  CATEGORIAS_ANIMAL,
  esCategoriaValidaPorSexo,
  ESTADOS_HATO,
} from '@/lib/api/catalogos';

vi.mock('@/lib/api/animales', () => ({
  updateAnimal: vi.fn(),
  getAnimales: vi.fn().mockResolvedValue([]),
  getRazas: vi.fn().mockResolvedValue([
    { id: 'raza-1', nombre: 'Brahman', diasGestacion: 285 },
    { id: 'raza-2', nombre: 'Jersey', dias_gestacion: 279 },
    { id: 'raza-3', nombre: 'Otra', diasGestacion: 280 },
  ]),
}));

vi.mock('@/lib/api/potreros', () => ({
  getPotreros: vi.fn().mockResolvedValue([
    { id: 'potrero-1', nombre: 'Potrero Principal' },
  ]),
}));

describe('RF-003 + RF-007 — Catálogos y gestión de Hato', () => {
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

  afterEach(() => { cleanup(); queryClient.clear(); });

  const renderWithClient = async (ui: React.ReactElement) => {
    return act(async () => render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>,
    ));
  };

  const animalHembra: animalesApi.Animal = {
    id: 'hembra-1',
    tenantId: 'tenant-1',
    areteInterno: '101',
    nombre: 'Esperanza',
    numeroOficialDiio: 'CR-101010',
    sexo: 'Hembra',
    razaId: 'raza-1',
    categoria: 'Vaca',
    activo: true,
    pesoActualKg: 450,
  };

  const animalMacho: animalesApi.Animal = {
    id: 'macho-1',
    tenantId: 'tenant-1',
    areteInterno: '202',
    nombre: 'Campeón',
    numeroOficialDiio: 'CR-202020',
    sexo: 'Macho',
    razaId: 'raza-1',
    categoria: 'Toro',
    activo: true,
    pesoActualKg: 780,
  };

  it('RF-007: Las categorías están sincronizadas y validadas por sexo', () => {
    expect(CATEGORIAS_HEMBRA).toContain('Vaca');
    expect(CATEGORIAS_HEMBRA).toContain('Novilla');
    expect(CATEGORIAS_HEMBRA).toContain('Ternera');
    expect(CATEGORIAS_HEMBRA).not.toContain('Toro');

    expect(CATEGORIAS_MACHO).toContain('Toro');
    expect(CATEGORIAS_MACHO).toContain('Novillo');
    expect(CATEGORIAS_MACHO).toContain('Novillo mayor');
    expect(CATEGORIAS_MACHO).toContain('Ternero');
    expect(CATEGORIAS_MACHO).not.toContain('Vaca');

    expect(esCategoriaValidaPorSexo('Vaca', 'Hembra')).toBe(true);
    expect(esCategoriaValidaPorSexo('Toro', 'Hembra')).toBe(false);
    expect(esCategoriaValidaPorSexo('Toro', 'Macho')).toBe(true);
    expect(esCategoriaValidaPorSexo('Novilla', 'Macho')).toBe(false);
  });

  it('RF-007: ESTADOS_HATO incluye los estados e invariantes de baja', () => {
    expect(ESTADOS_HATO).toContain('Activo');
    expect(ESTADOS_HATO).toContain('Inactivo');
    expect(ESTADOS_HATO).toContain('Fallecimiento');
    expect(ESTADOS_HATO).toContain('Venta Comercial');
    expect(ESTADOS_HATO).toContain('Descarte');
    expect(ESTADOS_HATO).toContain('Traslado');
  });

  it('RF-007: ModalEditarAnimal muestra categorías según el sexo del animal (Hembra)', async () => {
    await renderWithClient(
      <ModalEditarAnimal
        isOpen={true}
        onClose={vi.fn()}
        animal={animalHembra}
      />,
    );

    const categoriaSelect = screen.getByLabelText(/categoría/i) as HTMLSelectElement;
    expect(categoriaSelect).toBeDefined();

    const options = Array.from(categoriaSelect.options).map((o) => o.value);
    expect(options).toContain('Vaca');
    expect(options).toContain('Novilla');
    expect(options).toContain('Ternera');
    expect(options).not.toContain('Toro');
    expect(options).not.toContain('Novillo');
  });

  it('RF-007: ModalEditarAnimal muestra categorías según el sexo del animal (Macho)', async () => {
    await renderWithClient(
      <ModalEditarAnimal
        isOpen={true}
        onClose={vi.fn()}
        animal={animalMacho}
      />,
    );

    const categoriaSelect = screen.getByLabelText(/categoría/i) as HTMLSelectElement;
    const options = Array.from(categoriaSelect.options).map((o) => o.value);
    expect(options).toContain('Toro');
    expect(options).toContain('Novillo');
    expect(options).toContain('Novillo mayor');
    expect(options).toContain('Ternero');
    expect(options).not.toContain('Vaca');
    expect(options).not.toContain('Novilla');
  });

  it('RF-007: Si se selecciona raza "Otra", muestra input obligatorio para especificarla', async () => {
    await renderWithClient(
      <ModalEditarAnimal
        isOpen={true}
        onClose={vi.fn()}
        animal={animalHembra}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Otra' })).toBeDefined();
    });

    const razaSelect = screen.getByLabelText(/raza principal/i);
    fireEvent.change(razaSelect, { target: { value: 'raza-3' } }); // raza-3 es 'Otra'

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ej. Girolando/i)).toBeDefined();
    });
  });

  it('RF-003: Error 409 (DIIO duplicado) muestra alerta inline accesible', async () => {
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);

    const errorMsg = 'Ya existe un animal registrado con el número oficial DIIO "CR-101010" en esta finca.';
    vi.mocked(animalesApi.updateAnimal).mockRejectedValueOnce(new Error(errorMsg));

    await renderWithClient(
      <ModalEditarAnimal
        isOpen={true}
        onClose={vi.fn()}
        animal={animalHembra}
      />,
    );

    const form = screen.getByRole('button', { name: /guardar cambios/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeDefined();
    });

    // El error se notifica solo con el banner inline, sin duplicarlo como alerta nativa.
    expect(alertSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('RF-003: DIIO vacío o con solo espacios se envía como null', async () => {
    const updateSpy = vi.mocked(animalesApi.updateAnimal).mockResolvedValueOnce({} as unknown as animalesApi.Animal);

    await renderWithClient(
      <ModalEditarAnimal
        isOpen={true}
        onClose={vi.fn()}
        animal={animalHembra}
      />,
    );

    const diioInput = screen.getByPlaceholderText('Ej. CR-12345678');
    fireEvent.change(diioInput, { target: { value: '     ' } });

    const form = screen.getByRole('button', { name: /guardar cambios/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'hembra-1',
        expect.objectContaining({
          numeroOficialDiio: null,
        }),
      );
    });
  });
});
