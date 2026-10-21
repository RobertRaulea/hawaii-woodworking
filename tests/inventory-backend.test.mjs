import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as pos from '../convex/pos.ts';
import * as products from '../convex/products.ts';
import { fixture } from './helpers/convexFixture.mjs';

const request = (extra = {}) => ({
  requestId: 'inventory-request-0001',
  fairId: 'fair-1',
  productId: 'magnet',
  quantity: 10,
  direction: 'to_online',
  ...extra,
});

test('a return to online conserves total and produces an authoritative receipt', async () => {
  const db = fixture();
  const receipt = await db.run(pos.transfer, request());
  assert.equal(db.all('products')[0].stock, 110);
  assert.equal(db.all('fairInventory')[0].quantity, 24);
  assert.equal(receipt.stockAfter.totalStock, 134);
  assert.equal(receipt.stockAfter.onlineStock, 110);
  assert.equal(receipt.stockAfter.fairStock, 24);
  assert.equal(
    db
      .all('stockMovements')
      .reduce((sum, movement) => sum + movement.quantity, 0),
    0,
  );
  await db.ctx.db.patch('magnet', { stock: 109 });
  assert.deepEqual(await db.run(pos.transfer, request()), receipt);
  assert.equal(db.all('stockMovements').length, 2);
});

test('overview distinguishes the selected fair from every fair without double counting', async () => {
  const db = fixture();
  db.seed('fairs', 'fair-2', { name: 'Alt targ', active: true });
  db.seed('fairInventory', 'other-balance', {
    fairId: 'fair-2',
    productId: 'magnet',
    quantity: 6,
  });
  const overview = await db.run(pos.getStockOverview);
  const product = overview.products.find((item) => item.id === 'magnet');
  assert.equal(product.onlineStock, 100);
  assert.equal(product.fairsStock, 40);
  assert.equal(product.totalStock, 140);
  assert.equal(
    product.fairs.find((item) => item.fairId === 'fair-2').quantity,
    6,
  );
});

test('invalid quantities and insufficient source stock have no effects', async () => {
  for (const quantity of [
    0,
    -1,
    1.1,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    35,
  ]) {
    const db = fixture();
    await assert.rejects(db.run(pos.transfer, request({ quantity })));
    assert.equal(db.all('products')[0].stock, 100);
    assert.equal(db.all('fairInventory')[0].quantity, 34);
    assert.equal(db.all('inventoryOperations').length, 0);
  }
});

test('prepared payments block withdrawal of that product, but permit replenishment', async () => {
  const db = fixture();
  await db.run(pos.prepare, {
    requestId: 'prepared-sale-00001',
    fairId: 'fair-1',
    paymentMethod: 'card',
    discountCents: 0,
    discountReason: '',
    items: [{ productId: 'magnet', quantity: 1, expectedUnitPriceCents: 2500 }],
  });
  await assert.rejects(db.run(pos.transfer, request()), /plata|plată/);
  await db.run(pos.transfer, request({ direction: 'to_fair' }));
  assert.equal(db.all('fairInventory')[0].quantity, 44);
});

test('a failed audit write rolls back both balances and the receipt', async () => {
  const db = fixture();
  const insert = db.ctx.db.insert;
  db.ctx.db.insert = async (table, value) => {
    if (table === 'stockMovements') throw new Error('Audit unavailable');
    return insert(table, value);
  };
  await assert.rejects(db.run(pos.transfer, request()), /Audit/);
  assert.equal(db.all('inventoryOperations').length, 0);
  assert.equal(db.all('products')[0].stock, 100);
  assert.equal(db.all('fairInventory')[0].quantity, 34);
});

test('allocated fair stock prevents product deletion', async () => {
  const db = fixture();
  await assert.rejects(
    db.run(products.deleteProduct, { id: 'magnet' }),
    /targ|târg/,
  );
  assert.ok(await db.ctx.db.get('magnet'));
});

test('historic transfer retries are recognized before applying another stock movement', async () => {
  const db = fixture();
  await db.ctx.db.patch('magnet', { stock: 90 });
  await db.ctx.db.patch('balance-magnet', { quantity: 44 });
  const args = request({ direction: 'to_fair' });
  const common = {
    requestId: args.requestId,
    actorId: 'seller-1',
    kind: 'transfer',
    productId: 'magnet',
    createdAt: 1,
  };
  db.seed('stockMovements', 'old-online', {
    ...common,
    location: 'workshop',
    quantity: -10,
    balanceAfter: 90,
  });
  db.seed('stockMovements', 'old-fair', {
    ...common,
    location: 'fair',
    fairId: 'fair-1',
    quantity: 10,
    balanceAfter: 44,
  });
  const result = await db.run(pos.transfer, args);
  assert.equal(result.legacyReplay, true);
  assert.equal(result.stockAfter.onlineStock, 90);
  assert.equal(db.all('stockMovements').length, 2);
  assert.equal(db.all('products')[0].stock, 90);
});

test('a request cannot be replayed by another administrator or in another direction', async () => {
  const db = fixture();
  await db.run(pos.transfer, request());
  await assert.rejects(db.run(pos.transfer, request({ direction: 'to_fair' })));
  db.identity({ subject: 'other-admin', role: 'admin' });
  await assert.rejects(db.run(pos.transfer, request()));
  await assert.rejects(
    db.run(pos.getInventoryOperation, { requestId: request().requestId }),
  );
  assert.equal(db.all('stockMovements').length, 2);
});

test('untracked products can return known fair stock without inventing a total', async () => {
  const db = fixture();
  await db.ctx.db.patch('magnet', { trackStock: false });
  const result = await db.run(pos.transfer, request());
  assert.equal(result.stockAfter.onlineStock, null);
  assert.equal(result.stockAfter.totalStock, null);
  assert.equal(db.all('products')[0].stock, 110);
  await assert.rejects(
    db.run(
      pos.transfer,
      request({ requestId: 'inventory-new-request-02', direction: 'to_fair' }),
    ),
  );
});

test('orphaned balances remain visible as inventory issues', async () => {
  const db = fixture();
  await db.ctx.db.delete('magnet');
  const result = await db.run(pos.getStockOverview);
  assert.ok(result.issues.some((issue) => issue.includes('magnet')));
});
