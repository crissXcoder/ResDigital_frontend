import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RequireRole } from '@/components/auth/RequireRole';
import * as useAuthUserModule from '@/lib/hooks/useAuthUser';

vi.mock('@/lib/hooks/useAuthUser', () => ({
  useAuthUser: vi.fn(),
}));

describe('RequireRole Component', () => {
  it('debe renderizar los children cuando el usuario posee uno de los roles permitidos', () => {
    vi.mocked(useAuthUserModule.useAuthUser).mockReturnValue({
      user: {
        userId: '1',
        tenantId: '1',
        rol: 'propietario',
        nombreCompleto: 'Don Juan',
        correo: 'juan@finca.cr',
        nombreFinca: 'Finca Las Palmas',
      },
      role: 'propietario',
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isAuthenticated: true,
    });

    render(
      <RequireRole roles={['propietario', 'administrador']}>
        <div>Contenido solo para administración</div>
      </RequireRole>,
    );

    expect(
      screen.getByText('Contenido solo para administración'),
    ).toBeDefined();
  });

  it('debe ocultar los children y mostrar fallback si el usuario no tiene el rol permitido', () => {
    vi.mocked(useAuthUserModule.useAuthUser).mockReturnValue({
      user: {
        userId: '2',
        tenantId: '1',
        rol: 'peon',
        nombreCompleto: 'Pedro Peón',
        correo: 'pedro@finca.cr',
        nombreFinca: 'Finca Las Palmas',
      },
      role: 'peon',
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isAuthenticated: true,
    });

    render(
      <RequireRole
        roles={['propietario', 'administrador']}
        fallback={<div>Acceso restringido</div>}
      >
        <div>Contenido solo para administración</div>
      </RequireRole>,
    );

    expect(
      screen.queryByText('Contenido solo para administración'),
    ).toBeNull();
    expect(screen.getByText('Acceso restringido')).toBeDefined();
  });

  it('debe retornar null mientras la sesión está cargando', () => {
    vi.mocked(useAuthUserModule.useAuthUser).mockReturnValue({
      user: null,
      role: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isAuthenticated: false,
    });

    const { container } = render(
      <RequireRole roles={['propietario']}>
        <div>Contenido Secreto</div>
      </RequireRole>,
    );

    expect(container.firstChild).toBeNull();
  });
});
