import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as pos from '../convex/pos.ts';
import * as products from '../convex/products.ts';
import * as transfers from '../convex/transfers.ts';
import { fixture } from './helpers/convexFixture.mjs';

const workshop = { location: 'workshop' };
const fair1 = { location: 'fair', fairId: 'fair-1' };

const request = (extra = {}) => ({
  requestId: 'inventory-request-0001',
  fairId: 'fair-1',
  productId: 'magnet',
  quantity: 10,
  direction: 'to_online',
  ...extra,
});

test('a fair to atelier transfer conserves total and produces durable ledger rows', async () => {
  const db = fixture();
  const draft = await db.run(transfers.create, {
    requestId: 'inventory-request-0001',
    from: fair1,
    to: workshop,
    lines: [{ productId: 'magnet', quantity: 10 }],
  });
  await db.run(transfers.ship, {
    requestId: 'inventory-request-0002',
    transferId: draft._id,
  });
  const received = await db.run(transfers.receive, {
    requestId: 'inventory-request-0003',
    transferId: draft._id,
    lines: [{ productId: 'magnet', quantity: 10 }],
  });
  assert.equal(received.status, 'received');
  assert.equal(db.all('products')[0].stock, 110);
  assert.equal(db.all('fairInventory')[0].quantity, 24);
  assert.equal(
    db
      .all('stockMovements')
      .reduce((sum, movement) => sum + movement.quantity, 0),
    0,
  );
  await db.ctx.db.patch('magnet', { stock: 109 });
  const again = await db.run(transfers.receive, {
    requestId: 'inventory-request-0003',
    transferId: draft._id,
    lines: [{ productId: 'magnet', quantity: 10 }],
  });
  assert.equal(again._id, received._id);
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
  ]) {
    const db = fixture();
    await assert.rejects(
      db.run(transfers.create, {
        requestId: 'inventory-request-0001',
        from: fair1,
        to: workshop,
        lines: [{ productId: 'magnet', quantity }],
      }),
    );
    assert.equal(db.all('products')[0].stock, 100);
    assert.equal(db.all('fairInventory')[0].quantity, 34);
    assert.equal(db.all('transfers').length, 0);
  }
  const db = fixture();
  const draft = await db.run(transfers.create, {
    requestId: 'inventory-request-0004',
    from: fair1,
    to: workshop,
    lines: [{ productId: 'magnet', quantity: 35 }],
  });
  await assert.rejects(
    db.run(transfers.ship, {
      requestId: 'inventory-request-0005',
      transferId: draft._id,
    }),
  );
  assert.equal(db.all('products')[0].stock, 100);
  assert.equal(db.all('fairInventory')[0].quantity, 34);
  assert.equal(db.all('stockMovements').length, 0);
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
  const withdrawal = await db.run(transfers.create, {
    requestId: 'inventory-request-0006',
    from: fair1,
    to: workshop,
    lines: [{ productId: 'magnet', quantity: 1 }],
  });
  await assert.rejects(
    db.run(transfers.ship, {
      requestId: 'inventory-request-0007',
      transferId: withdrawal._id,
    }),
    /vânzare POS în curs|plata|plată/,
  );
  const replenishment = await db.run(transfers.create, {
    requestId: 'inventory-request-0008',
    from: workshop,
    to: fair1,
    lines: [{ productId: 'magnet', quantity: 10 }],
  });
  await db.run(transfers.ship, {
    requestId: 'inventory-request-0009',
    transferId: replenishment._id,
  });
  await db.run(transfers.receive, {
    requestId: 'inventory-request-0010',
    transferId: replenishment._id,
    lines: [{ productId: 'magnet', quantity: 10 }],
  });
  assert.equal(db.all('fairInventory')[0].quantity, 44);
});

test('a failed audit write rolls back both balances and the transfer state', async () => {
  const db = fixture();
  const draft = await db.run(transfers.create, {
    requestId: 'inventory-request-0011',
    from: fair1,
    to: workshop,
    lines: [{ productId: 'magnet', quantity: 10 }],
  });
  const insert = db.ctx.db.insert;
  db.ctx.db.insert = async (table, value) => {
    if (table === 'stockMovements') throw new Error('Audit unavailable');
    return insert(table, value);
  };
  await assert.rejects(
    db.run(transfers.ship, {
      requestId: 'inventory-request-0012',
      transferId: draft._id,
    }),
    /Audit/,
  );
  assert.equal(db.all('stockMovements').length, 0);
  assert.equal(db.all('products')[0].stock, 100);
  assert.equal(db.all('fairInventory')[0].quantity, 34);
  assert.equal((await db.ctx.db.get(draft._id)).status, 'draft');
});

test('allocated fair stock prevents product deletion', async () => {
  const db = fixture();
  await assert.rejects(
    db.run(products.deleteProduct, { id: 'magnet' }),
    /istoric|Arhivează/,
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

test('a legacy request cannot be replayed by another administrator or with other args', async () => {
  const db = fixture();
  db.seed('inventoryOperations', 'legacy-op', {
    requestId: 'inventory-request-0001',
    actorId: 'seller-1',
    kind: 'transfer',
    direction: 'to_online',
    fairId: 'fair-1',
    fairName: 'Targ Craciun',
    productId: 'magnet',
    productName: 'Magnet Sibiu',
    quantity: 10,
    stock: {},
    createdAt: 1,
  });
  const receipt = await db.run(pos.transfer, request());
  assert.equal(receipt._id, 'legacy-op');
  await assert.rejects(db.run(pos.transfer, request({ direction: 'to_fair' })));
  db.identity({ subject: 'other-admin', role: 'admin' });
  await assert.rejects(db.run(pos.transfer, request()));
  await assert.rejects(
    db.run(pos.getInventoryOperation, { requestId: request().requestId }),
  );
  assert.equal(db.all('stockMovements').length, 0);
});

test('untracked products replay historic transfers without inventing a total', async () => {
  const db = fixture();
  await db.ctx.db.patch('magnet', { trackStock: false, stock: 110 });
  await db.ctx.db.patch('balance-magnet', { quantity: 24 });
  const args = request();
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
    quantity: 10,
    balanceAfter: 110,
  });
  db.seed('stockMovements', 'old-fair', {
    ...common,
    location: 'fair',
    fairId: 'fair-1',
    quantity: -10,
    balanceAfter: 24,
  });
  const result = await db.run(pos.transfer, args);
  assert.equal(result.legacyReplay, true);
  assert.equal(result.stockAfter.onlineStock, null);
  assert.equal(result.stockAfter.totalStock, null);
  assert.equal(db.all('products')[0].stock, 110);
  await assert.rejects(
    db.run(
      pos.transfer,
      request({ requestId: 'inventory-new-request-02', direction: 'to_fair' }),
    ),
    /Transferuri/,
  );
});

test('orphaned balances remain visible as inventory issues', async () => {
  const db = fixture();
  await db.ctx.db.delete('magnet');
  const result = await db.run(pos.getStockOverview);
  assert.ok(result.issues.some((issue) => issue.includes('magnet')));
});
