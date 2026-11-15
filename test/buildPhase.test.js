import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const scratch = name => {
  const path = fileURLToPath(new URL(`../outputs/test-data/${randomUUID()}-${name}`, import.meta.url));
  mkdirSync(fileURLToPath(new URL('../outputs/test-data/', import.meta.url)), { recursive: true });
  return path;
};

const loadStore = `
  const store = await import('./web/lib/store.js');
  const { database } = await import('./src/storage/database.js');
  process.stdout.write(String(store.listConversations().length));
  database.close();
`;

test('the build phase never touches a configured on-disk database', async () => {
  const databasePath = scratch('build.db');
  const env = { ...process.env, NEXT_PHASE: 'phase-production-build', NEGOTIA_DATABASE_PATH: databasePath };
  delete env.NEGOTIA_SEED_DEMO;
  const { stdout } = await run(process.execPath, ['--input-type=module', '-e', loadStore], { cwd: projectRoot, env });
  assert.equal(stdout, '0', 'the build phase must start from an empty in-memory workspace');
  assert.equal(existsSync(databasePath), false, 'build must not create or open the configured database file');
  rmSync(databasePath, { force: true });
});

test('parallel workers can open and initialize the same database without SQLITE_BUSY', async () => {
  const databasePath = scratch('parallel.db');
  const env = { ...process.env, NEGOTIA_DATABASE_PATH: databasePath, NEGOTIA_SEED_DEMO: '1' };
  delete env.NEXT_PHASE;
  const runs = await Promise.allSettled(
    Array.from({ length: 6 }, () => run(process.execPath, ['--input-type=module', '-e', loadStore], { cwd: projectRoot, env })),
  );
  const failures = runs.filter(result => result.status === 'rejected').map(result => result.reason.stderr ?? result.reason.message);
  assert.deepEqual(failures, []);
  assert.ok(runs.every(result => result.value.stdout === '2'), 'every worker must see the seeded workspace');
  assert.equal(existsSync(databasePath), true);
  for (const suffix of ['-wal', '-shm']) rmSync(`${databasePath}${suffix}`, { force: true });
  rmSync(databasePath, { force: true });
});
