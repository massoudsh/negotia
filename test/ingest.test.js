import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ingestEmail } from '../src/ingest/emailIngest.js';

test('ingestEmail creates a new conversation with the message', () => {
  const { conversation, message } = ingestEmail(
    { from: 'buyer@example.com', subject: 'Pistachios inquiry', text: 'Hello, interested in your product.' },
    { contactId: 'contact-1', productCode: 'PISTACHIO-500G' },
  );

  assert.equal(conversation.contactId, 'contact-1');
  assert.equal(conversation.messages.length, 1);
  assert.equal(message.sender, 'contact');
  assert.equal(message.channel, 'email');
});

test('ingestEmail appends to an existing conversation', () => {
  const { conversation } = ingestEmail(
    { from: 'buyer@example.com', text: 'first message' },
    { contactId: 'contact-1', productCode: 'PISTACHIO-500G' },
  );
  const { conversation: updated } = ingestEmail(
    { from: 'buyer@example.com', text: 'second message' },
    { conversation },
  );

  assert.equal(updated.id, conversation.id);
  assert.equal(updated.messages.length, 2);
});

test('ingestEmail strips quoted reply and signature noise', () => {
  const raw = 'Sure, 500 units please.\nOn Mon, John wrote:\n> original message\n-- \nJohn Doe';
  const { message } = ingestEmail({ from: 'buyer@example.com', text: raw }, { contactId: 'c1', productCode: 'P1' });

  assert.equal(message.text, 'Sure, 500 units please.');
});

test('ingestEmail throws on invalid input', () => {
  assert.throws(() => ingestEmail({ from: 'x@example.com' }, { contactId: 'c1' }));
});
