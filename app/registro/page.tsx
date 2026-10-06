import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';

// Prevención del bug de CSP Nonce de Energisa:
// Server Component con force-dynamic para evaluación dinámica por petición.
export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-surface">
      <div className="mb-8 text-center">
        <span className="text-sm font-semibold tracking-wider text-secondary uppercase">
          Alta de Productores
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
        <RegisterForm />
      </Suspense>
    </main>
  );
}
