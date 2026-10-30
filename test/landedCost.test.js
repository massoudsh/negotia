import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLandedCost } from '../src/proforma/landed-cost.js';

const base = {
  quantity: 100,
  unitPrice: 10,
  currency: 'USD',
  freight: { amount: 50, currency: 'EUR' },
  insurance: { amount: 10, currency: 'AED' },
  customsCost: 2000000,
  otherCost: 100000,
  rates: { USD: 100000, EUR: 120000, AED: 27000 },
};

test('converts mixed currencies and allocates total shipment costs per unit', () => {
  const result = calculateLandedCost(base);
  assert.deepEqual(result, {
    currency: 'IRT',
    breakdown: { goods: 100000000, shipping: 6000000, insurance: 270000, customs: 2000000, other: 100000 },
    total: 108370000,
    perUnit: 1083700,
  });
});

test('rial uses one tenth of a toman and ignores supplied domestic FX overrides', () => {
  const result = calculateLandedCost({ ...base, unitPrice: 100, currency: 'IRR', freight: { amount: 10, currency: 'IRT' }, insurance: { amount: 20, currency: 'IRR' }, customsCost: 0, otherCost: 0, rates: { IRR: 500, IRT: 100 } });
  assert.equal(result.total, 1012);
  assert.equal(result.perUnit, 10.12);
});

test('supports fractional quantities and no ancillary costs', () => {
  const result = calculateLandedCost({ ...base, quantity: 2.5, unitPrice: 3, currency: 'CNY', freight: { amount: 0, currency: 'IRT' }, insurance: { amount: 0, currency: 'IRT' }, customsCost: 0, otherCost: 0, rates: { CNY: 14000 } });
  assert.equal(result.total, 105000);
  assert.equal(result.perUnit, 42000);
});

test('rejects missing, zero, negative and non-finite foreign exchange rates', () => {
  for (const value of [undefined, 0, -1, NaN, Infinity, '100000']) {
    assert.throws(() => calculateLandedCost({ ...base, rates: { ...base.rates, USD: value } }), /نرخ تبدیل/);
  }
});

test('rejects invalid quantities, costs and unsupported currencies', () => {
  for (const quantity of [0, -1, NaN, Infinity, '10']) {
    assert.throws(() => calculateLandedCost({ ...base, quantity }), /مقدار سفارش/);
  }
  for (const key of ['unitPrice', 'customsCost', 'otherCost']) {
    for (const value of [-1, Infinity, NaN, '100']) {
      assert.throws(() => calculateLandedCost({ ...base, [key]: value }));
    }
  }
  assert.throws(() => calculateLandedCost({ ...base, freight: { amount: -1, currency: 'USD' } }));
  assert.throws(() => calculateLandedCost({ ...base, insurance: { amount: NaN, currency: 'USD' } }));
  assert.throws(() => calculateLandedCost({ ...base, currency: 'GBP' }), /پشتیبانی/);
  assert.throws(() => calculateLandedCost({ ...base, freight: { amount: 0, currency: 'GBP' } }), /پشتیبانی/);
});

test('rejects overflowing totals and per-unit values', () => {
  assert.throws(() => calculateLandedCost({ ...base, rates: { ...base.rates, USD: Number.MAX_SAFE_INTEGER } }), /محدوده/);
  assert.throws(() => calculateLandedCost({ ...base, quantity: Number.MIN_VALUE }), /محدوده/);
});
