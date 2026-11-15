import Database from 'libsql';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The default path is assembled with path.join rather than new URL(..., import.meta.url):
// webpack statically resolves URL literals and fails the build when the database file
// does not exist in the build context.
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// `next build` collects page data in several parallel workers. Sharing one SQLite
// file across them races on schema creation (SQLITE_BUSY) and would also touch real
// business data at build time, so the build phase always uses a private in-memory
// database. Runtime keeps the configured path.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const configuredPath = process.env.NEGOTIA_DATABASE_PATH;
const filename = isBuildPhase ? ':memory:' : configuredPath ?? join(projectRoot, 'data', 'negotia.db');
if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });

export const database = new Database(filename);
if (filename !== ':memory:') chmodSync(filename, 0o600);
database.pragma('busy_timeout = 5000');
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');

// A second process may hold the write lock while opening the same file. Retry with a
// short synchronous backoff instead of failing the whole request at startup.
function withBusyRetry(operation, attempts = 10) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return operation();
    } catch (error) {
      if (error?.code !== 'SQLITE_BUSY' && error?.rawCode !== 5) throw error;
      if (attempt >= attempts) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, attempt * 100);
    }
  }
}

withBusyRetry(() => database.exec(`
  CREATE TABLE IF NOT EXISTS workspace (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'reviewer', 'viewer')),
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
  CREATE TABLE IF NOT EXISTS login_attempts (
    email TEXT PRIMARY KEY,
    failures INTEGER NOT NULL,
    retry_at INTEGER NOT NULL
  );
`));

export function initializeWorkspace(seed) {
  withBusyRetry(() => database.transaction(() => {
    if (!database.prepare('SELECT id FROM workspace WHERE id = 1').get()) {
      database.prepare('INSERT INTO workspace (id, payload) VALUES (1, ?)').run(JSON.stringify(seed()));
    }
  }).immediate());
}

export function readWorkspace() {
  return JSON.parse(database.prepare('SELECT payload FROM workspace WHERE id = 1').get().payload);
}

export function updateWorkspace(update) {
  return withBusyRetry(() => database.transaction(() => {
    const workspace = readWorkspace();
    const result = update(workspace);
    database.prepare('UPDATE workspace SET payload = ? WHERE id = 1').run(JSON.stringify(workspace));
    return result;
  }).immediate());
}
