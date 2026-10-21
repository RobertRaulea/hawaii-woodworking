import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as pos from '../convex/pos.ts';
import { businessDate } from '../convex/lib/pos.utils.ts';
import { fixture } from './helpers/convexFixture.mjs';

const example = (
  requestId = 'request-example-0001',
  paymentMethod = 'cash',
) => ({
  requestId,
  fairId: 'fair-1',
  paymentMethod,
  discountCents: 0,
  discountReason: '',
  items: [
    { productId: 'magnet', quantity: 2, expectedUnitPriceCents: 2500 },
    { productId: 'brad', quantity: 1, expectedUnitPriceCents: 3000 },
    { productId: 'stea', quantity: 1, expectedUnitPriceCents: 2000 },
  ],
});

test('prepare prices the example at 100 lei without reserving or decrementing stock', async () => {
  const db = fixture();
  const before = structuredClone(db.all('fairInventory'));
  const attempt = await db.run(pos.prepare, example());
  assert.equal(attempt.totalCents, 10000);
  assert.equal(attempt.status, 'prepared');
  assert.deepEqual(db.all('fairInventory'), before);
  assert.equal(db.all('posSales').length, 0);
  assert.equal(db.all('stockMovements').length, 0);
});

test('cash completion atomically records sale, change, fair stock, audit, and daily totals', async () => {
  const db = fixture();
  const args = example();
  await db.run(pos.prepare, args);
  const result = await db.run(pos.complete, {
    requestId: args.requestId,
    receivedCents: 15000,
  });
  assert.equal(result.changeCents, 5000);
  assert.deepEqual(
    db.all('fairInventory').map((entry) => entry.quantity),
    [32, 27, 15],
  );
  assert.deepEqual(
    db.all('products').map((entry) => entry.stock),
    [100, 100, 100],
  );
  assert.equal(db.all('stockMovements').length, 3);
  assert.deepEqual(
    db.all('stockMovements').map((entry) => entry.quantity),
    [-2, -1, -1],
  );
  assert.equal(db.all('posAttempts')[0].status, 'completed');
  const summary = await db.run(pos.dailySummary, {
    fairId: 'fair-1',
    date: businessDate(Date.now()),
  });
  assert.deepEqual(summary, {
    totalCents: 10000,
    cashCents: 10000,
    cardCents: 0,
    units: 4,
    count: 1,
  });
});

test('repeated confirmations and preparation retries record exactly one sale', async () => {
  const db = fixture();
  const args = example();
  const firstAttempt = await db.run(pos.prepare, args);
  assert.equal((await db.run(pos.prepare, args))._id, firstAttempt._id);
  const [first, second] = await Promise.all([
    db.run(pos.complete, { requestId: args.requestId, receivedCents: 15000 }),
    db.run(pos.complete, { requestId: args.requestId, receivedCents: 15000 }),
  ]);
  assert.deepEqual(first, second);
  assert.equal(db.all('posSales').length, 1);
  assert.equal(db.all('stockMovements').length, 3);
  await db.ctx.db.patch('magnet', { price: 99 });
  assert.deepEqual(
    await db.run(pos.complete, {
      requestId: args.requestId,
      receivedCents: 15000,
    }),
    first,
  );
  const lookup = await db.run(pos.lookup, { requestId: args.requestId });
  assert.equal(lookup.sale._id, first.saleId);
});

test('a request identifier cannot be reused for another basket or seller', async () => {
  const db = fixture();
  const args = example();
  await db.run(pos.prepare, args);
  await assert.rejects(
    db.run(pos.prepare, { ...args, paymentMethod: 'card' }),
    /alta comanda/,
  );
  await assert.rejects(
    db.run(pos.prepare, {
      ...args,
      discountCents: 100,
      discountReason: 'Test',
    }),
    /alta comanda/,
  );
  db.identity({ subject: 'seller-2', role: 'admin' });
  await assert.rejects(
    db.run(pos.complete, { requestId: args.requestId, receivedCents: 10000 }),
    /altui vanzator/,
  );
  await assert.rejects(
    db.run(pos.lookup, { requestId: args.requestId }),
    /altui vanzator/,
  );
});

