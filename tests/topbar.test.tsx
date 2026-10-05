import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Topbar } from '@/components/layout/Topbar';
import * as useAuthUserModule from '@/lib/hooks/useAuthUser';

vi.mock('@/lib/hooks/useAuthUser', () => ({
  useAuthUser: vi.fn(),
}));

type AuthHook = ReturnType<typeof useAuthUserModule.useAuthUser>;

function mockAuth(partial: Partial<AuthHook>) {
  vi.mocked(useAuthUserModule.useAuthUser).mockReturnValue({
    user: null,
    role: null,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isAuthenticated: false,
    ...partial,
  });
}

describe('Topbar — usuario y finca reales (DASH-T003)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra nombre, finca, iniciales y rol reales del perfil autenticado', () => {
    mockAuth({
      user: {
        userId: 'u-1',
        tenantId: 't-1',
        rol: 'veterinario',
        nombreCompleto: 'Sofía Mora Rojas',
        correo: 'sofia@finca.cr',
        nombreFinca: 'Finca La Montaña',
      },
      role: 'veterinario',
      isAuthenticated: true,
    });

    render(<Topbar onMenuClick={vi.fn()} />);

    expect(screen.getByText('Sofía Mora Rojas')).toBeDefined();
    expect(screen.getByText('Finca La Montaña')).toBeDefined();
    const avatar = screen.getByText('SM');
    expect(avatar.getAttribute('title')).toBe('Sofía Mora Rojas — veterinario');
  });

  it('muestra estado de carga sin identidad ficticia mientras resuelve el perfil', () => {
    mockAuth({ isLoading: true });

    const { container } = render(<Topbar onMenuClick={vi.fn()} />);

    expect(container.querySelector('.animate-pulse')).not.toBeNull();
    expect(screen.queryByText(/error al cargar perfil/i)).toBeNull();
  });

  it('adversarial: ante error muestra mensaje visible y NO inventa un usuario de reemplazo', () => {
    mockAuth({ isError: true, error: new Error('500') });

    render(<Topbar onMenuClick={vi.fn()} />);

    expect(screen.getByText(/error al cargar perfil/i)).toBeDefined();
    expect(screen.queryByTitle(/—/)).toBeNull();
  });

  it('adversarial: sin sesión (user null) muestra error y no una identidad por defecto', () => {
    mockAuth({ user: null });

    render(<Topbar onMenuClick={vi.fn()} />);

    expect(screen.getByText(/error al cargar perfil/i)).toBeDefined();
  });

  it('indica "Sin finca asignada" si el tenant no tiene nombre, en lugar de inventarlo', () => {
    mockAuth({
      user: {
        userId: 'u-2',
        tenantId: 't-2',
        rol: 'peon',
        nombreCompleto: 'Carlos Peón',
        correo: 'carlos@finca.cr',
        nombreFinca: '',
      },
      role: 'peon',
      isAuthenticated: true,
    });

    render(<Topbar onMenuClick={vi.fn()} />);

    expect(screen.getByText('Sin finca asignada')).toBeDefined();
  });
});
