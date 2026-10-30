import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDashboard } from '../web/lib/dashboard.js';

const now = new Date('2026-10-30T12:00:00Z');
function conversation(id, status, sender, at = '2026-10-27T12:00:00Z') {
  return { id, status, messages: sender ? [{ sender, at }] : [] };
}

test('empty dashboard has zero counts and no invented alerts', () => {
  assert.deepEqual(summarizeDashboard([], [], now), {
    active: 0, serious: 0, awaitingResponse: [], overdue: [], pending: 0, needsAttention: 0,
  });
});

test('dashboard derives counts and overdue alerts from open records', () => {
  const reply = conversation('reply', 'serious', 'contact');
  const overdue = conversation('overdue', 'awaiting_reply', 'company');
  const recent = conversation('recent', 'open', 'company', '2026-10-29T12:00:00Z');
  const closed = conversation('closed', 'closed', 'company');
  const empty = conversation('empty', 'open');
  const result = summarizeDashboard([reply, overdue, recent, closed, empty], [
    { status: 'pending' }, { status: 'approved' }, { status: 'rejected' },
  ], now);
  assert.equal(result.active, 4);
  assert.equal(result.serious, 1);
  assert.equal(result.pending, 1);
  assert.equal(result.needsAttention, 2);
  assert.deepEqual(result.awaitingResponse, [reply]);
  assert.deepEqual(result.overdue, [overdue]);
});

test('follow-up starts at exactly three days and excludes closed incoming messages', () => {
  const record = conversation('due', 'open', 'company');
  assert.equal(summarizeDashboard([record], [], new Date(now.getTime() - 1)).overdue.length, 0);
  assert.equal(summarizeDashboard([record], [], now).overdue.length, 1);
  assert.equal(summarizeDashboard([conversation('closed', 'closed', 'contact')], [], now).needsAttention, 0);
});

test('approval count follows actual decisions, not a fixed badge', () => {
  assert.equal(summarizeDashboard([], [{ status: 'pending' }], now).pending, 1);
  assert.equal(summarizeDashboard([], [{ status: 'approved' }], now).pending, 0);
});
