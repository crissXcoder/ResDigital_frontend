import { Lock, LockOpen } from 'lucide-react';
import { formatearFecha, type EstadoSanitario } from '@/lib/api/sanitary';

interface BadgeProps {
  producto: 'Leche' | 'Carne';
  liberacion: string | null;
  diasRestantes: number;
}

function BadgeRetiro({ producto, liberacion, diasRestantes }: BadgeProps) {
  const bloqueado = !!liberacion && diasRestantes > 0;
  return (
    <div
      data-testid={`badge-retiro-${producto.toLowerCase()}`}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm ${
        bloqueado ? 'bg-danger-bg border-danger/30 text-danger' : 'bg-success-bg border-success/30 text-success'
      }`}
    >
      {bloqueado ? <Lock className="w-5 h-5 shrink-0" /> : <LockOpen className="w-5 h-5 shrink-0" />}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider">
          {producto}: {bloqueado ? 'BLOQUEADO' : 'LIBRE'}
        </p>
        <p className="text-xs opacity-90">
          {bloqueado
            ? `Hasta ${formatearFecha(liberacion ?? '')} (${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'})`
            : 'Sin retiro vigente'}
        </p>
      </div>
    </div>
  );
}

/** Estado de retiro independiente para leche y carne. */
export function BadgesRetiro({ estado }: { estado: EstadoSanitario }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <BadgeRetiro producto="Leche" liberacion={estado.liberacionLeche} diasRestantes={estado.diasRestantesLeche} />
      <BadgeRetiro producto="Carne" liberacion={estado.liberacionCarne} diasRestantes={estado.diasRestantesCarne} />
    </div>
  );
}
