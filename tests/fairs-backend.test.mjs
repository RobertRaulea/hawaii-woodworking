import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as pos from '../convex/pos.ts';
import { fixture } from './helpers/convexFixture.mjs';

const previewArgs = async (db) => ({
  requestId: 'archive-fair-request-01',
  fairId: 'fair-1',
  expectedInventory: (
    await db.run(pos.getArchivePreview, { fairId: 'fair-1' })
  ).items.map(({ productId, quantity }) => ({ productId, quantity })),
});

test('archiving returns every fair unit online atomically and preserves history', async () => {
  const db = fixture();
  const args = await previewArgs(db);
  const result = await db.run(pos.archiveFair, args);
  assert.equal(result.returnedUnits, 78);
  assert.equal(result.returnedProducts, 3);
  assert.deepEqual(
    db.all('products').map((product) => product.stock),
    [134, 128, 116],
  );
  assert.ok(db.all('fairInventory').every((row) => row.quantity === 0));
  assert.equal(db.all('fairs')[0].active, false);
  assert.equal(db.all('stockMovements').length, 6);
  assert.deepEqual(await db.run(pos.archiveFair, args), result);
  assert.deepEqual(await db.run(pos.listFairs), []);
  assert.equal(
    (await db.run(pos.listFairs, { includeArchived: true })).length,
    1,
  );
  assert.ok(Array.isArray(await db.run(pos.workspace, { fairId: 'fair-1' })));
});

test('a changed preview or an unresolved payment prevents archiving', async () => {
  const db = fixture();
  const args = await previewArgs(db);
  await db.ctx.db.patch('balance-magnet', { quantity: 33 });
  await assert.rejects(db.run(pos.archiveFair, args), /schimbat/);
  assert.equal(db.all('fairs')[0].active, true);
  const fresh = await previewArgs(db);
  await db.run(pos.prepare, {
    requestId: 'other-seller-sale-001',
    fairId: 'fair-1',
    paymentMethod: 'card',
    discountCents: 0,
    discountReason: '',
    items: [{ productId: 'magnet', quantity: 1, expectedUnitPriceCents: 2500 }],
  });
  db.identity({ subject: 'another-admin', role: 'admin' });
  await assert.rejects(db.run(pos.archiveFair, fresh), /plati|plăți/);
  assert.equal(db.all('inventoryOperations').length, 0);
});

test('an orphaned product or failed write prevents partial archival', async () => {
  const db = fixture();
  const args = await previewArgs(db);
  await db.ctx.db.delete('stea');
  await assert.rejects(db.run(pos.archiveFair, args));
  assert.equal(db.all('products')[0].stock, 100);
  assert.equal(db.all('fairInventory')[0].quantity, 34);
  assert.equal(db.all('fairs')[0].active, true);
});

test('an audit failure rolls back all returned products and the archived flag', async () => {
  const db = fixture();
  const args = await previewArgs(db);
  const insert = db.ctx.db.insert;
  let written = 0;
  db.ctx.db.insert = async (table, value) => {
    if (table === 'stockMovements' && ++written === 3)
      throw new Error('Archive audit failure');
    return insert(table, value);
  };
  await assert.rejects(db.run(pos.archiveFair, args), /audit failure/);
  assert.deepEqual(
    db.all('products').map((product) => product.stock),
    [100, 100, 100],
  );
  assert.equal(db.all('stockMovements').length, 0);
  assert.equal(db.all('inventoryOperations').length, 0);
  assert.equal(db.all('fairs')[0].active, true);
});

test('an empty fair can be archived without movements and never returned twice', async () => {
  const db = fixture();
  for (const balance of db.all('fairInventory'))
    await db.ctx.db.patch(balance._id, { quantity: 0 });
  const args = await previewArgs(db);
  const [first, second] = await Promise.all([
    db.run(pos.archiveFair, args),
    db.run(pos.archiveFair, args),
  ]);
  assert.equal(first._id, second._id);
  assert.equal(first.returnedUnits, 0);
  assert.equal(db.all('stockMovements').length, 0);
  assert.equal(db.all('inventoryOperations').length, 1);
});

test('another archival request cannot return the same fair stock again', async () => {
  const db = fixture();
  const args = await previewArgs(db);
  await db.run(pos.archiveFair, args);
  db.identity({ subject: 'other-admin', role: 'admin' });
  await assert.rejects(
    db.run(pos.archiveFair, { ...args, requestId: 'archive-other-request-02' }),
  );
  assert.equal(db.all('products')[0].stock, 134);
  assert.equal(db.all('stockMovements').length, 6);
});

test('archiving one fair leaves other fair allocations intact', async () => {
  const db = fixture();
  db.seed('fairs', 'fair-2', { name: 'Alt târg', active: true });
  db.seed('fairInventory', 'other-balance', {
    fairId: 'fair-2',
    productId: 'magnet',
    quantity: 6,
  });
  await db.run(pos.archiveFair, await previewArgs(db));
  const overview = await db.run(pos.getStockOverview);
  const product = overview.products.find((row) => row.id === 'magnet');
  assert.equal(product.totalStock, 140);
  assert.equal(product.onlineStock, 134);
  assert.equal(product.fairsStock, 6);
});
