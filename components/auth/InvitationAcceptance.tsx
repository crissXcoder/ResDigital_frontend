'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, fetchApi } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';

type SessionUser = { id: string; email: string; invitationId: string };
type Profile = {
  userId: string;
  tenantId: string;
  rol: string;
  nombreCompleto: string;
  correo: string;
  nombreFinca: string;
};

export function InvitationAcceptance() {
  const router = useRouter();
  const [invitee, setInvitee] = useState<SessionUser | null>(null);
  const [authError, setAuthError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      const session = data.session;
      const invitationId: unknown = session?.user.user_metadata['invitacion_id'];
      if (sessionError || !session?.user.email || typeof invitationId !== 'string') {
        setAuthError(true);
        return;
      }
      setInvitee({ id: session.user.id, email: session.user.email, invitationId });
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }).catch(() => { if (active) setAuthError(true); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitee) return;
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const nombreCompleto = String(form.get('nombreCompleto') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');

    if (nombreCompleto.length < 3 || nombreCompleto.length > 120) {
      setError('Ingresá un nombre completo de 3 a 120 caracteres.');
      setBusy(false);
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      setBusy(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setBusy(false);
      return;
    }

    try {
      if (!confirmed) {
        await fetchApi<{ success: true }>('/auth/confirmar-invitacion', {
          method: 'POST',
          body: JSON.stringify({ nombreCompleto, invitacionId: invitee.invitationId }),
        });
        setConfirmed(true);
      }
      const { error: passwordError } = await createClient().auth.updateUser({ password });
      if (passwordError) throw passwordError;
      const result = await fetchApi<Profile>('/auth/perfil');
      setProfile(result);
    } catch (cause) {
      setError(cause instanceof ApiError
        ? cause.message
        : confirmed
          ? 'La invitación quedó aceptada, pero no se pudo guardar la contraseña. Volvé a intentarlo.'
          : 'No se pudo completar la invitación. Revisá el enlace e intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (profile) {
    return (
      <section className="w-full max-w-lg space-y-4 rounded-xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-900">✓</div>
        <h1 className="text-2xl font-bold text-slate-900">Invitación aceptada</h1>
        <p className="text-sm text-slate-700">{profile.nombreCompleto} · {profile.correo}</p>
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-800">Finca: <strong>{profile.nombreFinca}</strong><br />Rol: <strong>{profile.rol}</strong></p>
        <button type="button" onClick={() => router.replace('/dashboard')} className="w-full rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
          Abrir mi finca
        </button>
      </section>
    );
  }

  if (authError) {
    return (
      <section className="w-full max-w-lg space-y-4 rounded-xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Enlace vencido o inválido</h1>
        <p role="alert" className="text-sm text-slate-700">Iniciá sesión con el correo invitado o pedile al propietario que envíe una invitación nueva.</p>
        <Link href="/login" className="inline-flex rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">Ir a iniciar sesión</Link>
      </section>
    );
  }

  return (
    <section className="w-full max-w-lg space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Invitación a una finca</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Confirmá tu acceso</h1>
        {invitee ? <p className="mt-2 text-sm text-slate-600">Invitación para {invitee.email}. Elegí tu nombre y contraseña para continuar.</p> : <p role="status" className="mt-2 text-sm text-slate-600">Comprobando el enlace…</p>}
      </div>
      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {invitee && (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="aceptacion-nombre" className="mb-1 block text-sm font-medium text-slate-800">Nombre completo</label>
            <input id="aceptacion-nombre" name="nombreCompleto" autoComplete="name" required minLength={3} maxLength={120} disabled={confirmed} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:bg-slate-100" />
          </div>
          <div>
            <label htmlFor="aceptacion-password" className="mb-1 block text-sm font-medium text-slate-800">Crear contraseña</label>
            <input id="aceptacion-password" name="password" type="password" autoComplete="new-password" required minLength={8} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800" />
          </div>
          <div>
            <label htmlFor="aceptacion-password-confirm" className="mb-1 block text-sm font-medium text-slate-800">Confirmar contraseña</label>
            <input id="aceptacion-password-confirm" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800" />
          </div>
          <button type="submit" disabled={busy} className="w-full rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60">
            {busy ? 'Confirmando invitación…' : confirmed ? 'Guardar contraseña' : 'Aceptar invitación'}
          </button>
        </form>
      )}
    </section>
  );
}
