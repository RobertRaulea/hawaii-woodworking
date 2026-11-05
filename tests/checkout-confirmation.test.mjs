import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCheckoutConfirmation } from '../convex/orders.ts';
import { fixture } from './helpers/convexFixture.mjs';

const sessionId = `cs_test_${'A'.repeat(32)}`;

test('anonymous confirmation capability returns state only and never mutates orders', async () => {
  const db = fixture();
  db.identity(null);
  db.seed('orders', 'order-private', {
    customerId: 'private-customer',
    stripeSessionId: sessionId,
    stripePaymentIntentId: 'private-payment',
    total: 123,
    shipping: { firstName: 'Private', phone: '+40712345678' },
    status: 'paid',
    inventoryStatus: 'applied',
    paymentConfirmedAt: 1,
  });
  const before = structuredClone(db.all('orders'));
  assert.deepEqual(await db.run(getCheckoutConfirmation, { sessionId }), { state: 'confirmed', paymentMethod: null, total: 123 });
  assert.deepEqual(db.all('orders'), before);
  assert.equal(db.jobs().length, 0);
});

test('invalid, forged and missing session capabilities reveal nothing', async () => {
  const db = fixture();
  db.identity(null);
  for (const value of ['', 'cs_test_short', 'not-a-session', `cs_live_${'B'.repeat(32)}`, `cs_test_${'A'.repeat(241)}`, `${sessionId}<script>`]) {
    assert.equal(await db.run(getCheckoutConfirmation, { sessionId: value }), null);
  }
  const noReads = new Proxy({}, { get: () => { throw new Error('Unexpected read'); } });
  assert.equal(await getCheckoutConfirmation._handler(noReads, { sessionId: 'forged' }), null);
});

test('confirmation follows real payment markers and legacy semantics, not the session parameter', async () => {
  const cases = [
    [{ status: 'pending', inventoryStatus: 'pending' }, 'pending'],
    [{ status: 'paid', inventoryStatus: 'applied' }, 'pending'],
    [{ status: 'paid', inventoryStatus: 'needs_review' }, 'pending'],
    [{ status: 'cancelled', inventoryStatus: 'released' }, 'cancelled'],
    [{ status: 'paid', inventoryStatus: 'applied', paymentConfirmedAt: 0 }, 'confirmed'],
    [{ status: 'paid', inventoryStatus: 'needs_review', paymentConfirmedAt: 1 }, 'review'],
    [{ status: 'cancelled', inventoryStatus: 'needs_review', paymentConfirmedAt: 1 }, 'review'],
    [{ status: 'paid' }, 'confirmed'],
    [{ status: 'shipped' }, 'confirmed'],
    [{ status: 'delivered' }, 'confirmed'],
    [{ status: 'cancelled' }, 'cancelled'],
  ];
  for (const [fields, expected] of cases) {
    const db = fixture();
    db.identity(null);
    db.seed('orders', 'order', { stripeSessionId: sessionId, ...fields });
    const before = structuredClone(db.all('orders'));
    assert.deepEqual(await db.run(getCheckoutConfirmation, { sessionId }), { state: expected, paymentMethod: fields.paymentMethod ?? null, total: fields.total }, JSON.stringify(fields));
    assert.deepEqual(db.all('orders'), before);
    assert.equal(db.jobs().length, 0);
  }
});
