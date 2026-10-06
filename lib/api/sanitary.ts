import { fetchApi } from './client';

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

export interface TratamientoSanitario {
  id: string;
  tenantId?: string;
  animalId: string;
  farmaco: string;
  dosis: string;
  via: string | null;
  fecha: string; // YYYY-MM-DD
  diagnostico: string;
  veterinario: string | null;
  diasRetiro: number;
  diasRetiroLeche: number;
  diasRetiroCarne: number;
  fechaLiberacionLeche: string | null;
  fechaLiberacionCarne: string | null;
  documentoUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTratamientoDto {
  animalId: string;
  farmaco: string;
  dosis: string;
  via?: string;
  fecha: string;
  diagnostico: string;
  veterinario?: string;
  diasRetiro?: number;
  diasRetiroLeche?: number;
  diasRetiroCarne?: number;
  documentoUrl?: string | null;
}

export interface UpdateTratamientoDto {
  farmaco?: string;
  dosis?: string;
  via?: string;
  fecha?: string;
  diagnostico?: string;
  veterinario?: string;
  diasRetiro?: number;
  diasRetiroLeche?: number;
  diasRetiroCarne?: number;
  documentoUrl?: string | null;
}

export interface EstadoSanitario {
  animalId: string;
  enRetiro: boolean;
  liberacionLeche: string | null;
  liberacionCarne: string | null;
  diasRestantesLeche: number;
  diasRestantesCarne: number;
  tratamientoReferencia: { id: string; farmaco: string } | null;
}

const CREATE_WHITELIST = [
  'animalId',
  'farmaco',
  'dosis',
  'via',
  'fecha',
  'diagnostico',
  'veterinario',
  'diasRetiro',
  'diasRetiroLeche',
  'diasRetiroCarne',
  'documentoUrl',
] as const;

/**
 * Mapea datos del modal (snake_case o camelCase) a un payload whitelist
 * compatible con ValidationPipe forbidNonWhitelisted.
 */
export function toCreateTratamientoPayload(
  input: Record<string, unknown>,
  animalId: string,
): CreateTratamientoDto {
  const lecheRaw =
    input.diasRetiroLeche ?? input.dias_retiro_leche ?? input.diasRetiro ?? input.dias_retiro ?? 0;
  const carneRaw =
    input.diasRetiroCarne ?? input.dias_retiro_carne ?? input.diasRetiro ?? input.dias_retiro ?? 0;
  const diasRetiroLeche = Number(lecheRaw) || 0;
  const diasRetiroCarne = Number(carneRaw) || 0;
  const diasRetiro =
    Number(input.diasRetiro ?? input.dias_retiro) ||
    Math.max(diasRetiroLeche, diasRetiroCarne);

  const payload: CreateTratamientoDto = {
    animalId,
    farmaco: String(input.farmaco ?? ''),
    dosis: String(input.dosis ?? ''),
    fecha: String(input.fecha ?? '').slice(0, 10),
    diagnostico: String(input.diagnostico ?? ''),
    diasRetiro,
    diasRetiroLeche,
    diasRetiroCarne,
  };

  if (input.via != null && input.via !== '') payload.via = String(input.via);
  if (input.veterinario != null && input.veterinario !== '') {
    payload.veterinario = String(input.veterinario);
  }
  if (input.documentoUrl != null && input.documentoUrl !== '') {
    payload.documentoUrl = String(input.documentoUrl);
  }

  // Garantizar que no escapen claves fuera de whitelist
  const cleaned = {} as CreateTratamientoDto;
  for (const key of CREATE_WHITELIST) {
    if (key in payload && (payload as unknown as Record<string, unknown>)[key] !== undefined) {
      (cleaned as unknown as Record<string, unknown>)[key] = (payload as unknown as Record<string, unknown>)[key];
    }
  }
  return cleaned;
}

export function toUpdateTratamientoPayload(
  input: Record<string, unknown>,
): UpdateTratamientoDto {
  const base = toCreateTratamientoPayload(input, '00000000-0000-0000-0000-000000000000');
  const { animalId: _omit, ...rest } = base;
  void _omit;
  return rest;
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

export async function createTratamiento(payload: CreateTratamientoDto): Promise<TratamientoSanitario> {
  return await fetchApi<TratamientoSanitario>('/tratamientos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTratamiento(
  id: string,
  payload: UpdateTratamientoDto,
): Promise<TratamientoSanitario> {
  return await fetchApi<TratamientoSanitario>(`/tratamientos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
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
