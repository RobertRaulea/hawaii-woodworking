import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture } from './helpers/convexFixture.mjs';
import * as inventory from '../convex/inventory.ts';
import * as transfers from '../convex/transfers.ts';
import * as pos from '../convex/pos.ts';
import * as staff from '../convex/staff.ts';
import * as orders from '../convex/orders.ts';
import * as fulfillment from '../convex/fulfillment.ts';
import * as reports from '../convex/reports.ts';
import { businessDate } from '../convex/lib/pos.utils.ts';

const rid = (label) => `e2e-${label}-0000000000`;
const db = fixture();
const as = (subject, role) => db.identity({ subject, role });
const admin = () => as('admin-1', 'admin');
const atelier = () => as('user_at', 'atelier');
const seller = () => as('user_sel', 'seller');
const customer = () => as('cust-1', 'customer');
const anonymous = () => db.identity(null);
const today = businessDate(Date.now());
const sum = (rows, field, productId, fairId) =>
  rows
    .filter(
      (row) =>
        row.productId === productId &&
        (fairId === undefined ? row.location === 'workshop' : row.fairId === fairId),
    )
    .reduce((total, row) => total + row[field], 0);
const counts = () => ({
  stockMovements: db.all('stockMovements').length,
  posSales: db.all('posSales').length,
  orderEvents: db.all('orderEvents').length,
  transferEvents: db.all('transferEvents').length,
  stockOperations: db.all('stockOperations').length,
});

