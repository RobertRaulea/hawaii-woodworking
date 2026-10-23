import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as orders from '../convex/orders.ts';
import * as products from '../convex/products.ts';
import * as pos from '../convex/pos.ts';
import * as transfers from '../convex/transfers.ts';
import { fixture } from './helpers/convexFixture.mjs';
import { handleStripeWebhook } from '../convex/stripeWebhook.ts';
import { getFunctionName } from 'convex/server';

const orderFixture = (patch = {}) => {
  const db = fixture();
  db.seed('orders', 'order-1', {
    customerId: 'customer-1',
    stripeSessionId: 'cs_test_session',
    total: 80,
    status: 'pending',
    inventoryStatus: 'pending',
    items: [
      { productId: 'magnet', name: 'Magnet', price: 25, quantity: 2 },
      { productId: 'brad', name: 'Brad', price: 30, quantity: 1 },
    ],
    createdAt: Date.now(),
    ...patch,
  });
  return db;
};
const paid = {
  stripeSessionId: 'cs_test_session',
  stripePaymentIntentId: 'pi_test',
};

test('duplicate paid webhooks apply online stock and schedule post-payment only once', async () => {
  const db = orderFixture();
  await db.run(orders.markOrderPaid, paid);
  await db.run(orders.markOrderPaid, paid);
  assert.deepEqual(
    db.all('products').map((product) => product.stock),
    [98, 99, 100],
  );
  assert.equal(db.all('stockMovements').length, 2);
  assert.equal(db.jobs().length, 1);
  assert.equal(db.all('orders')[0].inventoryStatus, 'applied');
});

test('a paid order applies available lines and reconciles only outstanding quantities', async () => {
  const db = orderFixture();
  await db.ctx.db.patch('brad', { stock: 0 });
  await db.run(orders.markOrderPaid, paid);
  await db.run(orders.markOrderPaid, paid);
  const order = db.all('orders')[0];
  assert.equal(order.status, 'paid');
  assert.equal(order.inventoryStatus, 'needs_review');
  assert.ok(order.inventoryError);
  assert.equal(db.all('products')[0].stock, 98);
  assert.deepEqual(order.inventoryUnfulfilledItems, [
    { productId: 'brad', name: 'Ornament Brad', quantity: 1 },
  ]);
  assert.deepEqual(order.inventoryAppliedItems, [
    { productId: 'magnet', name: 'Magnet Sibiu', quantity: 2 },
  ]);
  assert.equal(db.jobs().length, 0);
  await assert.rejects(
    db.run(orders.updateStatus, { orderId: 'order-1', status: 'shipped' }),
  );
  await db.ctx.db.patch('brad', { stock: 1 });
  await db.run(orders.reconcileStock, { orderId: 'order-1' });
  await db.run(orders.reconcileStock, { orderId: 'order-1' });
  assert.equal(db.all('products')[0].stock, 98);
  assert.equal(db.all('products')[1].stock, 0);
  assert.equal(db.jobs().length, 1);
});

test('historic paid orders are not deducted or invoiced again', async () => {
  const db = orderFixture({ status: 'paid', inventoryStatus: undefined });
  await db.run(orders.markOrderPaid, paid);
  assert.equal(db.all('products')[0].stock, 100);
  assert.equal(db.jobs().length, 0);
});

test('a storage failure rolls back stock, payment markers, and scheduling together', async () => {
  const db = orderFixture();
  db.ctx.scheduler.runAfter = async () => {
    throw new Error('Scheduler unavailable');
  };
  await assert.rejects(db.run(orders.markOrderPaid, paid));
  assert.equal(db.all('products')[0].stock, 100);
  assert.equal(db.all('orders')[0].status, 'pending');
  assert.equal(db.all('stockMovements').length, 0);
});

test('checkout validates aggregate duplicate quantities before any payment action', async () => {
  const db = orderFixture();
  const snapshot = await db.run(orders.getCheckoutSnapshot, {
    items: [
      { productId: 'magnet', quantity: 2 },
      { productId: 'magnet', quantity: 3 },
    ],
  });
  assert.equal(snapshot.length, 1);
  assert.equal(snapshot[0].quantity, 5);
  await assert.rejects(
    db.run(orders.getCheckoutSnapshot, {
      items: [
        { productId: 'magnet', quantity: 60 },
        { productId: 'magnet', quantity: 60 },
      ],
    }),
  );
  await assert.rejects(
    db.run(orders.getCheckoutSnapshot, {
      items: [{ productId: 'magnet', quantity: -1 }],
    }),
  );
  assert.equal(db.all('products')[0].stock, 100);
});

