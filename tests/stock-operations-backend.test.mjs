import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers/convexFixture.mjs';
import {
  receive,
  adjust,
  count,
  setLowStockThreshold,
  countSnapshot,
  getStockOperation,
  movements,
} from '../convex/inventory.ts';
import { createProduct, updateProduct } from '../convex/products.ts';
import { prepare, complete } from '../convex/pos.ts';
import { create as createTransfer, ship } from '../convex/transfers.ts';

const product = (db, id) => db.ctx.db.get(id);

test('receive adds atelier stock, writes movement and operation, idempotent', async () => {
  const db = fixture();
  db.identity({ subject: 'admin-1', role: 'admin' });
  const req = { requestId: 'receive-0000000001', productId: 'magnet', quantity: 10 };
  const op = await db.run(receive, req);
  assert.equal(op.kind, 'receipt');
  assert.equal(op.reason, 'production');
  assert.equal(op.quantityBefore, 100);
  assert.equal(op.quantityAfter, 110);
  assert.equal(op.delta, 10);
  assert.equal(op.actorId, 'admin-1');
  assert.equal((await product(db, 'magnet')).stock, 110);
  const moves = db.all('stockMovements').filter((row) => row.requestId === req.requestId);
  assert.equal(moves.length, 1);
  assert.equal(moves[0].kind, 'receipt');
  assert.equal(moves[0].location, 'workshop');
  assert.equal(moves[0].balanceAfter, 110);
  assert.equal(moves[0].stockOperationId, op._id);
  const retry = await db.run(receive, req);
  assert.equal(retry._id, op._id);
  assert.equal((await product(db, 'magnet')).stock, 110);
  await assert.rejects(
    () => db.run(receive, { ...req, quantity: 11 }),
    /Identificator deja utilizat/,
  );
});

test('receive rejects seller, customer, untracked and invalid quantities', async () => {
  const db = fixture();
  db.identity({ subject: 'seller-1', role: 'seller' });
  await assert.rejects(
    () => db.run(receive, { requestId: 'receive-0000000002', productId: 'magnet', quantity: 1 }),
    /Forbidden/,
  );
  db.identity({ subject: 'user-1', role: 'customer' });
  await assert.rejects(
    () => db.run(receive, { requestId: 'receive-0000000002', productId: 'magnet', quantity: 1 }),
    /Forbidden/,
  );
  db.identity({ subject: 'admin-1', role: 'admin' });
  db.seed('products', 'untracked', { name: 'Untracked', price: 10, stock: 0, trackStock: false });
  await assert.rejects(
    () => db.run(receive, { requestId: 'receive-0000000003', productId: 'untracked', quantity: 1 }),
    /urmărirea stocului/,
  );
  for (const [i, quantity] of [0, -1, 1.5].entries()) {
    await assert.rejects(
      () => db.run(receive, { requestId: `receive-00000000${10 + i}`, productId: 'magnet', quantity }),
      /cantitate/,
    );
  }
});

test('adjust requires note, never goes negative, idempotent', async () => {
  const db = fixture();
  db.identity({ subject: 'admin-1', role: 'admin' });
  await assert.rejects(
    () => db.run(adjust, {
      requestId: 'adjust-000000000001', productId: 'magnet', delta: -2, reason: 'damaged', note: 'ab',
    }),
    /Nota este obligatorie/,
  );
  await assert.rejects(
    () => db.run(adjust, {
      requestId: 'adjust-000000000002', productId: 'magnet', delta: -5000, reason: 'damaged', note: 'deteriorate',
    }),
    /Stoc insuficient/,
  );
  const req = {
    requestId: 'adjust-000000000003', productId: 'magnet', delta: -3, reason: 'damaged', note: 'sparte în transport',
  };
  const op = await db.run(adjust, req);
  assert.equal(op.quantityAfter, 97);
  assert.equal((await product(db, 'magnet')).stock, 97);
  const again = await db.run(adjust, req);
  assert.equal(again._id, op._id);
  assert.equal((await product(db, 'magnet')).stock, 97);
});

