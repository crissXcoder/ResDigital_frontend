import { fetchApi } from './client';
import { Animal } from './animales';

export interface Potrero {
  id: string;
  tenantId: string;
  nombre: string;
  areaHa: number;
  tipoPasto: string | null;
  capacidadRecomendadaUaHa: number;
  diasDescansoRecomendados: number;
  fechaUltimoIngreso: string | null;
  fuenteAgua: string | null;
  notas: string | null;
  estadoManual: string | null;
  
  // Computed fields
  cargaActualUaHa: number;
  uaTotal: number;
  estadoCalculado: 'DISPONIBLE' | 'EN RECUPERACIÓN' | 'SOBRECARGADO' | 'DESCANSO PROGRAMADO' | string;
  animalesAsignadosCount: number;
  
  animales?: Animal[];
}

export const getPotreros = async (): Promise<Potrero[]> => {
  return await fetchApi<Potrero[]>('/potreros');
};

export const getPotrero = async (id: string): Promise<Potrero> => {
  return await fetchApi<Potrero>(`/potreros/${id}`);
};

export const createPotrero = async (data: Partial<Potrero>): Promise<Potrero> => {
  return await fetchApi<Potrero>('/potreros', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updatePotrero = async (id: string, data: Partial<Potrero>): Promise<Potrero> => {
  return await fetchApi<Potrero>(`/potreros/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const deletePotrero = async (id: string): Promise<void> => {
  return await fetchApi<void>(`/potreros/${id}`, {
    method: 'DELETE',
  });
};

export const asignarAnimalesPotrero = async (id: string, animalIds: string[]): Promise<Potrero> => {
  return await fetchApi<Potrero>(`/potreros/${id}/asignar`, {
    method: 'POST',
    body: JSON.stringify({ animalIds }),
  });
};
