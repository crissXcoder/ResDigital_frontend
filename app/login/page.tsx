import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';

// Prevención del bug de CSP Nonce de Energisa:
// Server Component con force-dynamic garantiza que no se pre-renderice estático en el build
// y genere un nonce fresco y cookies sincronizadas en cada petición.
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-surface">
      <div className="mb-8 text-center">
        <span className="text-sm font-semibold tracking-wider text-secondary uppercase">
          Plataforma de Trazabilidad Bovina
        </span>
        <h2 className="text-3xl font-extrabold text-foreground mt-1">
          ResDigital
        </h2>
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-md bg-card p-8 rounded-2xl border border-border animate-pulse h-96 shadow-2xl" />
        }
      >
        <LoginForm />
      </Suspense>

      <footer className="mt-8 text-center text-xs text-muted-foreground max-w-sm">
        <p>
          Al ingresar al piloto de ResDigital, aceptas los{' '}
          <Link href="/terminos" className="text-primary font-medium hover:underline">
            Términos y Condiciones
          </Link>{' '}
          y la{' '}
          <Link href="/privacidad" className="text-primary font-medium hover:underline">
            Política de Privacidad
          </Link>
          .
        </p>
      </footer>
    </main>
  );
}
