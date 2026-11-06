import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture } from './helpers/convexFixture.mjs';
import * as orders from '../convex/orders.ts';
import * as reports from '../convex/reports.ts';
import { fulfillmentState } from '../convex/lib/orders.utils.ts';

const admin = (db) => db.identity({ subject: 'admin-1', role: 'admin' });
const customer = (db) =>
  db.identity({ subject: 'user_cust', role: 'customer' });

const address = {
  street: 'Str. Florilor 1',
  city: 'Sibiu',
  county: 'SB',
  postalCode: '550001',
  country: 'RO',
};

const seedCustomer = (db, id = 'cust-1', fields = {}) => {
  db.seed('customers', id, {
    clerkUserId: 'user_cust',
    email: 'client@exemplu.ro',
    firstName: 'Prenume',
    lastName: 'Nume',
    shippingAddress: address,
    billingAddress: address,
    newsletter: false,
    createdAt: 1,
    ...fields,
  });
};

const seedOrder = (db, id, fields = {}) => {
  db.seed('orders', id, {
    customerId: 'cust-1',
    items: [
      { productId: 'magnet', name: 'Magnet Sibiu', price: 25, quantity: 2 },
    ],
    total: 50,
    status: 'pending',
    stripeSessionId: `sess-${id}`,
    inventoryStatus: 'pending',
    createdAt: Date.now(),
    ...fields,
  });
};

// Card order fully paid with stock applied (stock already deducted to 98).
const seedPaidCard = (db, id = 'o-card', fields = {}) => {
  seedOrder(db, id, {
    status: 'paid',
    paymentMethod: 'card',
    paymentConfirmedAt: Date.now(),
    inventoryStatus: 'applied',
    inventoryAppliedItems: [
      { productId: 'magnet', name: 'Magnet Sibiu', quantity: 2 },
    ],
    ...fields,
  });
  return id;
};

const cancelMovements = (db) =>
  db.all('stockMovements').filter((m) => m.kind === 'online_cancel');
const returnMovements = (db) =>
  db.all('stockMovements').filter((m) => m.kind === 'online_return');
const noticeJobs = (db, kind) =>
  db.jobs().filter((job) => job.args?.kind === kind);

test('cancelMine: paid card order cancels once, restocks once, flags manual refund, notifies', async () => {
  const db = fixture();
  seedCustomer(db);
  seedPaidCard(db);
  await db.ctx.db.patch('magnet', { stock: 98 });
  customer(db);

  const cancelled = await db.run(orders.cancelMine, {
    requestId: 'mine-cancel-00000001',
    orderId: 'o-card',
  });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.cancelledBy, 'user_cust');
  assert.equal(cancelled.cancelReason, 'Anulată de client');
  assert.equal(cancelled.inventoryStatus, 'released');
  assert.equal(cancelled.refundStatus, 'manual_required');
  assert.equal((await db.ctx.db.get('magnet')).stock, 100);
  assert.equal(cancelMovements(db).length, 1);
  assert.equal(cancelMovements(db)[0].quantity, 2);
  assert.equal(cancelMovements(db)[0].balanceAfter, 100);
  assert.equal(noticeJobs(db, 'customer_cancelled').length, 1);

  // Same requestId replays without a second restock or notice.
  const replay = await db.run(orders.cancelMine, {
    requestId: 'mine-cancel-00000001',
    orderId: 'o-card',
  });
  assert.equal(replay.status, 'cancelled');
  assert.equal(cancelMovements(db).length, 1);
  assert.equal(noticeJobs(db, 'customer_cancelled').length, 1);

  // New requestId on the cancelled order is rejected.
  await assert.rejects(
    db.run(orders.cancelMine, {
      requestId: 'mine-cancel-00000002',
      orderId: 'o-card',
    }),
    /deja anulată/,
  );
  assert.equal(cancelMovements(db).length, 1);
});

