import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveHooksPath } from '../install-hooks.mjs';

test('instala el path requerido cuando el clon no tiene core.hooksPath', () => {
  assert.equal(resolveHooksPath('', '.githooks'), '.githooks');
});

test('conserva la configuración cuando ya apunta al hook del repositorio', () => {
  assert.equal(resolveHooksPath('.githooks', '.githooks'), '.githooks');
});

test('rechaza una ruta personalizada en lugar de sobrescribirla', () => {
  assert.throws(
    () => resolveHooksPath('hooks-personalizados', '.githooks'),
    /no se reemplaza automáticamente/,
  );
});
