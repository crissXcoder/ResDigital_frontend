import { fetchApi } from './client';
import type { EstadoReproductivoResponse, HitosReproductivos } from '../reproductivo/tipos';
import type { ServicioInput, DiagnosticoInput } from './reproductivo';
import type { CreateTratamientoDto, UpdateTratamientoDto, TratamientoSanitario } from './sanitary';

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
  pesoActualKg?: number;
  potreroId?: string;
  potrero?: { id: string; nombre: string; };
  tipoBaja?: string;
  motivoBaja?: string;
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
export interface CreatePesajeInput {
  animalId: string;
  fecha: string;
  pesoActualKg?: number | null;
  lecheMananaL?: number | null;
  lecheTardeL?: number | null;
}
export interface Pesaje extends CreatePesajeInput {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}
export interface DocumentoAnimal {
  id: string;
  animalId: string;
  tenantId: string;
  tipo: string;
  archivoUrl: string | null;
  objectPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export const getRazas = async (): Promise<Raza[]> => {
  return await fetchApi('/catalogos/razas');
};

export const getAnimales = async (filters: Record<string, string> = {}): Promise<Animal[]> => {
  const queryParams = new URLSearchParams(filters).toString();
  const url = queryParams ? `/animales?${queryParams}` : '/animales';
  return await fetchApi(url);
};

export const getAnimal = async (id: string): Promise<Animal> => {
  return fetchApi(`/animales/${id}`);
};

export const createAnimal = async (animalData: CreateAnimalInput): Promise<Animal> => {
  return fetchApi('/animales', {
    method: 'POST',
    body: JSON.stringify(animalData),
  });
};

export const getDocumentos = async (animalId: string): Promise<DocumentoAnimal[]> => {
  return fetchApi(`/animales/${animalId}/documentos`);
};

export const createDocumento = async (animalId: string, docData: { tipo: string, objectPath: string }) => {
  return fetchApi(`/animales/${animalId}/documentos`, {
    method: 'POST',
    body: JSON.stringify(docData),
  });
};

export const updateAnimal = async (id: string, animalData: UpdateAnimalInput): Promise<Animal> => {
  return fetchApi(`/animales/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(animalData),
  });
};

export const darDeBajaAnimal = async (id: string, data: BajaAnimalInput): Promise<Animal> => {
  return fetchApi(`/animales/${id}/baja`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const createPesaje = async (pesaje: CreatePesajeInput): Promise<Pesaje> => {
  return fetchApi('/pesajes', {
    method: 'POST',
    body: JSON.stringify(pesaje),
  });
};

export const getPesajesByAnimal = async (animalId: string): Promise<Pesaje[]> => {
  return fetchApi(`/pesajes/animal/${animalId}`);
};

export const getEstadoReproductivo = async (animalId: string): Promise<EstadoReproductivoResponse> => {
  return fetchApi(`/animales/${animalId}/estado-reproductivo`);
};

export const createServicioReproductivo = async (animalId: string, data: ServicioInput): Promise<HitosReproductivos> => {
  return fetchApi(`/animales/${animalId}/servicios`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const createTratamiento = async (tratamiento: CreateTratamientoDto): Promise<TratamientoSanitario> => {
  return fetchApi('/tratamientos', {
    method: 'POST',
    body: JSON.stringify(tratamiento),
  });
};

export const getTratamientosByAnimal = async (animalId: string): Promise<TratamientoSanitario[]> => {
  return fetchApi(`/tratamientos/animal/${animalId}`);
};

export const updateTratamiento = async (id: string, data: UpdateTratamientoDto): Promise<TratamientoSanitario> => {
  return fetchApi(`/tratamientos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const createDiagnosticoReproductivo = async (animalId: string, data: DiagnosticoInput): Promise<unknown> => {
  return fetchApi(`/animales/${animalId}/diagnosticos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
