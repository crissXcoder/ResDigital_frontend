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


export interface FilaImportarProduccionLeche {
  fecha: string;
  turno: TurnoOrdeno;
  areteInterno: string;
  litros: number;
  notas?: string;
}

export interface ImportarProduccionLecheInput {
  filas: FilaImportarProduccionLeche[];
}

export interface ImportarLoteResponse {
  totalImportados: number;
  litrosTotales: number;
  litrosComercializables: number;
  litrosDescarte: number;
  registros: ProduccionLeche[];
}

export async function importarProduccionLote(
  input: ImportarProduccionLecheInput,
): Promise<ImportarLoteResponse> {
  return await fetchApi<ImportarLoteResponse>('/produccion-leche/lote', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function generarPlantillaCsvProduccion(): string {
  const encabezado = 'fecha,turno,arete_interno,litros,notas';
  const filaEjemplo1 = '2026-10-21,Mañana,101,15.5,Ordeño matutino';
  const filaEjemplo2 = '2026-10-21,Tarde,102,12.0,';
  return `${encabezado}\n${filaEjemplo1}\n${filaEjemplo2}\n`;
}

export function parsearCsvProduccion(csvText: string): {
  filas: FilaImportarProduccionLeche[];
  errores: string[];
} {
  const lineas = csvText
    .replace(/^\uFEFF/, '') // Quitar BOM si existe
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lineas.length <= 1) {
    return {
      filas: [],
      errores: ['El archivo CSV está vacío o solo contiene la cabecera.'],
    };
  }

  const cabecera = lineas[0].toLowerCase().split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const colFecha = cabecera.indexOf('fecha');
  const colTurno = cabecera.indexOf('turno');
  const colArete = cabecera.findIndex((h) => h === 'arete_interno' || h === 'arete' || h === 'areteinterno');
  const colLitros = cabecera.indexOf('litros');
  const colNotas = cabecera.indexOf('notas');

  if (colFecha === -1 || colTurno === -1 || colArete === -1 || colLitros === -1) {
    return {
      filas: [],
      errores: [
        'Formato inválido. Las columnas requeridas son: fecha, turno, arete_interno, litros, notas.',
      ],
    };
  }

  const filas: FilaImportarProduccionLeche[] = [];
  const errores: string[] = [];

  const registrosLineas = lineas.slice(1);
  if (registrosLineas.length > 200) {
    errores.push(`El archivo contiene ${registrosLineas.length} filas. El máximo permitido por lote es 200.`);
    return { filas: [], errores };
  }

  for (let i = 0; i < registrosLineas.length; i++) {
    const numFila = i + 2; // +1 cabecera, +1 base 1
    const parts = registrosLineas[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));

    const fechaRaw = parts[colFecha] || '';
    const turnoRaw = parts[colTurno] || '';
    const areteRaw = (parts[colArete] || '').replace(/^#/, '').trim();
    const litrosRaw = parts[colLitros] || '';
    let notasRaw = colNotas !== -1 && parts[colNotas] ? parts[colNotas] : undefined;

    // Sanitización contra inyección de fórmulas CSV (=, +, -, @)
    if (notasRaw && /^[=+\-@]/.test(notasRaw)) {
      notasRaw = `'${notasRaw}`;
    }

    // Validar fecha (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaRaw)) {
      errores.push(`Fila ${numFila}: Fecha '${fechaRaw}' inválida. Debe tener formato YYYY-MM-DD.`);
      continue;
    }

    // Validar turno
    const turnoNorm = turnoRaw.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let turno: TurnoOrdeno;
    if (turnoNorm === 'MANANA') {
      turno = 'MANANA';
    } else if (turnoNorm === 'TARDE') {
      turno = 'TARDE';
    } else {
      errores.push(`Fila ${numFila}: Turno '${turnoRaw}' inválido. Debe ser 'Mañana' o 'Tarde'.`);
      continue;
    }

    // Validar arete
    if (!areteRaw) {
      errores.push(`Fila ${numFila}: El arete interno es requerido.`);
      continue;
    }

    // Validar litros
    const litros = Number(litrosRaw);
    if (isNaN(litros) || litros <= 0 || litros > 60) {
      errores.push(`Fila ${numFila}: Litros '${litrosRaw}' inválido. Debe ser un número entre 0.1 y 60.`);
      continue;
    }

    filas.push({
      fecha: fechaRaw,
      turno,
      areteInterno: areteRaw,
      litros: Math.round(litros * 10) / 10,
      notas: notasRaw,
    });
  }

  return { filas, errores };
}
