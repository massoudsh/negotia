import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createConversation } from '../src/models/index.js';
import { prepareProforma } from '../src/proforma/prepare.js';
import { guardSend } from '../src/approval/checkpoint.js';

const policy = JSON.parse(readFileSync(new URL('../config/policy.example.json', import.meta.url)));

test('prepares a proforma pending human approval', () => {
  const conversation = createConversation({ contactId: 'c1', productCode: 'PISTACHIO-500G' });
  const offer = {
    productCode: 'PISTACHIO-500G',
    quantity: 1000,
    unitPrice: 5,
    paymentTerms: 'advance_payment',
    deliveryDays: 30,
    destination: 'Rotterdam, NL',
    country: 'NL',
  };

  const { proforma, approvalRequest } = prepareProforma(conversation, offer, policy);

  assert.equal(proforma.status, 'pending_approval');
  assert.equal(proforma.totalPrice, 5000);
  assert.equal(approvalRequest.status, 'pending');
  assert.throws(() => guardSend(approvalRequest), /هنوز تأیید انسانی نگرفته/);
});

test('carries policy violations into the proforma even when a human could still approve it', () => {
  const conversation = createConversation({ contactId: 'c1', productCode: 'PISTACHIO-500G' });
  const offer = {
    productCode: 'PISTACHIO-500G',
    quantity: 1000,
    unitPrice: 2, // below min price
    paymentTerms: 'advance_payment',
    deliveryDays: 30,
    destination: 'Rotterdam, NL',
  };

  const { proforma } = prepareProforma(conversation, offer, policy);
  assert.ok(proforma.violations.includes('below_min_price'));
});