test('adjust atelier decrease respects paid order reservations', async () => {
  const db = fixture();
  db.identity({ subject: 'admin-1', role: 'admin' });
  db.seed('products', 'held', { name: 'Held', price: 10, stock: 5, trackStock: true });
  db.seed('orders', 'order-1', {
    number: 'ORD-1', status: 'paid', inventoryStatus: 'needs_review',
    paymentConfirmedAt: 1, createdAt: 1, total: 10,
    items: [{ productId: 'held', name: 'Held', quantity: 4, price: 10 }],
  });
  await assert.rejects(
    () => db.run(adjust, {
      requestId: 'adjust-000000000004', productId: 'held', delta: -2, reason: 'damaged', note: 'deteriorate',
    }),
    /4 buc\. sunt ținute pentru comenzi plătite/,
  );
  const op = await db.run(adjust, {
    requestId: 'adjust-000000000005', productId: 'held', delta: -1, reason: 'damaged', note: 'deteriorate',
  });
  assert.equal(op.quantityAfter, 4);
});

test('adjust at fair blocked by prepared POS attempt and archived fairs', async () => {
  const db = fixture();
  db.identity({ subject: 'admin-1', role: 'admin' });
  db.seed('posAttempts', 'attempt-1', {
    requestId: 'pos-attempt-1', sellerId: 'admin-1', fairId: 'fair-1',
    paymentMethod: 'cash', status: 'prepared',
    items: [{ productId: 'magnet', name: 'Magnet Sibiu', quantity: 1, unitPriceCents: 2500 }],
    total: 2500, createdAt: 1,
  });
  await assert.rejects(
    () => db.run(adjust, {
      requestId: 'adjust-000000000006', productId: 'magnet', fairId: 'fair-1',
      delta: -1, reason: 'damaged', note: 'deteriorate',
    }),
    /vânzare POS în curs/,
  );
  db.seed('fairs', 'fair-archived', { name: 'Old', active: false, createdBy: 'admin-1' });
  await assert.rejects(
    () => db.run(adjust, {
      requestId: 'adjust-000000000007', productId: 'magnet', fairId: 'fair-archived',
      delta: 1, reason: 'found', note: 'găsite în cutie',
    }),
    /nu este activ/,
  );
  const op = await db.run(adjust, {
    requestId: 'adjust-000000000008', productId: 'magnet', fairId: 'fair-1',
    delta: 2, reason: 'found', note: 'găsite în cutie',
  });
  assert.equal(op.quantityAfter, 36);
});

test('count success records expected/counted and movement, zero delta allowed', async () => {
  const db = fixture();
  db.identity({ subject: 'admin-1', role: 'admin' });
  const snapshot = await db.run(countSnapshot, { productId: 'magnet' });
  assert.equal(snapshot.expectedQuantity, 100);
  const op = await db.run(count, {
    requestId: 'count-0000000000001', productId: 'magnet',
    expectedQuantity: snapshot.expectedQuantity,
    lastMovementId: snapshot.lastMovementId,
    countedQuantity: 95,
  });
  assert.equal(op.delta, -5);
  assert.equal(op.expectedQuantity, 100);
  assert.equal(op.countedQuantity, 95);
  assert.equal((await product(db, 'magnet')).stock, 95);
  const move = db.all('stockMovements').find((row) => row.requestId === 'count-0000000000001');
  assert.equal(move.kind, 'count');
  assert.equal(move.quantity, -5);
  const zero = await db.run(countSnapshot, { productId: 'magnet' });
  const zeroOp = await db.run(count, {
    requestId: 'count-0000000000002', productId: 'magnet',
    expectedQuantity: zero.expectedQuantity,
    lastMovementId: zero.lastMovementId,
    countedQuantity: 95,
  });
  assert.equal(zeroOp.delta, 0);
});

