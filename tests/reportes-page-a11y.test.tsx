import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReportesPage from '@/app/(dashboard)/reportes/page';
import * as useAuthUserModule from '@/lib/hooks/useAuthUser';
import * as dashboardDataModule from '@/lib/hooks/use-dashboard-data';
import * as useReproductivoModule from '@/lib/hooks/use-reproductivo';
import * as animalesApi from '@/lib/api/animales';

const { save } = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('jspdf', () => ({
  default: class {
    lastAutoTable = { finalY: 80 };
    setFontSize() {}
    setTextColor() {}
    text() {}
    addPage() {}
    save = save;
  },
}));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

vi.mock('@/lib/hooks/useAuthUser', () => ({
  useAuthUser: vi.fn(),
}));

vi.mock('@/lib/hooks/use-dashboard-data', async () => {
  const actual = await vi.importActual<typeof dashboardDataModule>('@/lib/hooks/use-dashboard-data');
  return { ...actual, useAnimalesEnRetiro: vi.fn() };
});

vi.mock('@/lib/hooks/use-reproductivo', async () => {
  const actual = await vi.importActual<typeof useReproductivoModule>('@/lib/hooks/use-reproductivo');
  return { ...actual, useProximosEventosFinca: vi.fn() };
});

vi.mock('@/lib/api/animales', async () => {
  const actual = await vi.importActual<typeof animalesApi>('@/lib/api/animales');
  return { ...actual, getAnimales: vi.fn() };
});

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ReportesPage — accesibilidad de controles del reporte reproductivo (RF-030)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthUserModule.useAuthUser).mockReturnValue({
      user: {
        userId: 'u1',
        tenantId: 'tenant-1',
        rol: 'propietario',
        nombreCompleto: 'Karla',
        correo: 'karla@finca.com',
        nombreFinca: 'Finca Modelo',
      },
      role: 'propietario',
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isAuthenticated: true,
    } as unknown as ReturnType<typeof useAuthUserModule.useAuthUser>);

    vi.mocked(dashboardDataModule.useAnimalesEnRetiro).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof dashboardDataModule.useAnimalesEnRetiro>);

    vi.mocked(useReproductivoModule.useProximosEventosFinca).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useReproductivoModule.useProximosEventosFinca>);

    vi.mocked(animalesApi.getAnimales).mockResolvedValue([]);
  });

  it('los selectores de "Horizonte Temporal" y "Filtro por Hito" son accesibles por su label (lector de pantalla)', () => {
    renderWithQueryClient(<ReportesPage />);

    expect(screen.getByLabelText('Horizonte Temporal')).toBeDefined();
    expect(screen.getByLabelText('Filtro por Hito')).toBeDefined();
  });

  it('RF-031: doble clic en "Descargar Reporte PDF" (retiros) genera un solo PDF, no dos', () => {
    vi.mocked(dashboardDataModule.useAnimalesEnRetiro).mockReturnValue({
      data: [
        {
          animalId: 'a1',
          arete: '101',
          nombre: 'Estrella',
          fechaLiberacionLeche: '2026-10-25',
          fechaLiberacionCarne: null,
          diasRestantesLeche: 5,
          diasRestantesCarne: null,
        },
      ],
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof dashboardDataModule.useAnimalesEnRetiro>);

    renderWithQueryClient(<ReportesPage />);

    const boton = screen.getByRole('button', { name: 'Descargar Reporte PDF Retiros' });
    fireEvent.click(boton);
    fireEvent.click(boton);
    fireEvent.click(boton);

    expect(save).toHaveBeenCalledTimes(1);
  });
});
