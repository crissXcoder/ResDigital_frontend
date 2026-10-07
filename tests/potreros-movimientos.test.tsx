import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PotreroDetailPage from '@/app/(dashboard)/potreros/[id]/page';
import * as potrerosApi from '@/lib/api/potreros';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'potrero-123' }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/api/potreros', async () => {
  const actual = await vi.importActual<typeof potrerosApi>('@/lib/api/potreros');
  return {
    ...actual,
    getPotrero: vi.fn(),
    getMovimientosPotrero: vi.fn(),
    asignarAnimalesPotrero: vi.fn(),
  };
});

describe('POT-T001 — Historial de Movimientos de Potrero', () => {
  let queryClient: QueryClient;

  const mockPotrero: potrerosApi.Potrero = {
    id: 'potrero-123',
    tenantId: 'tenant-test',
    nombre: 'Potrero Los Laureles',
    areaHa: 15,
    tipoPasto: 'Estrella Africana',
    capacidadRecomendadaUaHa: 2.5,
    diasDescansoRecomendados: 35,
    fechaUltimoIngreso: '2026-10-06',
    fuenteAgua: 'Quebrada natural',
    notas: 'Buen drenaje',
    estadoManual: null,
    cargaActualUaHa: 1.2,
    uaTotal: 18,
    estadoCalculado: 'DISPONIBLE',
    estadoCarga: 'ÓPTIMO',
    estadoOperativo: 'OCUPADO',
    sobrecargado: false,
    animalesAsignadosCount: 2,
    animales: [],
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

  it('renderiza la sección de historial de movimientos con entradas y salidas', async () => {
    vi.mocked(potrerosApi.getPotrero).mockResolvedValue(mockPotrero);
    vi.mocked(potrerosApi.getMovimientosPotrero).mockResolvedValue([
      {
        id: 'ev-1',
        tipo: 'INGRESO',
        fechaEvento: '2026-10-06',
        fechaRegistro: '2026-10-06T15:00:00Z',
        motivo: 'Rotación por descanso',
        animal: { id: 'a-1', areteInterno: '101', nombre: 'Manuela' },
        potreroOrigen: { id: 'p-prev', nombre: 'Potrero El Río' },
        potreroDestino: { id: 'potrero-123', nombre: 'Potrero Los Laureles' },
      },
      {
        id: 'ev-2',
        tipo: 'SALIDA',
        fechaEvento: '2026-09-20',
        fechaRegistro: '2026-09-20T10:00:00Z',
        motivo: 'Traslado a cuarentena',
        animal: { id: 'a-2', areteInterno: '102', nombre: 'Parda' },
        potreroOrigen: { id: 'potrero-123', nombre: 'Potrero Los Laureles' },
        potreroDestino: { id: 'p-cuarentena', nombre: 'Potrero Enfermería' },
      },
    ]);

    renderWithClient(<PotreroDetailPage />);

    // Verificar que carga el título y la tabla de movimientos
    expect(await screen.findByText('Historial de Movimientos')).toBeDefined();
    expect(screen.getByText('2 movimiento(s)')).toBeDefined();

    // Movimiento 1 (Ingreso)
    expect(screen.getByText('#101')).toBeDefined();
    expect(screen.getByText('Manuela')).toBeDefined();
    expect(screen.getByText('INGRESO')).toBeDefined();
    expect(screen.getByText('Potrero El Río')).toBeDefined();
    expect(screen.getByText('Rotación por descanso')).toBeDefined();

    // Movimiento 2 (Salida)
    expect(screen.getByText('#102')).toBeDefined();
    expect(screen.getByText('Parda')).toBeDefined();
    expect(screen.getByText('SALIDA')).toBeDefined();
    expect(screen.getByText('Potrero Enfermería')).toBeDefined();
    expect(screen.getByText('Traslado a cuarentena')).toBeDefined();
  });

  it('muestra estado vacío amigable cuando el potrero no tiene movimientos históricos', async () => {
    vi.mocked(potrerosApi.getPotrero).mockResolvedValue(mockPotrero);
    vi.mocked(potrerosApi.getMovimientosPotrero).mockResolvedValue([]);

    renderWithClient(<PotreroDetailPage />);

    expect(await screen.findByText('Historial de Movimientos')).toBeDefined();
    expect(
      screen.getByText('No hay movimientos históricos registrados para este potrero.'),
    ).toBeDefined();
    expect(screen.getByText('0 movimiento(s)')).toBeDefined();
  });
});

describe('POT-T002 — Separación de Estado Operativo y Carga Derivada', () => {
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
      </QueryClientProvider>,
    );
  };

  it('muestra banner de alerta de sobrecarga crítica y desglose operativo y de carga cuando sobrecargado es true', async () => {
    const potreroSobrecargado: potrerosApi.Potrero = {
      id: 'potrero-123',
      tenantId: 'tenant-test',
      nombre: 'Potrero Sobrecargado',
      areaHa: 2,
      tipoPasto: 'Brizantha',
      capacidadRecomendadaUaHa: 1.5,
      diasDescansoRecomendados: 28,
      fechaUltimoIngreso: '2026-10-06',
      fuenteAgua: 'Bebedero',
      notas: null,
      estadoManual: 'DISPONIBLE',
      cargaActualUaHa: 4.5,
      uaTotal: 9,
      estadoCalculado: 'SOBRECARGADO',
      estadoCarga: 'SOBRECARGADO',
      estadoOperativo: 'DISPONIBLE',
      sobrecargado: true,
      animalesAsignadosCount: 9,
      animales: [],
    };

    vi.mocked(potrerosApi.getPotrero).mockResolvedValue(potreroSobrecargado);
    vi.mocked(potrerosApi.getMovimientosPotrero).mockResolvedValue([]);

    renderWithClient(<PotreroDetailPage />);

    // Debe mostrar la alerta crítica sin ser ocultada por el estado manual
    expect(await screen.findByText('Alerta de Sobrecarga Crítica')).toBeDefined();
    expect(screen.getByText(/Carga actual: 4.5 UA\/ha/)).toBeDefined();
    expect(screen.getByText(/Estado operativo manual: DISPONIBLE/)).toBeDefined();

    // Debe mostrar ambos estados en la línea de rotación
    expect(screen.getByText('Estado operativo')).toBeDefined();
    expect(screen.getByText('Estado de carga')).toBeDefined();
  });
});
