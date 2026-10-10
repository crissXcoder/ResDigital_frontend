import { fetchApi } from './client';
import type { components } from './openapi.generated';
import type { EstadoReproductivoResponse } from '../reproductivo/tipos';
import type { ServicioInput, DiagnosticoInput } from './reproductivo';
export interface Raza {
  id: string;
  nombre: string;
  dias_gestacion: number; // In DB it's dias_gestacion? Wait, catalogo_raza entity. Let's check it later.
}

export interface Animal {
  id: string;
  tenantId: string;
  nombre?: string;
  areteInterno: string;
  numeroOficialDiio?: string;
  sexo: string;
  razaId: string;
  razaOtra?: string;
  fechaNacimiento?: string;
  categoria: string;
  activo: boolean;
  madreId?: string;
  padreId?: string;
  madre?: Animal;
  padre?: Animal;
  fotoUrl?: string;
  raza?: Raza;
  
  // Nuevos campos
  origen?: 'Finca' | 'Externa';
  compradoA?: string;
  fechaCompra?: string;
  valorCompraCrc?: number;
  numeroGuia?: string;
  metodoCompra?: 'Sinpe' | 'Depósito' | 'Efectivo' | 'Combinado';
  metodosCombinados?: string[];
  referenciaPago?: string;
  
  // Campos faltantes (TS Errors)
  pesoActualKg?: number | null;
  uaCalculada?: number;
  metodoCalculoUa?: 'PESO' | 'CATEGORIA';
  potreroId?: string;
  potrero?: { id: string; nombre: string; };
  tipoBaja?: string;
  motivoBaja?: string;
  fechaBaja?: string | null;
  precioVentaCrc?: number | null;
  pesoFinalKg?: number;
}

export interface CreateAnimalInput {
  nombre: string;
  areteInterno: string;
  sexo: string;
  razaId: string;
  categoria: string;
  numeroOficialDiio?: string;
  razaOtra?: string;
  potreroId?: string;
  fechaNacimiento?: string;
  pesoActualKg?: number | null;
  fotoUrl?: string;
  madreId?: string;
  padreId?: string;
  padreExternoDescripcion?: string;
  origen?: 'Finca' | 'Externa';
  compradoA?: string;
  fechaCompra?: string;
  valorCompraCrc?: number | null;
  numeroGuia?: string;
  metodoCompra?: 'Sinpe' | 'Depósito' | 'Efectivo' | 'Combinado';
  metodosCombinados?: string[];
  referenciaPago?: string;
}
export type UpdateAnimalInput = { [K in keyof CreateAnimalInput]?: CreateAnimalInput[K] | null };
export interface BajaAnimalInput {
  tipoBaja: string;
  motivoBaja?: string;
  fechaBaja: string;
  precioVentaCrc?: number;
  pesoFinalKg?: number | null;
}
export interface EventoBajaResponse {
  eventoId: string | null;
  tipoBaja: string;
  motivo?: string | null;
  fechaBaja: string;
  fechaRegistro?: string;
  precioVentaCrc?: number | null;
  pesoFinalKg?: number | null;
  usuarioId?: string | null;
}
export type CreatePesajeInput = components['schemas']['CreatePesajeDto'];
export interface Pesaje {
  id: string;
  animalId: string;
  fecha: string;
  /** La API serializa numeric como texto. */
  pesoActualKg: number | string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}
export type DocumentoAnimal = components['schemas']['DocumentoAnimalResponseDto'];

export const getRazas = async (): Promise<Raza[]> => {
  return await fetchApi<Raza[]>('/catalogos/razas');
};

export const getAnimales = async (filters: Record<string, string> = {}): Promise<Animal[]> => {
  const queryParams = new URLSearchParams(filters).toString();
  const url = queryParams ? `/animales?${queryParams}` : '/animales';
  return await fetchApi<Animal[]>(url);
};

export const getAnimal = async (id: string): Promise<Animal> => {
  return fetchApi<Animal>(`/animales/${id}`);
};

export const createAnimal = async (animalData: CreateAnimalInput): Promise<Animal> => {
  return fetchApi<Animal>('/animales', {
    method: 'POST',
    body: JSON.stringify(animalData),
  });
};

export const getDocumentos = async (animalId: string): Promise<DocumentoAnimal[]> => {
  return fetchApi<DocumentoAnimal[]>(`/animales/${animalId}/documentos`);
};

export const createDocumento = async (
  animalId: string,
  docData: components['schemas']['CreateDocumentoDto'],
): Promise<DocumentoAnimal> => {
  return fetchApi<DocumentoAnimal>(`/animales/${animalId}/documentos`, {
    method: 'POST',
    body: JSON.stringify(docData),
  });
};

export const updateAnimal = async (id: string, animalData: UpdateAnimalInput): Promise<Animal> => {
  return fetchApi<Animal>(`/animales/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(animalData),
  });
};

export const darDeBajaAnimal = async (id: string, data: BajaAnimalInput): Promise<Animal> => {
  return fetchApi<Animal>(`/animales/${id}/baja`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getBajaAnimal = async (id: string): Promise<EventoBajaResponse> => {
  return fetchApi<EventoBajaResponse>(`/animales/${id}/baja`);
};

export const createPesaje = async (pesaje: CreatePesajeInput): Promise<Pesaje> => {
  return fetchApi<Pesaje>('/pesajes', {
    method: 'POST',
    body: JSON.stringify(pesaje),
  });
};

export const getPesajesByAnimal = async (animalId: string): Promise<Pesaje[]> => {
  return fetchApi<Pesaje[]>(`/pesajes/animal/${animalId}`);
};

export const getEstadoReproductivo = async (animalId: string): Promise<EstadoReproductivoResponse> => {
  return fetchApi<EstadoReproductivoResponse>(`/animales/${animalId}/estado-reproductivo`);
};

export const createServicioReproductivo = async (animalId: string, data: ServicioInput): Promise<components['schemas']['RegistrarServicioResponseDto']> => {
  return fetchApi<components['schemas']['RegistrarServicioResponseDto']>(`/animales/${animalId}/servicios`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const createDiagnosticoReproductivo = async (animalId: string, data: DiagnosticoInput): Promise<components['schemas']['RegistrarDiagnosticoResponseDto']> => {
  return fetchApi<components['schemas']['RegistrarDiagnosticoResponseDto']>(`/animales/${animalId}/diagnosticos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
