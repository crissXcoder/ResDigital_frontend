import test from 'node:test';
import assert from 'node:assert/strict';
import { hasOnlyFullShaPinnedActions, isForbiddenMigrationChange, validatePullRequest, validateTag, requiredCheckName, requiredCheckPassed } from '../git-policy.mjs';
import { resolveScanRange } from '../security-tools.mjs';

const base = '1'.repeat(40);
const head = '2'.repeat(40);

test('release check follows package identity after repository renames', () => {
  assert.equal(requiredCheckName('frontend'), 'Frontend required');
  assert.equal(requiredCheckName('backend'), 'Backend required');
  assert.throws(() => requiredCheckName('other'), /paquete/);
});

test('release refuses a spoofed check and a newer failed rerun', () => {
  const success = { id: 10, name: 'Frontend required', status: 'completed', conclusion: 'success', app: { id: 15368 } };
  assert.equal(requiredCheckPassed([success], 'Frontend required'), true);
  assert.equal(requiredCheckPassed([{ ...success, app: { id: 1 } }], 'Frontend required'), false);
  assert.equal(requiredCheckPassed([success, { ...success, id: 11, conclusion: 'failure' }], 'Frontend required'), false);
  assert.equal(requiredCheckPassed([{ ...success, conclusion: 'skipped' }], 'Frontend required'), false);
  assert.equal(requiredCheckPassed([], 'Frontend required'), false);
});

test('accepts an infrastructure PR with criteria and task scope', () => {
  assert.deepEqual(validatePullRequest({
    pull_request: {
      title: 'chore(ci): protect ResDigital integration branches',
      body: '## Tarea y objetivo\nInfraestructura: automatización CI\n\n## Criterios de aceptación\n- El check bloquea al fallar.',
    },
  }), []);
});

test('rejects missing title format, sections, criteria and task reference', () => {
  assert.equal(validatePullRequest({ pull_request: { title: 'Dev', body: 'cambio' } }).length, 5);
});

test('rejects a tag which does not equal the manifest version', () => {
  assert.match(validateTag('v1.2.4', '1.2.3'), /package\.json/);
});

test('rejects a non-release tag', () => {
  assert.match(validateTag('dev', '0.1.0'), /v<major>/);
});

test('requires full action SHAs even with version comments', () => {
  assert.equal(hasOnlyFullShaPinnedActions('      uses: actions/checkout@0123456789abcdef0123456789abcdef01234567 # v5'), true);
  assert.equal(hasOnlyFullShaPinnedActions('      uses: actions/checkout@v5 # floating tag'), false);
});

test('protects existing migrations while allowing new ones', () => {
  assert.equal(isForbiddenMigrationChange('A\tsrc/database/migrations/20261003000000-New.ts'), false);
  assert.equal(isForbiddenMigrationChange('M\tsrc/database/migrations/Old.ts'), true);
  assert.equal(isForbiddenMigrationChange('D\tsrc/database/migrations/Old.ts'), true);
  assert.equal(isForbiddenMigrationChange('R100\tsrc/database/migrations/Old.ts\tsrc/database/migrations/Renamed.ts'), true);
  assert.equal(isForbiddenMigrationChange('M\tsrc/features/animals/service.ts'), false);
});

test('scans every PR commit reachable from head but absent from base', () => {
  assert.equal(resolveScanRange({ pull_request: { base: { sha: base }, head: { sha: head } } }, 'pull_request'), `${base}..${head}`);
});

test('scans the pushed commit range and refuses an initial push without a base', () => {
  assert.equal(resolveScanRange({ before: base, after: head }, 'push'), `${base}..${head}`);
  assert.throws(() => resolveScanRange({ before: '0'.repeat(40), after: head }, 'push'), /rango Git verificable/);
});

test('manual scan uses exact local parent and head commits', () => {
  assert.equal(resolveScanRange({}, 'workflow_dispatch', [base, head]), `${base}..${head}`);
  assert.throws(() => resolveScanRange({}, 'workflow_dispatch', []), /rango Git verificable/);
});
