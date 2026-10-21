'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError, fetchApi } from '@/lib/api/client';
import { useAuthUser } from '@/lib/hooks/useAuthUser';

type Invitacion = {
  success: true;
  invitacionId: string;
  rolAsignado: 'administrador' | 'peon' | 'veterinario';
  emailSent: boolean | null;
  expiresAt: string;
};
type InvitacionPersistida = { invitacionId: string; correo: string; rol: Invitacion['rolAsignado']; estado: 'PENDIENTE' | 'ACEPTADA' | 'CANCELADA' | 'EXPIRADA'; createdAt: string; expiresAt: string };

const roles: Invitacion['rolAsignado'][] = ['administrador', 'peon', 'veterinario'];

export function InvitationManagement() {
  const { role } = useAuthUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<Invitacion | null>(null);
  const [invitations, setInvitations] = useState<InvitacionPersistida[] | null>(null);
  const [listError, setListError] = useState(false);

  const refreshInvitations = useCallback(async () => {
    try {
      setInvitations(await fetchApi<InvitacionPersistida[]>('/auth/invitaciones'));
      setListError(false);
    } catch {
      setListError(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchApi<InvitacionPersistida[]>('/auth/invitaciones').then(
      (rows) => { if (active) setInvitations(rows); },
      () => { if (active) setListError(true); },
    );
    return () => { active = false; };
  }, []);

  if (role !== 'propietario') {
    return <p role="alert">Solo el propietario puede invitar personas a esta finca.</p>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInvitation(null);
    setBusy(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const result = await fetchApi<Invitacion>('/auth/invitar', {
        method: 'POST',
        body: JSON.stringify({
          correo: form.get('correo'),
          nombreCompleto: form.get('nombreCompleto'),
          rol: form.get('rol'),
        }),
      });
      setInvitation(result);
      formElement.reset();
      await refreshInvitations();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'No se pudo invitar a la persona. Revisá la conexión e intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Acceso a la finca</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Invitar a una persona</h1>
        <p className="mt-2 text-sm text-slate-600">El rol se define antes de enviar el enlace. La invitación vence en 24 horas.</p>
      </div>

      {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="invitacion-nombre" className="mb-1 block text-sm font-medium text-slate-800">Nombre completo</label>
          <input id="invitacion-nombre" name="nombreCompleto" autoComplete="name" required maxLength={120} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800" />
        </div>
        <div>
          <label htmlFor="invitacion-correo" className="mb-1 block text-sm font-medium text-slate-800">Correo electrónico</label>
          <input id="invitacion-correo" name="correo" type="email" autoComplete="email" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800" />
        </div>
        <div>
          <label htmlFor="invitacion-rol" className="mb-1 block text-sm font-medium text-slate-800">Rol en la finca</label>
          <select id="invitacion-rol" name="rol" defaultValue="peon" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
            {roles.map((item) => <option key={item} value={item}>{item === 'peon' ? 'Peón' : item === 'administrador' ? 'Administrador' : 'Veterinario'}</option>)}
          </select>
        </div>
        <button type="submit" disabled={busy} className="w-full rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60 sm:w-auto">
          {busy ? 'Enviando invitación…' : 'Enviar invitación'}
        </button>
      </form>

      {invitation && (
        <div role={invitation.emailSent ? 'status' : 'alert'} className={`rounded-md border p-4 text-sm ${invitation.emailSent ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-300 bg-amber-50 text-amber-950'}`}>
          <p className="font-semibold">{invitation.emailSent ? 'Invitación enviada.' : 'La invitación quedó guardada, pero no se pudo enviar el correo.'}</p>
          <p className="mt-1">Rol: {invitation.rolAsignado}. Vence: {new Intl.DateTimeFormat('es-CR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(invitation.expiresAt))}.</p>
        </div>
      )}

      <section aria-labelledby="invitaciones-title" className="border-t border-slate-200 pt-5">
        <h2 id="invitaciones-title" className="text-lg font-semibold text-slate-900">Invitaciones recientes</h2>
        {invitations === null && !listError && <p role="status" className="mt-2 text-sm text-slate-600">Cargando invitaciones…</p>}
        {listError && <p role="alert" className="mt-2 text-sm text-red-800">No se pudieron cargar las invitaciones. Volvé a intentar.</p>}
        {invitations?.length === 0 && <p role="status" className="mt-2 text-sm text-slate-600">Todavía no hay invitaciones para esta finca.</p>}
        {invitations && invitations.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-200">
            {invitations.map((row) => (
              <li key={row.invitacionId} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-900">{row.correo} · {row.rol}</span>
                <span className="text-slate-600">{row.estado === 'EXPIRADA' ? 'Vencida' : row.estado === 'PENDIENTE' ? 'Pendiente' : row.estado === 'ACEPTADA' ? 'Aceptada' : 'Cancelada'} · {row.estado === 'EXPIRADA' ? 'Venció' : 'Vence'} {new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.expiresAt))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}


