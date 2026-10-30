import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { createUser } from '../src/auth/accounts.js';
import { database } from '../src/storage/database.js';

const [email, name, role] = process.argv.slice(2);
let prompt;
try {
  if (process.argv.length !== 5 || !['admin', 'reviewer', 'viewer'].includes(role)) throw new Error('Usage: npm run user:create -- email "Full Name" admin|reviewer|viewer');
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Run in an interactive terminal; password input is hidden.');
  const output = new Writable({ write(_chunk, _encoding, done) { done(); } });
  prompt = createInterface({ input: process.stdin, output, terminal: true });
  process.stdout.write('Password (12–256 characters, hidden): ');
  const password = await prompt.question('');
  process.stdout.write('\nConfirm password (hidden): ');
  const confirmation = await prompt.question('');
  process.stdout.write('\n');
  if (password !== confirmation) throw new Error('Passwords do not match.');
  const user = await createUser({ email, name, role, password });
  process.stdout.write(`Created ${user.role} account for ${user.email}.\n`);
} catch (err) {
  process.stderr.write(`${err.code?.startsWith('SQLITE_CONSTRAINT') ? 'An account with that email already exists.' : err.message}\n`);
  process.exitCode = 1;
} finally {
  prompt?.close();
  database.close();
}
