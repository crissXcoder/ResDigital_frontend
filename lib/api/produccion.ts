import { fetchApi } from './client';
import type { components } from './openapi.generated';

type Schemas = components['schemas'];

export type TurnoOrdeno = Schemas['CreateProduccionLecheDto']['turno'];
export type DisposicionLeche = Schemas['ProduccionLecheResponseDto']['disposicion'];
export type CreateProduccionLecheInput = Schemas['CreateProduccionLecheDto'];
export type ProduccionLeche = Schemas['ProduccionLecheResponseDto'];
export type AnulacionProduccion = Schemas['AnulacionProduccionResponseDto'];
export type ResumenProduccion = Schemas['ResumenProduccionDto'];
export type EstadoLactancia = Schemas['EstadoLactanciaDto'];
export type HembraEnLactancia = Schemas['HembraEnLactanciaDto'];
export type EventoLactancia = Schemas['EventoLactanciaResponseDto'];
export type RegistrarEventoLactanciaInput = Schemas['RegistrarEventoLactanciaDto'];
export type CreatePesajeInput = Schemas['CreatePesajeDto'];

export const MAX_LITROS_TURNO = 60;

export const ETIQUETA_TURNO: Record<TurnoOrdeno, string> = {
  MANANA: 'Mañana',
  TARDE: 'Tarde',
};

export const ETIQUETA_DISPOSICION: Record<DisposicionLeche, string> = {
  COMERCIALIZABLE: 'Comercializable',
  DESCARTE: 'Descarte',
};

export interface ProduccionDiaria {
  fecha: string;
  producidos: number;
  comercializables: number;
}

/** Totales por fecha (ascendente) para la gráfica; los anulados no cuentan. */
export function agruparProduccionPorFecha(registros: ProduccionLeche[]): ProduccionDiaria[] {
  const porFecha = new Map<string, ProduccionDiaria>();
  for (const r of registros) {
    if (r.revertido) continue;
    const dia = porFecha.get(r.fecha) ?? { fecha: r.fecha, producidos: 0, comercializables: 0 };
    dia.producidos += Number(r.litros);
    if (r.disposicion === 'COMERCIALIZABLE') dia.comercializables += Number(r.litros);
    porFecha.set(r.fecha, dia);
  }
  return [...porFecha.values()]
    .map((d) => ({
      ...d,
      producidos: Math.round(d.producidos * 10) / 10,
      comercializables: Math.round(d.comercializables * 10) / 10,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function query(params: Record<string, string | undefined>): string {
  const entradas = Object.entries(params).filter(
    (e): e is [string, string] => !!e[1],
  );
  if (entradas.length === 0) return '';
  return `?${new URLSearchParams(entradas).toString()}`;
}

/** El pesaje solo lleva peso: la API rechaza cualquier campo de leche. */
export function toCreatePesajePayload(input: {
  animalId: string;
  fecha: string;
  pesoActualKg: string | number;
}): CreatePesajeInput {
  return {
    animalId: input.animalId,
    fecha: String(input.fecha).slice(0, 10),
    pesoActualKg: Math.round(Number(input.pesoActualKg) * 10) / 10,
  };
}

/** Cuerpo exacto que acepta la API: sin disposición, litros con un decimal. */
export function toCreateProduccionPayload(input: {
  animalId: string;
  fecha: string;
  turno: TurnoOrdeno;
  litros: string | number;
  notas?: string;
}): CreateProduccionLecheInput {
  const payload: CreateProduccionLecheInput = {
    animalId: input.animalId,
    fecha: String(input.fecha).slice(0, 10),
    turno: input.turno,
    litros: Math.round(Number(input.litros) * 10) / 10,
  };
  const notas = input.notas?.trim();
  if (notas) payload.notas = notas;
  return payload;
}

export async function createProduccionLeche(
  payload: CreateProduccionLecheInput,
): Promise<ProduccionLeche> {
  return await fetchApi<ProduccionLeche>('/produccion-leche', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getProduccionByAnimal(animalId: string): Promise<ProduccionLeche[]> {
  return await fetchApi<ProduccionLeche[]>(`/produccion-leche/animal/${animalId}`);
}

export async function getResumenProduccion(desde?: string, hasta?: string): Promise<ResumenProduccion> {
  return await fetchApi<ResumenProduccion>(`/produccion-leche/resumen${query({ desde, hasta })}`);
}

export async function anularProduccion(id: string, motivo: string): Promise<AnulacionProduccion> {
  return await fetchApi<AnulacionProduccion>(`/produccion-leche/${id}/anulacion`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}

export async function getEstadoLactancia(animalId: string, fecha?: string): Promise<EstadoLactancia> {
  return await fetchApi<EstadoLactancia>(`/lactancia/animal/${animalId}${query({ fecha })}`);
}

export async function getHembrasEnLactancia(fecha?: string): Promise<HembraEnLactancia[]> {
  return await fetchApi<HembraEnLactancia[]>(`/lactancia/activas${query({ fecha })}`);
}

export async function iniciarLactancia(
  animalId: string,
  input: RegistrarEventoLactanciaInput,
): Promise<EventoLactancia> {
  return await fetchApi<EventoLactancia>(`/lactancia/animal/${animalId}/inicio`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function finalizarLactancia(
  animalId: string,
  input: RegistrarEventoLactanciaInput,
): Promise<EventoLactancia> {
  return await fetchApi<EventoLactancia>(`/lactancia/animal/${animalId}/fin`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
