import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HatoPage from '@/app/(dashboard)/hato/page';
import type { Animal, Raza } from '@/lib/api/animales';
import { getAnimales, getRazas } from '@/lib/api/animales';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api/animales', () => ({
  getAnimales: vi.fn(),
  getRazas: vi.fn(),
  updateAnimal: vi.fn(),
  darDeBajaAnimal: vi.fn(),
}));

vi.mock('@/components/auth/RequireRole', () => ({
  RequireRole: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockRazas: Raza[] = [
  { id: 'raza-1', nombre: 'Brahman', dias_gestacion: 285 },
  { id: 'raza-2', nombre: 'Holstein', dias_gestacion: 280 },
];

const mockAnimales: Animal[] = [
  {
    id: 'hembra-activa-1',
    tenantId: 'tenant-1',
    nombre: 'Esperanza',
    areteInterno: '101',
    sexo: 'Hembra',
    razaId: 'raza-1',
    categoria: 'Vaca',
    activo: true,
  },
  {
    id: 'macho-activo-1',
    tenantId: 'tenant-1',
    nombre: 'Faraón',
    areteInterno: '102',
    sexo: 'Macho',
    razaId: 'raza-1',
    categoria: 'Toro',
    activo: true,
  },
  {
    id: 'hembra-baja-1',
    tenantId: 'tenant-1',
    nombre: 'Paloma',
    areteInterno: '103',
    sexo: 'Hembra',
    razaId: 'raza-2',
    categoria: 'Novilla',
    activo: false,
    tipoBaja: 'Venta Comercial',
  },
  {
    id: 'macho-fallecido-1',
    tenantId: 'tenant-1',
    nombre: 'Rayo',
    areteInterno: '104',
    sexo: 'Macho',
    razaId: 'raza-1',
    categoria: 'Ternero',
    activo: false,
    tipoBaja: 'Fallecimiento',
  },
];

function renderConQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('HATO-T001 — Eliminación de estados falsos en Hato', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('no muestra hembras como "Preñada" por defecto, muestra "Sin Diagnóstico" y machos como "N/A"', async () => {
    vi.mocked(getAnimales).mockResolvedValue(mockAnimales);
    vi.mocked(getRazas).mockResolvedValue(mockRazas);

    renderConQuery(<HatoPage />);

    await waitFor(() => {
      expect(screen.getByText('Esperanza')).toBeDefined();
    });

    // Ningún animal debe mostrar "Preñada" por defecto
    expect(screen.queryByText(/Preñada/i)).toBeNull();

    // Las hembras deben mostrar "Sin Diagnóstico"
    const sinDiagBadges = screen.getAllByText(/Sin Diagnóstico/i);
    expect(sinDiagBadges.length).toBeGreaterThanOrEqual(1);

    // Los machos deben mostrar "N/A"
    const naLabels = screen.getAllByText('N/A');
    expect(naLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('no muestra animales activos como "Apto" sanitario, muestra "Activo"', async () => {
    vi.mocked(getAnimales).mockResolvedValue(mockAnimales);
    vi.mocked(getRazas).mockResolvedValue(mockRazas);

    renderConQuery(<HatoPage />);

    await waitFor(() => {
      expect(screen.getByText('Esperanza')).toBeDefined();
    });

    // No debe haber badge de "Apto" en el inventario de hato
    expect(screen.queryByText('Apto')).toBeNull();

    // Debe mostrar badges de "Activo" para animales activos
    const activos = screen.getAllByText('Activo');
    expect(activos.length).toBeGreaterThanOrEqual(2); // Al menos Esperanza y Faraón (y opción de select)

    // Debe mostrar los estados de baja reales en la tabla y opciones
    expect(screen.getAllByText('Venta Comercial').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Fallecimiento').length).toBeGreaterThanOrEqual(2);
  });

  it('muestra la columna "Estado Hato" en vez de "Estado Sanitario"', async () => {
    vi.mocked(getAnimales).mockResolvedValue(mockAnimales);
    vi.mocked(getRazas).mockResolvedValue(mockRazas);

    renderConQuery(<HatoPage />);

    await waitFor(() => {
      expect(screen.getByText('Esperanza')).toBeDefined();
    });

    expect(screen.getByText('Estado Hato')).toBeDefined();
    expect(screen.queryByText('Estado Sanitario')).toBeNull();
  });

  it('permite filtrar por estado en hato correctamente', async () => {
    vi.mocked(getAnimales).mockResolvedValue(mockAnimales);
    vi.mocked(getRazas).mockResolvedValue(mockRazas);

    renderConQuery(<HatoPage />);

    await waitFor(() => {
      expect(screen.getByText('Esperanza')).toBeDefined();
      expect(screen.getByText('Paloma')).toBeDefined();
    });

    const selectEstado = screen.getByLabelText(/Filtrar por estado en hato/i);

    // Filtramos por Activo
    fireEvent.change(selectEstado, { target: { value: 'Activo' } });

    expect(screen.getByText('Esperanza')).toBeDefined();
    expect(screen.getByText('Faraón')).toBeDefined();
    expect(screen.queryByText('Paloma')).toBeNull();
    expect(screen.queryByText('Rayo')).toBeNull();

    // Filtramos por Fallecimiento
    fireEvent.change(selectEstado, { target: { value: 'Fallecimiento' } });

    expect(screen.queryByText('Esperanza')).toBeNull();
    expect(screen.queryByText('Paloma')).toBeNull();
    expect(screen.getByText('Rayo')).toBeDefined();
  });
});
