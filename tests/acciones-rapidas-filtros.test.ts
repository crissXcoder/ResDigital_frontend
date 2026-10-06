import { describe, it, expect } from 'vitest';
import {
  filtrarAnimalesAccion,
  puedeEjecutarAccion,
  type TipoAccionRapida,
} from '@/components/dashboard/acciones-rapidas';
import type { Animal } from '@/lib/api/animales';

/**
 * Pruebas unitarias — Filtros Biológicos de Acciones Rápidas (MOD-04 Karla)
 *
 * Reglas de negocio críticas:
 * 1. Los animales inactivos (dados de baja o fallecidos) NUNCA deben poder ser
 *    seleccionados en ninguna acción rápida.
 * 2. Biología ganadera:
 *    - "reproductivo" (inseminación/servicio) aplica exclusivamente a Hembras activas.
 *    - "leche" (producción/ordeño) aplica exclusivamente a Hembras activas.
 *    - "tratamiento" aplica a cualquier animal activo (machos y hembras).
 * 3. Búsqueda reactiva: busca insensible a mayúsculas sobre areteInterno, nombre y categoría.
 */

const ANIMALES_PRUEBA: Animal[] = [
  {
    id: '1',
    areteInterno: 'H-001',
    nombre: 'Mariposa',
    categoria: 'Vaca en Ordeño',
    sexo: 'Hembra',
    activo: true,
    tenantId: 'tenant-1',
    razaId: 'raza-1',
  },
  {
    id: '2',
    areteInterno: 'M-002',
    nombre: 'Tormenta',
    categoria: 'Toro Reproductor',
    sexo: 'Macho',
    activo: true,
    tenantId: 'tenant-1',
    razaId: 'raza-1',
  },
  {
    id: '3',
    areteInterno: 'H-003',
    nombre: 'Estrella',
    categoria: 'Vaquilla',
    sexo: 'Hembra',
    activo: false, // DADA DE BAJA
    tenantId: 'tenant-1',
    razaId: 'raza-1',
  },
  {
    id: '4',
    areteInterno: 'M-004',
    nombre: 'Ferdinand',
    categoria: 'Novillo',
    sexo: 'Macho',
    activo: false, // DADO DE BAJA
    tenantId: 'tenant-1',
    razaId: 'raza-1',
  },
  {
    id: '5',
    areteInterno: 'H-005',
    nombre: 'Canela',
    categoria: 'Vaca Seca',
    sexo: 'hembra', // minúscula deliberada para verificar case-insensitivity
    activo: true,
    tenantId: 'tenant-1',
    razaId: 'raza-1',
  },
];

