import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkOffer } from '../src/policy/guardrails.js';

const policy = JSON.parse(readFileSync(new URL('../config/policy.example.json', import.meta.url)));

const baseOffer = {
  productCode: 'PISTACHIO-500G',
  unitPrice: 5,
  quantity: 1000,
  paymentTerms: 'advance_payment',
  deliveryDays: 30,
  country: 'DE',
};

test('allows an offer within policy', () => {
  const result = checkOffer(baseOffer, policy);
  assert.equal(result.allowed, true);
  assert.equal(result.requiresHumanApproval, false);
  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.paymentRecommendation, {
    riskLevel: 'low',
    recommendedPaymentTerms: ['credit_30', 'lc', 'advance_payment'],
    reason: 'ریسک پایین — شرایط اعتباری استاندارد شرکت نیز قابل قبول است.',
  });
});

test('flags below-min-price for human approval instead of rejecting', () => {
  const result = checkOffer({ ...baseOffer, unitPrice: 3 }, policy);
  assert.equal(result.allowed, false);
  assert.equal(result.requiresHumanApproval, true);
  assert.ok(result.violations.includes('below_min_price'));
});

test('flags non-standard payment terms', () => {
  const result = checkOffer({ ...baseOffer, paymentTerms: 'cod' }, policy);
  assert.ok(result.violations.includes('non_standard_payment_terms'));
  assert.equal(result.requiresHumanApproval, true);
});

test('flags sensitive country and pauses for review', () => {
  const result = checkOffer({ ...baseOffer, country: 'RU' }, policy);
  assert.ok(result.violations.includes('sensitive_party'));
  assert.equal(result.requiresHumanApproval, true);
});

test('recommends protected payment methods for sensitive parties', () => {
  const result = checkOffer({ ...baseOffer, country: 'RU' }, policy);
  assert.deepEqual(result.paymentRecommendation, {
    riskLevel: 'high',
    recommendedPaymentTerms: ['lc', 'advance_payment'],
    reason: 'کشور یا مشتری در فهرست حساس قرار دارد — فقط پیش‌پرداخت کامل یا LC تأییدشده پیشنهاد می‌شود.',
  });
});

test('recommends LC or advance payment for large deals', () => {
  const result = checkOffer({ ...baseOffer, quantity: 11000, unitPrice: 5 }, policy);
  assert.equal(result.paymentRecommendation.riskLevel, 'medium');
  assert.deepEqual(result.paymentRecommendation.recommendedPaymentTerms, ['lc', 'advance_payment']);
});

test('auto-adjusts delivery days when beyond real capacity', () => {
  const result = checkOffer({ ...baseOffer, quantity: 20000, deliveryDays: 30 }, policy);
  assert.ok(result.violations.includes('delivery_beyond_capacity'));
  assert.equal(result.adjustedDeliveryDays, 120);
});
