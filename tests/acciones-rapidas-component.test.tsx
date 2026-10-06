import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccionesRapidas } from '@/components/dashboard/acciones-rapidas';
import * as useAuthUserModule from '@/lib/hooks/useAuthUser';
import * as animalesApi from '@/lib/api/animales';

vi.mock('@/lib/hooks/useAuthUser', () => ({
  useAuthUser: vi.fn(),
}));

vi.mock('@/lib/api/animales', async () => {
  const actual = await vi.importActual<typeof animalesApi>('@/lib/api/animales');
  return {
    ...actual,
    getAnimales: vi.fn(),
  };
});

const MOCK_ANIMALS: animalesApi.Animal[] = [
  {
    id: 'anim-1',
    areteInterno: 'H-100',
    nombre: 'Esperanza',
    categoria: 'Vaca en Ordeño',
    sexo: 'Hembra',
    activo: true,
    tenantId: 'tenant-1',
    razaId: 'raza-1',
  },
  {
    id: 'anim-2',
    areteInterno: 'M-200',
    nombre: 'Bravo',
    categoria: 'Toro Reproductor',
    sexo: 'Macho',
    activo: true,
    tenantId: 'tenant-1',
    razaId: 'raza-1',
  },
];

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

describe('AccionesRapidas Component — Autorización por rol y flujo real (DASH-T005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(animalesApi.getAnimales).mockResolvedValue(MOCK_ANIMALS);
  });

  describe('Rol: veterinario', () => {
    beforeEach(() => {
      vi.mocked(useAuthUserModule.useAuthUser).mockReturnValue({
        user: {
          userId: 'vet-1',
          tenantId: 'tenant-1',
          rol: 'veterinario',
          nombreCompleto: 'Dra. Sofía Mora',
          correo: 'sofia@veterinaria.com',
          nombreFinca: 'Finca La Montaña',
        },
        role: 'veterinario',
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isAuthenticated: true,
      });
    });

    it('habilita tratamiento y reproductivo, pero bloquea terminantemente la acción de leche', () => {
      renderWithQueryClient(<AccionesRapidas />);

      const btnTratamiento = screen.getByTestId('accion-rapida-tratamiento') as HTMLButtonElement;
      const btnReproductivo = screen.getByTestId('accion-rapida-reproductivo') as HTMLButtonElement;
      const btnLeche = screen.getByTestId('accion-rapida-leche') as HTMLButtonElement;

      expect(btnTratamiento.disabled).toBe(false);
      expect(btnReproductivo.disabled).toBe(false);

      // Leche debe estar deshabilitada
      expect(btnLeche.disabled).toBe(true);
      expect(btnLeche.getAttribute('aria-disabled')).toBe('true');
      expect(btnLeche.textContent).toContain('Rol no autorizado');
    });

    it('adversarial: al intentar hacer click en la acción prohibida (leche), no abre el selector modal', () => {
      renderWithQueryClient(<AccionesRapidas />);

      const btnLeche = screen.getByTestId('accion-rapida-leche');
      fireEvent.click(btnLeche);

      // El modal selector NO debe abrirse
      expect(screen.queryByText('Seleccionar Hembra para Registro de Leche')).toBeNull();
    });

    it('abre el selector de animales cuando pulsa una acción autorizada (tratamiento)', async () => {
      renderWithQueryClient(<AccionesRapidas />);

      const btnTratamiento = screen.getByTestId('accion-rapida-tratamiento');
      fireEvent.click(btnTratamiento);

      expect(
        await screen.findByText('Seleccionar Animal para Tratamiento'),
      ).toBeDefined();
    });
  });

  describe('Rol: propietario', () => {
    beforeEach(() => {
      vi.mocked(useAuthUserModule.useAuthUser).mockReturnValue({
        user: {
          userId: 'prop-1',
          tenantId: 'tenant-1',
          rol: 'propietario',
          nombreCompleto: 'Don Alberto',
          correo: 'alberto@finca.cr',
          nombreFinca: 'Finca El Roble',
        },
        role: 'propietario',
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isAuthenticated: true,
      });
    });

    it('permite abrir las 3 acciones rápidas sin restricciones', async () => {
      renderWithQueryClient(<AccionesRapidas />);

      const btnTratamiento = screen.getByTestId('accion-rapida-tratamiento') as HTMLButtonElement;
      const btnReproductivo = screen.getByTestId('accion-rapida-reproductivo') as HTMLButtonElement;
      const btnLeche = screen.getByTestId('accion-rapida-leche') as HTMLButtonElement;

      expect(btnTratamiento.disabled).toBe(false);
      expect(btnReproductivo.disabled).toBe(false);
      expect(btnLeche.disabled).toBe(false);
      expect(screen.queryByText('Rol no autorizado')).toBeNull();

      // Abrir leche
      fireEvent.click(btnLeche);
      expect(
        await screen.findByText('Seleccionar Hembra para Registro de Leche'),
      ).toBeDefined();
    });
  });

  describe('Rol: peon', () => {
    beforeEach(() => {
      vi.mocked(useAuthUserModule.useAuthUser).mockReturnValue({
        user: {
          userId: 'peon-1',
          tenantId: 'tenant-1',
          rol: 'peon',
          nombreCompleto: 'Carlos Peón',
          correo: 'carlos@finca.cr',
          nombreFinca: 'Finca El Roble',
        },
        role: 'peon',
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isAuthenticated: true,
      });
    });

    it('permite las tres acciones rápidas que autoriza la matriz', () => {
      renderWithQueryClient(<AccionesRapidas />);

      const btnTratamiento = screen.getByTestId('accion-rapida-tratamiento') as HTMLButtonElement;
      const btnReproductivo = screen.getByTestId('accion-rapida-reproductivo') as HTMLButtonElement;
      const btnLeche = screen.getByTestId('accion-rapida-leche') as HTMLButtonElement;

      expect(btnTratamiento.disabled).toBe(false);
      expect(btnReproductivo.disabled).toBe(false);
      expect(btnLeche.disabled).toBe(false);
      expect(screen.queryByText('Rol no autorizado')).toBeNull();

      fireEvent.click(btnReproductivo);
      expect(screen.getByText('Seleccionar Hembra para Evento Reproductivo')).toBeDefined();
    });
  });
});
