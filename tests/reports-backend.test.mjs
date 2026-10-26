import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture } from './helpers/convexFixture.mjs';
import * as reports from '../convex/reports.ts';
import * as pos from '../convex/pos.ts';
import * as fulfillment from '../convex/fulfillment.ts';
import * as transfers from '../convex/transfers.ts';

const D = '2026-04-01';
const D_TS = Date.UTC(2026, 3, 1, 12);
const admin = (db) => db.identity({ subject: 'admin-1', role: 'admin' });
const atelier = (db) => db.identity({ subject: 'user_at', role: 'atelier' });
const seller = (db) => db.identity({ subject: 'user_sel', role: 'seller' });

const seedFair2 = (db) => {
  db.seed('fairs', 'fair-2', {
    name: 'Târg B',
    active: true,
    createdBy: 'admin-1',
  });
};

const seedPosSale = (db, id, fields = {}) => {
  db.seed('posSales', id, {
    requestId: `pos-sale-${id}-00000`,
    sellerId: 'seller-1',
    fairId: 'fair-1',
    paymentMethod: 'cash',
    items: [
      {
        productId: 'magnet',
        name: 'Magnet Sibiu',
        quantity: 1,
        unitPriceCents: 2500,
      },
    ],
    subtotalCents: 2500,
    discountCents: 0,
    discountReason: '',
    totalCents: 2500,
    changeCents: 0,
    completedAt: D_TS,
    businessDate: D,
    ...fields,
  });
};

const seedOrder = (db, id, fields = {}) => {
  db.seed('orders', id, {
    customerId: 'cust-1',
    items: [
      { productId: 'magnet', name: 'Magnet Sibiu', price: 25, quantity: 1 },
    ],
    total: 25,
    status: 'pending',
    stripeSessionId: `sess-${id}`,
    createdAt: D_TS,
    ...fields,
  });
};

const seedAll = (db) => {
  seedFair2(db);
  // POS sales on D: fair A cash (with discount), fair A card, fair B card.
  seedPosSale(db, 's-a-cash', {
    paymentMethod: 'cash',
    items: [
      {
        productId: 'magnet',
        name: 'Magnet Sibiu',
        quantity: 2,
        unitPriceCents: 2500,
      },
    ],
    subtotalCents: 5000,
    discountCents: 500,
    totalCents: 4500,
  });
  seedPosSale(db, 's-a-card', {
    paymentMethod: 'card',
    items: [
      {
        productId: 'brad',
        name: 'Ornament Brad',
        quantity: 1,
        unitPriceCents: 3000,
      },
    ],
    subtotalCents: 3000,
    totalCents: 3000,
  });
  seedPosSale(db, 's-b-card', {
    fairId: 'fair-2',
    paymentMethod: 'card',
    items: [
      {
        productId: 'stea',
        name: 'Stea',
        quantity: 1,
        unitPriceCents: 2000,
      },
    ],
    subtotalCents: 2000,
    totalCents: 2000,
  });
  // Out-of-period POS sale (day before D in Bucharest terms).
  seedPosSale(db, 's-old', {
    businessDate: '2026-03-31',
    completedAt: Date.UTC(2026, 2, 31, 10),
    totalCents: 1000,
    subtotalCents: 1000,
  });

  // Online: paid order confirmed 21:30 UTC = 00:30 on D in Bucharest.
  seedOrder(db, 'o-paid', {
    status: 'paid',
    inventoryStatus: 'applied',
    paymentConfirmedAt: Date.UTC(2026, 2, 31, 21, 30),
    items: [
      { productId: 'magnet', name: 'Magnet Sibiu', price: 25, quantity: 2 },
    ],
    total: 45,
  });
  // Pending unpaid order created on D (appears only in ordersByState).
  seedOrder(db, 'o-pending', { total: 100 });
  // Paid then cancelled on D → return + manual refund flag.
  seedOrder(db, 'o-cancelled-paid', {
    status: 'cancelled',
    inventoryStatus: 'released',
    paymentConfirmedAt: D_TS,
    cancelledAt: D_TS,
    refundStatus: 'manual_required',
    items: [{ productId: 'stea', name: 'Stea', price: 20, quantity: 1 }],
    total: 20,
  });
  // Legacy paid order without paymentConfirmedAt → unverified collection.
  seedOrder(db, 'o-legacy', {
    status: 'paid',
    inventoryStatus: undefined,
    items: [
      { productId: 'brad', name: 'Ornament Brad', price: 30, quantity: 1 },
    ],
    total: 30,
  });
  // Cancelled before payment, paid late → sale set + return on D + needs_review.
  seedOrder(db, 'o-late', {
    status: 'cancelled',
    inventoryStatus: 'needs_review',
    paymentConfirmedAt: D_TS,
    cancelledAt: Date.UTC(2026, 2, 20, 8),
    items: [
      { productId: 'magnet', name: 'Magnet Sibiu', price: 25, quantity: 1 },
    ],
    total: 25,
  });
};

