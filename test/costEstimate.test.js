import test from 'node:test';
import assert from 'node:assert/strict';
import { listConversations, getConversation, saveCostEstimate, makeProforma, listApprovals } from '../web/lib/store.js';
import { snapshotLandedCost } from '../src/proforma/landed-cost.js';
import { guardSend } from '../src/approval/checkpoint.js';

const input = {
  quantity: 100,
  unitPrice: 10,
  currency: 'USD',
  freight: { amount: 20, currency: 'USD' },
  insurance: { amount: 0, currency: 'IRT' },
  customsCost: 1000,
  otherCost: 0,
  rates: { USD: 100000 },
};
const importing = listConversations().find((conversation) => conversation.direction === 'import');
const exporting = listConversations().find((conversation) => conversation.direction === 'export');
const offer = { productCode: importing.productCode, quantity: 100, unitPrice: 12, paymentTerms: 'lc', deliveryDays: 30, destination: 'Tehran' };

test('saved estimates use recomputed totals and detached, allowlisted inputs', () => {
  const mutable = structuredClone(input);
  mutable.total = 1;
  mutable.extra = 'discard';
  mutable.rates.unused = 2;
  const estimate = saveCostEstimate(importing.id, mutable);
  assert.equal(estimate.total, 102001000);
  assert.equal(estimate.inputs.extra, undefined);
  assert.equal(estimate.inputs.rates.unused, undefined);
  mutable.rates.USD = 1;
  mutable.freight.amount = 999;
  assert.equal(getConversation(importing.id).costEstimate.inputs.rates.USD, 100000);
  assert.equal(estimate.inputs.freight.amount, 20);
});

test('proforma approval receives a recalculated cost snapshot that survives estimate replacement', () => {
  const estimate = saveCostEstimate(importing.id, input);
  const { proforma, approvalRequest } = makeProforma(importing.id, { ...offer, costEstimateId: estimate.id });
  assert.equal(proforma.costEstimate.total, estimate.total);
  assert.equal(proforma.costEstimate.id, estimate.id);
  assert.equal(proforma.totalPrice, 1200);
  assert.equal(approvalRequest.payload.costEstimate.total, 102001000);
  assert.equal(approvalRequest.status, 'pending');
  assert.throws(() => guardSend(approvalRequest));
  estimate.inputs.rates.USD = 1;
  assert.equal(proforma.costEstimate.inputs.rates.USD, 100000);
  saveCostEstimate(importing.id, { ...input, otherCost: 5000 });
  assert.equal(approvalRequest.payload.costEstimate.total, 102001000);
});

test('stale estimate IDs and quantity mismatches cannot create approvals', () => {
  const old = saveCostEstimate(importing.id, input);
  const current = saveCostEstimate(importing.id, input);
  const before = listApprovals().length;
  assert.throws(() => makeProforma(importing.id, { ...offer, costEstimateId: old.id }), /تغییر کرده/);
  assert.throws(() => makeProforma(importing.id, { ...offer, quantity: 99, costEstimateId: current.id }), /مقدار پیش‌فاکتور/);
  assert.throws(() => makeProforma(importing.id, { ...offer, productCode: 'OTHER', costEstimateId: current.id }), /مطابقت/);
  assert.equal(listApprovals().length, before);
});

test('saving rejects exports, nonexistent conversations and invalid costs without replacing a valid estimate', () => {
  assert.throws(() => saveCostEstimate(exporting.id, input), /وارداتی/);
  assert.throws(() => saveCostEstimate('missing', input), /پیدا نشد/);
  const current = saveCostEstimate(importing.id, input);
  assert.throws(() => saveCostEstimate(importing.id, { ...input, quantity: 0 }));
  assert.equal(getConversation(importing.id).costEstimate.id, current.id);
});

test('proforma costing remains opt-in and domestic-only snapshots need no exchange rates', () => {
  const { proforma } = makeProforma(importing.id, offer);
  assert.equal(proforma.costEstimate, undefined);
  const domestic = snapshotLandedCost({ ...input, currency: 'IRR', freight: { amount: 0, currency: 'IRT' }, rates: undefined });
  assert.deepEqual(domestic.inputs.rates, {});
});
