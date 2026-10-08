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
  estadoCalculado: 'DISPONIBLE' | 'EN RECUPERACIÓN' | 'SOBRECARGADO' | 'DESCANSO PROGRAMADO' | 'EN MANTENIMIENTO' | string;
  estadoCarga: 'SOBRECARGADO' | 'ÓPTIMO' | 'SIN_CARGA' | string;
  estadoOperativo: 'DISPONIBLE' | 'OCUPADO' | 'EN RECUPERACIÓN' | 'EN MANTENIMIENTO' | string;
  sobrecargado: boolean;
  animalesAsignadosCount: number;
  desgloseUa?: {
    porPeso: number;
    porCategoria: number;
    total: number;
  };

  animales?: Animal[];
}

export interface MovimientoPotrero {
  id: string; // eventoId
  tipo?: 'INGRESO' | 'SALIDA';
  fechaEvento: string;
  fechaRegistro: string;
  usuarioId?: string;
  motivo: string | null;
  animal?: {
    id: string;
    areteInterno: string;
    nombre: string | null;
  };
  potreroOrigen: { id: string; nombre: string } | null;
  potreroDestino: { id: string; nombre: string };
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

export const asignarAnimalesPotrero = async (
  id: string,
  animalIds: string[],
  opciones?: { fecha?: string; motivo?: string }
): Promise<Potrero> => {
  return await fetchApi<Potrero>(`/potreros/${id}/asignar`, {
    method: 'POST',
    body: JSON.stringify({
      animalIds,
      ...(opciones?.fecha ? { fecha: opciones.fecha } : {}),
      ...(opciones?.motivo ? { motivo: opciones.motivo } : {}),
    }),
  });
};

export const getMovimientosPotrero = async (id: string): Promise<MovimientoPotrero[]> => {
  return await fetchApi<MovimientoPotrero[]>(`/potreros/${id}/movimientos`);
};

export const getMovimientosAnimal = async (animalId: string): Promise<MovimientoPotrero[]> => {
  return await fetchApi<MovimientoPotrero[]>(`/potreros/animal/${animalId}/movimientos`);
};