test('admin cancel schedules no notice; cancelMine schedules exactly one', async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  seedPaidCard(db, 'o-admin');
  seedPaidCard(db, 'o-mine');
  const cancelledByAdmin = await db.run(orders.cancel, {
    requestId: 'admin-cancel-0000001',
    orderId: 'o-admin',
    reason: 'Anulată telefonic.',
  });
  assert.equal(cancelledByAdmin.status, 'cancelled');
  assert.equal(noticeJobs(db, 'customer_cancelled').length, 0);

  customer(db);
  const cancelledByCustomer = await db.run(orders.cancelMine, {
    requestId: 'mine-cancel-00000004',
    orderId: 'o-mine',
  });
  assert.equal(cancelledByCustomer.status, 'cancelled');
  assert.equal(noticeJobs(db, 'customer_cancelled').length, 1);
});

test('cancelMine: COD order restocks but never flags a refund', async () => {
  const db = fixture();
  seedCustomer(db);
  seedOrder(db, 'o-cod', {
    paymentMethod: 'cod',
    inventoryStatus: 'applied',
    inventoryAppliedItems: [
      { productId: 'magnet', name: 'Magnet Sibiu', quantity: 2 },
    ],
  });
  await db.ctx.db.patch('magnet', { stock: 98 });
  customer(db);

  const cancelled = await db.run(orders.cancelMine, {
    requestId: 'mine-cancel-00000003',
    orderId: 'o-cod',
    reason: 'M-am răzgândit.',
  });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.cancelReason, 'M-am răzgândit.');
  assert.equal(cancelled.refundStatus, undefined);
  assert.equal(cancelMovements(db).length, 1);
  assert.equal((await db.ctx.db.get('magnet')).stock, 100);
});

test('cancelMine rejects ineligible orders and foreign or anonymous callers', async () => {
  const cases = [
    ['o-packed', { status: 'paid', paymentMethod: 'card', paymentConfirmedAt: 1, inventoryStatus: 'applied', fulfillmentStatus: 'packed' }, /ambalată/],
    ['o-shipped', { status: 'shipped', paymentMethod: 'card', paymentConfirmedAt: 1, inventoryStatus: 'applied' }, /expediată/],
    ['o-delivered', { status: 'delivered', paymentMethod: 'card', paymentConfirmedAt: 1, inventoryStatus: 'applied' }, /expediată/],
    ['o-unpaid', { status: 'pending', paymentMethod: 'card', inventoryStatus: 'pending' }, /nu poate fi anulată online/],
    ['o-review', { status: 'paid', paymentMethod: 'card', paymentConfirmedAt: 1, inventoryStatus: 'needs_review' }, /nu poate fi anulată online/],
    ['o-returned', { status: 'returned', paymentMethod: 'card', paymentConfirmedAt: 1, inventoryStatus: 'released', returnedAt: 1 }, /returnată/],
  ];
  let n = 0;
  for (const [id, fields, pattern] of cases) {
    const db = fixture();
    seedCustomer(db);
    seedOrder(db, id, fields);
    customer(db);
    await assert.rejects(
      db.run(orders.cancelMine, {
        requestId: `mine-cancel-rej-${String(++n).padStart(4, '0')}`,
        orderId: id,
      }),
      pattern,
    );
    assert.equal(cancelMovements(db).length, 0);
  }

  // Another customer's order is invisible.
  const db = fixture();
  seedCustomer(db);
  seedCustomer(db, 'cust-2', { clerkUserId: 'user_other' });
  seedPaidCard(db, 'o-foreign');
  await db.ctx.db.patch('o-foreign', { customerId: 'cust-2' });
  customer(db);
  await assert.rejects(
    db.run(orders.cancelMine, {
      requestId: 'mine-cancel-foreign01',
      orderId: 'o-foreign',
    }),
    /nu există/,
  );

  // Anonymous caller is rejected.
  const db2 = fixture();
  seedCustomer(db2);
  seedPaidCard(db2, 'o-anon');
  db2.identity(null);
  await assert.rejects(
    db2.run(orders.cancelMine, {
      requestId: 'mine-cancel-anon-0001',
      orderId: 'o-anon',
    }),
    /autentificat/,
  );
});

