import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConversation, createMessage } from '../src/models/index.js';
import { scheduleFollowUp } from '../src/followup/scheduler.js';

test('no follow-up needed when buyer replied last', () => {
  const conversation = createConversation({ contactId: 'c1', productCode: 'P1' });
  conversation.messages.push(createMessage({ conversationId: conversation.id, channel: 'email', sender: 'contact', text: 'hi' }));

  const result = scheduleFollowUp(conversation);
  assert.equal(result.needsFollowUp, false);
  assert.equal(result.dueAt, null);
});

test('no follow-up needed yet if wait period has not passed', () => {
  const conversation = createConversation({ contactId: 'c1', productCode: 'P1' });
  const at = new Date().toISOString();
  conversation.messages.push(createMessage({ conversationId: conversation.id, channel: 'email', sender: 'company', text: 'our offer', at }));

  const result = scheduleFollowUp(conversation, { waitDays: 3, now: new Date(at) });
  assert.equal(result.needsFollowUp, false);
  assert.ok(result.dueAt);
});

test('follow-up needed once wait period has passed with no reply', () => {
  const conversation = createConversation({ contactId: 'c1', productCode: 'P1' });
  const at = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
  conversation.messages.push(createMessage({ conversationId: conversation.id, channel: 'email', sender: 'company', text: 'our offer', at }));

  const result = scheduleFollowUp(conversation, { waitDays: 3 });
  assert.equal(result.needsFollowUp, true);
});
