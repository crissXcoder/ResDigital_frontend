/**
 * Mapa semántico de color del módulo Reproductivo.
 *
 * design.md §7 y §8.4: ningún componente decide un color con un if/else que
 * devuelva un hex ni con interpolación de string — Tailwind necesita ver la
 * clase completa en el fuente para generarla. Este es el único lugar del
 * módulo que traduce un valor de negocio a clases; todo lo demás importa de
 * acá.
 */

import type { EstadoReproductivo, TipoEvento, TipoHito } from './tipos';

/**
 * 'Servida' no tenía fila en design.md §7 — se agregó reusando
 * `--color-info-bg-soft` (ya existía, sin uso como estado): es
 * deliberadamente más tenue que 'Preñada', porque una hembra servida no es
 * una hembra preñada, solo un diagnóstico lo confirma.
 */
export const CLASES_ESTADO: Record<EstadoReproductivo, string> = {
  Preñada: 'bg-info-bg text-info border border-info/30',
  Servida: 'bg-info-bg-soft text-info border border-info/20',
  Vacía: 'bg-warning-bg text-warning border border-warning/30',
  'En Secado':
    'bg-accent-secado-bg text-accent-secado border border-accent-secado/30',
};

/**
 * 'Aviso Parto Urgente' (FPP-3) es el único hito en rojo: Reglas de Negocio
 * Ganaderas separa las dos alertas de parto porque la de -3 días exige
 * preparar ya el corral de maternidad.
 */
export const CLASES_HITO: Record<TipoHito, string> = {
  Palpación: 'bg-info-bg text-info border border-info/30',
  Secado:
    'bg-accent-secado-bg text-accent-secado border border-accent-secado/30',
  'Aviso Parto': 'bg-warning-bg text-warning border border-warning/30',
  'Aviso Parto Urgente': 'bg-danger-bg text-danger border border-danger/30',
  'Parto FPP': 'bg-success-bg text-success border border-success/30',
};

export const CLASES_EVENTO: Record<TipoEvento, string> = {
  SERVICIO: 'bg-info-bg text-info border border-info/30',
  DIAGNOSTICO: 'bg-success-bg text-success border border-success/30',
  PARTO: 'bg-success-bg text-success border border-success/30',
  SECADO:
    'bg-accent-secado-bg text-accent-secado border border-accent-secado/30',
};

/** Neutro del sistema (design.md §7, fila "Baja / Salida / Inactivo"). */
export const CLASES_REVERTIDO = 'bg-slate-100 text-slate-500 border border-slate-300';

export const CLASES_DIAGNOSTICO_RESULTADO: Record<'Preñada' | 'Vacía', string> = {
  Preñada: 'bg-success-bg text-success border border-success/30',
  Vacía: 'bg-danger-bg text-danger border border-danger/30',
};