test('preparation retries ignore object property serialization order', async () => {
  const db = fixture();
  const args = example();
  const attempt = await db.run(pos.prepare, args);
  const reordered = args.items.map((item) => ({
    expectedUnitPriceCents: item.expectedUnitPriceCents,
    productId: item.productId,
    quantity: item.quantity,
  }));
  const retry = await db.run(pos.prepare, { ...args, items: reordered });
  assert.equal(retry._id, attempt._id);
});

test('competing prepared sales recheck the last available unit at completion', async () => {
  const db = fixture();
  await db.ctx.db.patch('balance-magnet', { quantity: 1 });
  const args = {
    ...example(),
    items: [{ productId: 'magnet', quantity: 1, expectedUnitPriceCents: 2500 }],
  };
  await db.run(pos.prepare, args);
  db.identity({ subject: 'seller-2', role: 'admin' });
  await db.run(pos.prepare, { ...args, requestId: 'request-competing-0002' });
  db.identity({ subject: 'seller-1', role: 'admin' });
  await db.run(pos.complete, {
    requestId: args.requestId,
    receivedCents: 2500,
  });
  db.identity({ subject: 'seller-2', role: 'admin' });
  await assert.rejects(
    db.run(pos.complete, {
      requestId: 'request-competing-0002',
      receivedCents: 2500,
    }),
    /Stoc insuficient/,
  );
  assert.equal(db.all('posSales').length, 1);
  assert.equal(db.all('fairInventory')[0].quantity, 0);
  assert.equal(db.all('posAttempts')[1].status, 'prepared');
});

test('cash underpayment, current price changes, and cancelled attempts never write a sale', async () => {
  const db = fixture();
  const args = example();
  await db.run(pos.prepare, args);
  await assert.rejects(
    db.run(pos.complete, { requestId: args.requestId, receivedCents: 9999 }),
    /nu acopera/,
  );
  await db.ctx.db.patch('stea', { price: 21 });
  await assert.rejects(
    db.run(pos.complete, { requestId: args.requestId, receivedCents: 10000 }),
    /Pretul/,
  );
  await db.run(pos.cancel, { requestId: args.requestId });
  await db.run(pos.cancel, { requestId: args.requestId });
  await assert.rejects(
    db.run(pos.complete, { requestId: args.requestId, receivedCents: 10000 }),
    /anulata/,
  );
  assert.equal(db.all('posSales').length, 0);
  assert.equal(db.all('stockMovements').length, 0);
  assert.deepEqual(
    db.all('fairInventory').map((entry) => entry.quantity),
    [34, 28, 16],
  );
});

test('card confirmation records only the external payment acknowledgement and approved discount', async () => {
  const db = fixture();
  const args = {
    ...example('request-card-000001', 'card'),
    discountCents: 1000,
    discountReason: 'Client fidel',
  };
  await db.run(pos.prepare, args);
  await assert.rejects(
    db.run(pos.complete, { requestId: args.requestId, receivedCents: 9000 }),
    /numerar/,
  );
  await db.run(pos.complete, { requestId: args.requestId });
  const sale = db.all('posSales')[0];
  assert.equal(sale.paymentMethod, 'card');
  assert.equal(sale.totalCents, 9000);
  assert.equal(sale.discountReason, 'Client fidel');
  const summary = await db.run(pos.dailySummary, {
    fairId: 'fair-1',
    date: businessDate(Date.now()),
  });
  assert.equal(summary.cardCents, 9000);
  assert.equal(summary.cashCents, 0);
});

