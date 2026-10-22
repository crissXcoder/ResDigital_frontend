import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * RF-032 — Autovalidación final del bloque de Karla (FL-10: Cero Mocks Silenciosos).
 *
 * Guarda de regresión: ningún archivo de producción de Dashboard, Reportes o QR
 * debe importar `lib/mock/**`. El mock solo puede ser consumido por sus propios
 * tests (dashboard-kpis.test.ts), nunca por un hook, componente o página real.
 */
function listarArchivos(dir: string): string[] {
  let resultado: string[] = [];
  let entradas: string[];
  try {
    entradas = readdirSync(dir);
  } catch {
    return [];
  }
  for (const entrada of entradas) {
    const ruta = join(dir, entrada);
    const info = statSync(ruta);
    if (info.isDirectory()) {
      resultado = resultado.concat(listarArchivos(ruta));
    } else if (/\.(ts|tsx)$/.test(entrada) && !entrada.endsWith('.test.ts') && !entrada.endsWith('.test.tsx')) {
      resultado.push(ruta);
    }
  }
  return resultado;
}

describe('FL-10: ningún archivo de producción de Karla importa lib/mock/**', () => {
  it('dashboard, reportes y qr no dependen del módulo de datos simulados', () => {
    const root = join(__dirname, '..');
    const directorios = [
      join(root, 'lib', 'reportes'),
      join(root, 'lib', 'qr'),
      join(root, 'components', 'dashboard'),
      join(root, 'components', 'reportes'),
      join(root, 'app', '(dashboard)', 'dashboard'),
      join(root, 'app', '(dashboard)', 'reportes'),
      join(root, 'app', '(dashboard)', 'qr'),
    ];
    const archivos = [
      join(root, 'lib', 'hooks', 'use-dashboard-data.ts'),
      ...directorios.flatMap(listarArchivos),
    ];

    expect(archivos.length).toBeGreaterThan(5);

    const infractores = archivos.filter((ruta) => {
      const contenido = readFileSync(ruta, 'utf-8');
      return /from\s+['"].*lib\/mock/.test(contenido);
    });

    expect(infractores).toEqual([]);
  });
});
