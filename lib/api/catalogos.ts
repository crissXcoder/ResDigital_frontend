import { fetchApi } from './client';
import type { Raza } from './animales';

export const getCatalogosRazas = async (): Promise<Raza[]> => {
  return fetchApi<Raza[]>('/catalogos/razas');
};