test('workshop transfer is idempotent and has both sides of the inventory audit', async () => {
  const db = fixture();
  const args = {
    requestId: 'request-transfer-001',
    fairId: 'fair-1',
    productId: 'magnet',
    quantity: 10,
  };
  await db.run(pos.transfer, args);
  await db.run(pos.transfer, args);
  assert.equal(db.all('products')[0].stock, 90);
  assert.equal(db.all('fairInventory')[0].quantity, 44);
  assert.equal(db.all('stockMovements').length, 2);
  assert.equal(
    db.all('stockMovements').reduce((sum, entry) => sum + entry.quantity, 0),
    0,
  );
  await assert.rejects(
    db.run(pos.transfer, { ...args, quantity: 11 }),
    /alta operatiune/,
  );
  await assert.rejects(
    db.run(pos.transfer, {
      ...args,
      requestId: 'request-transfer-002',
      quantity: 101,
    }),
    /Stoc insuficient/,
  );
});

test('a storage failure rolls back the entire completion transaction', async () => {
  const db = fixture();
  const args = example();
  await db.run(pos.prepare, args);
  const original = db.ctx.db.insert;
  db.ctx.db.insert = async (table, value) => {
    if (table === 'stockMovements') throw new Error('Storage unavailable');
    return original(table, value);
  };
  await assert.rejects(
    db.run(pos.complete, { requestId: args.requestId, receivedCents: 10000 }),
    /Storage unavailable/,
  );
  assert.equal(db.all('posSales').length, 0);
  assert.deepEqual(
    db.all('fairInventory').map((entry) => entry.quantity),
    [34, 28, 16],
  );
  assert.equal(db.all('posAttempts')[0].status, 'prepared');
});

test('SKU codes are unique and favorite changes do not alter stock', async () => {
  const db = fixture();
  await db.run(pos.setProductOptions, {
    productId: 'magnet',
    sku: ' mag-01 ',
    favorite: true,
  });
  await assert.rejects(
    db.run(pos.setProductOptions, {
      productId: 'stea',
      sku: 'MAG-01',
      favorite: false,
    }),
    /deja utilizat/,
  );
  const products = await db.run(pos.workspace, { fairId: 'fair-1' });
  assert.equal(products[0].sku, 'MAG-01');
  assert.equal(products[0].favorite, true);
  assert.equal(products[0].stock, 34);
  assert.equal(products[0].workshopStock, 100);
});

test('summary excludes other locations, prior trading days, and prepared or cancelled attempts', async () => {
  const db = fixture();
  const args = example();
  await db.run(pos.prepare, args);
  await db.run(pos.complete, {
    requestId: args.requestId,
    receivedCents: 10000,
  });
  const sale = db.all('posSales')[0];
  db.seed('posSales', 'yesterday', {
    ...sale,
    requestId: 'yesterday',
    businessDate: '2000-01-01',
  });
  db.seed('posSales', 'another-fair', {
    ...sale,
    requestId: 'other-fair',
    fairId: 'fair-2',
  });
  await db.run(pos.prepare, example('request-cancelled-01'));
  await db.run(pos.cancel, { requestId: 'request-cancelled-01' });
  await db.run(pos.prepare, example('request-unpaid-0001'));
  const summary = await db.run(pos.dailySummary, {
    fairId: 'fair-1',
    date: businessDate(Date.now()),
  });
  assert.equal(summary.count, 1);
  assert.equal(summary.totalCents, 10000);
});

test('an unresolved server attempt is recoverable and prevents a second payment session for the same seller', async () => {
  const db = fixture();
  const args = example();
  await db.run(pos.prepare, args);
  await assert.rejects(
    db.run(pos.prepare, example('request-another-tab-01')),
    /anterioara/,
  );
  const attempts = await db.run(pos.openAttempts, {});
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].requestId, args.requestId);
  db.identity({ subject: 'seller-2', role: 'admin' });
  assert.deepEqual(await db.run(pos.openAttempts, {}), []);
});

test('every POS operation rejects unauthenticated or unauthorized callers', async () => {
  const db = fixture();
  for (const identity of [null, { subject: 'customer', role: 'customer' }]) {
    db.identity(identity);
    for (const fn of Object.values(pos)) {
      await assert.rejects(
        db.run(fn, { ...example(), date: businessDate(Date.now()) }),
        /Unauthorized|Forbidden/,
      );
    }
  }
});
