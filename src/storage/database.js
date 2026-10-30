import Database from 'libsql';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const filename = process.env.NEGOTIA_DATABASE_PATH ?? fileURLToPath(new URL('../../data/negotia.db', import.meta.url));
if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
export const database = new Database(filename);
if (filename !== ':memory:') chmodSync(filename, 0o600);
database.pragma('journal_mode = WAL');
database.pragma('busy_timeout = 5000');
database.pragma('foreign_keys = ON');
database.exec(`
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
`);

export function initializeWorkspace(seed) {
  database.transaction(() => {
    if (!database.prepare('SELECT id FROM workspace WHERE id = 1').get()) {
      database.prepare('INSERT INTO workspace (id, payload) VALUES (1, ?)').run(JSON.stringify(seed()));
    }
  }).immediate();
}

export function readWorkspace() {
  return JSON.parse(database.prepare('SELECT payload FROM workspace WHERE id = 1').get().payload);
}

export function updateWorkspace(update) {
  return database.transaction(() => {
    const workspace = readWorkspace();
    const result = update(workspace);
    database.prepare('UPDATE workspace SET payload = ? WHERE id = 1').run(JSON.stringify(workspace));
    return result;
  }).immediate();
}
