import { fetchApi } from './client';

export interface EpisodioBaja {
  eventoId: string;
  fecha: string;
  tipoBaja: string;
  motivo: string | null;
  revertido: boolean;
  modalidad: 'RETORNO' | 'CORRECCION' | null;
  fechaReactivacion: string | null;
  motivoReactivacion: string | null;
}

export const getHistorialBajas = (id: string) => fetchApi<EpisodioBaja[]>(`/animales/${id}/historial-bajas`);