test('requestReturnMine: delivered order inside 14 days registers the request once', async () => {
  const db = fixture();
  seedCustomer(db);
  seedOrder(db, 'o-ret', {
    status: 'delivered',
    paymentMethod: 'card',
    paymentConfirmedAt: 1,
    inventoryStatus: 'applied',
    deliveredAt: Date.now() - 2 * 24 * 3600 * 1000,
  });
  customer(db);

  const requested = await db.run(orders.requestReturnMine, {
    requestId: 'mine-return-00000001',
    orderId: 'o-ret',
    reason: 'Produsul nu corespunde așteptărilor.',
  });
  assert.equal(requested.status, 'delivered');
  assert.equal(requested.returnRequestReason, 'Produsul nu corespunde așteptărilor.');
  assert.ok(requested.returnRequestedAt);
  const events = db
    .all('orderEvents')
    .filter((e) => e.kind === 'return_requested');
  assert.equal(events.length, 1);
  assert.equal(events[0].note, 'Produsul nu corespunde așteptărilor.');
  assert.equal(noticeJobs(db, 'return_requested').length, 1);

  // Replay with the same requestId returns the order, no duplicate event.
  const replay = await db.run(orders.requestReturnMine, {
    requestId: 'mine-return-00000001',
    orderId: 'o-ret',
    reason: 'Produsul nu corespunde așteptărilor.',
  });
  assert.equal(replay.status, 'delivered');
  assert.equal(
    db.all('orderEvents').filter((e) => e.kind === 'return_requested').length,
    1,
  );

  // A second, different request is rejected.
  await assert.rejects(
    db.run(orders.requestReturnMine, {
      requestId: 'mine-return-00000002',
      orderId: 'o-ret',
      reason: 'Încercare dublă.',
    }),
    /deja/,
  );
});

test('requestReturnMine rejects shipped, expired and foreign orders', async () => {
  const db = fixture();
  seedCustomer(db);
  seedOrder(db, 'o-ship', { status: 'shipped', deliveredAt: undefined });
  seedOrder(db, 'o-late', {
    status: 'delivered',
    deliveredAt: Date.now() - (14 * 24 * 3600 * 1000 + 1),
  });
  customer(db);
  await assert.rejects(
    db.run(orders.requestReturnMine, {
      requestId: 'mine-return-ship-0001',
      orderId: 'o-ship',
      reason: 'Prea devreme.',
    }),
    /livrate/,
  );
  await assert.rejects(
    db.run(orders.requestReturnMine, {
      requestId: 'mine-return-late-0001',
      orderId: 'o-late',
      reason: 'Prea târziu.',
    }),
    /14 zile/,
  );

  const db2 = fixture();
  seedCustomer(db2);
  seedCustomer(db2, 'cust-2', { clerkUserId: 'user_other' });
  seedOrder(db2, 'o-foreign', {
    status: 'delivered',
    deliveredAt: Date.now() - 24 * 3600 * 1000,
  });
  await db2.ctx.db.patch('o-foreign', { customerId: 'cust-2' });
  customer(db2);
  await assert.rejects(
    db2.run(orders.requestReturnMine, {
      requestId: 'mine-return-foreign1',
      orderId: 'o-foreign',
      reason: 'Nu e comanda mea.',
    }),
    /nu există/,
  );
});

