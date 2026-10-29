import { fetchApi } from './client';
import type { components } from './openapi.generated';
import { hoyLocal } from '../reproductivo/fechas';

type Schemas = components['schemas'];

export type TurnoOrdeno = Schemas['CreateProduccionLecheDto']['turno'];
export type DisposicionLeche = Schemas['ProduccionLecheResponseDto']['disposicion'];
export type CreateProduccionLecheInput = Schemas['CreateProduccionLecheDto'];
export type UpdateProduccionLecheInput = {
  litros: number;
  notas?: string;
  motivo: string;
};
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

export async function updateProduccionLeche(
  id: string,
  payload: UpdateProduccionLecheInput,
): Promise<ProduccionLeche> {
  return await fetchApi<ProduccionLeche>(`/produccion-leche/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getProduccionRegistros(desde: string, hasta: string): Promise<ProduccionLeche[]> {
  return await fetchApi<ProduccionLeche[]>(`/produccion-leche/registros${query({ desde, hasta })}`);
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
  const fecha = hoyLocal();
  const filaEjemplo1 = `${fecha},Mañana,101,15.5,Ejemplo: reemplace los datos`;
  const filaEjemplo2 = `${fecha},Tarde,102,12.0,`;
  return `${encabezado}\n${filaEjemplo1}\n${filaEjemplo2}\n`;
}

interface RegistroCsv {
  campos: string[];
}

function leerRegistrosCsv(texto: string): { registros: RegistroCsv[]; error?: string } {
  const registros: RegistroCsv[] = [];
  let campos: string[] = [];
  let campo = '';
  let citado = false;
  let comillaCerrada = false;
  let lineaFisica = 1;
  let lineaRegistro = 1;

  const terminarCampo = () => {
    campos.push(campo);
    campo = '';
    comillaCerrada = false;
  };
  const terminarRegistro = () => {
    terminarCampo();
    if (campos.some((valor) => valor.trim() !== '')) registros.push({ campos });
    campos = [];
    lineaRegistro = lineaFisica + 1;
  };

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto[i];
    if (citado) {
      if (caracter === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (caracter === '"') {
        citado = false;
        comillaCerrada = true;
      } else if (caracter === '\n' || caracter === '\r') {
        if (caracter === '\r' && texto[i + 1] === '\n') i++;
        campo += '\n';
        lineaFisica++;
      } else {
        campo += caracter;
      }
      continue;
    }

    if (comillaCerrada) {
      if (caracter === ',') terminarCampo();
      else if (caracter === '\n' || (caracter === '\r' && texto[i + 1] === '\n')) {
        if (caracter === '\r') i++;
        terminarRegistro();
        lineaFisica++;
      } else {
        return { registros: [], error: `Línea ${lineaFisica}: hay texto después de cerrar una celda entre comillas.` };
      }
      continue;
    }

    if (caracter === '"') {
      if (campo.length !== 0) {
        return { registros: [], error: `Línea ${lineaFisica}: las comillas deben iniciar una celda.` };
      }
      citado = true;
    } else if (caracter === ',') {
      terminarCampo();
    } else if (caracter === '\n' || (caracter === '\r' && texto[i + 1] === '\n')) {
      if (caracter === '\r') i++;
      terminarRegistro();
      lineaFisica++;
    } else if (caracter === '\r') {
      return { registros: [], error: `Línea ${lineaFisica}: use saltos de línea LF o CRLF.` };
    } else {
      campo += caracter;
    }
  }

  if (citado) return { registros: [], error: `Línea ${lineaRegistro}: hay una celda entre comillas sin cerrar.` };
  if (campo !== '' || campos.length > 0) terminarRegistro();
  return { registros };
}

function esFechaCivil(fecha: string): boolean {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!partes) return false;
  const [, anio, mes, dia] = partes.map(Number);
  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));
  return fechaUtc.getUTCFullYear() === anio && fechaUtc.getUTCMonth() === mes - 1 && fechaUtc.getUTCDate() === dia;
}

export function parsearCsvProduccion(csvText: string): {
  filas: FilaImportarProduccionLeche[];
  errores: string[];
} {
  if (new TextEncoder().encode(csvText).byteLength > 4 * 1024 * 1024) {
    return { filas: [], errores: ['El archivo supera el tamaño máximo de 4 MiB.'] };
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(csvText)) {
    return { filas: [], errores: ['El archivo contiene caracteres de control no permitidos.'] };
  }

  const { registros, error } = leerRegistrosCsv(csvText.replace(/^\uFEFF/, ''));
  if (error) return { filas: [], errores: [error] };
  if (registros.length <= 1) {
    return {
      filas: [],
      errores: ['El archivo CSV está vacío o solo contiene la cabecera.'],
    };
  }

  const alias: Record<string, string> = { arete: 'arete_interno', areteinterno: 'arete_interno' };
  const cabecera = registros[0].campos.map((valor) => alias[valor.trim().toLowerCase()] ?? valor.trim().toLowerCase());
  const permitidas = new Set(['fecha', 'turno', 'arete_interno', 'litros', 'notas']);
  const duplicadas = cabecera.filter((valor, indice) => cabecera.indexOf(valor) !== indice);
  const desconocidas = cabecera.filter((valor) => !permitidas.has(valor));
  if (duplicadas.length > 0) return { filas: [], errores: [`La columna '${duplicadas[0]}' está duplicada.`] };
  if (desconocidas.length > 0) return { filas: [], errores: [`La columna '${desconocidas[0]}' es desconocida.`] };
  const colFecha = cabecera.indexOf('fecha');
  const colTurno = cabecera.indexOf('turno');
  const colArete = cabecera.indexOf('arete_interno');
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

  const registrosLineas = registros.slice(1);
  if (registrosLineas.length > 200) {
    errores.push(`El archivo contiene ${registrosLineas.length} filas. El máximo permitido por lote es 200.`);
    return { filas: [], errores };
  }

  for (let i = 0; i < registrosLineas.length; i++) {
    const numFila = i + 1;
    const parts = registrosLineas[i].campos;
    if (parts.length !== cabecera.length) {
      errores.push(`Fila ${numFila}: La cantidad de celdas no coincide con la cabecera.`);
      continue;
    }

    const fechaRaw = (parts[colFecha] || '').trim();
    const turnoRaw = (parts[colTurno] || '').trim();
    const areteRaw = (parts[colArete] || '').trim();
    const litrosRaw = (parts[colLitros] || '').trim();
    const notas = colNotas !== -1 ? parts[colNotas] : '';
    const notasRaw = notas === '' ? undefined : notas;

    if (!esFechaCivil(fechaRaw)) {
      errores.push(`Fila ${numFila}: Fecha '${fechaRaw}' inválida. Debe tener formato YYYY-MM-DD.`);
      continue;
    }
    if (fechaRaw > hoyLocal()) {
      errores.push(`Fila ${numFila}: La fecha no puede ser futura.`);
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
    if (!/^\d+(?:\.\d)?$/.test(litrosRaw) || !Number.isFinite(litros) || litros <= 0 || litros > 60) {
      errores.push(`Fila ${numFila}: Litros '${litrosRaw}' inválido. Debe ser un número entre 0.1 y 60.`);
      continue;
    }

    if (notasRaw && notasRaw.length > 2000) {
      errores.push(`Fila ${numFila}: Las notas no pueden superar 2000 caracteres.`);
      continue;
    }
    const duplicado = filas.some((fila) => fila.fecha === fechaRaw && fila.turno === turno && fila.areteInterno === areteRaw);
    if (duplicado) {
      errores.push(`Fila ${numFila}: Registro duplicado para el mismo arete, fecha y turno.`);
      continue;
    }

    filas.push({
      fecha: fechaRaw,
      turno,
      areteInterno: areteRaw,
      litros,
      notas: notasRaw,
    });
  }

  return { filas: errores.length === 0 ? filas : [], errores };
}