test('end-to-end staff workflow across modules', async () => {
  admin();
  db.seed('fairs', 'fair-b', {
    name: 'Targ B',
    active: true,
    createdBy: 'admin-1',
  });
  db.seed('customers', 'cust-1', {
    firstName: 'Ana',
    lastName: 'Pop',
    email: 'ana@example.com',
  });
  await db.run(staff.assignFairSeller, {
    fairId: 'fair-1',
    userId: 'user_sel',
  });

  // a. Atelier receives finished products into Atelier.
  atelier();
  await db.run(inventory.receive, {
    requestId: rid('receive-magnet'),
    productId: 'magnet',
    quantity: 10,
    note: 'Productie',
  });
  assert.equal((await db.ctx.db.get('magnet')).stock, 110);

  // b. Transfer Atelier -> fair-1, shipped.
  const transfer = await db.run(transfers.create, {
    requestId: rid('create-t1'),
    from: { location: 'workshop' },
    to: { location: 'fair', fairId: 'fair-1' },
    lines: [{ productId: 'magnet', quantity: 5 }],
  });
  await db.run(transfers.ship, { requestId: rid('ship-t1'), transferId: transfer._id });
  assert.equal((await db.ctx.db.get('magnet')).stock, 105);
  assert.equal(
    db.all('fairInventory').find((row) => row.productId === 'magnet' && row.fairId === 'fair-1')
      .quantity,
    34,
  );
  admin();
  const overview = await db.run(pos.getStockOverview, {});
  assert.equal(
    overview.products.find((row) => row.id === 'magnet').inTransitStock,
    5,
  );

  // c. Partial then full receive at fair-1.
  atelier();
  let updated = await db.run(transfers.receive, {
    requestId: rid('recv-t1-a'),
    transferId: transfer._id,
    lines: [{ productId: 'magnet', quantity: 2 }],
  });
  assert.equal(updated.status, 'partially_received');
  updated = await db.run(transfers.receive, {
    requestId: rid('recv-t1-b'),
    transferId: transfer._id,
    lines: [{ productId: 'magnet', quantity: 3 }],
  });
  assert.equal(updated.status, 'received');
  assert.equal(
    db.all('fairInventory').find((row) => row.productId === 'magnet' && row.fairId === 'fair-1')
      .quantity,
    39,
  );

  // d. Seller scope + POS sale at fair-1.
  seller();
  const sellerOverview = await db.run(pos.getStockOverview, {});
  assert.equal(sellerOverview.scope, 'assigned');
  assert.deepEqual(
    sellerOverview.fairs.map((fair) => fair._id),
    ['fair-1'],
  );
  assert.equal(
    sellerOverview.products.find((row) => row.id === 'magnet').onlineStock,
    null,
  );
  await db.run(pos.prepare, {
    requestId: rid('pos-sale'),
    fairId: 'fair-1',
    paymentMethod: 'cash',
    items: [{ productId: 'magnet', quantity: 2, expectedUnitPriceCents: 2500 }],
    discountCents: 0,
    discountReason: '',
  });
  const completed = await db.run(pos.complete, {
    requestId: rid('pos-sale'),
    receivedCents: 6000,
  });
  assert.equal(completed.totalCents, 5000);
  assert.equal(completed.changeCents, 1000);
  assert.equal(
    db.all('fairInventory').find((row) => row.productId === 'magnet' && row.fairId === 'fair-1')
      .quantity,
    37,
  );

  // e. Seller restock request; scoping.
  const requested = await db.run(transfers.request, {
    requestId: rid('request-t2'),
    toFairId: 'fair-1',
    lines: [{ productId: 'magnet', quantity: 1 }],
    note: 'Se termina magnetii',
  });
  assert.equal(requested.status, 'requested');
  atelier();
  const pending = await db.run(transfers.list, { status: 'requested' });
  assert.ok(pending.some((row) => row._id === requested._id));
  seller();
  await assert.rejects(
    db.run(transfers.request, {
      requestId: rid('request-b'),
      toFairId: 'fair-b',
      lines: [{ productId: 'magnet', quantity: 1 }],
    }),
  );

  // f. Online order through the checkout path, then fulfillment.
  const orderId = await db.run(orders.createPendingOrder, {
    customerId: 'cust-1',
    items: [{ productId: 'magnet', name: 'Magnet Sibiu', price: 25, quantity: 3 }],
    total: 75,
    stripeSessionId: 'cs_e2e_1',
    shipping: {
      firstName: 'Ana',
      lastName: 'Pop',
      address: {
        street: 'Str. Exemplu 1',
        city: 'Cluj',
        county: 'Cluj',
        postalCode: '400000',
        country: 'RO',
      },
    },
  });
  await db.run(orders.markOrderPaid, { stripeSessionId: 'cs_e2e_1' });
  const redelivery = await db.run(orders.markOrderPaid, {
    stripeSessionId: 'cs_e2e_1',
  });
  assert.equal(redelivery.alreadyProcessed, true);
  assert.equal((await db.ctx.db.get('magnet')).stock, 102);
  atelier();
  await db.run(fulfillment.claim, { requestId: rid('claim-1'), orderId });
  await db.run(fulfillment.setChecked, {
    requestId: rid('check-1'),
    orderId,
    productId: 'magnet',
    checked: true,
  });
  await db.run(fulfillment.markPacked, { requestId: rid('pack-1'), orderId });
  await db.run(fulfillment.ship, {
    requestId: rid('ship-order-1'),
    orderId,
    awb: 'AWB-E2E-001',
    carrier: 'FAN Courier',
  });
  await db.run(fulfillment.markDelivered, {
    requestId: rid('deliver-1'),
    orderId,
  });
  assert.equal((await db.ctx.db.get(orderId)).status, 'delivered');
  seller();
  await assert.rejects(db.run(fulfillment.queue, {}));
  await assert.rejects(
    db.run(fulfillment.claim, { requestId: rid('claim-sel'), orderId }),
  );
  atelier();
  const view = await db.run(fulfillment.get, { orderId });
  const serialized = JSON.stringify(view);
  assert.ok(!('total' in view) && !('email' in view));
  assert.ok(!serialized.includes('cs_e2e_1') && !serialized.includes('ana@example.com'));
  assert.ok(!serialized.includes('"price"'));

  // g. Cancellation restock (idempotent) + adjustment.
  const order2 = await db.run(orders.createPendingOrder, {
    customerId: 'cust-1',
    items: [{ productId: 'magnet', name: 'Magnet Sibiu', price: 25, quantity: 1 }],
    total: 25,
    stripeSessionId: 'cs_e2e_2',
  });
  await db.run(orders.markOrderPaid, { stripeSessionId: 'cs_e2e_2' });
  assert.equal((await db.ctx.db.get('magnet')).stock, 101);
  admin();
  const cancelled = await db.run(orders.cancel, {
    requestId: rid('cancel-2'),
    orderId: order2,
    reason: 'Clientul a anulat comanda.',
  });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.inventoryStatus, 'released');
  assert.equal(cancelled.refundStatus, 'manual_required');
  assert.equal((await db.ctx.db.get('magnet')).stock, 102);
  const movementsBefore = db.all('stockMovements').length;
  await db.run(orders.cancel, {
    requestId: rid('cancel-2'),
    orderId: order2,
    reason: 'Clientul a anulat comanda.',
  });
  assert.equal(db.all('stockMovements').length, movementsBefore);
  await assert.rejects(
    db.run(orders.cancel, {
      requestId: rid('cancel-2b'),
      orderId: order2,
      reason: 'Clientul a anulat comanda.',
    }),
  );
  atelier();
  await db.run(inventory.adjust, {
    requestId: rid('adjust-stea'),
    productId: 'stea',
    delta: -1,
    reason: 'damaged',
    note: 'Piesa crapata la control',
  });
  assert.equal((await db.ctx.db.get('stea')).stock, 99);

  // h. Final audit, replay and reporting assertions.
  for (const product of db.all('products'))
    assert.ok(product.stock >= 0, `negative stock ${product._id}`);
  for (const balance of db.all('fairInventory'))
    assert.ok(balance.quantity >= 0, `negative fair balance ${balance._id}`);
  const movements = db.all('stockMovements');
  const workshopStart = { magnet: 100, brad: 100, stea: 100 };
  const fairStart = { magnet: 34, brad: 28, stea: 16 };
  for (const productId of ['magnet', 'brad', 'stea']) {
    assert.equal(
      (await db.ctx.db.get(productId)).stock,
      workshopStart[productId] + sum(movements, 'quantity', productId),
      `workshop audit ${productId}`,
    );
    const fairBalance = db
      .all('fairInventory')
      .find((row) => row.productId === productId && row.fairId === 'fair-1');
    assert.equal(
      fairBalance.quantity,
      fairStart[productId] + sum(movements, 'quantity', productId, 'fair-1'),
      `fair audit ${productId}`,
    );
  }
  const before = counts();
  atelier();
  await db.run(inventory.receive, {
    requestId: rid('receive-magnet'),
    productId: 'magnet',
    quantity: 10,
    note: 'Productie',
  });
  await db.run(transfers.ship, { requestId: rid('ship-t1'), transferId: transfer._id });
  await db.run(inventory.adjust, {
    requestId: rid('adjust-stea'),
    productId: 'stea',
    delta: -1,
    reason: 'damaged',
    note: 'Piesa crapata la control',
  });
  admin();
  await db.run(orders.cancel, {
    requestId: rid('cancel-2'),
    orderId: order2,
    reason: 'Clientul a anulat comanda.',
  });
  atelier();
  await db.run(fulfillment.claim, { requestId: rid('claim-1'), orderId });
  assert.deepEqual(counts(), before, 'replays must not write again');
  const queue = await db.run(fulfillment.queue, {});
  assert.ok(queue.every((row) => db.all('posSales').every((sale) => sale._id !== row._id)));
  admin();
  const summary = await db.run(reports.summary, {
    from: today,
    to: today,
    channel: 'all',
  });
  assert.equal(summary.sales.pos.netCents, 5000);
  assert.equal(summary.sales.pos.count, 1);
  assert.equal(summary.sales.online.grossCents, 10000);
  assert.equal(summary.sales.online.returnsCents, 2500);
  assert.equal(summary.sales.online.netCents, 7500);
  assert.equal(summary.sales.online.count, 2);
  assert.equal(summary.collections.posCashCents, 5000);
  assert.equal(summary.collections.onlineCardConfirmedCents, 10000);
  assert.equal(summary.collections.refundsManualCents, 2500);
  const fairRow = summary.posByFair.find((row) => row.fairId === 'fair-1');
  seller();
  const daily = await db.run(pos.dailySummary, { fairId: 'fair-1', date: today });
  assert.deepEqual(
    {
      netCents: fairRow.netCents,
      cashCents: fairRow.cashCents,
      cardCents: fairRow.cardCents,
      count: fairRow.count,
      units: fairRow.units,
    },
    daily === null ? daily : {
      netCents: daily.totalCents,
      cashCents: daily.cashCents,
      cardCents: daily.cardCents,
      count: daily.count,
      units: daily.units,
    },
  );
  admin();
  const dash = await db.run(reports.dashboard, { today });
  assert.equal(dash.sales.today.sales.pos.netCents, 5000);
  assert.equal(dash.sales.today.collections.onlineCardConfirmedCents, 10000);
  assert.equal(dash.transfers.count, 0);
  assert.equal(dash.exceptions.needsReview, 0);
  assert.equal(dash.exceptions.posPrepared, 0);

  // i. Stale-snapshot and in-progress guards.
  atelier();
  const snapStea = await db.run(inventory.countSnapshot, {
    productId: 'stea',
    fairId: 'fair-1',
  });
  seller();
  await db.run(pos.prepare, {
    requestId: rid('pos-sale-stea'),
    fairId: 'fair-1',
    paymentMethod: 'cash',
    items: [{ productId: 'stea', quantity: 1, expectedUnitPriceCents: 2000 }],
    discountCents: 0,
    discountReason: '',
  });
  await db.run(pos.complete, { requestId: rid('pos-sale-stea'), receivedCents: 2000 });
  atelier();
  await assert.rejects(
    db.run(inventory.count, {
      requestId: rid('count-stea'),
      productId: 'stea',
      fairId: 'fair-1',
      expectedQuantity: snapStea.expectedQuantity,
      lastMovementId: snapStea.lastMovementId,
      countedQuantity: snapStea.expectedQuantity,
    }),
    /Revalidează/,
  );
  const snapBrad = await db.run(inventory.countSnapshot, {
    productId: 'brad',
    fairId: 'fair-1',
  });
  const backTransfer = await db.run(transfers.create, {
    requestId: rid('create-t3'),
    from: { location: 'fair', fairId: 'fair-1' },
    to: { location: 'workshop' },
    lines: [{ productId: 'brad', quantity: 1 }],
  });
  await db.run(transfers.ship, { requestId: rid('ship-t3'), transferId: backTransfer._id });
  await assert.rejects(
    db.run(inventory.count, {
      requestId: rid('count-brad'),
      productId: 'brad',
      fairId: 'fair-1',
      expectedQuantity: snapBrad.expectedQuantity,
      lastMovementId: snapBrad.lastMovementId,
      countedQuantity: snapBrad.expectedQuantity,
    }),
    /Revalidează/,
  );
  seller();
  await db.run(pos.prepare, {
    requestId: rid('pos-pending-brad'),
    fairId: 'fair-1',
    paymentMethod: 'cash',
    items: [{ productId: 'brad', quantity: 1, expectedUnitPriceCents: 3000 }],
    discountCents: 0,
    discountReason: '',
  });
  atelier();
  const blocked = await db.run(transfers.create, {
    requestId: rid('create-t4'),
    from: { location: 'fair', fairId: 'fair-1' },
    to: { location: 'workshop' },
    lines: [{ productId: 'brad', quantity: 1 }],
  });
  await assert.rejects(
    db.run(transfers.ship, { requestId: rid('ship-t4'), transferId: blocked._id }),
  );
  await assert.rejects(
    db.run(inventory.adjust, {
      requestId: rid('adjust-brad'),
      productId: 'brad',
      fairId: 'fair-1',
      delta: -1,
      reason: 'damaged',
      note: 'Incercare in timpul unei vanzari',
    }),
  );
  seller();
  await db.run(pos.cancel, { requestId: rid('pos-pending-brad') });
  const order3 = await db.run(orders.createPendingOrder, {
    customerId: 'cust-1',
    items: [{ productId: 'brad', name: 'Ornament Brad', price: 30, quantity: 1 }],
    total: 30,
    stripeSessionId: 'cs_e2e_3',
  });
  await db.run(orders.markOrderPaid, { stripeSessionId: 'cs_e2e_3' });
  atelier();
  await db.run(fulfillment.claim, { requestId: rid('claim-3'), orderId: order3 });
  admin();
  await assert.rejects(
    db.run(fulfillment.claim, { requestId: rid('claim-3b'), orderId: order3 }),
  );

  // j. Direct unauthorized calls.
  for (const deny of [anonymous, customer]) {
    deny();
    await assert.rejects(
      db.run(pos.prepare, {
        requestId: rid('deny-pos'),
        fairId: 'fair-1',
        paymentMethod: 'cash',
        items: [{ productId: 'magnet', quantity: 1, expectedUnitPriceCents: 2500 }],
        discountCents: 0,
        discountReason: '',
      }),
    );
    await assert.rejects(
      db.run(inventory.adjust, {
        requestId: rid('deny-adjust'),
        productId: 'magnet',
        delta: -1,
        reason: 'other',
        note: 'Neautorizat',
      }),
    );
    await assert.rejects(db.run(transfers.list, {}));
    await assert.rejects(db.run(orders.listAdmin, {}));
    await assert.rejects(db.run(fulfillment.queue, {}));
    await assert.rejects(
      db.run(reports.summary, { from: today, to: today, channel: 'all' }),
    );
    await assert.rejects(db.run(staff.directory, {}));
  }
  seller();
  await assert.rejects(
    db.run(pos.prepare, {
      requestId: rid('deny-fairb'),
      fairId: 'fair-b',
      paymentMethod: 'cash',
      items: [{ productId: 'magnet', quantity: 1, expectedUnitPriceCents: 2500 }],
      discountCents: 0,
      discountReason: '',
    }),
  );
  await assert.rejects(db.run(pos.dailySummary, { fairId: 'fair-b', date: today }));
});
