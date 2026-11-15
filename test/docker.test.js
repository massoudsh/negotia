import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const exists = path => existsSync(new URL(path, root));
const dockerfile = read('Dockerfile');
const dockerignore = read('.dockerignore');
const compose = read('docker-compose.yml');
const entrypoint = read('docker/entrypoint.sh');

const dockerfileLines = dockerfile.replace(/\\\n/g, ' ').split('\n');
const copySources = dockerfileLines
  .filter(line => /^COPY\s/.test(line.trim()) && !/--from=/.test(line))
  .flatMap(line => line.trim().replace(/^COPY\s+/, '').split(/\s+/).slice(0, -1));
const ignored = dockerignore.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#') && !line.startsWith('!'));

test('every local COPY source exists and is not excluded from the build context', () => {
  assert.ok(copySources.length > 0);
  for (const source of copySources) {
    assert.ok(exists(source), `COPY source missing: ${source}`);
    for (const pattern of ignored) {
      if (pattern === source || pattern === source.replace(/\/$/, '') || pattern.startsWith(`${source}/`)) {
        assert.fail(`COPY source ${source} is excluded by .dockerignore pattern ${pattern}`);
      }
    }
  }
});

test('build context excludes local data, secrets and host dependencies', () => {
  for (const required of ['node_modules', 'web/node_modules', '.git', 'data', '.env']) {
    assert.ok(ignored.includes(required), `.dockerignore must exclude ${required}`);
  }
  for (const secret of ['*.pem', '*.key']) assert.ok(!read('Dockerfile').includes(`COPY ${secret}`));
  assert.ok(!/ARG\s+\w*(PASSWORD|SECRET|TOKEN)/i.test(dockerfile));
  assert.ok(!/ENV\s+\w*(PASSWORD|SECRET|TOKEN)/i.test(dockerfile));
});

test('runtime stage is multi-stage, non-root, health-checked and persistent', () => {
  const stages = dockerfile.match(/^FROM\s+\S+/gm) ?? [];
  assert.ok(stages.length >= 3, 'expected deps, builder and runner stages');
  assert.match(dockerfile, /^USER node$/m);
  assert.ok(!/^USER root$/m.test(dockerfile));
  assert.match(dockerfile, /^HEALTHCHECK[\s\S]*?\/login/m);
  assert.match(dockerfile, /^VOLUME \["\/app\/data"\]$/m);
  assert.match(dockerfile, /^ENTRYPOINT \["\/usr\/local\/bin\/entrypoint\.sh"\]$/m);
  assert.match(dockerfile, /^ENV NODE_ENV=production/m);
  assert.match(dockerfile, /NEGOTIA_DATABASE_PATH=\/app\/data\/negotia\.db/);
});

test('builder signs the production web app and the runtime serves it', () => {
  assert.match(dockerfile, /RUN npm --prefix web run build/);
  assert.match(dockerfile, /CMD \["npm", "--prefix", "web", "run", "start"\]/);
  for (const path of ['web/package.json', 'web/next.config.mjs', 'web/.next', 'src', 'config']) {
    assert.ok(dockerfile.includes(path), `runtime stage must provide ${path}`);
  }
});

test('entrypoint refuses an unwritable database directory and forwards signals', () => {
  assert.ok(entrypoint.startsWith('#!/bin/sh'));
  assert.match(entrypoint, /set -eu/);
  assert.match(entrypoint, /not available or not writable/);
  assert.match(entrypoint, /exec "\$@"/);
  assert.ok(statSync(new URL('docker/entrypoint.sh', root)).mode & 0o111, 'entrypoint must be executable');
});

test('compose keeps data in a named volume and exposes no privileged settings', () => {
  assert.match(compose, /^services:/m);
  assert.match(compose, /^\s{2}app:/m);
  assert.match(compose, /^\s{2}account:/m);
  assert.match(compose, /negotia-data:\/app\/data/);
  assert.match(compose, /^volumes:\n\s{2}negotia-data:/m);
  assert.match(compose, /NEGOTIA_DATABASE_PATH: \/app\/data\/negotia\.db/);
  assert.ok(!/privileged:\s*true/.test(compose));
  assert.ok(!/network_mode:\s*host/.test(compose));
  assert.ok(!/docker\.sock/.test(compose));
  assert.ok(!/NEGOTIA_SEED_DEMO/.test(compose), 'demo seed must stay opt-in, not a compose default');
});

test('deployment notes document the volume, account creation and TLS boundary', () => {
  assert.ok(exists('docs/deployment-docker.md'));
  const notes = read('docs/deployment-docker.md');
  for (const topic of ['docker compose run --rm account', 'NEGOTIA_DATABASE_PATH', 'uid 1000', 'Secure', 'Origin']) {
    assert.ok(notes.includes(topic), `deployment notes must cover ${topic}`);
  }
});
