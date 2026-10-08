import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AccionesTratamiento } from '@/components/sanitario/AccionesTratamiento';
import * as useAuthUserModule from '@/lib/hooks/useAuthUser';
import type { RolUsuario } from '@/lib/hooks/useAuthUser';

vi.mock('@/lib/hooks/useAuthUser', () => ({
  useAuthUser: vi.fn(),
}));

function comoRol(rol: RolUsuario) {
  vi.mocked(useAuthUserModule.useAuthUser).mockReturnValue({
    user: {
      userId: '1',
      tenantId: '1',
      rol,
      nombreCompleto: 'Usuario',
      correo: 'usuario@finca.cr',
      nombreFinca: 'Finca',
    },
    role: rol,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isAuthenticated: true,
  });
}

afterEach(cleanup);

describe('AccionesTratamiento por rol', () => {
  it.each<RolUsuario>(['propietario', 'administrador', 'veterinario'])(
    '%s ve Corregir y Anular',
    (rol) => {
      comoRol(rol);
      const onCorregir = vi.fn();
      const onAnular = vi.fn();
      render(<AccionesTratamiento onCorregir={onCorregir} onAnular={onAnular} />);

      fireEvent.click(screen.getByRole('button', { name: 'Corregir tratamiento' }));
      fireEvent.click(screen.getByRole('button', { name: 'Anular tratamiento' }));
      expect(onCorregir).toHaveBeenCalledOnce();
      expect(onAnular).toHaveBeenCalledOnce();
    },
  );

  it('peón no ve Corregir ni Anular', () => {
    comoRol('peon');
    render(<AccionesTratamiento onCorregir={vi.fn()} onAnular={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Corregir tratamiento' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Anular tratamiento' })).toBeNull();
  });
});
