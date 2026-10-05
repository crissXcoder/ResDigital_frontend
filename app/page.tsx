import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface">
      <div className="w-full max-w-xl bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent text-accent-foreground font-bold text-2xl mb-4">
          RD
        </div>
        <span className="text-xs font-semibold tracking-wider text-secondary uppercase block mb-1">
          EIF-409 Aplicaciones Informáticas Globales
        </span>
        <h1 className="text-3xl font-extrabold text-foreground mb-3">
          ResDigital
        </h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-md mx-auto">
          Cuaderno de campo digital y control de trazabilidad, sanidad y
          reproducción bovina para pequeños y medianos ganaderos de Costa Rica.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="py-2.5 px-6 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-navy-light transition-colors shadow-sm"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/registro"
            className="py-2.5 px-6 rounded-md border border-border bg-card text-foreground font-medium text-sm hover:bg-muted transition-colors shadow-sm"
          >
            Registrar Nueva Finca
          </Link>
        </div>

        <footer className="mt-8 pt-6 border-t border-border flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <Link
            href="/terminos"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Términos y Condiciones
          </Link>
          <span>·</span>
          <Link
            href="/privacidad"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Política de Privacidad
          </Link>
        </footer>
      </div>
    </main>
  );
}