const summaryArgs = (overrides = {}) => ({
  from: D,
  to: D,
  channel: 'all',
  ...overrides,
});

test('summary computes exact online/POS/total figures for D', async () => {
  const db = fixture();
  admin(db);
  seedAll(db);
  const result = await db.run(reports.summary, summaryArgs());
  assert.deepEqual(result.sales.online, {
    grossCents: 12500,
    discountCents: 500,
    returnsCents: 4500,
    netCents: 7500,
    count: 4,
    units: 5,
    returnCount: 2,
    returnUnits: 2,
  });
  assert.deepEqual(result.sales.pos, {
    grossCents: 10000,
    discountCents: 500,
    returnsCents: 0,
    netCents: 9500,
    count: 3,
    units: 4,
    returnCount: 0,
    returnUnits: 0,
  });
  assert.deepEqual(result.sales.total, {
    grossCents: 22500,
    discountCents: 1000,
    returnsCents: 4500,
    netCents: 17000,
    count: 7,
    units: 9,
    returnCount: 2,
    returnUnits: 2,
  });
  assert.equal(result.posReturnsTracked, false);
  assert.deepEqual(result.collections, {
    posCashCents: 4500,
    posCardCents: 5000,
    onlineCardConfirmedCents: 9000,
    onlineCardConfirmedCount: 3,
    onlineUnverifiedCents: 3000,
    onlineUnverifiedCount: 1,
    refundsManualCents: 2000,
    refundsManualCount: 1,
  });
  assert.deepEqual(result.ordersByState.byPayment, {
    pending: { count: 1, valueCents: 10000 },
    paid: { count: 4, valueCents: 12000 },
    cancelled: { count: 0, valueCents: 0 },
  });
  assert.deepEqual(result.ordersByState.byFulfillment, {
    cancelled: 2,
    delivered: 0,
    shipped: 0,
    packed: 0,
    preparing: 0,
    ready: 2,
    blocked: 1,
  });
  assert.deepEqual(result.posByFair, [
    {
      fairId: 'fair-1',
      fairName: 'Targ Craciun',
      grossCents: 8000,
      discountCents: 500,
      netCents: 7500,
      cashCents: 4500,
      cardCents: 3000,
      count: 2,
      units: 3,
    },
    {
      fairId: 'fair-2',
      fairName: 'Târg B',
      grossCents: 2000,
      discountCents: 0,
      netCents: 2000,
      cashCents: 0,
      cardCents: 2000,
      count: 1,
      units: 1,
    },
  ]);
  assert.deepEqual(result.productsSold, [
    {
      productId: 'magnet',
      name: 'Magnet Sibiu',
      onlineUnits: 3,
      onlineReturnedUnits: 1,
      posUnits: 2,
      units: 4,
      grossCents: 12500,
    },
    {
      productId: 'brad',
      name: 'Ornament Brad',
      onlineUnits: 1,
      onlineReturnedUnits: 0,
      posUnits: 1,
      units: 2,
      grossCents: 6000,
    },
    {
      productId: 'stea',
      name: 'Stea',
      onlineUnits: 1,
      onlineReturnedUnits: 1,
      posUnits: 1,
      units: 1,
      grossCents: 4000,
    },
  ]);
  assert.deepEqual(result.byDay, [
    { date: D, onlineNetCents: 7500, posNetCents: 9500 },
  ]);
});

