import { sumarDiasCivil } from './fechas';

/** Edad civil mínima para servicio o diagnóstico de preñez. */
export const MESES_MINIMOS_PARA_PRENEZ = 15;

/** Categoría que no entra al ciclo. El resto de hembras adultas sí. */
export const CATEGORIAS_HEMBRA_NO_REPRODUCTORA = ['Ternera'] as const;

/** Piso de la ventana de palpación (35–45 días). No se rechaza un diagnóstico tardío. */
export const DIAS_MINIMOS_POST_SERVICIO_DIAGNOSTICO = 35;

/** Un parto viable no se registra antes de este porcentaje de la gestación de la raza. */
export const FRACCION_MINIMA_GESTACION_PARTO = 0.6;

export function puedeQuedarPreniada(estado: {
  aptoParaPreniez?: boolean;
}): boolean {
  return estado.aptoParaPreniez !== false;
}

export function fechaMinimaDiagnostico(
  fechaServicio: string | undefined,
): string | null {
  if (!fechaServicio) return null;
  return sumarDiasCivil(fechaServicio, DIAS_MINIMOS_POST_SERVICIO_DIAGNOSTICO);
}

export function mensajeDiagnosticoPrematuro(fechaMinima: string): string {
  return `El diagnóstico no puede ser anterior al ${fechaMinima} (35 días post-servicio).`;
}

export function fechaMinimaPartoViable(
  fechaServicio: string | undefined,
  diasGestacion: number | undefined,
): string | null {
  if (!fechaServicio || !diasGestacion || diasGestacion <= 0) return null;
  return sumarDiasCivil(
    fechaServicio,
    Math.floor(diasGestacion * FRACCION_MINIMA_GESTACION_PARTO),
  );
}

export function mensajePartoPrematuro(fechaMinima: string): string {
  return `Un parto viable no puede ser anterior al ${fechaMinima} (60 % de la gestación de la raza). Un aborto sí puede registrarse antes.`;
}
