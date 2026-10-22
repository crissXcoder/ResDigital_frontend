import type { Animal } from '@/lib/api/animales';

/** Categorías de macho que un productor usa para monta. No terneros ni novillos. */
export const CATEGORIAS_MACHO_REPRODUCTOR = [
  'Toro',
  'Semental/Reproductor',
] as const;

export const TORO_EXTERNO = '__otro__';

export function esMachoReproductor(animal: Pick<Animal, 'sexo' | 'activo' | 'categoria'>): boolean {
  return (
    animal.sexo === 'Macho' &&
    animal.activo &&
    (CATEGORIAS_MACHO_REPRODUCTOR as readonly string[]).includes(animal.categoria)
  );
}

export function etiquetaToro(animal: Pick<Animal, 'areteInterno' | 'nombre'>): string {
  return animal.nombre
    ? `${animal.areteInterno} · ${animal.nombre}`
    : animal.areteInterno;
}