describe('filtrarAnimalesAccion — Reglas de negocio y filtros biológicos', () => {
  it('devuelve array vacío si no hay ninguna acción activa seleccionada', () => {
    const res = filtrarAnimalesAccion(ANIMALES_PRUEBA, null, '');
    expect(res).toEqual([]);
  });

  it('excluye estrictamente a todos los animales dados de baja (activo = false)', () => {
    const tipos: TipoAccionRapida[] = ['tratamiento', 'reproductivo', 'leche'];
    for (const accion of tipos) {
      const res = filtrarAnimalesAccion(ANIMALES_PRUEBA, accion, '');
      const inactivos = res.filter((a) => !a.activo);
      expect(inactivos).toHaveLength(0);
      expect(res.some((a) => a.id === '3' || a.id === '4')).toBe(false);
    }
  });

  describe('Acción: "tratamiento"', () => {
    it('incluye todos los animales activos sin importar su sexo', () => {
      const res = filtrarAnimalesAccion(ANIMALES_PRUEBA, 'tratamiento', '');
      expect(res).toHaveLength(3); // H-001 (Hembra), M-002 (Macho), H-005 (Hembra)
      expect(res.map((a) => a.id)).toEqual(['1', '2', '5']);
    });
  });

  describe('Acción: "reproductivo" (filtro biológico hembras)', () => {
    it('filtra exclusivamente a hembras activas, descartando machos', () => {
      const res = filtrarAnimalesAccion(ANIMALES_PRUEBA, 'reproductivo', '');
      expect(res).toHaveLength(2); // H-001 (Mariposa) y H-005 (Canela)
      expect(res.every((a) => a.sexo?.toLowerCase() === 'hembra')).toBe(true);
      expect(res.some((a) => a.sexo === 'Macho')).toBe(false);
    });

    it('no incluye machos ni aunque coincidan con el término de búsqueda', () => {
      const res = filtrarAnimalesAccion(ANIMALES_PRUEBA, 'reproductivo', 'Tormenta');
      expect(res).toHaveLength(0);
    });
  });

  describe('Acción: "leche" (filtro biológico producción lechera)', () => {
    it('filtra exclusivamente a hembras activas, descartando machos', () => {
      const res = filtrarAnimalesAccion(ANIMALES_PRUEBA, 'leche', '');
      expect(res).toHaveLength(2); // Mariposa y Canela
      expect(res.every((a) => a.sexo?.toLowerCase() === 'hembra')).toBe(true);
      expect(res.some((a) => a.id === '2')).toBe(false); // No Tormenta (macho)
    });
  });

  describe('Búsqueda reactiva en el selector', () => {
    it('filtra por areteInterno insensible a mayúsculas/minúsculas', () => {
      const res = filtrarAnimalesAccion(ANIMALES_PRUEBA, 'tratamiento', 'h-001');
      expect(res).toHaveLength(1);
      expect(res[0].areteInterno).toBe('H-001');
    });

    it('filtra por nombre del animal', () => {
      const res = filtrarAnimalesAccion(ANIMALES_PRUEBA, 'tratamiento', 'mariposa');
      expect(res).toHaveLength(1);
      expect(res[0].nombre).toBe('Mariposa');
    });

    it('filtra por categoría del animal', () => {
      const res = filtrarAnimalesAccion(ANIMALES_PRUEBA, 'tratamiento', 'ordeño');
      expect(res).toHaveLength(1);
      expect(res[0].categoria).toBe('Vaca en Ordeño');
    });

    it('devuelve vacío si el término no coincide con ningún animal activo', () => {
      const res = filtrarAnimalesAccion(ANIMALES_PRUEBA, 'tratamiento', 'inexistente');
      expect(res).toHaveLength(0);
    });

    it('elimina espacios en blanco accidentales al inicio o final de la búsqueda', () => {
      const res = filtrarAnimalesAccion(ANIMALES_PRUEBA, 'tratamiento', '   Canela   ');
      expect(res).toHaveLength(1);
      expect(res[0].nombre).toBe('Canela');
    });
  });
});

describe('puedeEjecutarAccion — Matriz de Roles y Autorización (DASH-T005 / ARCH-ROLES)', () => {
  it('retorna false si el rol es null o undefined (sesión no resuelta)', () => {
    expect(puedeEjecutarAccion('tratamiento', null)).toBe(false);
    expect(puedeEjecutarAccion('tratamiento', undefined)).toBe(false);
    expect(puedeEjecutarAccion('reproductivo', null)).toBe(false);
    expect(puedeEjecutarAccion('leche', null)).toBe(false);
  });

  describe('Rol: propietario', () => {
    it('tiene acceso a todas las acciones rápidas', () => {
      expect(puedeEjecutarAccion('tratamiento', 'propietario')).toBe(true);
      expect(puedeEjecutarAccion('reproductivo', 'propietario')).toBe(true);
      expect(puedeEjecutarAccion('leche', 'propietario')).toBe(true);
    });
  });

  describe('Rol: administrador', () => {
    it('tiene acceso a todas las acciones rápidas', () => {
      expect(puedeEjecutarAccion('tratamiento', 'administrador')).toBe(true);
      expect(puedeEjecutarAccion('reproductivo', 'administrador')).toBe(true);
      expect(puedeEjecutarAccion('leche', 'administrador')).toBe(true);
    });
  });

  describe('Rol: veterinario', () => {
    it('puede registrar tratamientos y eventos reproductivos', () => {
      expect(puedeEjecutarAccion('tratamiento', 'veterinario')).toBe(true);
      expect(puedeEjecutarAccion('reproductivo', 'veterinario')).toBe(true);
    });

    it('tiene estrictamente PROHIBIDO registrar producción de leche o pesaje (ARCH-ROLES)', () => {
      expect(puedeEjecutarAccion('leche', 'veterinario')).toBe(false);
    });
  });

  describe('Rol: peon', () => {
    it('puede ejecutar las acciones rápidas permitidas por la matriz', () => {
      expect(puedeEjecutarAccion('tratamiento', 'peon')).toBe(true);
      expect(puedeEjecutarAccion('reproductivo', 'peon')).toBe(true);
      expect(puedeEjecutarAccion('leche', 'peon')).toBe(true);
    });
  });
});

