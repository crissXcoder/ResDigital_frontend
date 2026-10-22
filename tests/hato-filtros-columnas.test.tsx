import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HatoPage from '@/app/(dashboard)/hato/page';
import type { Animal, Raza } from '@/lib/api/animales';
import { getAnimales, getRazas } from '@/lib/api/animales';
import { getPotreros, type Potrero } from '@/lib/api/potreros';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api/animales', () => ({
  getAnimales: vi.fn(),
  getRazas: vi.fn(),
  updateAnimal: vi.fn(),
  darDeBajaAnimal: vi.fn(),
}));

vi.mock('@/lib/api/potreros', () => ({
  getPotreros: vi.fn(),
}));

vi.mock('@/components/auth/RequireRole', () => ({
  RequireRole: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockRazas: Raza[] = [
  { id: 'raza-1', nombre: 'Brahman', dias_gestacion: 285 },
  { id: 'raza-2', nombre: 'Holstein', dias_gestacion: 280 },
];

const mockPotreros: Potrero[] = [
  {
    id: 'potrero-1',
    tenantId: 'tenant-1',
    nombre: 'Potrero La Vega',
    areaHa: 10,
    tipoPasto: 'Brachiaria',
    capacidadRecomendadaUaHa: 2,
    diasDescansoRecomendados: 25,
    fechaUltimoIngreso: null,
    fuenteAgua: 'Río',
    notas: null,
    estadoManual: null,
    cargaActualUaHa: 1.5,
    uaTotal: 15,
    estadoCalculado: 'DISPONIBLE',
    estadoCarga: 'ÓPTIMO',
    estadoOperativo: 'DISPONIBLE',
    sobrecargado: false,
    animalesAsignadosCount: 2,
  },
  {
    id: 'potrero-2',
    tenantId: 'tenant-1',
    nombre: 'Potrero El Alto',
    areaHa: 8,
    tipoPasto: 'Estrella',
    capacidadRecomendadaUaHa: 2,
    diasDescansoRecomendados: 25,
    fechaUltimoIngreso: null,
    fuenteAgua: 'Quebrada',
    notas: null,
    estadoManual: null,
    cargaActualUaHa: 1,
    uaTotal: 8,
    estadoCalculado: 'DISPONIBLE',
    estadoCarga: 'ÓPTIMO',
    estadoOperativo: 'DISPONIBLE',
    sobrecargado: false,
    animalesAsignadosCount: 1,
  },
];

const mockAnimales: Animal[] = [
  {
    id: 'animal-1',
    tenantId: 'tenant-1',
    nombre: 'Esperanza',
    areteInterno: '101',
    numeroOficialDiio: 'CR-101101',
    sexo: 'Hembra',
    razaId: 'raza-1',
    raza: mockRazas[0],
    categoria: 'Vaca',
    activo: true,
    potreroId: 'potrero-1',
    potrero: { id: 'potrero-1', nombre: 'Potrero La Vega' },
    fechaNacimiento: '2020-01-15',
  },
  {
    id: 'animal-2',
    tenantId: 'tenant-1',
    nombre: 'Faraón',
    areteInterno: '102',
    sexo: 'Macho',
    razaId: 'raza-1',
    raza: mockRazas[0],
    categoria: 'Toro',
    activo: true,
    potreroId: 'potrero-2',
    potrero: { id: 'potrero-2', nombre: 'Potrero El Alto' },
    fechaNacimiento: '2021-05-10',
  },
  {
    id: 'animal-3',
    tenantId: 'tenant-1',
    nombre: 'Paloma',
    areteInterno: '103',
    sexo: 'Hembra',
    razaId: 'raza-2',
    raza: mockRazas[1],
    categoria: 'Novilla',
    activo: false,
    tipoBaja: 'Venta Comercial',
    potreroId: 'potrero-1',
    potrero: { id: 'potrero-1', nombre: 'Potrero La Vega' },
    fechaNacimiento: '2022-03-20',
  },
];

function renderConQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('OBS-005 — Tabla del hato: filtros y columnas configurables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getAnimales).mockResolvedValue(mockAnimales);
    vi.mocked(getRazas).mockResolvedValue(mockRazas);
    vi.mocked(getPotreros).mockResolvedValue(mockPotreros);
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza la tabla completa con contador de animales e indicadores', async () => {
    renderConQuery(<HatoPage />);

    await waitFor(() => {
      expect(screen.getByText('Esperanza')).toBeDefined();
      expect(screen.getByText('Faraón')).toBeDefined();
      expect(screen.getByText('Paloma')).toBeDefined();
    });

    const contador = screen.getByTestId('contador-animales');
    expect(contador.textContent).toContain('Mostrando 3 de 3 animales');
    expect(screen.getByText('DIIO: CR-101101')).toBeDefined();
  });

  it('combina filtros de sexo, categoría y potrero y actualiza el contador', async () => {
    renderConQuery(<HatoPage />);

    await waitFor(() => {
      expect(screen.getByText('Esperanza')).toBeDefined();
    });

    // Filtrar por sexo: Hembra
    const selectSexo = screen.getByLabelText(/filtrar por sexo/i);
    fireEvent.change(selectSexo, { target: { value: 'Hembra' } });

    // Faraón (Macho) debe desaparecer; Esperanza y Paloma permanecen
    expect(screen.getByText('Esperanza')).toBeDefined();
    expect(screen.getByText('Paloma')).toBeDefined();
    expect(screen.queryByText('Faraón')).toBeNull();
    expect(screen.getByTestId('contador-animales').textContent).toContain('Mostrando 2 de 3 animales');

    // Filtrar adicionalmente por potrero: Potrero La Vega
    const selectPotrero = screen.getByLabelText(/filtrar por potrero/i);
    fireEvent.change(selectPotrero, { target: { value: 'potrero-1' } });

    // Filtrar por categoría: Vaca
    const selectCategoria = screen.getByLabelText(/filtrar por categoría/i);
    fireEvent.change(selectCategoria, { target: { value: 'Vaca' } });

    // Solo Esperanza queda
    expect(screen.getByText('Esperanza')).toBeDefined();
    expect(screen.queryByText('Paloma')).toBeNull();
    expect(screen.getByTestId('contador-animales').textContent).toContain('Mostrando 1 de 3 animales');

    // Botón restablecer filtros debe estar presente
    const btnRestablecer = screen.getByRole('button', { name: /restablecer filtros/i });
    expect(btnRestablecer).toBeDefined();

    // Al hacer click en restablecer filtros, se limpian todos los filtros
    fireEvent.click(btnRestablecer);
    expect(screen.getByTestId('contador-animales').textContent).toContain('Mostrando 3 de 3 animales');
    expect(screen.getByText('Faraón')).toBeDefined();
    expect(screen.getByText('Paloma')).toBeDefined();
  });

  it('permite alternar entre "Vista básica" y "Vista completa" desde el selector de columnas', async () => {
    renderConQuery(<HatoPage />);

    await waitFor(() => {
      expect(screen.getByText('Esperanza')).toBeDefined();
    });

    // Inicialmente todas las columnas están visibles en el thead
    expect(screen.getByRole('columnheader', { name: 'Raza / híbrido' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Nacimiento / edad' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Estado reproductivo' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Potrero' })).toBeDefined();

    // Abrir menú de columnas
    const btnColumnas = screen.getByRole('button', { name: /configurar columnas visibles/i });
    fireEvent.click(btnColumnas);

    // Seleccionar "Vista básica"
    const btnBasica = screen.getByRole('button', { name: /vista básica/i });
    fireEvent.click(btnBasica);

    // Columnas opcionales ocultas del thead
    expect(screen.queryByRole('columnheader', { name: 'Raza / híbrido' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Nacimiento / edad' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Estado reproductivo' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: 'Potrero' })).toBeNull();

    // Columnas básicas protegidas (siempre visibles en el thead)
    expect(screen.getByRole('columnheader', { name: 'Foto' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Arete #' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Categoría' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Estado en hato' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeDefined();

    // Restaurar a "Vista completa"
    const btnCompleta = screen.getByRole('button', { name: /vista completa/i });
    fireEvent.click(btnCompleta);

    expect(screen.getByRole('columnheader', { name: 'Raza / híbrido' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Nacimiento / edad' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Estado reproductivo' })).toBeDefined();
    expect(screen.getByRole('columnheader', { name: 'Potrero' })).toBeDefined();
  });

  it('persiste la preferencia de columnas en localStorage sin almacenar datos privados del hato', async () => {
    renderConQuery(<HatoPage />);

    await waitFor(() => {
      expect(screen.getByText('Esperanza')).toBeDefined();
    });

    // Abrir menú y aplicar vista básica
    fireEvent.click(screen.getByRole('button', { name: /configurar columnas visibles/i }));
    fireEvent.click(screen.getByRole('button', { name: /vista básica/i }));

    const guardado = localStorage.getItem('resdigital_hato_columnas');
    expect(guardado).toBeTruthy();
    const config = JSON.parse(guardado!);
    expect(config).toEqual({
      raza: false,
      edad: false,
      estadoReproductivo: false,
      potrero: false,
    });

    // Invariante de seguridad: jamás debe contener aretes, nombres ni IDs de animales
    expect(guardado).not.toContain('Esperanza');
    expect(guardado).not.toContain('CR-101101');
    expect(guardado).not.toContain('tenant-1');
  });

  it('muestra estado vacío con botón de limpiar cuando ningún animal coincide', async () => {
    renderConQuery(<HatoPage />);

    await waitFor(() => {
      expect(screen.getByText('Esperanza')).toBeDefined();
    });

    const inputSearch = screen.getByPlaceholderText(/buscar por arete/i);
    fireEvent.change(inputSearch, { target: { value: 'Inexistente9999' } });

    expect(screen.getByText('No se encontraron animales con los filtros seleccionados.')).toBeDefined();
    const btnLimpiar = screen.getByRole('button', { name: /limpiar filtros/i });
    expect(btnLimpiar).toBeDefined();

    fireEvent.click(btnLimpiar);
    expect(screen.getByText('Esperanza')).toBeDefined();
  });
});
