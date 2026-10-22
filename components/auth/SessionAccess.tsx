'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthUser } from '@/lib/hooks/useAuthUser';

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function logout() {
    setPending(true);
    setError(false);
    try {
      const { error } = await createClient().auth.signOut({ scope: 'local' });
      if (error) throw error;
      // Recargar descarta también la caché de navegación del usuario anterior.
      window.location.replace('/login');
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={logout} disabled={pending}
        className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-navy hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:opacity-50">
        {pending ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </button>
      {error && <p role="alert" className="max-w-56 text-xs text-red-700">No se pudo cerrar la sesión. Volvé a intentar.</p>}
    </div>
  );
}

function ProfileAccess({ userId, children }: { userId: string; children: React.ReactNode }) {
  const { user, isLoading, isError, refetch } = useAuthUser();
  if (isLoading) return <p role="status" className="p-6">Validando el acceso a tu finca…</p>;
  if (isError || !user?.tenantId || !user.nombreFinca?.trim() || user.userId !== userId) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
        <h1 className="text-xl font-bold text-navy">No se pudo abrir tu finca</h1>
        <p role="alert">{isError
          ? 'No se pudo consultar tu perfil. Revisá la conexión y volvé a intentar.'
          : 'Tu sesión no tiene acceso a una finca activa. Volvé a iniciar sesión o consultá al propietario.'}</p>
        <button type="button" onClick={() => refetch()} className="rounded-md bg-navy px-4 py-2 text-white">Reintentar</button>
        <LogoutButton />
      </div>
    );
  }
  return (
    <React.Fragment key={`${user.userId}:${user.tenantId}:${user.rol}`}>
      {user.rol === 'propietario' && (
        <div className="border-b border-slate-200 bg-white px-4 py-2 text-right sm:px-6">
          <Link href="/equipo" className="text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
            Administrar equipo
          </Link>
        </div>
      )}
      {children}
    </React.Fragment>
  );
}

export function SessionGate({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const previousUser = useRef<string | null | undefined>(undefined);
  const [session, setSession] = useState<{ userId: string | null; revision: number }>();
  const [error, setError] = useState(false);

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    Promise.resolve().then(() => {
      if (disposed) return;
      const { data } = createClient().auth.onAuthStateChange((event, current) => {
        if (disposed) return;
        const userId = current?.user.id ?? null;
        if (previousUser.current !== userId) {
          previousUser.current = userId;
          queryClient.clear();
          setSession((previous) => ({ userId, revision: (previous?.revision ?? 0) + 1 }));
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          void queryClient.invalidateQueries({ queryKey: ['authUserProfile'] });
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
    }).catch(() => { if (!disposed) setError(true); });
    return () => { disposed = true; unsubscribe?.(); };
  }, [queryClient]);

  if (!session && !error) return <p role="status" className="p-6">Comprobando tu sesión…</p>;
  if (!session?.userId || error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
        <h1 className="text-xl font-bold text-navy">Iniciá sesión para continuar</h1>
        <p role="alert">{error ? 'No se pudo comprobar la sesión. Volvé a intentar.' : 'Tu sesión finalizó. Iniciá sesión para abrir tu finca.'}</p>
        <Link href="/login" className="rounded-md bg-navy px-4 py-2 text-center text-white">Ir a iniciar sesión</Link>
      </div>
    );
  }
  return <ProfileAccess key={session.revision} userId={session.userId}>{children}</ProfileAccess>;
}
