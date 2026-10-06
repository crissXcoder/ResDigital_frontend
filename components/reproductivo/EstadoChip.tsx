import {
  CLASES_DIAGNOSTICO_RESULTADO,
  CLASES_ESTADO,
  CLASES_EVENTO,
  CLASES_HITO,
  CLASES_REVERTIDO,
} from '@/lib/reproductivo/estado-colores';
import type { EstadoReproductivo, TipoEvento, TipoHito } from '@/lib/reproductivo/tipos';

/**
 * Únicos componentes del módulo que traducen un valor de negocio a una clase
 * de color. Todo lo demás importa de acá — nunca decide un color por su
 * cuenta (design.md §7/§8.4).
 */

const BASE = 'px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide inline-block';

export function ChipEstado({ estado }: { estado: EstadoReproductivo }) {
  return <span className={`${BASE} ${CLASES_ESTADO[estado]}`}>{estado}</span>;
}

export function ChipHito({ tipo }: { tipo: TipoHito }) {
  return <span className={`${BASE} ${CLASES_HITO[tipo]}`}>{tipo}</span>;
}

export function ChipEvento({ tipo }: { tipo: TipoEvento }) {
  return <span className={`${BASE} ${CLASES_EVENTO[tipo]}`}>{tipo}</span>;
}

export function ChipRevertido() {
  return <span className={`${BASE} ${CLASES_REVERTIDO}`}>Corregido</span>;
}

export function ChipResultadoDiagnostico({
  resultado,
}: {
  resultado: 'Preñada' | 'Vacía';
}) {
  return (
    <span className={`${BASE} ${CLASES_DIAGNOSTICO_RESULTADO[resultado]}`}>
      {resultado}
    </span>
  );
}
