import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { scratchDirectory, scratchFile } from './helpers/scratch.js';

const run = promisify(execFile);
const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const directory = scratchDirectory();
const scratch = () => scratchFile(directory, `${randomUUID()}-demo.db`);

const inspect = `
  const store = await import('./web/lib/store.js');
  const { database } = await import('./src/storage/database.js');
  const conversations = store.listConversations();
  const approvals = store.listApprovals();
  const library = store.getLibrary();
  const account = await store.ensureDemoAccount();
  const again = await store.ensureDemoAccount();
  process.stdout.write(JSON.stringify({
    demo: store.isDemoMode(),
    conversations: conversations.length,
    statuses: conversations.map(item => item.status).sort(),
    directions: [...new Set(conversations.map(item => item.direction))].sort(),
    approvals: approvals.map(item => item.status).sort(),
    contacts: library.contacts.length,
    products: library.products.length,
    estimate: conversations.find(item => item.direction === 'import')?.costEstimate?.total ?? null,
    account: account && { email: account.email, role: account.role },
    secondAccount: again,
  }));
  database.close();
`;

async function inspectWith(env) {
  const { stdout } = await run(process.execPath, ['--input-type=module', '-e', inspect], { cwd: projectRoot, env: { ...process.env, ...env } });
  return JSON.parse(stdout);
}

test('demo mode seeds a varied, internally consistent sample workspace', async () => {
  const databasePath = scratch();
  const result = await inspectWith({ NEGOTIA_DATABASE_PATH: databasePath, NEGOTIA_DEMO_MODE: '1' });
  assert.equal(result.demo, true);
  assert.equal(result.conversations, 5);
  assert.deepEqual(result.directions, ['export', 'import']);
  assert.deepEqual(result.statuses, ['awaiting_reply', 'closed', 'open', 'open', 'serious']);
  assert.deepEqual(result.approvals, ['approved', 'pending', 'rejected']);
  assert.equal(result.contacts, 5);
  assert.equal(result.products, 4);
  assert.ok(result.estimate > 0, 'the import deal should carry a landed-cost estimate');
  assert.deepEqual(result.account, { email: 'demo@negotia.local', role: 'admin' });
  assert.equal(result.secondAccount, null, 'the demo account must be created only once');
});

test('demo mode stays off by default and the legacy seed flag still works', async () => {
  const off = await inspectWith({ NEGOTIA_DATABASE_PATH: scratch(), NEGOTIA_DEMO_MODE: '0', NEGOTIA_SEED_DEMO: '' });
  assert.equal(off.demo, false);
  assert.equal(off.conversations, 0);
  assert.equal(off.account, null, 'no demo account may be provisioned outside demo mode');

  const legacy = await inspectWith({ NEGOTIA_DATABASE_PATH: scratch(), NEGOTIA_DEMO_MODE: '', NEGOTIA_SEED_DEMO: '1' });
  assert.equal(legacy.demo, true);
  assert.equal(legacy.conversations, 5);
});

test('demo mode never overwrites an existing workspace', async () => {
  const databasePath = scratch();
  const first = await inspectWith({ NEGOTIA_DATABASE_PATH: databasePath, NEGOTIA_DEMO_MODE: '1' });
  assert.equal(first.conversations, 5);
  const second = await inspectWith({ NEGOTIA_DATABASE_PATH: databasePath, NEGOTIA_DEMO_MODE: '1' });
  assert.equal(second.conversations, 5, 'reopening must not duplicate the seed');
});