test('count conflicts after a sale or transfer and rejects stale snapshots', async () => {
  const db = fixture();
  db.identity({ subject: 'admin-1', role: 'admin' });
  const snapshot = await db.run(countSnapshot, { productId: 'magnet', fairId: 'fair-1' });
  const attempt = await db.run(prepare, {
    requestId: 'sale-attempt-0001', fairId: 'fair-1', paymentMethod: 'cash',
    items: [{ productId: 'magnet', quantity: 1, expectedUnitPriceCents: 2500 }],
    discountCents: 0, discountReason: '',
  });
  await db.run(complete, { requestId: 'sale-attempt-0001', receivedCents: 2500 });
  assert.ok(attempt);
  await assert.rejects(
    () => db.run(count, {
      requestId: 'count-0000000000003', productId: 'magnet', fairId: 'fair-1',
      expectedQuantity: snapshot.expectedQuantity,
      lastMovementId: snapshot.lastMovementId,
      countedQuantity: snapshot.expectedQuantity,
    }),
    /s-a modificat după începerea numărării/,
  );

  const db2 = fixture();
  db2.identity({ subject: 'admin-1', role: 'admin' });
  const atelierSnapshot = await db2.run(countSnapshot, { productId: 'magnet' });
  const draft = await db2.run(createTransfer, {
    requestId: 'transfer-000000001',
    from: { location: 'workshop' },
    to: { location: 'fair', fairId: 'fair-1' },
    lines: [{ productId: 'magnet', quantity: 2 }],
  });
  await db2.run(ship, {
    requestId: 'transfer-ship-00001',
    transferId: draft._id,
  });
  await assert.rejects(
    () => db2.run(count, {
      requestId: 'count-0000000000004', productId: 'magnet',
      expectedQuantity: atelierSnapshot.expectedQuantity,
      lastMovementId: atelierSnapshot.lastMovementId,
      countedQuantity: atelierSnapshot.expectedQuantity,
    }),
    /s-a modificat după începerea numărării/,
  );
  const db3 = fixture();
  db3.identity({ subject: 'admin-1', role: 'admin' });
  const fresh = await db3.run(countSnapshot, { productId: 'magnet' });
  const req = {
    requestId: 'count-0000000000005', productId: 'magnet',
    expectedQuantity: fresh.expectedQuantity,
    lastMovementId: fresh.lastMovementId,
    countedQuantity: 90,
  };
  const op = await db3.run(count, req);
  const again = await db3.run(count, req);
  assert.equal(again._id, op._id);
});

test('count rejects counted below held reservations at atelier', async () => {
  const db = fixture();
  db.identity({ subject: 'admin-1', role: 'admin' });
  db.seed('products', 'held2', { name: 'Held2', price: 10, stock: 5, trackStock: true });
  db.seed('orders', 'order-2', {
    number: 'ORD-2', status: 'paid', inventoryStatus: 'needs_review',
    paymentConfirmedAt: 1, createdAt: 1, total: 10,
    items: [{ productId: 'held2', name: 'Held2', quantity: 3, price: 10 }],
  });
  const snapshot = await db.run(countSnapshot, { productId: 'held2' });
  assert.equal(snapshot.held, 3);
  await assert.rejects(
    () => db.run(count, {
      requestId: 'count-0000000000006', productId: 'held2',
      expectedQuantity: snapshot.expectedQuantity,
      lastMovementId: snapshot.lastMovementId,
      countedQuantity: 2,
    }),
    /ținute pentru comenzi plătite/,
  );
});

test('setLowStockThreshold sets, clears and validates', async () => {
  const db = fixture();
  db.identity({ subject: 'admin-1', role: 'admin' });
  await db.run(setLowStockThreshold, { productId: 'magnet', threshold: 7 });
  assert.equal((await product(db, 'magnet')).lowStockThreshold, 7);
  await db.run(setLowStockThreshold, { productId: 'magnet', threshold: null });
  assert.equal((await product(db, 'magnet')).lowStockThreshold, undefined);
  await assert.rejects(
    () => db.run(setLowStockThreshold, { productId: 'magnet', threshold: -1 }),
    /invalid/,
  );
  db.identity({ subject: 'seller-1', role: 'seller' });
  await assert.rejects(
    () => db.run(setLowStockThreshold, { productId: 'magnet', threshold: 3 }),
    /Forbidden/,
  );
});