test('markReturned: paid delivered order with restock restocks once, flags manual refund', async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  seedPaidCard(db, 'o-ret', {
    status: 'delivered',
    deliveredAt: Date.now() - 24 * 3600 * 1000,
  });
  await db.ctx.db.patch('magnet', { stock: 98 });

  const returned = await db.run(orders.markReturned, {
    requestId: 'admin-return-000001',
    orderId: 'o-ret',
    reason: 'Clientul a returnat produsul.',
    restock: true,
  });
  assert.equal(returned.status, 'returned');
  assert.equal(returned.returnedBy, 'admin-1');
  assert.equal(returned.returnReason, 'Clientul a returnat produsul.');
  assert.equal(returned.returnRestocked, true);
  assert.equal(returned.inventoryStatus, 'released');
  assert.equal(returned.refundStatus, 'manual_required');
  assert.ok(returned.returnedAt);
  assert.ok(returned.inventoryRestockedAt);
  assert.equal((await db.ctx.db.get('magnet')).stock, 100);
  assert.equal(returnMovements(db).length, 1);
  assert.equal(returnMovements(db)[0].quantity, 2);
  assert.equal(returnMovements(db)[0].balanceAfter, 100);
  assert.equal(returnMovements(db)[0].location, 'workshop');
  assert.equal(noticeJobs(db, 'returned').length, 1);
  const event = db.all('orderEvents').find((e) => e.kind === 'returned');
  assert.match(event.note, /stoc restabilit/);

  // Replay: no second restock; new requestId rejected.
  const replay = await db.run(orders.markReturned, {
    requestId: 'admin-return-000001',
    orderId: 'o-ret',
    reason: 'Clientul a returnat produsul.',
    restock: true,
  });
  assert.equal(replay.status, 'returned');
  assert.equal(returnMovements(db).length, 1);
  await assert.rejects(
    db.run(orders.markReturned, {
      requestId: 'admin-return-000002',
      orderId: 'o-ret',
      reason: 'Din nou.',
      restock: true,
    }),
    /deja returnată/,
  );
  assert.equal(returnMovements(db).length, 1);
});

test('markReturned: restock false touches no stock and keeps inventory applied', async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  seedPaidCard(db, 'o-damaged', {
    status: 'delivered',
    deliveredAt: Date.now() - 24 * 3600 * 1000,
  });
  await db.ctx.db.patch('magnet', { stock: 98 });

  const returned = await db.run(orders.markReturned, {
    requestId: 'admin-return-000003',
    orderId: 'o-damaged',
    reason: 'Produs deteriorat, nu revine în stoc.',
    restock: false,
  });
  assert.equal(returned.status, 'returned');
  assert.equal(returned.returnRestocked, false);
  assert.equal(returned.inventoryStatus, 'applied');
  assert.equal(returned.refundStatus, 'manual_required');
  assert.equal(returnMovements(db).length, 0);
  assert.equal((await db.ctx.db.get('magnet')).stock, 98);
});

test('markReturned: COD delivered flags manual refund; COD refused at the door does not', async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  seedOrder(db, 'o-cod-dlv', {
    paymentMethod: 'cod',
    status: 'delivered',
    paymentConfirmedAt: 1,
    deliveredAt: 2,
    inventoryStatus: 'applied',
    inventoryAppliedItems: [
      { productId: 'magnet', name: 'Magnet Sibiu', quantity: 2 },
    ],
  });
  seedOrder(db, 'o-cod-ref', {
    paymentMethod: 'cod',
    status: 'shipped',
    inventoryStatus: 'applied',
    inventoryAppliedItems: [
      { productId: 'brad', name: 'Ornament Brad', quantity: 1 },
    ],
  });

  const delivered = await db.run(orders.markReturned, {
    requestId: 'admin-return-000004',
    orderId: 'o-cod-dlv',
    reason: 'Retur după livrare.',
    restock: true,
  });
  assert.equal(delivered.status, 'returned');
  assert.equal(delivered.refundStatus, 'manual_required');
  assert.equal(returnMovements(db).length, 1);

  const refused = await db.run(orders.markReturned, {
    requestId: 'admin-return-000005',
    orderId: 'o-cod-ref',
    reason: 'Clientul a refuzat coletul.',
    restock: true,
  });
  assert.equal(refused.status, 'returned');
  assert.equal(refused.refundStatus, undefined);
  assert.equal(returnMovements(db).length, 2);
  assert.equal(returnMovements(db)[1].productId, 'brad');
  assert.equal(returnMovements(db)[1].balanceAfter, 101);
});