test('a late payment for a cancelled order requires explicit reconciliation', async () => {
  const db = orderFixture({ status: 'cancelled' });
  await db.run(orders.markOrderPaid, paid);
  const order = db.all('orders')[0];
  assert.equal(order.status, 'cancelled');
  assert.equal(order.inventoryReviewReason, 'cancelled');
  assert.ok(order.paymentConfirmedAt);
  assert.equal(db.jobs().length, 0);
  await db.run(orders.reconcileStock, { orderId: order._id });
  assert.equal(db.all('orders')[0].status, 'paid');
  assert.equal(db.all('stockMovements')[0].actorId, 'seller-1');
});

test('legacy payment evidence prevents duplicate deductions even after a manual status change', async () => {
  const db = orderFixture({
    status: 'pending',
    inventoryStatus: undefined,
    stripePaymentIntentId: 'pi_legacy',
  });
  await db.run(orders.markOrderPaid, paid);
  assert.equal(db.all('products')[0].stock, 100);
  assert.equal(db.jobs().length, 0);
});

test('stock reconciliation and inventory issue reads require an administrator', async () => {
  const db = orderFixture();
  db.identity({ subject: 'customer-1', role: 'customer' });
  await assert.rejects(
    db.run(orders.reconcileStock, { orderId: 'order-1' }),
    /Forbidden/,
  );
  await assert.rejects(db.run(orders.getInventoryIssues), /Forbidden/);
});

test('the HTTP webhook verifies each delivery but schedules fulfillment once', async () => {
  const db = orderFixture();
  const actions = [];
  const ctx = {
    runAction: async (fn) => {
      actions.push(getFunctionName(fn));
      return {
        type: 'checkout.session.completed',
        paymentStatus: 'paid',
        sessionId: paid.stripeSessionId,
        paymentIntentId: paid.stripePaymentIntentId,
      };
    },
    runMutation: async (_fn, args) => db.run(orders.markOrderPaid, args),
  };
  const request = () =>
    new Request('https://example.test/webhook', {
      method: 'POST',
      body: '{}',
      headers: { 'stripe-signature': 'test-signature' },
    });
  assert.equal(
    (await handleStripeWebhook._handler(ctx, request())).status,
    200,
  );
  assert.equal(
    (await handleStripeWebhook._handler(ctx, request())).status,
    200,
  );
  assert.deepEqual(actions, [
    'stripeVerify:verifyWebhookSignature',
    'stripeVerify:verifyWebhookSignature',
  ]);
  assert.equal(db.jobs().length, 1);
  assert.equal(db.all('products')[0].stock, 98);
});

test('unsigned webhooks never reach the stock mutation', async () => {
  let mutations = 0;
  const response = await handleStripeWebhook._handler(
    {
      runMutation: async () => {
        mutations++;
      },
    },
    new Request('https://example.test/webhook', { method: 'POST', body: '{}' }),
  );
  assert.equal(response.status, 400);
  assert.equal(mutations, 0);
});

test('partial quantities persist across repeated webhooks and replenishments', async () => {
  const db = orderFixture();
  await db.ctx.db.patch('magnet', { stock: 1 });
  await db.ctx.db.patch('brad', { stock: 0 });
  await db.run(orders.markOrderPaid, paid);
  assert.equal(db.all('products')[0].stock, 0);
  assert.deepEqual(db.all('orders')[0].inventoryAppliedItems, [
    { productId: 'magnet', name: 'Magnet Sibiu', quantity: 1 },
  ]);
  assert.equal(db.all('orders')[0].inventoryUnfulfilledItems.length, 2);
  assert.equal(db.all('orders')[0].postPaymentScheduledAt, undefined);
  await db.ctx.db.patch('magnet', { stock: 1 });
  await db.run(orders.markOrderPaid, paid);
  assert.equal(db.all('products')[0].stock, 1);
  await db.run(orders.reconcileStock, { orderId: 'order-1' });
  await db.run(orders.reconcileStock, { orderId: 'order-1' });
  assert.equal(db.all('products')[0].stock, 0);
  assert.equal(db.all('stockMovements').length, 2);
  assert.equal(db.jobs().length, 0);
  assert.deepEqual(db.all('orders')[0].inventoryUnfulfilledItems, [
    { productId: 'brad', name: 'Ornament Brad', quantity: 1 },
  ]);
  await db.ctx.db.patch('brad', { stock: 3 });
  await db.run(orders.reconcileStock, { orderId: 'order-1' });
  await db.run(orders.reconcileStock, { orderId: 'order-1' });
  assert.equal(db.all('products')[1].stock, 2);
  assert.equal(db.all('orders')[0].inventoryStatus, 'applied');
  assert.equal(db.all('orders')[0].inventoryUnfulfilledItems, undefined);
  assert.equal(db.jobs().length, 1);
});

