import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const databasePath = fileURLToPath(new URL(`../outputs/test-data/${randomUUID()}.db`, import.meta.url));
mkdirSync(fileURLToPath(new URL('../outputs/test-data/', import.meta.url)), { recursive: true });
const env = { ...process.env, NEGOTIA_DATABASE_PATH: databasePath, NEGOTIA_SEED_DEMO: '1' };
const run = (source) => execFileSync(process.execPath, ['--input-type=module', '-e', source], { cwd: fileURLToPath(new URL('..', import.meta.url)), env, encoding: 'utf8' });

test('messages and approval decisions survive independent process restarts', () => {
  run(`
    const { createUser } = await import('./src/auth/accounts.js');
    const store = await import('./web/lib/store.js');
    const user = await createUser({ email: 'persist@example.test', name: 'Persistence Test', role: 'reviewer', password: 'test-persistence-password' });
    const conversation = store.listConversations().find(c => c.direction === 'import');
    store.addMessage(conversation.id, { sender: 'contact', text: 'Persisted message' });
    const { approvalRequest } = store.makeProforma(conversation.id, { productCode: conversation.productCode, quantity: 100, unitPrice: 12, paymentTerms: 'lc', deliveryDays: 30, destination: 'Tehran' });
    store.decideApproval(approvalRequest.id, 'approved', user.id);
    const { database } = await import('./src/storage/database.js');
    database.close();
  `);
  const output = run(`
    const store = await import('./web/lib/store.js');
    const { database } = await import('./src/storage/database.js');
    const conversation = store.listConversations().find(c => c.direction === 'import');
    process.stdout.write(JSON.stringify({ text: conversation.messages.at(-1).text, status: store.listApprovals()[0].status, count: store.listConversations().length }));
    database.close();
  `);
  assert.deepEqual(JSON.parse(output), { text: 'Persisted message', status: 'approved', count: 2 });
});