test('channel and fairId filters scope the report', async () => {
  const db = fixture();
  admin(db);
  seedAll(db);
  const online = await db.run(
    reports.summary,
    summaryArgs({ channel: 'online' }),
  );
  assert.equal(online.sales.online.netCents, 7500);
  assert.equal(online.sales.pos, null);
  assert.equal(online.ordersByState.byPayment.pending.count, 1);
  assert.equal(online.posByFair, null);
  assert.deepEqual(online.byDay, [
    { date: D, onlineNetCents: 7500, posNetCents: 0 },
  ]);
  assert.equal(online.collections.posCashCents, null);
  assert.equal(online.collections.posCardCents, null);
  assert.equal(online.collections.onlineCardConfirmedCents, 9000);

  const posOnly = await db.run(
    reports.summary,
    summaryArgs({ channel: 'pos' }),
  );
  assert.equal(posOnly.sales.online, null);
  assert.equal(posOnly.ordersByState, null);
  assert.equal(posOnly.sales.pos.netCents, 9500);
  assert.equal(posOnly.collections.posCashCents, 4500);
  assert.equal(posOnly.collections.onlineCardConfirmedCents, null);
  assert.equal(posOnly.collections.onlineCardConfirmedCount, null);
  assert.equal(posOnly.collections.onlineUnverifiedCents, null);
  assert.equal(posOnly.collections.refundsManualCents, null);
  assert.equal(posOnly.collections.refundsManualCount, null);

  const fairA = await db.run(
    reports.summary,
    summaryArgs({ fairId: 'fair-1' }),
  );
  assert.equal(fairA.filters.channel, 'pos');
  assert.equal(fairA.sales.online, null);
  assert.equal(fairA.posByFair.length, 1);
  assert.equal(fairA.posByFair[0].netCents, 7500);
});

test('a period excluding D returns no POS sales', async () => {
  const db = fixture();
  admin(db);
  seedAll(db);
  const result = await db.run(
    reports.summary,
    summaryArgs({ from: '2026-02-01', to: '2026-02-28', channel: 'pos' }),
  );
  assert.equal(result.sales.pos.count, 0);
  assert.equal(result.sales.pos.netCents, 0);
  assert.equal(result.posByFair.length, 0);
});

test('posByFair row for fair A matches pos.dailySummary', async () => {
  const db = fixture();
  admin(db);
  seedAll(db);
  const result = await db.run(reports.summary, summaryArgs());
  const daily = await db.run(pos.dailySummary, {
    fairId: 'fair-1',
    date: D,
  });
  const row = result.posByFair.find((entry) => entry.fairId === 'fair-1');
  assert.equal(row.netCents, daily.totalCents);
  assert.equal(row.cashCents, daily.cashCents);
  assert.equal(row.cardCents, daily.cardCents);
  assert.equal(row.count, daily.count);
  assert.equal(row.units, daily.units);
});

test('dashboard sections match summary, queue, overview and transfers', async () => {
  const db = fixture();
  admin(db);
  seedAll(db);
  await db.ctx.db.patch('stea', { stock: 3 });
  await db.ctx.db.patch('brad', { stock: -2 });
  db.seed('transfers', 'tr-1', {
    status: 'in_transit',
    createdBy: 'user_at',
    createdAt: 1,
    updatedAt: 1,
    fromLocation: 'workshop',
    toLocation: 'fair',
    toFairId: 'fair-1',
    shippedAt: D_TS,
    lines: [
      {
        productId: 'magnet',
        productName: 'Magnet Sibiu',
        quantity: 5,
        shippedQuantity: 5,
        receivedQuantity: 2,
      },
    ],
  });
  db.seed('transfers', 'tr-2', {
    status: 'partially_received',
    createdBy: 'user_at',
    createdAt: 1,
    updatedAt: 1,
    fromLocation: 'fair',
    fromFairId: 'fair-1',
    toLocation: 'workshop',
    shippedAt: D_TS,
    lines: [
      {
        productId: 'stea',
        productName: 'Stea',
        quantity: 4,
        shippedQuantity: 4,
        receivedQuantity: 0,
      },
    ],
  });
  db.seed('fairAssignments', 'asg-1', {
    fairId: 'fair-1',
    userId: 'user_sel',
    assignedBy: 'admin-1',
    createdAt: 1,
  });

  const dash = await db.run(reports.dashboard, { today: D });
  const sum = await db.run(reports.summary, summaryArgs());
  assert.deepEqual(dash.sales.today, {
    sales: sum.sales,
    collections: sum.collections,
  });

  const queue = await db.run(fulfillment.queue, {});
  const queueCount = (state) =>
    queue.filter((row) => row.state === state).length;
  assert.deepEqual(dash.fulfillment, {
    ready: queueCount('ready'),
    preparing: queueCount('preparing'),
    packed: queueCount('packed'),
  });
  assert.equal(dash.fulfillment.ready, 2);

  const overview = await db.run(pos.getStockOverview, {});
  const low = overview.products.filter(
    (product) =>
      product.status === 'active' &&
      product.trackStock &&
      (product.invalidStock ||
        (product.onlineStock !== null &&
          product.onlineStock <= (product.lowStockThreshold ?? 5))),
  );
  assert.equal(dash.lowStock.count, 2);
  // Invalid stock sorts first and reports available:null.
  assert.equal(dash.lowStock.rows[0].productId, 'brad');
  assert.equal(dash.lowStock.rows[0].available, null);
  assert.equal(dash.lowStock.rows[0].invalid, true);
  assert.deepEqual(
    dash.lowStock.rows.map((row) => row.productId),
    low.map((row) => row.id).sort((a, b) => (a === 'brad' ? -1 : b === 'brad' ? 1 : 0)),
  );

  const allTransfers = await db.run(transfers.list, {});
  const open = allTransfers.filter(
    (row) =>
      row.status === 'in_transit' || row.status === 'partially_received',
  );
  assert.equal(dash.transfers.count, open.length);
  // inTransitUnits sums ALL open transfers (3 + 4), not only the listed rows.
  assert.equal(dash.transfers.inTransitUnits, 7);
  assert.equal(dash.transfers.rows[0].toName, 'Targ Craciun');
  assert.equal(dash.transfers.rows[0].inTransitUnits, 3);

  assert.deepEqual(dash.exceptions, {
    needsReview: 1,
    posPrepared: 0,
    invalidBalances: 0,
  });
  assert.equal(dash.pos, null);
});

