import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const conventionalTitle = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._/-]+\))?!?: .{8,120}$/;

export function validatePullRequest(event) {
  const pr = event?.pull_request;
  if (!pr || typeof pr.title !== 'string' || typeof pr.body !== 'string') {
    return ['El evento no contiene un pull request válido.'];
  }

  const errors = [];
  if (!conventionalTitle.test(pr.title)) {
    errors.push('Usá un título Conventional Commits: tipo(scope): resumen.');
  }
  if (!/^## Tarea y objetivo\s*$/m.test(pr.body)) {
    errors.push('El PR debe completar «Tarea y objetivo».');
  }
  if (!/^## Criterios de aceptación\s*$/m.test(pr.body)) {
    errors.push('El PR debe describir criterios verificables.');
  }
  if (!/(?:CORE|AUTH|SEC|QA|SAN|HATO|REPRO|DASH|POT|LECHE|REP)-T\d{3,4}/i.test(pr.body) &&
      !/^Infraestructura:\s+\S.{4,}$/m.test(pr.body)) {
    errors.push('Indicá un ID de tarea o una justificación después de «Infraestructura:».');
  }
  const criteria = pr.body.split(/^## Criterios de aceptación\s*$/m)[1]?.split(/^## /m)[0] ?? '';
  if (!criteria.split(/\r?\n/).some((line) => /^\s*-\s+\S.{5,}$/.test(line) && !line.includes('Criterio verificable'))) {
    errors.push('El PR debe listar al menos un criterio de aceptación concreto.');
  }
  return errors;
}

export function validateTag(tag, packageVersion) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? '')) return 'El tag debe usar v<major>.<minor>.<patch>.';
  if (tag !== `v${packageVersion}`) return 'El tag debe coincidir con package.json.';
  return null;
}

export function hasOnlyFullShaPinnedActions(content) {
  const actions = [...content.matchAll(/^\s+uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)].map((match) => match[1]);
  return actions.every((action) => /^[^@]+@[0-9a-f]{40}$/.test(action));
}

function runGit(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function requiredCheckName(packageName) {
  if (packageName === 'frontend') return 'Frontend required';
  if (packageName === 'backend') return 'Backend required';
  throw new Error('El paquete no tiene un check de release reconocido.');
}

export function requiredCheckPassed(checks, name) {
  if (!Array.isArray(checks)) return false;
  const trusted = checks.filter((check) => check?.name === name && check.app?.id === 15368 && Number.isSafeInteger(check.id));
  const latest = trusted.reduce((result, check) => !result || check.id > result.id ? check : result, null);
  return latest?.status === 'completed' && latest.conclusion === 'success';
}

function checkWorkflows() {
  const directory = path.join(root, '.github', 'workflows');
  const files = readdirSync(directory).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'));
  if (files.length === 0) throw new Error('No hay workflows para validar.');
  for (const file of files) {
    const content = readFileSync(path.join(directory, file), 'utf8');
    if (/pull_request_target/i.test(content)) throw new Error(`${file}: no se permite pull_request_target.`);
    if (!hasOnlyFullShaPinnedActions(content)) {
      throw new Error(`${file}: cada Action debe fijarse a un SHA completo.`);
    }
    if (!/^permissions:\r?\n  contents: read$/m.test(content)) {
      const restricted = /^permissions:\r?\n(?:  [a-z_]+: [a-z]+\r?\n?)+/m.test(content);
      if (!restricted) throw new Error(`${file}: faltan permisos explícitos y acotados.`);
    }
  }
}

function rejectChangedMigrations(event) {
  if (!event.pull_request) return;
  const base = event.pull_request.base?.sha;
  const head = event.pull_request.head?.sha;
  if (!/^[0-9a-f]{40}$/.test(base ?? '') || !/^[0-9a-f]{40}$/.test(head ?? '')) {
    throw new Error('Faltan los commits base/head del PR para proteger migraciones.');
  }
  const changed = runGit(['diff', '--name-status', '--find-renames', `${base}...${head}`]);
  if (changed.split(/\r?\n/).some(isForbiddenMigrationChange)) throw new Error('No se editan, renombran ni eliminan migraciones existentes; agregá una migración correctiva.');
}

export function isForbiddenMigrationChange(line) {
  const [status, ...paths] = line.split('\t');
  return status !== 'A' && paths.some((file) => file.startsWith('src/database/migrations/'));
}

function validateRelease() {
  const tag = process.env.RELEASE_TAG;
  const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const tagError = validateTag(tag, packageJson.version);
  if (tagError) throw new Error(tagError);

  const commit = runGit(['rev-parse', `refs/tags/${tag}^{commit}`]);
  runGit(['merge-base', '--is-ancestor', commit, 'origin/main']);
  const repository = process.env.GITHUB_REPOSITORY;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')) {
    throw new Error('GITHUB_REPOSITORY ausente o inválido.');
  }
  const requiredName = requiredCheckName(packageJson.name);
  const response = execFileSync('gh', ['api', 'repos/' + repository + '/commits/' + commit + '/check-runs?check_name=' + encodeURIComponent(requiredName) + '&filter=latest&per_page=100'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const checks = JSON.parse(response).check_runs;
  if (!requiredCheckPassed(checks, requiredName)) {
    throw new Error('El commit ' + commit + ' no tiene exitoso el check requerido ' + requiredName + '.');
  }
}

function main() {
  try {
    if (process.argv.includes('--verify-workflows')) {
      checkWorkflows();
    } else if (process.argv.includes('--release')) {
      validateRelease();
    } else {
      const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      rejectChangedMigrations(event);
      if (event.pull_request) {
        const errors = validatePullRequest(event);
        if (errors.length) throw new Error(errors.join('\n'));
      } else if (event.ref !== 'refs/heads/main' && event.ref !== 'refs/heads/dev') {
        throw new Error('El push debe corresponder a main o dev.');
      }
      if (event.before && !/^0+$/.test(event.before)) {
        runGit(['diff', '--check', event.before + '..' + event.after]);
      }
    }
    process.stdout.write('Política Git verificada.\n');
  } catch (error) {
    process.stderr.write('Política Git bloqueó la operación: ' + error.message + '\n');
    process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
