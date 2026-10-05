'use client';

import React from 'react';
import { Menu, AlertCircle } from 'lucide-react';
import { useAuthUser } from '@/lib/hooks/useAuthUser';

/** Extrae hasta 2 iniciales del nombre completo del usuario. */
function getInitials(nombreCompleto: string): string {
  return nombreCompleto
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, isLoading, isError } = useAuthUser();

  const renderUserInfo = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right animate-pulse">
            <div className="h-3.5 w-28 bg-slate-200 rounded mb-1" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
        </div>
      );
    }

    if (isError || !user) {
      return (
        <div
          className="flex items-center gap-2 text-red-600"
          title="No se pudo cargar el perfil del usuario"
        >
          <AlertCircle size={18} />
          <span className="text-xs hidden md:inline">Error al cargar perfil</span>
        </div>
      );
    }

    const initials = getInitials(user.nombreCompleto);

    return (
      <div className="flex items-center gap-3">
        <div className="hidden md:block text-right">
          <p className="text-sm font-bold text-navy">{user.nombreCompleto}</p>
          <p className="text-xs text-slate-500">
            {user.nombreFinca || <span className="italic text-slate-400">Sin finca asignada</span>}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center font-bold text-sm"
          title={`${user.nombreCompleto} — ${user.rol}`}
        >
          {initials}
        </div>
      </div>
    );
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"
        >
          <Menu size={20} />
        </button>

        {/* Espacio para Search / Acciones que en este caso estarán en cada página según requerimiento */}
        <div className="flex-1" />
      </div>

      <div className="flex items-center gap-4">
        {renderUserInfo()}
      </div>
    </header>
  );
}

