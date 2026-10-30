import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { NextRequest, NextResponse } from '../web/node_modules/next/server.js';

process.env.NEGOTIA_DATABASE_PATH = ':memory:';
process.env.NEGOTIA_SEED_DEMO = '1';
const { createUser, login, sessionUser } = await import('../src/auth/accounts.js');
const { withSession, SESSION_COOKIE } = await import('../web/lib/auth.js');
const { POST: signIn } = await import('../web/app/api/auth/login/route.js');
const { POST: signOut } = await import('../web/app/api/auth/logout/route.js');
const { POST: decide } = await import('../web/app/api/approvals/[id]/route.js');
const { listConversations, makeProforma } = await import('../web/lib/store.js');
const origin = 'http://negotia.test';
const password = 'test-api-only-password';
const viewer = await createUser({ email: 'viewer@example.test', name: 'Viewer', role: 'viewer', password });
const reviewer = await createUser({ email: 'reviewer@example.test', name: 'Reviewer', role: 'reviewer', password });
const viewerSession = await login(viewer.email, password);
const reviewerSession = await login(reviewer.email, password);
function request(method, token, body, source = origin) {
  return new NextRequest(`${origin}/api/test`, { method, headers: { ...(token ? { cookie: `${SESSION_COOKIE}=${token}` } : {}), ...(source ? { origin: source } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

test('session wrapper rejects missing sessions, cross-origin writes and viewer writes', async () => {
  let calls = 0;
  const endpoint = withSession(async (_req, _context, user) => { calls++; return NextResponse.json({ id: user.id }); });
  assert.equal((await endpoint(request('GET'))).status, 401);
  assert.equal((await endpoint(request('POST', reviewerSession.token, {}, 'http://other.test'))).status, 403);
  assert.equal((await endpoint(request('POST', reviewerSession.token, {}, null))).status, 403);
  assert.equal((await endpoint(request('POST', viewerSession.token, {}))).status, 403);
  assert.equal(calls, 0);
  const response = await endpoint(request('GET', viewerSession.token));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { id: viewer.id });
});

test('login uses HttpOnly strict cookies and logout revokes sessions for every role', async () => {
  assert.equal((await signIn(request('POST', null, { email: viewer.email, password }, 'http://other.test'))).status, 403);
  assert.equal((await signIn(request('POST', null, { email: viewer.email, password: 'wrong' }))).status, 401);
  const response = await signIn(request('POST', null, { email: viewer.email, password }));
  assert.equal(response.status, 200);
  const cookie = response.cookies.get(SESSION_COOKIE);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, 'strict');
  assert.equal(cookie.path, '/');
  assert.equal(cookie.maxAge, 28800);
  assert.equal(sessionUser(cookie.value).id, viewer.id);
  const loggedOut = await signOut(request('POST', cookie.value));
  assert.equal(loggedOut.status, 200);
  assert.equal(sessionUser(cookie.value), null);
  assert.equal(loggedOut.cookies.get(SESSION_COOKIE).maxAge, 0);
});

test('approval endpoint ignores forged actor and blocks a repeated decision', async () => {
  const conversation = listConversations().find(item => item.direction === 'import');
  const { approvalRequest } = makeProforma(conversation.id, { productCode: conversation.productCode, quantity: 100, unitPrice: 12, paymentTerms: 'lc', deliveryDays: 30, destination: 'Tehran' });
  const context = { params: Promise.resolve({ id: approvalRequest.id }) };
  const response = await decide(request('POST', reviewerSession.token, { decision: 'approved', approverId: viewer.id }), context);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).approvedBy, reviewer.id);
  assert.equal((await decide(request('POST', reviewerSession.token, { decision: 'rejected' }), context)).status, 409);
});

test('every business API route exports a session-wrapped handler', () => {
  function check(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
      if (entry.isDirectory()) { if (entry.name !== 'auth') check(path); }
      else if (entry.name === 'route.js') {
        const source = readFileSync(path, 'utf8');
        assert.match(source, /export const (GET|POST) = withSession\(/, path.pathname);
        assert.doesNotMatch(source, /export (async )?function (GET|POST)/, path.pathname);
      }
    }
  }
  check(new URL('../web/app/api/', import.meta.url));
});
