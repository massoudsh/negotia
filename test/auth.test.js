import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

process.env.NEGOTIA_DATABASE_PATH = ':memory:';
process.env.NEGOTIA_SEED_DEMO = '1';
const { createUser, login, sessionUser, logout, reviewer, SESSION_SECONDS } = await import('../src/auth/accounts.js');
const { updateWorkspace, readWorkspace } = await import('../src/storage/database.js');
const { listConversations, makeProforma, decideApproval, listApprovals } = await import('../web/lib/store.js');
const password = 'test-only-long-password';
const account = (role) => createUser({ email: `${randomUUID()}@example.test`, name: 'Test User', role, password });

test('accounts validate role and password, normalize email and expose no hashes', async () => {
  await assert.rejects(createUser({ email: 'a@example.test', name: 'A', role: 'owner', password }));
  await assert.rejects(createUser({ email: 'a@example.test', name: 'A', role: 'admin', password: 'short' }));
  const user = await createUser({ email: ' TEST@example.test ', name: ' Test ', role: 'admin', password });
  assert.equal(user.email, 'test@example.test');
  assert.deepEqual(Object.keys(user).sort(), ['email', 'id', 'name', 'role']);
  const session = await login('TEST@example.test', password);
  assert.deepEqual(sessionUser(session.token), user);
  assert.equal(sessionUser(session.token, Date.now() + SESSION_SECONDS * 1000 + 1), null);
  assert.equal(sessionUser('invalid'), null);
  logout(session.token);
  assert.equal(sessionUser(session.token), null);
});

test('login rejects invalid credentials and throttles concurrent attempts before password work', async () => {
  const user = await account('viewer');
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => login(user.email, 'incorrect')));
  assert.equal(results.filter((result) => result.status === 'rejected').length, 8);
  assert.equal(results.filter((result) => /۱۵ دقیقه/.test(result.reason.message)).length, 3);
  await assert.rejects(login(user.email, password), /۱۵ دقیقه/);
  await assert.rejects(login(null, password));
});

test('approval decisions require live reviewers and cannot be repeated', async () => {
  const viewer = await account('viewer');
  const approver = await account('reviewer');
  assert.throws(() => reviewer(viewer.id));
  assert.throws(() => reviewer('demo-reviewer'));
  const conversation = listConversations().find((item) => item.direction === 'import');
  const { approvalRequest } = makeProforma(conversation.id, { productCode: conversation.productCode, quantity: 100, unitPrice: 12, paymentTerms: 'lc', deliveryDays: 30, destination: 'Tehran' });
  assert.throws(() => decideApproval(approvalRequest.id, 'approved', viewer.id));
  assert.throws(() => decideApproval(approvalRequest.id, 'approved', 'forged-actor'));
  assert.equal(listApprovals().find((item) => item.id === approvalRequest.id).status, 'pending');
  const decided = decideApproval(approvalRequest.id, 'approved', approver.id);
  assert.equal(decided.approvedBy, approver.id);
  assert.throws(() => decideApproval(approvalRequest.id, 'rejected', approver.id), /قبلاً/);
});

test('workspace transactions roll back on errors and reads are detached', () => {
  const before = readWorkspace();
  assert.throws(() => updateWorkspace((workspace) => { workspace.conversations = []; throw new Error('rollback'); }));
  assert.deepEqual(readWorkspace(), before);
  before.conversations.length = 0;
  assert.ok(readWorkspace().conversations.length > 0);
});
