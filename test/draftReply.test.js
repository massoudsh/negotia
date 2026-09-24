import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConversation, createMessage } from '../src/models/index.js';
import { draftReply } from '../src/negotiation/draftReply.js';

test('asks for missing quantity, specs and destination', () => {
  const conversation = createConversation({ contactId: 'c1', productCode: 'P1' });
  conversation.messages.push(
    createMessage({ conversationId: conversation.id, channel: 'email', sender: 'contact', text: 'Interested in your product.' }),
  );

  const reply = draftReply(conversation, { summary: 's', intent: 'general_inquiry', seriousness: 'medium' });
  assert.equal(reply.suggestedQuestions.length, 3);
});

test('does not ask about info already present', () => {
  const conversation = createConversation({ contactId: 'c1', productCode: 'P1' });
  conversation.messages.push(
    createMessage({
      conversationId: conversation.id,
      channel: 'email',
      sender: 'contact',
      text: 'We need 500 cartons, grade A, shipping to Rotterdam port.',
    }),
  );

  const reply = draftReply(conversation, { summary: 's', intent: 'general_inquiry', seriousness: 'medium' });
  assert.equal(reply.suggestedQuestions.length, 0);
});

test('rejects unsupported locale', () => {
  const conversation = createConversation({ contactId: 'c1', productCode: 'P1' });
  assert.throws(() => draftReply(conversation, {}, { locale: 'ar' }));
});
