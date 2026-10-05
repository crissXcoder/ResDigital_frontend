import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/Sidebar';
import * as useAuthUserModule from '@/lib/hooks/useAuthUser';
import * as animalesApi from '@/lib/api/animales';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('@/lib/hooks/useAuthUser', () => ({
  useAuthUser: vi.fn(),
}));

vi.mock('@/lib/api/animales', () => ({
  getAnimales: vi.fn(),
}));

function renderSidebar(isOpen = true) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Sidebar isOpen={isOpen} onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('Sidebar Component (CORE-T005)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthUserModule.useAuthUser).mockReturnValue({
      user: {
        userId: 'user-1',
        tenantId: 'tenant-1',
        rol: 'propietario',
        nombreCompleto: 'Ana Administradora Demo',
        correo: 'ana@finca.cr',
        nombreFinca: 'Hacienda El Progreso',
      },
      role: 'propietario',
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isAuthenticated: true,
    });

    vi.mocked(animalesApi.getAnimales).mockResolvedValue([
      { id: '1', areteInterno: '101', activo: true } as unknown as animalesApi.Animal,
      { id: '2', areteInterno: '102', activo: false } as unknown as animalesApi.Animal,
    ]);
  });

  it('renderiza módulos reales con rutas navegables activas', () => {
    renderSidebar();

    const linkDashboard = screen.getByRole('link', { name: /dashboard/i });
    expect(linkDashboard.getAttribute('href')).toBe('/dashboard');

    const linkHato = screen.getByRole('link', { name: /hato ganadero/i });
    expect(linkHato.getAttribute('href')).toBe('/hato');

    const linkRepro = screen.getByRole('link', { name: /reproducción/i });
    expect(linkRepro.getAttribute('href')).toBe('/reproductivo');

    const linkPotreros = screen.getByRole('link', { name: /módulo de potreros/i });
    expect(linkPotreros.getAttribute('href')).toBe('/potreros');

    const linkQr = screen.getByRole('link', { name: /escáner qr \/ arete/i });
    expect(linkQr.getAttribute('href')).toBe('/qr');
  });

  it('CORE-T005: ningún módulo aparente tiene href="#"', () => {
    renderSidebar();

    const allLinks = screen.getAllByRole('link');
    for (const link of allLinks) {
      expect(link.getAttribute('href')).not.toBe('#');
    }
  });

  it('CORE-T005: módulos en desarrollo están deshabilitados con motivo visible (Próximamente)', () => {
    renderSidebar();

    // Producción Lechera, Reportes (Escáner QR ya fue activado con QR-T002)
    const disabledItems = screen.getAllByText('Próximamente');
    expect(disabledItems.length).toBe(2);

    const lechera = screen.getByText('Producción Lechera').closest('[aria-disabled="true"]');
    expect(lechera?.getAttribute('aria-disabled')).toBe('true');
    expect(lechera?.getAttribute('title')).toContain('desarrollo');

    const reportes = screen.getByText('Reportes').closest('[aria-disabled="true"]');
    expect(reportes?.getAttribute('aria-disabled')).toBe('true');
  });

  it('CORE-T005: no contiene el botón falso "Restaurar Base de Datos"', () => {
    renderSidebar();

    expect(screen.queryByText(/restaurar base de datos/i)).toBeNull();
  });

  it('muestra el nombre real de la finca del usuario autenticado', () => {
    renderSidebar();

    expect(screen.getByText('Hacienda El Progreso')).toBeDefined();
    expect(screen.queryByText('Finca San Martín')).toBeNull();
  });
});