test('markReturned: refused paid card parcel still flags manual refund', async () => {
  const db = fixture();
  admin(db);
  seedCustomer(db);
  seedPaidCard(db, 'o-card-ref', { status: 'shipped' });
  const returned = await db.run(orders.markReturned, {
    requestId: 'admin-return-000006',
    orderId: 'o-card-ref',
    reason: 'Colet refuzat la ușă.',
    restock: false,
  });
  assert.equal(returned.status, 'returned');
  assert.equal(returned.refundStatus, 'manual_required');
});

test('markReturned requires admin; admin cancel rejects returned orders', async () => {
  const db = fixture();
  seedCustomer(db);
  seedOrder(db, 'o-ret', {
    status: 'returned',
    returnedAt: 1,
    inventoryStatus: 'released',
    paymentMethod: 'card',
    paymentConfirmedAt: 1,
  });
  admin(db);
  await assert.rejects(
    db.run(orders.cancel, {
      requestId: 'admin-cancel-0000001',
      orderId: 'o-ret',
      reason: 'Anulare pe retur.',
    }),
    /returnată nu mai poate fi anulată/,
  );

  for (const role of ['seller', 'atelier', 'customer']) {
    const db2 = fixture();
    seedCustomer(db2);
    seedOrder(db2, 'o-x', { status: 'delivered', deliveredAt: 1 });
    db2.identity({ subject: `u-${role}`, role });
    await assert.rejects(
      db2.run(orders.markReturned, {
        requestId: 'admin-return-000007',
        orderId: 'o-x',
        reason: 'Fără drepturi.',
        restock: true,
      }),
      /Forbidden|Unauthorized/,
    );
  }
});

test('reports count returns in the return period; refused COD counts as neither', async () => {
  const db = fixture();
  admin(db);
  const D = '2026-04-01';
  const D_TS = Date.UTC(2026, 3, 1, 12);
  // Returned paid card order: sale AND return on D.
  seedOrder(db, 'o-ret-card', {
    status: 'returned',
    paymentMethod: 'card',
    paymentConfirmedAt: D_TS,
    inventoryStatus: 'released',
    returnedAt: D_TS,
    refundStatus: 'manual_required',
    createdAt: D_TS,
    items: [
      { productId: 'stea', name: 'Stea', price: 20, quantity: 1 },
    ],
    total: 20,
  });
  // Refused unpaid COD parcel: neither sale nor return, no refund.
  seedOrder(db, 'o-ret-cod', {
    status: 'returned',
    paymentMethod: 'cod',
    inventoryStatus: 'released',
    returnedAt: D_TS,
    createdAt: D_TS,
    items: [
      { productId: 'brad', name: 'Brad', price: 30, quantity: 1 },
    ],
    total: 30,
  });

  const result = await db.run(reports.summary, {
    from: D,
    to: D,
    channel: 'all',
  });
  assert.equal(result.sales.online.returnsCents, 2000);
  assert.equal(result.sales.online.returnCount, 1);
  assert.equal(result.collections.refundsManualCents, 2000);
  assert.equal(result.collections.refundsManualCount, 1);
  assert.deepEqual(result.ordersByState.byFulfillment.returned, 2);
  // The refused COD parcel is closed unpaid: the cancelled bucket, never pending.
  assert.deepEqual(result.ordersByState.byPayment, {
    pending: { count: 0, valueCents: 0 },
    paid: { count: 1, valueCents: 2000 },
    cancelled: { count: 1, valueCents: 3000 },
  });
  // Returned orders never enter the fulfillment queue.
  assert.equal(fulfillmentState(await db.ctx.db.get('o-ret-card')), 'returned');
  assert.equal(fulfillmentState(await db.ctx.db.get('o-ret-cod')), 'returned');
});
