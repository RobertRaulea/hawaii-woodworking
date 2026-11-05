import assert from 'node:assert/strict';
import { beforeEach, after, test } from 'node:test';
import { fixture } from './helpers/convexFixture.mjs';
import { placeCodOrder } from '../convex/codOrders.ts';
import { updateStatus, cancel } from '../convex/orders.ts';
import { updateSettings } from '../convex/shipping.ts';

const keys = ['APP_ENV', 'CONVEX_CLOUD_URL', 'CLERK_JWT_ISSUER_DOMAIN', 'SITE_URL', 'CHECKOUT_ENABLED'];
const original = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
beforeEach(() => {
  Object.assign(process.env, {
    APP_ENV: 'test',
    CONVEX_CLOUD_URL: 'https://exuberant-fox-228.convex.cloud',
    CLERK_JWT_ISSUER_DOMAIN: 'https://choice-fowl-16.clerk.accounts.dev',
    SITE_URL: 'http://127.0.0.1:5173',
    CHECKOUT_ENABLED: 'true',
  });
});
after(() => { for (const k of keys) { if (original[k] === undefined) delete process.env[k]; else process.env[k] = original[k]; } });

const address = { street: 'S 1', city: 'Sibiu', county: 'Sibiu', postalCode: '550000', country: 'România' };
const args = (over = {}) => ({
  requestId: 'codreq-000000000001',
  items: [{ productId: 'magnet', quantity: 2 }],
  customer: {
    email: 'buyer@example.test', phone: '+40712345678',
    firstName: 'Buyer', lastName: 'X',
    shippingAddress: address, billingAddress: address, newsletter: false,
  },
  ...over,
});

test('happy path: COD order, stock applied, pending status', async () => {
  const db = fixture();
  db.identity(null);
  const { orderId, confirmationToken } = await db.run(placeCodOrder, args());
  assert.equal(confirmationToken, 'cod:codreq-000000000001');
  const order = await db.ctx.db.get(orderId);
  assert.equal(order.status, 'pending');
  assert.equal(order.paymentMethod, 'cod');
  assert.equal(order.total, 75); // 2*25 + 25 shipping
  assert.equal(order.shippingCost, 25);
  assert.equal(order.inventoryStatus, 'applied');
  const movements = db.all('stockMovements');
  assert.equal(movements.length, 1);
  assert.equal(movements[0].requestId, 'cod:codreq-000000000001');
  assert.equal(movements[0].balanceAfter, 98);
});

test('same requestId returns existing order without double deduction', async () => {
  const db = fixture();
  db.identity(null);
  const first = await db.run(placeCodOrder, args());
  const second = await db.run(placeCodOrder, args());
  assert.equal(second.orderId, first.orderId);
  assert.equal(db.all('orders').length, 1);
  assert.equal(db.all('stockMovements').length, 1);
});

test('insufficient stock rejects and leaves nothing', async () => {
  const db = fixture();
  db.identity(null);
  await assert.rejects(
    db.run(placeCodOrder, args({ items: [{ productId: 'magnet', quantity: 500 }] })),
    /Stoc|stock/i,
  );
  assert.equal(db.all('orders').length, 0);
});

test('cod disabled and production gate reject', async () => {
  const db = fixture(); // default admin identity for the settings write
  await db.run(updateSettings, { flatRateCents: 2500, codEnabled: false, codFeeCents: 0 });
  db.identity(null);
  await assert.rejects(db.run(placeCodOrder, args()), /ramburs/i);
  process.env.APP_ENV = 'production';
  process.env.CONVEX_CLOUD_URL = 'https://upbeat-lyrebird-218.convex.cloud';
  process.env.CLERK_JWT_ISSUER_DOMAIN = 'https://clerk.hawaiiproducts.ro';
  process.env.SITE_URL = 'https://www.hawaiiproducts.ro';
  await assert.rejects(db.run(placeCodOrder, args()), /transportului/);
});

test('non-RO country rejected', async () => {
  const db = fixture();
  db.identity(null);
  await assert.rejects(
    db.run(placeCodOrder, args({ customer: { ...args().customer, shippingAddress: { ...address, country: 'Germany' } } })),
    /România/,
  );
});

test('COD delivery sets paymentConfirmedAt', async () => {
  const db = fixture(); // default admin identity
  const { orderId } = await db.run(placeCodOrder, args());
  await db.ctx.db.patch(orderId, { status: 'shipped' });
  await db.run(updateStatus, { orderId, status: 'delivered' });
  assert.equal(typeof (await db.ctx.db.get(orderId)).paymentConfirmedAt, 'number');
});

test('COD cancel before shipment restocks once, no refundStatus', async () => {
  const db = fixture(); // default admin identity
  const { orderId } = await db.run(placeCodOrder, args());
  const cancelled = await db.run(cancel, {
    requestId: 'cancel-req-000000000001',
    orderId,
    reason: 'Clientul s-a răzgândit',
  });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.inventoryStatus, 'released');
  assert.equal(cancelled.refundStatus, undefined);
  const restocks = db.all('stockMovements').filter((m) => m.kind === 'online_cancel');
  assert.equal(restocks.length, 1);
  assert.equal(restocks[0].balanceAfter, 100);
  await assert.rejects(
    db.run(cancel, {
      requestId: 'cancel-req-000000000002',
      orderId,
      reason: 'A doua încercare',
    }),
    /deja anulată/,
  );
  assert.equal(
    db.all('stockMovements').filter((m) => m.kind === 'online_cancel').length,
    1,
  );
});

test('shipped COD cannot be cancelled; paid card cancel keeps manual refund', async () => {
  const db = fixture();
  const { orderId } = await db.run(placeCodOrder, args());
  await db.ctx.db.patch(orderId, { status: 'shipped' });
  await assert.rejects(
    db.run(cancel, {
      requestId: 'cancel-req-000000000003',
      orderId,
      reason: 'Prea târziu',
    }),
    /nu mai poate fi anulată/,
  );
  db.seed('orders', 'card-order', {
    customerId: 'customer-1',
    total: 75,
    status: 'paid',
    paymentMethod: 'card',
    paymentConfirmedAt: 1,
    inventoryStatus: 'applied',
    stripeSessionId: `cs_test_${'C'.repeat(32)}`,
    items: [{ productId: 'magnet', name: 'Magnet', price: 25, quantity: 2 }],
    inventoryAppliedItems: [
      { productId: 'magnet', name: 'Magnet', quantity: 2 },
    ],
    createdAt: Date.now(),
  });
  const cancelledCard = await db.run(cancel, {
    requestId: 'cancel-req-000000000004',
    orderId: 'card-order',
    reason: 'Caz de rambursare',
  });
  assert.equal(cancelledCard.status, 'cancelled');
  assert.equal(cancelledCard.inventoryStatus, 'released');
  assert.equal(cancelledCard.refundStatus, 'manual_required');
});
