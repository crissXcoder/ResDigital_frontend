import { InvitationAcceptance } from '@/components/auth/InvitationAcceptance';

export const dynamic = 'force-dynamic';

export default function AceptarInvitacionPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div className="mb-6 text-center">
        <span className="text-sm font-semibold tracking-wide text-emerald-800">Plataforma de Trazabilidad Bovina</span>
        <h2 className="mt-1 text-3xl font-extrabold text-slate-900">ResDigital</h2>
      </div>
      <InvitationAcceptance />
    </main>
  );
}