test('paid claims reduce checkout, public availability and transfers, not physical totals', async () => {
  const db = orderFixture({
    items: [{ productId: 'magnet', name: 'Magnet', price: 25, quantity: 5 }],
  });
  await db.ctx.db.patch('magnet', { stock: 2 });
  await db.run(orders.markOrderPaid, paid);
  await db.ctx.db.patch('magnet', { stock: 4 });
  const overview = (await db.run(pos.getStockOverview)).products[0];
  assert.equal(overview.onlineStock, 1);
  assert.equal(overview.onlinePhysicalStock, 4);
  assert.equal(overview.onlineHeldOrders, 3);
  assert.equal(overview.totalStock, 38);
  const publicProducts = await db.run(products.getAll);
  assert.equal(publicProducts[0].stock, 4);
  assert.equal(publicProducts[0].availableStock, 1);
  assert.equal(
    (await db.run(products.getById, { id: 'magnet' })).availableStock,
    1,
  );
  await assert.rejects(
    db.run(orders.getCheckoutSnapshot, {
      items: [{ productId: 'magnet', quantity: 2 }],
    }),
  );
  assert.equal(
    (
      await db.run(orders.getCheckoutSnapshot, {
        items: [{ productId: 'magnet', quantity: 1 }],
      })
    )[0].quantity,
    1,
  );
  const tooMuch = await db.run(transfers.create, {
    requestId: 'held-stock-transfer-001',
    from: { location: 'workshop' },
    to: { location: 'fair', fairId: 'fair-1' },
    lines: [{ productId: 'magnet', quantity: 2 }],
  });
  await assert.rejects(
    db.run(transfers.ship, {
      requestId: 'held-stock-ship-001',
      transferId: tooMuch._id,
    }),
  );
  await db.run(transfers.cancel, {
    requestId: 'held-stock-cancel-001',
    transferId: tooMuch._id,
    reason: 'cantitate prea mare',
  });
  const draft = await db.run(transfers.create, {
    requestId: 'held-stock-transfer-002',
    from: { location: 'workshop' },
    to: { location: 'fair', fairId: 'fair-1' },
    lines: [{ productId: 'magnet', quantity: 1 }],
  });
  await db.run(transfers.ship, {
    requestId: 'held-stock-ship-002',
    transferId: draft._id,
  });
  await db.run(transfers.receive, {
    requestId: 'held-stock-recv-001',
    transferId: draft._id,
    lines: [{ productId: 'magnet', quantity: 1 }],
  });
  const afterTransfer = (await db.run(pos.getStockOverview)).products[0];
  assert.equal(afterTransfer.onlineStock, 0);
  assert.equal(afterTransfer.onlinePhysicalStock, 3);
  assert.equal(afterTransfer.onlineHeldOrders, 3);
  assert.equal(afterTransfer.totalStock, 38);
  const preview = await db.run(pos.getArchivePreview, { fairId: 'fair-1' });
  assert.equal(preview.items[0].onlineAfter, 35);
  await db.run(pos.archiveFair, {
    requestId: 'held-stock-archive-001',
    fairId: 'fair-1',
    expectedInventory: preview.items.map(({ productId, quantity }) => ({
      productId,
      quantity,
    })),
  });
  assert.equal(db.all('products')[0].stock, 38);
  assert.equal(
    (await db.run(pos.getStockOverview)).products[0].onlineStock,
    35,
  );
});

test('pending Stripe sessions never reserve stock', async () => {
  const db = orderFixture();
  await db.run(orders.createPendingOrder, {
    customerId: 'customer-1',
    items: db.all('orders')[0].items,
    total: 80,
    stripeSessionId: 'cs_other_pending',
  });
  assert.equal((await db.run(products.getAll))[0].availableStock, 100);
  assert.equal(
    (await db.run(pos.getStockOverview)).products[0].onlineHeldOrders,
    0,
  );
  await db.run(orders.getCheckoutSnapshot, {
    items: [{ productId: 'magnet', quantity: 100 }],
  });
  assert.equal(db.all('products')[0].stock, 100);
});

