import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApprovalRequest, approve, reject, guardSend } from '../src/approval/checkpoint.js';

test('blocks sending until approved', () => {
  const request = createApprovalRequest({ type: 'message', payload: { text: 'hello' } });
  assert.throws(() => guardSend(request), /هنوز تأیید انسانی نگرفته/);
});

test('allows sending after approval', () => {
  const request = createApprovalRequest({ type: 'message', payload: { text: 'hello' } });
  const approved = approve(request, 'user-1');
  assert.deepEqual(guardSend(approved), { text: 'hello' });
  assert.equal(approved.approvedBy, 'user-1');
});

test('rejected requests remain blocked', () => {
  const request = createApprovalRequest({ type: 'proforma', payload: {} });
  const rejected = reject(request, 'user-1', 'price too low');
  assert.throws(() => guardSend(rejected));
  assert.equal(rejected.reason, 'price too low');
});
