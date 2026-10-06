import { fetchApi } from './client';
import type { AnimalEnRetiro } from '@/lib/types/dashboard';

export interface Medicamento {
  id: string;
  tenantId?: string;
  nombreComercial: string;
  principioActivo: string | null;
  viaAdministracion: string | null;
  diasRetiroLecheDefault: number;
  diasRetiroCarneDefault: number;
}

export interface Padecimiento {
  id: string;
  tenantId?: string;
  nombre: string;
  categoria: string | null;
  medicamentoSugeridoId: string | null;
  medicamentoSugerido?: Medicamento | null;
}

/** Tratamiento vigente tal como lo devuelve la API (id = evento TRATAMIENTO). */
export interface TratamientoSanitario {
  id: string;
  animalId: string;
  fecha: string; // YYYY-MM-DD, aplicación
  fechaUltimaAdministracion: string;
  medicamentoId: string | null;
  farmaco: string;
  padecimientoId: string | null;
  diagnostico: string;
  dosis: string;
  via: string | null;
  veterinario: string | null;
  diasRetiroLeche: number;
  diasRetiroCarne: number;
  fechaLiberacionLeche: string;
  fechaLiberacionCarne: string;
  documentoUrl: string | null;
  usuarioId: string;
  eventoCorrigeId: string | null;
  fechaRegistro: string;
}

export interface DatosTratamientoDto {
  medicamentoId?: string;
  farmaco?: string;
  padecimientoId?: string;
  diagnostico?: string;
  dosis: string;
  via?: string;
  fecha: string;
  fechaUltimaAdministracion?: string;
  veterinario?: string;
  diasRetiroLeche: number;
  diasRetiroCarne: number;
  documentoUrl?: string;
}

export interface CreateTratamientoDto extends DatosTratamientoDto {
  animalId: string;
}

export type CorregirTratamientoDto = DatosTratamientoDto;

export interface AnulacionTratamiento {
  id: string;
  eventoAnulacionId: string;
  motivo: string;
}

export interface EstadoSanitario {
  animalId: string;
  enRetiro: boolean;
  liberacionLeche: string | null;
  liberacionCarne: string | null;
  diasRestantesLeche: number;
  diasRestantesCarne: number;
  tratamientoReferencia: {
    id: string;
    farmaco: string;
    fechaAplicacion: string | null;
  } | null;
}

export interface RetiroActivo extends AnimalEnRetiro {
  tratamientoReferencia: EstadoSanitario['tratamientoReferencia'];
}

function texto(valor: unknown): string | undefined {
  if (valor == null) return undefined;
  const limpio = String(valor).trim();
  return limpio === '' ? undefined : limpio;
}

/**
 * Construye el cuerpo exacto que acepta la API (ValidationPipe con
 * forbidNonWhitelisted): solo claves conocidas y sin el legado `diasRetiro`.
 */
export function toDatosTratamientoPayload(
  input: Record<string, unknown>,
): DatosTratamientoDto {
  const payload: DatosTratamientoDto = {
    dosis: String(input.dosis ?? '').trim(),
    fecha: String(input.fecha ?? '').slice(0, 10),
    diasRetiroLeche: Number(input.diasRetiroLeche) || 0,
    diasRetiroCarne: Number(input.diasRetiroCarne) || 0,
  };

  const medicamentoId = texto(input.medicamentoId);
  if (medicamentoId) payload.medicamentoId = medicamentoId;
  else {
    const farmaco = texto(input.farmaco);
    if (farmaco) payload.farmaco = farmaco;
  }

  const padecimientoId = texto(input.padecimientoId);
  if (padecimientoId) payload.padecimientoId = padecimientoId;
  else {
    const diagnostico = texto(input.diagnostico);
    if (diagnostico) payload.diagnostico = diagnostico;
  }

  const ultima = texto(input.fechaUltimaAdministracion)?.slice(0, 10);
  if (ultima && ultima !== payload.fecha) payload.fechaUltimaAdministracion = ultima;

  const via = texto(input.via);
  if (via) payload.via = via;
  const veterinario = texto(input.veterinario);
  if (veterinario) payload.veterinario = veterinario;
  const documentoUrl = texto(input.documentoUrl);
  if (documentoUrl) payload.documentoUrl = documentoUrl;

  return payload;
}

export function toCreateTratamientoPayload(
  input: Record<string, unknown>,
  animalId: string,
): CreateTratamientoDto {
  return { animalId, ...toDatosTratamientoPayload(input) };
}

export async function getMedicamentos(): Promise<Medicamento[]> {
  return await fetchApi<Medicamento[]>('/catalogos/medicamentos');
}

export async function getPadecimientos(): Promise<Padecimiento[]> {
  return await fetchApi<Padecimiento[]>('/catalogos/padecimientos');
}

export async function getTratamientosByAnimal(animalId: string): Promise<TratamientoSanitario[]> {
  return await fetchApi<TratamientoSanitario[]>(`/tratamientos/animal/${animalId}`);
}

export async function getEstadoSanitario(
  animalId: string,
  fechaReferencia?: string,
): Promise<EstadoSanitario> {
  const qs = fechaReferencia
    ? `?fechaReferencia=${encodeURIComponent(fechaReferencia)}`
    : '';
  return await fetchApi<EstadoSanitario>(`/tratamientos/animal/${animalId}/estado-sanitario${qs}`);
}

export async function getRetirosActivos(fechaReferencia?: string): Promise<RetiroActivo[]> {
  const qs = fechaReferencia
    ? `?fechaReferencia=${encodeURIComponent(fechaReferencia)}`
    : '';
  return await fetchApi<RetiroActivo[]>(`/tratamientos/retiros-activos${qs}`);
}

export async function createTratamiento(payload: CreateTratamientoDto): Promise<TratamientoSanitario> {
  return await fetchApi<TratamientoSanitario>('/tratamientos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function corregirTratamiento(
  id: string,
  payload: CorregirTratamientoDto,
): Promise<TratamientoSanitario> {
  return await fetchApi<TratamientoSanitario>(`/tratamientos/${id}/correccion`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function anularTratamiento(
  id: string,
  motivo: string,
): Promise<AnulacionTratamiento> {
  return await fetchApi<AnulacionTratamiento>(`/tratamientos/${id}/anulacion`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}

export function parseDateComponents(dateStr: string): { year: number; month: number; day: number } {
  const cleanStr = (dateStr || '').split('T')[0];
  const parts = cleanStr.split('-').map(Number);
  return {
    year: parts[0] || 0,
    month: (parts[1] || 1) - 1,
    day: parts[2] || 1,
  };
}

export function calcularFechaLiberacion(fechaIso: string, dias: number): string {
  if (!fechaIso || dias == null || isNaN(dias) || dias < 0) return '';
  const { year, month, day } = parseDateComponents(fechaIso);
  if (!year) return '';

  const d = new Date(Date.UTC(year, month, day + dias));
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatearFecha(dateStr: string): string {
  if (!dateStr) return '-';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  const [yyyy, mm, dd] = parts;
  return `${dd}/${mm}/${yyyy}`;
}

export function diasRestantesRetiro(fechaLiberacionIso: string, fechaReferencia?: string): number {
  if (!fechaLiberacionIso) return 0;
  const lib = parseDateComponents(fechaLiberacionIso);
  const now = fechaReferencia ? parseDateComponents(fechaReferencia) : (() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
  })();

  const libTime = Date.UTC(lib.year, lib.month, lib.day);
  const nowTime = Date.UTC(now.year, now.month, now.day);
  const diffDays = Math.ceil((libTime - nowTime) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
