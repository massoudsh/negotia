import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from '../web/node_modules/next/server.js';
import { validateOffer } from '../web/lib/validation.js';
process.env.NEGOTIA_DATABASE_PATH = ':memory:';
process.env.NEGOTIA_SEED_DEMO = '1';
const store = await import('../web/lib/store.js');
const { createUser, login } = await import('../src/auth/accounts.js');
const { POST: draftApproval } = await import('../web/app/api/conversations/[id]/draft-approval/route.js');
const { POST: noteRoute } = await import('../web/app/api/conversations/[id]/notes/route.js');
const { GET: libraryRoute } = await import('../web/app/api/library/route.js');
const account = role => createUser({ email: `${role}@backlog.test`, name: `Test ${role}`, role, password: 'backlog-test-password' });
const reviewer = await account('reviewer');
const viewer = await account('viewer');
const session = await login(reviewer.email, 'backlog-test-password');
const viewSession = await login(viewer.email, 'backlog-test-password');
const conversation = store.listConversations()[0];
const context = { params: Promise.resolve({ id: conversation.id }) };
function req(token, body, method = 'POST') { return new NextRequest('http://negotia.test/api/test', { method, headers: { origin: 'http://negotia.test', cookie: `negotia_session=${token ?? ''}`, 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) }); }

test('reviewed draft snapshot is pending and never inserts or sends a message', async () => {
  const count = store.getConversation(conversation.id).messages.length;
  const response = await draftApproval(req(session.token, { text: 'Human edited text', originalText: 'Original draft', actorId: viewer.id, recipient: 'forged@other.test' }), context);
  assert.equal(response.status, 201);
  const request = await response.json();
  assert.equal(request.status, 'pending');
  assert.equal(request.type, 'message');
  assert.equal(request.payload.requestedBy, reviewer.id);
  assert.equal(request.payload.recipient, conversation.contact.email);
  assert.equal(request.payload.originalText, 'Original draft');
  assert.equal(request.payload.text, 'Human edited text');
  assert.equal(request.payload.sourceMessageIds.length, count);
  assert.equal(store.getConversation(conversation.id).messages.length, count);
  store.decideApproval(request.id, 'approved', reviewer.id);
  assert.equal(store.getConversation(conversation.id).messages.length, count);
  assert.equal(store.getConversation(conversation.id).activity.at(-1).actorId, reviewer.id);
});

test('draft and note APIs enforce authentication and role for every write', async () => {
  for (const handler of [draftApproval, noteRoute]) {
    assert.equal((await handler(req(null, { text: 'no' }), context)).status, 401);
    assert.equal((await handler(req(viewSession.token, { text: 'no' }), context)).status, 403);
    assert.equal((await handler(req(session.token, { text: '' }), context)).status, 400);
  }
});

test('notes remain internal, record actor, and reject oversized inputs transactionally', async () => {
  const before = store.getConversation(conversation.id).messages.length;
  const response = await noteRoute(req(session.token, { text: 'Internal only', actorId: viewer.id }), context);
  assert.equal(response.status, 201);
  const note = await response.json();
  assert.equal(note.actorId, reviewer.id);
  assert.equal(note.type, 'note');
  assert.equal(store.getConversation(conversation.id).messages.length, before);
  const events = store.getConversation(conversation.id).activity.length;
  assert.throws(() => store.addNote(conversation.id, 'x'.repeat(10001), reviewer.id));
  assert.throws(() => store.addNote(conversation.id, 'forged', viewer.id));
  assert.equal(store.getConversation(conversation.id).activity.length, events);
});

test('context library is authenticated and excludes unrelated workspace and account data', async () => {
  assert.equal((await libraryRoute(req(null, null, 'GET'))).status, 401);
  const response = await libraryRoute(req(viewSession.token, null, 'GET'));
  assert.equal(response.status, 200);
  const library = await response.json();
  assert.deepEqual(Object.keys(library).sort(), ['contacts', 'products', 'source', 'terms']);
  assert.ok(library.terms.includes('lc'));
  assert.equal(library.users, undefined);
});

test('offer validation rejects missing, coerced and overflowing values without changing inputs', () => {
  const offer = { quantity: '10', unitPrice: '12', deliveryDays: '30', destination: 'Tehran', paymentTerms: 'lc' };
  const before = structuredClone(offer);
  assert.deepEqual(validateOffer(offer), {});
  for (const value of ['', ' ', null, true, [], {}, -1, Infinity]) assert.ok(validateOffer({ ...offer, quantity: value }).quantity);
  assert.ok(validateOffer({ ...offer, unitPrice: Number.MAX_SAFE_INTEGER }).unitPrice);
  assert.ok(validateOffer({ ...offer, destination: '' }).destination);
  assert.deepEqual(offer, before);
});

test('consequential record writes retain authenticated actors and linked event context', () => {
  const importing = store.listConversations().find(item => item.direction === 'import');
  const message = store.addMessage(importing.id, { sender: 'contact', text: 'Historical record' }, reviewer.id);
  assert.equal(message.recordedBy, reviewer.id);
  store.saveCostEstimate(importing.id, { quantity: 10, unitPrice: 12, currency: 'IRT', freight: { amount: 0, currency: 'IRT' }, insurance: { amount: 0, currency: 'IRT' }, customsCost: 0, otherCost: 0 }, reviewer.id);
  const { approvalRequest } = store.makeProforma(importing.id, { productCode: importing.productCode, quantity: 10, unitPrice: 12, paymentTerms: 'lc', deliveryDays: 30, destination: 'Tehran' }, reviewer.id);
  const events = store.getConversation(importing.id).activity;
  assert.deepEqual(events.map(event => event.type), ['cost-estimate', 'proforma']);
  assert.ok(events.every(event => event.actorId === reviewer.id));
  assert.equal(events.at(-1).referenceId, approvalRequest.id);
});
