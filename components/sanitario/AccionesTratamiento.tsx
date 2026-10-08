'use client';

import { Ban, Pencil } from 'lucide-react';
import { RequireRole } from '@/components/auth/RequireRole';
import type { RolUsuario } from '@/lib/hooks/useAuthUser';

/** Roles que pueden corregir o anular un tratamiento (Matriz de Roles: el peón solo registra). */
export const ROLES_CORRIGEN_TRATAMIENTO: RolUsuario[] = ['propietario', 'administrador', 'veterinario'];

interface AccionesTratamientoProps {
  onCorregir: () => void;
  onAnular: () => void;
}

export function AccionesTratamiento({ onCorregir, onAnular }: AccionesTratamientoProps) {
  return (
    <RequireRole roles={ROLES_CORRIGEN_TRATAMIENTO}>
      <button
        type="button"
        onClick={onCorregir}
        className="text-slate-400 hover:text-navy transition-colors inline-block"
        title="Corregir tratamiento"
        aria-label="Corregir tratamiento"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onAnular}
        className="text-slate-400 hover:text-danger transition-colors inline-block"
        title="Anular tratamiento"
        aria-label="Anular tratamiento"
      >
        <Ban className="w-4 h-4" />
      </button>
    </RequireRole>
  );
}
