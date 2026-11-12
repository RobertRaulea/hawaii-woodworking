import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canCancelOrder,
  canRequestReturn,
  RETURN_WINDOW_MS,
} from '../src/utils/orderActions.utils.ts';

const paidCard = {
  status: 'paid',
  paymentMethod: 'card',
  paymentConfirmedAt: 1,
  inventoryStatus: 'applied',
};

test('canCancelOrder mirrors the backend eligibility rules', () => {
  assert.equal(canCancelOrder(paidCard), true);
  // COD pending with applied stock is cancellable before packing.
  assert.equal(
    canCancelOrder({
      status: 'pending',
      paymentMethod: 'cod',
      inventoryStatus: 'applied',
    }),
    true,
  );
  for (const [why, order] of [
    ['cancelled', { ...paidCard, status: 'cancelled' }],
    ['shipped', { ...paidCard, status: 'shipped' }],
    ['delivered', { ...paidCard, status: 'delivered' }],
    ['returned', { ...paidCard, status: 'returned' }],
    ['packed', { ...paidCard, fulfillmentStatus: 'packed' }],
    ['unpaid card', { ...paidCard, status: 'pending', paymentConfirmedAt: undefined, inventoryStatus: 'pending' }],
    ['needs_review', { ...paidCard, inventoryStatus: 'needs_review' }],
    ['unpaid pending applied', { ...paidCard, paymentConfirmedAt: undefined }],
  ]) {
    assert.equal(canCancelOrder(order), false, why);
  }
  // Preparing (claimed but not packed) is still cancellable.
  assert.equal(
    canCancelOrder({ ...paidCard, fulfillmentStatus: 'preparing' }),
    true,
  );
});

test('canRequestReturn enforces delivered + 14-day window + single request', () => {
  const now = Date.now();
  const delivered = {
    status: 'delivered',
    deliveredAt: now - 2 * 24 * 3600 * 1000,
  };
  assert.equal(canRequestReturn(delivered, now), true);
  // Exactly at the window edge is still allowed.
  assert.equal(
    canRequestReturn(
      { status: 'delivered', deliveredAt: now - RETURN_WINDOW_MS },
      now,
    ),
    true,
  );
  // One millisecond late is rejected.
  assert.equal(
    canRequestReturn(
      { status: 'delivered', deliveredAt: now - RETURN_WINDOW_MS - 1 },
      now,
    ),
    false,
  );
  assert.equal(
    canRequestReturn({ status: 'shipped' }, now),
    false,
  );
  assert.equal(
    canRequestReturn({ status: 'delivered' }, now),
    false,
  );
  assert.equal(
    canRequestReturn({ ...delivered, returnRequestedAt: now - 1000 }, now),
    false,
  );
});