test('older paid claims can reconcile without mutual blocking or stealing their held stock', async () => {
  const db = orderFixture({
    items: [{ productId: 'magnet', name: 'Magnet', price: 25, quantity: 5 }],
  });
  await db.ctx.db.patch('magnet', { stock: 0 });
  await db.run(orders.markOrderPaid, paid);
  await db.ctx.db.patch('order-1', { paymentConfirmedAt: 1 });
  db.seed('orders', 'order-2', {
    ...db.all('orders')[0],
    stripeSessionId: 'cs_second',
    paymentConfirmedAt: 2,
  });
  await db.ctx.db.patch('magnet', { stock: 5 });
  await db.run(orders.reconcileStock, { orderId: 'order-2' });
  assert.equal(db.all('products')[0].stock, 5);
  assert.equal(db.jobs().length, 0);
  await db.run(orders.reconcileStock, { orderId: 'order-1' });
  assert.equal(db.all('products')[0].stock, 0);
  assert.equal(db.jobs().length, 1);
  await db.ctx.db.patch('magnet', { stock: 5 });
  await db.run(orders.reconcileStock, { orderId: 'order-2' });
  assert.equal(db.all('products')[0].stock, 0);
  assert.equal(db.jobs().length, 2);
});

test('new payments cannot consume replenishments held for earlier paid orders', async () => {
  const db = orderFixture({
    items: [{ productId: 'magnet', name: 'Magnet', price: 25, quantity: 5 }],
  });
  await db.ctx.db.patch('magnet', { stock: 0 });
  await db.run(orders.markOrderPaid, paid);
  db.seed('orders', 'new-order', {
    customerId: 'customer-1',
    stripeSessionId: 'cs_new',
    status: 'pending',
    inventoryStatus: 'pending',
    total: 25,
    createdAt: 1,
    items: [{ productId: 'magnet', name: 'Magnet', price: 25, quantity: 1 }],
  });
  await db.ctx.db.patch('magnet', { stock: 5 });
  await db.run(orders.markOrderPaid, { stripeSessionId: 'cs_new' });
  assert.equal(db.all('products')[0].stock, 5);
  assert.equal(db.all('orders')[1].inventoryUnfulfilledItems[0].quantity, 1);
  assert.equal(db.jobs().length, 0);
});

test('missing or invalid product stock does not prevent allocation of other valid lines', async () => {
  for (const missing of [true, false]) {
    const db = orderFixture();
    if (missing) await db.ctx.db.delete('brad');
    else await db.ctx.db.patch('brad', { stock: -1 });
    await db.run(orders.markOrderPaid, paid);
    assert.equal(db.all('products')[0].stock, 98);
    assert.equal(db.all('orders')[0].inventoryUnfulfilledItems[0].quantity, 1);
    assert.equal(db.all('orders')[0].inventoryStatus, 'needs_review');
    assert.equal(db.jobs().length, 0);
  }
});

test('untracked lines are fulfilled without decrementing a fictitious stock pool', async () => {
  const db = orderFixture();
  await db.ctx.db.patch('magnet', { stock: 0, trackStock: false });
  await db.run(orders.markOrderPaid, paid);
  assert.equal(db.all('products')[0].stock, 0);
  assert.equal(db.all('orders')[0].inventoryStatus, 'applied');
  assert.equal(db.all('orders')[0].inventoryAppliedItems[0].quantity, 2);
  assert.equal(db.all('stockMovements').length, 1);
});

test('partial allocation audit failures roll back both remaining quantities and payment confirmation', async () => {
  const db = orderFixture();
  await db.ctx.db.patch('magnet', { stock: 1 });
  const insert = db.ctx.db.insert;
  db.ctx.db.insert = async (table, value) => {
    if (table === 'stockMovements') throw new Error('Audit unavailable');
    return insert(table, value);
  };
  await assert.rejects(db.run(orders.markOrderPaid, paid));
  assert.equal(db.all('products')[0].stock, 1);
  assert.equal(db.all('orders')[0].paymentConfirmedAt, undefined);
  assert.equal(db.all('orders')[0].inventoryUnfulfilledItems, undefined);
  assert.equal(db.jobs().length, 0);
});
