import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PotreroDetailPage from '@/app/(dashboard)/potreros/[id]/page';
import * as potrerosApi from '@/lib/api/potreros';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'potrero-ua-123' }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/api/potreros', async () => {
  const actual = await vi.importActual<typeof potrerosApi>('@/lib/api/potreros');
  return {
    ...actual,
    getPotrero: vi.fn(),
    getMovimientosPotrero: vi.fn().mockResolvedValue([]),
    asignarAnimalesPotrero: vi.fn(),
  };
});

describe('POT-T003 — Mejorar Cálculo UA Configurable (Frontend)', () => {
  let queryClient: QueryClient;

  const mockPotreroConUa: potrerosApi.Potrero = {
    id: 'potrero-ua-123',
    tenantId: 'tenant-test',
    nombre: 'Potrero Zootécnico El Ceibo',
    areaHa: 10,
    tipoPasto: 'Brachiaria Brizantha',
    capacidadRecomendadaUaHa: 2.0,
    diasDescansoRecomendados: 30,
    fechaUltimoIngreso: '2026-10-01',
    fuenteAgua: 'Bebedero automático',
    notas: 'Pastoreo rotacional intensivo',
    estadoManual: null,
    cargaActualUaHa: 0.25,
    uaTotal: 2.55,
    estadoCalculado: 'DISPONIBLE',
    estadoCarga: 'ÓPTIMO',
    estadoOperativo: 'OCUPADO',
    sobrecargado: false,
    animalesAsignadosCount: 2,
    desgloseUa: {
      porPeso: 1.3,
      porCategoria: 1.25,
      total: 2.55,
    },
    animales: [
      {
        id: 'animal-1',
        tenantId: 'tenant-test',
        areteInterno: '101',
        nombre: 'El Sultán',
        sexo: 'Macho',
        categoria: 'Toro',
        activo: true,
        razaId: 'raza-1',
        raza: { id: 'raza-1', nombre: 'Brahman', dias_gestacion: 285 },
        pesoActualKg: 585,
        uaCalculada: 1.3,
        metodoCalculoUa: 'PESO',
      },
      {
        id: 'animal-2',
        tenantId: 'tenant-test',
        areteInterno: '102',
        nombre: 'Hércules',
        sexo: 'Macho',
        categoria: 'Toro',
        activo: true,
        razaId: 'raza-1',
        raza: { id: 'raza-1', nombre: 'Brahman', dias_gestacion: 285 },
        pesoActualKg: null,
        uaCalculada: 1.25,
        metodoCalculoUa: 'CATEGORIA',
      },
    ],
  };

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
      </QueryClientProvider>,
    );
  };

  it('diferencia nítidamente entre conteo de cabezas físicas y carga en Unidades Animales (UA)', async () => {
    vi.mocked(potrerosApi.getPotrero).mockResolvedValue(mockPotreroConUa);

    renderWithClient(<PotreroDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Potrero Zootécnico El Ceibo')).toBeDefined();
    });

    // Muestra cabezas físicas junto con el valor en UA
    expect(screen.getByText(/cabezas \(2\.55 UA\)/i)).toBeDefined();
    // Muestra carga actual en UA/ha
    expect(screen.getByText('0.25 UA/ha')).toBeDefined();
  });

  it('desglosa la UA individual de cada animal según método (peso vs categoría)', async () => {
    vi.mocked(potrerosApi.getPotrero).mockResolvedValue(mockPotreroConUa);

    renderWithClient(<PotreroDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/#101 El Sultán/i)).toBeDefined();
      expect(screen.getByText(/#102 Hércules/i)).toBeDefined();
    });

    // Animal con peso: 1.30 UA (peso)
    expect(screen.getByText('1.30 UA (peso)')).toBeDefined();
    // Animal sin peso: 1.25 UA (cat)
    expect(screen.getByText('1.25 UA (cat)')).toBeDefined();
  });
});
