import { fetchApi } from './client';
import type { Raza } from './animales';

export const SEXOS = ['Hembra', 'Macho'] as const;
export type SexoAnimal = (typeof SEXOS)[number];

export const CATEGORIAS_HEMBRA = ['Ternera', 'Novilla', 'Vaca'] as const;
export const CATEGORIAS_MACHO = ['Ternero', 'Novillo', 'Novillo mayor', 'Toro'] as const;
export const CATEGORIAS_ANIMAL = [
  'Ternero',
  'Ternera',
  'Novillo',
  'Novillo mayor',
  'Novilla',
  'Vaca',
  'Toro',
] as const;
export type CategoriaAnimal = (typeof CATEGORIAS_ANIMAL)[number];

export const ESTADOS_HATO = [
  'Activo',
  'Inactivo',
  'Fallecimiento',
  'Venta Comercial',
  'Descarte',
  'Traslado',
] as const;
export type EstadoHato = (typeof ESTADOS_HATO)[number];

export const ORIGENES_ANIMAL = ['Finca', 'Externa'] as const;
export type OrigenAnimal = (typeof ORIGENES_ANIMAL)[number];

export const METODOS_COMPRA = [
  'Sinpe',
  'Depósito',
  'Efectivo',
  'Combinado',
] as const;
export type MetodoCompra = (typeof METODOS_COMPRA)[number];

export function esCategoriaValidaPorSexo(categoria: string, sexo: string): boolean {
  if (!categoria) return true;
  if (sexo === 'Hembra') {
    return (CATEGORIAS_HEMBRA as readonly string[]).includes(categoria);
  }
  if (sexo === 'Macho') {
    return (CATEGORIAS_MACHO as readonly string[]).includes(categoria);
  }
  return (CATEGORIAS_ANIMAL as readonly string[]).includes(categoria);
}

export const getCatalogosRazas = async (): Promise<Raza[]> => {
  return fetchApi<Raza[]>('/catalogos/razas');
};
