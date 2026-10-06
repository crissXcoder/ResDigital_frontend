/**
 * Fechas reproductivas.
 *
 * El backend siempre devuelve `YYYY-MM-DD` (columnas `date`, sin hora). Pasar
 * ese string por `new Date(...)` lo interpreta como medianoche UTC, y en Costa
 * Rica (UTC-6) `toLocaleDateString()` imprime el día anterior. Es el mismo
 * corrimiento que se corrigió en el backend (`ReproductiveCalculationService`),
 * y hoy sigue vivo en `hato/[id]/page.tsx`. Estas funciones nunca pasan por
 * `Date` para formatear: el string ya es la fecha local de la finca.
 */

const ZONA_COSTA_RICA = 'America/Costa_Rica';

function esFechaCalendarioValida(anio: number, mes: number, dia: number): boolean {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

/** Mantiene YYYY-MM-DD como fecha civil; solo timestamps se convierten a zona finca. */
export function normalizarFechaCivil(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const fechaCivil = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (fechaCivil) {
    const [, anioTexto, mesTexto, diaTexto] = fechaCivil;
    return esFechaCalendarioValida(Number(anioTexto), Number(mesTexto), Number(diaTexto))
      ? valor
      : null;
  }

  const fechaTimestamp = /^(\d{4})-(\d{2})-(\d{2})T/.exec(valor);
  if (
    fechaTimestamp &&
    !esFechaCalendarioValida(
      Number(fechaTimestamp[1]),
      Number(fechaTimestamp[2]),
      Number(fechaTimestamp[3]),
    )
  ) {
    return null;
  }

  const instante = new Date(valor);
  if (Number.isNaN(instante.getTime())) return null;
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_COSTA_RICA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instante);
  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((item) => item.type === tipo)?.value;
  const anio = parte('year');
  const mes = parte('month');
  const dia = parte('day');
  return anio && mes && dia ? `${anio}-${mes}-${dia}` : null;
}

/** 'YYYY-MM-DD' → '16/09/2026'. */
export function formatearFecha(iso: string | null | undefined): string {
  const fecha = normalizarFechaCivil(iso);
  if (!fecha) return '—';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** 12 → 'en 12 días' · 0 → 'hoy' · -3 → 'vencido hace 3 días'. */
export function textoDiasRestantes(dias: number): string {
  if (dias === 0) return 'hoy';
  if (dias > 0) return `en ${dias} día${dias === 1 ? '' : 's'}`;
  const vencido = Math.abs(dias);
  return `vencido hace ${vencido} día${vencido === 1 ? '' : 's'}`;
}

/**
 * 'YYYY-MM-DD' de hoy en America/Costa_Rica.
 *
 * `Intl.DateTimeFormat('en-CA', …)` ya devuelve ese formato directamente —
 * misma técnica que `hoyLocal()` en el backend.
 */
export function hoyLocal(): string {
  const fecha = normalizarFechaCivil(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_COSTA_RICA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
  );
  if (!fecha) throw new RangeError('No se pudo obtener la fecha local de la finca.');
  return fecha;
}

/** Diferencia en días de calendario, independiente del huso horario navegador. */
export function diferenciaDiasCivil(inicio: string, fin: string): number | null {
  const fechaInicio = normalizarFechaCivil(inicio);
  const fechaFin = normalizarFechaCivil(fin);
  if (!fechaInicio || !fechaFin) return null;
  const a = fechaInicio.split('-').map(Number);
  const b = fechaFin.split('-').map(Number);
  return (
    (Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) /
    (24 * 60 * 60 * 1000)
  );
}

/** Suma días de calendario sin convertir una fecha civil a la zona del navegador. */
export function sumarDiasCivil(fecha: string, dias: number): string | null {
  const fechaCivil = normalizarFechaCivil(fecha);
  if (!fechaCivil || !Number.isInteger(dias)) return null;
  const [anio, mes, dia] = fechaCivil.split('-').map(Number);
  const resultado = new Date(Date.UTC(anio, mes - 1, dia + dias));
  return [
    String(resultado.getUTCFullYear()).padStart(4, '0'),
    String(resultado.getUTCMonth() + 1).padStart(2, '0'),
    String(resultado.getUTCDate()).padStart(2, '0'),
  ].join('-');
}
