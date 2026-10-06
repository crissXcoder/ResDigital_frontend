import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

// Prevención del bug de CSP Nonce de Energisa:
// Server Component con force-dynamic para evaluación dinámica por petición.
export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-surface">
      <div className="mb-8 text-center">
        <span className="text-sm font-semibold tracking-wider text-secondary uppercase">
          Seguridad y Recuperación
        </span>
        <h2 className="text-3xl font-extrabold text-foreground mt-1">
          ResDigital
        </h2>
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-md bg-card p-8 rounded-xl border border-border animate-pulse h-96" />
        }
      >
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
