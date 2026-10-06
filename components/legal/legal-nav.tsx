'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LayoutDashboard, LogIn } from 'lucide-react';
import { useAuthUser } from '@/lib/hooks/useAuthUser';

interface LegalNavProps {
  current: 'terminos' | 'privacidad';
}

export function LegalHeader({ current }: LegalNavProps) {
  const router = useRouter();
  const { user, isLoading } = useAuthUser();

  const handleBack = () => {
    // Devuelve al usuario exactamente a la pantalla donde estaba antes de abrir términos/privacidad
    router.back();
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors text-sm font-medium cursor-pointer py-1 px-2 -ml-2 rounded-md hover:bg-slate-100"
          aria-label="Volver a la pantalla anterior"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
          <span>Volver</span>
        </button>

        <div className="flex items-center gap-3">
          {current === 'terminos' ? (
            <Link
              href="/privacidad"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Ver Política de Privacidad
            </Link>
          ) : (
            <Link
              href="/terminos"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Ver Términos y Condiciones
            </Link>
          )}

          {!isLoading && user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-navy text-white font-medium hover:bg-navy-light transition-colors shadow-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-blue-300" />
              <span>Ir al Dashboard</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Ingresar</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function LegalFooter({ current }: LegalNavProps) {
  const { user } = useAuthUser();

  return (
    <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
      <p>© 2026 ResDigital · Proyecto Académico EIF-409</p>
      <div className="flex items-center gap-4">
        {current === 'terminos' ? (
          <Link href="/privacidad" className="text-blue-600 hover:underline">
            Política de Privacidad
          </Link>
        ) : (
          <Link href="/terminos" className="text-blue-600 hover:underline">
            Términos y Condiciones
          </Link>
        )}
        <span>·</span>
        {user ? (
          <Link href="/dashboard" className="text-slate-600 hover:underline">
            Volver al Dashboard
          </Link>
        ) : (
          <Link href="/" className="text-slate-600 hover:underline">
            Página Principal
          </Link>
        )}
      </div>
    </div>
  );
}