test('seller dashboard exposes only own POS and own transfers', async () => {
  const db = fixture();
  seedAll(db);
  db.seed('fairAssignments', 'asg-1', {
    fairId: 'fair-1',
    userId: 'user_sel',
    assignedBy: 'admin-1',
    createdAt: 1,
  });
  db.seed('transfers', 'tr-own', {
    status: 'in_transit',
    createdBy: 'user_sel',
    createdAt: 1,
    updatedAt: 1,
    fromLocation: 'workshop',
    toLocation: 'fair',
    toFairId: 'fair-1',
    lines: [
      {
        productId: 'magnet',
        productName: 'Magnet Sibiu',
        quantity: 2,
        shippedQuantity: 2,
        receivedQuantity: 0,
      },
    ],
  });
  db.seed('transfers', 'tr-other', {
    status: 'in_transit',
    createdBy: 'user_at',
    createdAt: 1,
    updatedAt: 1,
    fromLocation: 'workshop',
    toLocation: 'fair',
    toFairId: 'fair-2',
    lines: [
      {
        productId: 'brad',
        productName: 'Ornament Brad',
        quantity: 3,
        shippedQuantity: 3,
        receivedQuantity: 0,
      },
    ],
  });
  seller(db);
  const dash = await db.run(reports.dashboard, { today: D });
  assert.equal(dash.sales, null);
  assert.equal(dash.fulfillment, null);
  assert.equal(dash.lowStock, null);
  assert.equal(dash.exceptions, null);
  assert.equal(dash.transfers.count, 1);
  assert.equal(dash.transfers.rows[0]._id, 'tr-own');
  assert.equal(dash.pos.length, 1);
  assert.deepEqual(dash.pos[0], {
    fairId: 'fair-1',
    fairName: 'Targ Craciun',
    netCents: 7500,
    cashCents: 4500,
    cardCents: 3000,
    count: 2,
    units: 3,
  });
});

test('atelier dashboard exposes fulfillment, stock, transfers, exceptions', async () => {
  const db = fixture();
  seedAll(db);
  atelier(db);
  const dash = await db.run(reports.dashboard, { today: D });
  assert.equal(dash.sales, null);
  assert.equal(dash.pos, null);
  assert.equal(dash.fulfillment.ready, 2);
  assert.ok(dash.lowStock);
  assert.ok(dash.transfers);
  assert.equal(dash.exceptions.needsReview, 1);
  assert.equal(dash.exceptions.posPrepared, null);
});

test('access and validation', async () => {
  const db = fixture();
  seedAll(db);
  for (const make of [seller, atelier, (d) => d.identity({ subject: 'c', role: 'customer' })]) {
    const db2 = fixture();
    seedAll(db2);
    make(db2);
    await assert.rejects(db2.run(reports.summary, summaryArgs()));
  }
  await assert.rejects(
    db.run(reports.summary, summaryArgs({ from: '2026-13-40' })),
    /invalidă/i,
  );
  await assert.rejects(
    db.run(reports.summary, summaryArgs({ from: D, to: '2026-03-01' })),
    /invalidă/i,
  );
  await assert.rejects(
    db.run(
      reports.summary,
      summaryArgs({ from: '2025-04-01', to: '2026-04-02' }),
    ),
    /366/,
  );
  await assert.rejects(
    db.run(reports.dashboard, { today: 'not-a-date' }),
    /invalidă/i,
  );
});
