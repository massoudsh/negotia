import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAgentBrief, createNegotiationPlan, getDealReadiness } from '../src/negotiation/agent-tools.js';

const policy = {
  minPrice: { default: 10, PISTACHIO: 4.5 },
  acceptedPaymentTerms: ['advance_payment', 'lc', 'credit_30'],
  sensitiveCountries: ['RU'],
  sensitiveCustomers: [],
};

function createConversation({ country = 'AE', messages }) {
  return {
    productCode: 'PISTACHIO',
    direction: 'export',
    contact: { id: 'contact-1', country },
    messages,
  };
}

test('assesses a complete standard-risk deal as ready for quotation', () => {
  const conversation = createConversation({
    messages: [{ sender: 'contact', text: 'We need 2,000 cartons, grade A. Destination port is Jebel Ali. LC at sight and delivery within 30 days.' }],
  });

  const readiness = getDealReadiness(conversation, policy);

  assert.equal(readiness.score, 100);
  assert.equal(readiness.readyForQuote, true);
  assert.deepEqual(readiness.missing, []);
  assert.equal(readiness.risk.level, 'standard');
});

test('keeps sensitive parties out of ready-to-quote status', () => {
  const conversation = createConversation({
    country: 'RU',
    messages: [{ sender: 'contact', text: 'We need 2,000 cartons, grade A. Destination port is Moscow. LC at sight and delivery within 30 days.' }],
  });

  const brief = buildAgentBrief(conversation, policy);

  assert.equal(brief.readiness.readyForQuote, false);
  assert.equal(brief.readiness.risk.level, 'high');
  assert.match(brief.nextMove, /بررسی طرف معامله/);
});

test('builds a negotiation plan around missing deal information and policy limits', () => {
  const conversation = createConversation({ messages: [{ sender: 'contact', text: 'We need 2000 cartons.' }] });

  const plan = createNegotiationPlan(conversation, policy);

  assert.equal(plan.commercialBoundaries.minimumUnitPrice, 4.5);
  assert.deepEqual(plan.commercialBoundaries.acceptedPaymentTerms, policy.acceptedPaymentTerms);
  assert.match(plan.actions[0], /مشخصات یا گرید کالا/);
  assert.match(plan.actions.at(-1), /پیش‌نویس پاسخ/);
});
