import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createConversation, createMessage } from '../src/models/index.js';
import { summarizeConversation } from '../src/negotiation/summarize.js';
import { createMockLlmProvider } from '../src/llm/provider.js';

function conversationWithText(text) {
  const conversation = createConversation({ contactId: 'c1', productCode: 'P1' });
  conversation.messages.push(createMessage({ conversationId: conversation.id, channel: 'email', sender: 'contact', text }));
  return conversation;
}

test('detects high seriousness from purchase-order language', () => {
  const conversation = conversationWithText('We are ready to send a purchase order, please confirm final price.');
  const result = summarizeConversation(conversation, { provider: createMockLlmProvider() });
  assert.equal(result.seriousness, 'high');
});

test('detects low seriousness from casual inquiry', () => {
  const conversation = conversationWithText('Just checking your catalog, for information only.');
  const result = summarizeConversation(conversation, { provider: createMockLlmProvider() });
  assert.equal(result.seriousness, 'low');
});

test('detects price_inquiry intent', () => {
  const conversation = conversationWithText('Can you send me a quote for your product price?');
  const result = summarizeConversation(conversation, { provider: createMockLlmProvider() });
  assert.equal(result.intent, 'price_inquiry');
});
