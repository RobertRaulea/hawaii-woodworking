import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeOrderTotals, codAllowed, DEFAULT_SHIPPING_SETTINGS } from '../shared/shipping.ts';

const s = (o = {}) => ({ ...DEFAULT_SHIPPING_SETTINGS, ...o });

test('computeOrderTotals: flat shipping, free at threshold boundary', () => {
  const st = s({ flatRateCents: 2500, freeShippingThresholdCents: 10000 });
  assert.deepEqual(computeOrderTotals({ settings: st, subtotalCents: 9999, paymentMethod: 'card' }), { shippingCents: 2500, codFeeCents: 0, totalCents: 12499 });
  assert.deepEqual(computeOrderTotals({ settings: st, subtotalCents: 10000, paymentMethod: 'card' }), { shippingCents: 0, codFeeCents: 0, totalCents: 10000 });
  assert.deepEqual(computeOrderTotals({ settings: s(), subtotalCents: 5000, paymentMethod: 'card' }), { shippingCents: 2500, codFeeCents: 0, totalCents: 7500 });
});

test('computeOrderTotals: COD fee only for cod', () => {
  const st = s({ flatRateCents: 2500, codFeeCents: 500 });
  assert.deepEqual(computeOrderTotals({ settings: st, subtotalCents: 5000, paymentMethod: 'cod' }), { shippingCents: 2500, codFeeCents: 500, totalCents: 8000 });
  assert.equal(computeOrderTotals({ settings: st, subtotalCents: 5000, paymentMethod: 'card' }).codFeeCents, 0);
});

test('codAllowed: enabled/max boundaries', () => {
  assert.equal(codAllowed(s(), 999999), true);
  assert.equal(codAllowed(s({ codEnabled: false }), 100), false);
  assert.equal(codAllowed(s({ codMaxOrderCents: 10000 }), 10000), true);
  assert.equal(codAllowed(s({ codMaxOrderCents: 10000 }), 10001), false);
});