test('getStockOperation returns own op and rejects foreign ids', async () => {
  const db = fixture();
  db.identity({ subject: 'admin-1', role: 'admin' });
  await db.run(receive, { requestId: 'receive-0000000010', productId: 'magnet', quantity: 1 });
  const mine = await db.run(getStockOperation, { requestId: 'receive-0000000010' });
  assert.equal(mine.requestId, 'receive-0000000010');
  assert.equal(await db.run(getStockOperation, { requestId: 'missing-000000000' }), null);
  db.identity({ subject: 'admin-2', role: 'admin' });
  await assert.rejects(
    () => db.run(getStockOperation, { requestId: 'receive-0000000010' }),
    /altui utilizator/,
  );
});

test('movements orders desc, paginates, filters and gates sellers', async () => {
  const db = fixture();
  db.identity({ subject: 'admin-1', role: 'admin' });
  for (let i = 0; i < 3; i += 1) {
    await db.run(receive, {
      requestId: `receive-page-00000${i}`, productId: 'magnet', quantity: 1,
    });
  }
  await db.run(adjust, {
    requestId: 'adjust-fair-000001', productId: 'brad', fairId: 'fair-1',
    delta: 2, reason: 'found', note: 'găsite în cutie',
  });
  const first = await db.run(movements, { paginationOpts: { numItems: 2, cursor: null } });
  assert.equal(first.page.length, 2);
  assert.equal(first.isDone, false);
  assert.equal(first.page[0].kind, 'adjustment');
  assert.ok(first.page[0]._id > first.page[1]._id);
  const second = await db.run(movements, {
    paginationOpts: { numItems: 2, cursor: first.continueCursor },
  });
  assert.equal(second.page.length, 2);
  const magnet = await db.run(movements, {
    paginationOpts: { numItems: 10, cursor: null }, productId: 'magnet',
  });
  assert.ok(magnet.page.every((row) => row.productId === 'magnet'));
  const workshop = await db.run(movements, {
    paginationOpts: { numItems: 10, cursor: null }, location: 'workshop',
  });
  assert.ok(workshop.page.every((row) => row.location === 'workshop'));
  const fair = await db.run(movements, {
    paginationOpts: { numItems: 10, cursor: null }, location: 'fair', fairId: 'fair-1',
  });
  assert.ok(
    fair.page.every(
      (row) => row.fairId === 'fair-1' && row.fairName === 'Targ Craciun',
    ),
  );
  assert.ok(fair.page.length >= 1);

  db.identity({ subject: 'seller-1', role: 'seller' });
  await assert.rejects(
    () => db.run(movements, { paginationOpts: { numItems: 10, cursor: null } }),
    /Selectează un târg alocat/,
  );
  await assert.rejects(
    () => db.run(movements, {
      paginationOpts: { numItems: 10, cursor: null }, location: 'fair', fairId: 'fair-1',
    }),
    /Nu ai acces la acest târg/,
  );
  db.seed('fairAssignments', 'assign-1', {
    fairId: 'fair-1', userId: 'seller-1', assignedBy: 'admin-1', createdAt: 1,
  });
  const sellerPage = await db.run(movements, {
    paginationOpts: { numItems: 10, cursor: null }, location: 'fair', fairId: 'fair-1',
  });
  assert.ok(sellerPage.page.length >= 1);
});

test('product mutations refuse direct stock edits', async () => {
  const db = fixture();
  db.identity({ subject: 'admin-1', role: 'admin' });
  await assert.rejects(
    () => db.run(updateProduct, { id: 'magnet', stock: 5 }),
    /Stocul nu se modifică din produs/,
  );
  await assert.rejects(
    () => db.run(createProduct, { name: 'X', price: 10, stock: 5 }),
    /Stocul nu se modifică din produs/,
  );
  const id = await db.run(createProduct, { name: 'Y', price: 10 });
  assert.equal((await product(db, id)).stock, 0);
});
