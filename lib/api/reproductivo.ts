import { fetchApi } from './client';
import type { components } from './openapi.generated';
import type {
  EstadoReproductivoResponse,
  EventoHistorial,
} from '../reproductivo/tipos';

export type ProximoEvento = components['schemas']['ProximoEventoReproductivoDto'];
export type ServicioInput = components['schemas']['RegistrarServicioDto'];
export type DiagnosticoInput = components['schemas']['RegistrarDiagnosticoDto'];
export type PartoInput = components['schemas']['RegistrarPartoDto'];
export type SecadoInput = components['schemas']['RegistrarSecadoDto'];
export type RegistrarServicioResponse =
  components['schemas']['RegistrarServicioResponseDto'];
export type RegistrarDiagnosticoResponse =
  components['schemas']['RegistrarDiagnosticoResponseDto'];
export type RegistrarPartoResponse =
  components['schemas']['RegistrarPartoResponseDto'];
export type RegistrarSecadoResponse =
  components['schemas']['RegistrarSecadoResponseDto'];

export const getEstadoReproductivoTipado = async (
  animalId: string,
): Promise<EstadoReproductivoResponse> => {
  return fetchApi<EstadoReproductivoResponse>(
    `/animales/${animalId}/estado-reproductivo`,
  );
};

export const getHistorialReproductivo = async (
  animalId: string,
): Promise<EventoHistorial[]> => {
  return fetchApi<EventoHistorial[]>(
    `/animales/${animalId}/eventos-reproductivos`,
  );
};

export const getProximosEventos = async (
  diasVentana?: number,
): Promise<ProximoEvento[]> => {
  const query = diasVentana ? `?diasVentana=${diasVentana}` : '';
  return fetchApi<ProximoEvento[]>(`/reproductivo/proximos-eventos${query}`);
};

export const registrarServicioReproductivo = async (
  animalId: string,
  data: ServicioInput,
): Promise<RegistrarServicioResponse> => {
  return fetchApi<RegistrarServicioResponse>(`/animales/${animalId}/servicios`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const registrarDiagnosticoReproductivo = async (
  animalId: string,
  data: DiagnosticoInput,
): Promise<RegistrarDiagnosticoResponse> => {
  return fetchApi<RegistrarDiagnosticoResponse>(
    `/animales/${animalId}/diagnosticos`,
    {
    method: 'POST',
    body: JSON.stringify(data),
    },
  );
};

export const registrarPartoReproductivo = async (
  animalId: string,
  data: PartoInput,
): Promise<RegistrarPartoResponse> => {
  return fetchApi<RegistrarPartoResponse>(`/animales/${animalId}/partos`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const registrarSecadoReproductivo = async (
  animalId: string,
  data: SecadoInput,
): Promise<RegistrarSecadoResponse> => {
  return fetchApi<RegistrarSecadoResponse>(`/animales/${animalId}/secados`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
