import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalendarioReproductivo } from '@/components/dashboard/calendario-reproductivo';
import { KpiRow } from '@/components/dashboard/kpi-row';
import * as dashboardDataModule from '@/lib/hooks/use-dashboard-data';

vi.mock('@/lib/hooks/use-dashboard-data', async () => {
  const actual = await vi.importActual<typeof dashboardDataModule>('@/lib/hooks/use-dashboard-data');
  return {
    ...actual,
    useProximosEventosReproductivos: vi.fn(),
    useKpisDashboard: vi.fn(),
  };
});

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('Manejo honesto de errores en Dashboard (MOD-04 / FL-10 - Cero Mocks Silenciosos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CalendarioReproductivo — Sin fallback a mock cuando falla la API', () => {
    it('muestra alerta de error visible si la petición de eventos reproductivos falla', () => {
      vi.mocked(dashboardDataModule.useProximosEventosReproductivos).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Fallo de conexión 500'),
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof dashboardDataModule.useProximosEventosReproductivos>);

      renderWithQueryClient(<CalendarioReproductivo />);

      // Debe mostrar el mensaje honesto de error en pantalla
      expect(
        screen.getByText('No se pudieron cargar los eventos reproductivos desde el servidor.'),
      ).toBeDefined();

      // No debe inventar eventos ni mostrar lista de animales de prueba
      expect(screen.queryByText(/FPP:/)).toBeNull();
      expect(screen.queryByText(/Palpación:/)).toBeNull();
    });

    it('muestra estado vacío si la API responde exitosamente pero sin eventos próximos', () => {
      vi.mocked(dashboardDataModule.useProximosEventosReproductivos).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof dashboardDataModule.useProximosEventosReproductivos>);

      renderWithQueryClient(<CalendarioReproductivo />);

      expect(
        screen.getByText('No hay palpaciones ni partos próximos en los siguientes días.'),
      ).toBeDefined();
    });
  });

  describe('KpiRow — Detección honesta de fallos al sincronizar con el backend', () => {
    it('despliega banner de alerta si la consulta de animales o KPIs falla', () => {
      vi.mocked(dashboardDataModule.useKpisDashboard).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Error al conectar con la base de datos'),
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof dashboardDataModule.useKpisDashboard>);

      renderWithQueryClient(<KpiRow />);

      // Muestra advertencia visible sin inventar números simulados
      expect(
        screen.getByText('Error al sincronizar indicadores del hato con el servidor.'),
      ).toBeDefined();

      // Los valores por defecto quedan en 0, no en números ficticios heredados del mock
      const cards = screen.getAllByText('0');
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });
  });
});
