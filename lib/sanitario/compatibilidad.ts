import type { Medicamento, Padecimiento } from '@/lib/api/sanitary';

/** Mismas reglas que `backend/src/tratamientos/compatibilidad-sexo.ts`. */
const CATEGORIAS_SOLO_HEMBRA: readonly string[] = ['Ubre', 'Reproductivo'];
const DIAGNOSTICOS_SOLO_HEMBRA: readonly string[] = ['mastitis', 'metritis'];
const DIAGNOSTICOS_SOLO_MACHO: readonly string[] = [];
export const VIA_SOLO_HEMBRA = 'Intramamaria';

function contieneAlguno(texto: string, fragmentos: readonly string[]): boolean {
  const normalizado = texto.toLowerCase();
  return fragmentos.some(f => normalizado.includes(f));
}

export function padecimientoAplica(
  padecimiento: Pick<Padecimiento, 'nombre' | 'categoria'>,
  sexo?: string,
): boolean {
  if (sexo === 'Macho') {
    return (
      !CATEGORIAS_SOLO_HEMBRA.includes(padecimiento.categoria ?? '') &&
      !contieneAlguno(padecimiento.nombre, DIAGNOSTICOS_SOLO_HEMBRA)
    );
  }
  if (sexo === 'Hembra') {
    return !contieneAlguno(padecimiento.nombre, DIAGNOSTICOS_SOLO_MACHO);
  }
  return true;
}

export function medicamentoAplica(
  medicamento: Pick<Medicamento, 'viaAdministracion'>,
  sexo?: string,
): boolean {
  return !(sexo === 'Macho' && medicamento.viaAdministracion === VIA_SOLO_HEMBRA);
}
