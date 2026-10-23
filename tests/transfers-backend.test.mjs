import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers/convexFixture.mjs';
import {
  request,
  create,
  updateDraft,
  accept,
  ship,
  receive as receiveTransfer,
  cancel,
  list,
  get,
  getEvent,
  pendingRequestCount,
} from '../convex/transfers.ts';
import { countSnapshot, count } from '../convex/inventory.ts';
import {
  archiveFair,
  getArchivePreview,
  getStockOverview,
  transfer as legacyTransfer,
} from '../convex/pos.ts';

const workshop = { location: 'workshop' };
const fair1 = { location: 'fair', fairId: 'fair-1' };
const fair2 = { location: 'fair', fairId: 'fair-2' };
const line = (productId, quantity) => ({ productId, quantity });
const stockOf = async (db, id) => (await db.ctx.db.get(id)).stock;
const fairQty = (db, productId, fairId = 'fair-1') =>
  db
    .all('fairInventory')
    .find((row) => row.fairId === fairId && row.productId === productId)
    ?.quantity;
const movementsFor = (db, requestId) =>
  db.all('stockMovements').filter((row) => row.requestId === requestId);
const overviewRow = async (db, productId) =>
  (await db.run(getStockOverview, {})).products.find(
    (row) => row.id === productId,
  );

const admin = (db) => db.identity({ subject: 'admin-1', role: 'admin' });
const seller = (db) => db.identity({ subject: 'seller-1', role: 'seller' });

test('full flow workshop -> fair: draft, ship, receive, ledger and overview', async () => {
  const db = fixture();
  admin(db);
  const draft = await db.run(create, {
    requestId: 'tr-create-00000001',
    from: workshop,
    to: fair1,
    lines: [line('magnet', 5)],
    note: 'restock',
  });
  assert.equal(draft.status, 'draft');
  assert.equal(await stockOf(db, 'magnet'), 100);
  assert.equal(fairQty(db, 'magnet'), 34);

  const shipped = await db.run(ship, {
    requestId: 'tr-ship-0000000001',
    transferId: draft._id,
  });
  assert.equal(shipped.status, 'in_transit');
  assert.equal(shipped.lines[0].shippedQuantity, 5);
  assert.ok(shipped.shippedAt);
  assert.equal(await stockOf(db, 'magnet'), 95);
  assert.equal(fairQty(db, 'magnet'), 34);
  const out = movementsFor(db, 'tr-ship-0000000001');
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'transfer_out');
  assert.equal(out[0].quantity, -5);
  assert.equal(out[0].balanceAfter, 95);
  assert.equal(out[0].location, 'workshop');
  assert.equal(out[0].transferId, draft._id);
  let row = await overviewRow(db, 'magnet');
  assert.equal(row.inTransitStock, 5);
  assert.equal(row.totalStock, 134);

  const received = await db.run(receiveTransfer, {
    requestId: 'tr-recv-0000000001',
    transferId: draft._id,
    lines: [line('magnet', 5)],
  });
  assert.equal(received.status, 'received');
  assert.equal(received.lines[0].receivedQuantity, 5);
  assert.ok(received.receivedAt);
  assert.equal(fairQty(db, 'magnet'), 39);
  const incoming = movementsFor(db, 'tr-recv-0000000001');
  assert.equal(incoming[0].kind, 'transfer_in');
  assert.equal(incoming[0].quantity, 5);
  assert.equal(incoming[0].fairId, 'fair-1');
  row = await overviewRow(db, 'magnet');
  assert.equal(row.inTransitStock, 0);
  assert.equal(row.totalStock, 134);
});

test('partial receive keeps remainder in transit and completes later', async () => {
  const db = fixture();
  admin(db);
  const draft = await db.run(create, {
    requestId: 'tr-create-00000002',
    from: workshop,
    to: fair1,
    lines: [line('magnet', 6)],
  });
  await db.run(ship, { requestId: 'tr-ship-0000000002', transferId: draft._id });
  const first = await db.run(receiveTransfer, {
    requestId: 'tr-recv-0000000002',
    transferId: draft._id,
    lines: [line('magnet', 4)],
  });
  assert.equal(first.status, 'partially_received');
  assert.equal(first.lines[0].receivedQuantity, 4);
  assert.equal(fairQty(db, 'magnet'), 38);
  assert.equal((await overviewRow(db, 'magnet')).inTransitStock, 2);
  await assert.rejects(
    () =>
      db.run(receiveTransfer, {
        requestId: 'tr-recv-0000000003',
        transferId: draft._id,
        lines: [line('magnet', 3)],
      }),
    /depășește cantitatea în tranzit/,
  );
  const second = await db.run(receiveTransfer, {
    requestId: 'tr-recv-0000000004',
    transferId: draft._id,
    lines: [line('magnet', 2)],
  });
  assert.equal(second.status, 'received');
  assert.equal(fairQty(db, 'magnet'), 40);
  assert.equal((await overviewRow(db, 'magnet')).inTransitStock, 0);
});

test('fair -> fair and fair -> workshop ship and receive', async () => {
  const db = fixture();
  admin(db);
  db.seed('fairs', 'fair-2', { name: 'Targ Vara', active: true, createdBy: 'admin-1' });
  const between = await db.run(create, {
    requestId: 'tr-create-00000003',
    from: fair1,
    to: fair2,
    lines: [line('magnet', 4)],
  });
  await db.run(ship, { requestId: 'tr-ship-0000000005', transferId: between._id });
  assert.equal(fairQty(db, 'magnet'), 30);
  assert.equal(fairQty(db, 'magnet', 'fair-2'), undefined);
  await db.run(receiveTransfer, {
    requestId: 'tr-recv-0000000005',
    transferId: between._id,
    lines: [line('magnet', 4)],
  });
  assert.equal(fairQty(db, 'magnet', 'fair-2'), 4);

  const back = await db.run(create, {
    requestId: 'tr-create-00000004',
    from: fair2,
    to: workshop,
    lines: [line('magnet', 2)],
  });
  await db.run(ship, { requestId: 'tr-ship-0000000006', transferId: back._id });
  assert.equal(fairQty(db, 'magnet', 'fair-2'), 2);
  assert.equal(await stockOf(db, 'magnet'), 100);
  await db.run(receiveTransfer, {
    requestId: 'tr-recv-0000000006',
    transferId: back._id,
    lines: [line('magnet', 2)],
  });
  assert.equal(await stockOf(db, 'magnet'), 102);
});

test('identical source and destination are rejected', async () => {
  const db = fixture();
  admin(db);
  await assert.rejects(
    () =>
      db.run(create, {
        requestId: 'tr-create-00000005',
        from: workshop,
        to: workshop,
        lines: [line('magnet', 1)],
      }),
    /trebuie să difere/,
  );
  await assert.rejects(
    () =>
      db.run(create, {
        requestId: 'tr-create-00000006',
        from: fair1,
        to: fair1,
        lines: [line('magnet', 1)],
      }),
    /trebuie să difere/,
  );
});

test('ship validates source stock: atelier reservations, fair balance, POS attempt', async () => {
  const db = fixture();
  admin(db);
  db.seed('products', 'held', { name: 'Held', price: 10, stock: 5, trackStock: true });
  db.seed('orders', 'order-1', {
    number: 'ORD-1', status: 'paid', inventoryStatus: 'needs_review',
    paymentConfirmedAt: 1, createdAt: 1, total: 10,
    items: [{ productId: 'held', name: 'Held', quantity: 4, price: 10 }],
  });
  const held = await db.run(create, {
    requestId: 'tr-create-00000007',
    from: workshop,
    to: fair1,
    lines: [line('held', 2)],
  });
  await assert.rejects(
    () => db.run(ship, { requestId: 'tr-ship-0000000007', transferId: held._id }),
    /ținute pentru comenzi plătite/,
  );
  assert.equal(await stockOf(db, 'held'), 5);
  assert.equal(movementsFor(db, 'tr-ship-0000000007').length, 0);

  const tooMuch = await db.run(create, {
    requestId: 'tr-create-00000008',
    from: fair1,
    to: workshop,
    lines: [line('magnet', 100)],
  });
  await assert.rejects(
    () => db.run(ship, { requestId: 'tr-ship-0000000008', transferId: tooMuch._id }),
    /Stoc insuficient/,
  );
  assert.equal(fairQty(db, 'magnet'), 34);
  assert.equal(await stockOf(db, 'magnet'), 100);

  db.seed('posAttempts', 'attempt-1', {
    requestId: 'pos-attempt-1', sellerId: 'admin-1', fairId: 'fair-1',
    paymentMethod: 'cash', status: 'prepared',
    items: [{ productId: 'magnet', name: 'Magnet Sibiu', quantity: 1, unitPriceCents: 2500 }],
    total: 2500, createdAt: 1,
  });
  const blocked = await db.run(create, {
    requestId: 'tr-create-00000009',
    from: fair1,
    to: workshop,
    lines: [line('magnet', 2)],
  });
  await assert.rejects(
    () => db.run(ship, { requestId: 'tr-ship-0000000009', transferId: blocked._id }),
    /vânzare POS în curs/,
  );
  assert.equal(fairQty(db, 'magnet'), 34);
});

test('retrying create/ship/receive with the same requestId replays, mismatches reject', async () => {
  const db = fixture();
  admin(db);
  const req = {
    requestId: 'tr-create-00000010',
    from: workshop,
    to: fair1,
    lines: [line('magnet', 5)],
  };
  const draft = await db.run(create, req);
  const replayed = await db.run(create, req);
  assert.equal(replayed._id, draft._id);
  await assert.rejects(
    () =>
      db.run(cancel, {
        requestId: 'tr-create-00000010',
        transferId: draft._id,
        reason: 'alt context',
      }),
    /Identificator deja utilizat/,
  );
  const shipReq = { requestId: 'tr-ship-0000000010', transferId: draft._id };
  await db.run(ship, shipReq);
  const again = await db.run(ship, shipReq);
  assert.equal(again._id, draft._id);
  assert.equal(movementsFor(db, 'tr-ship-0000000010').length, 1);
  assert.equal(await stockOf(db, 'magnet'), 95);
  await assert.rejects(
    () => db.run(ship, { requestId: 'tr-ship-0000000011', transferId: draft._id }),
    /expediate/,
  );
  await assert.rejects(
    () =>
      db.run(receiveTransfer, {
        requestId: 'tr-ship-0000000010',
        transferId: draft._id,
        lines: [line('magnet', 5)],
      }),
    /Identificator deja utilizat/,
  );
  const recvReq = {
    requestId: 'tr-recv-0000000007',
    transferId: draft._id,
    lines: [line('magnet', 5)],
  };
  const received = await db.run(receiveTransfer, recvReq);
  const receivedAgain = await db.run(receiveTransfer, recvReq);
  assert.equal(receivedAgain._id, received._id);
  assert.equal(movementsFor(db, 'tr-recv-0000000007').length, 1);
  assert.equal(fairQty(db, 'magnet'), 39);
});

test('request, updateDraft preserves requested quantities and cancel rules', async () => {
  const db = fixture();
  admin(db);
  db.seed('fairAssignments', 'assign-1', {
    fairId: 'fair-1', userId: 'seller-1', assignedBy: 'admin-1', createdAt: 1,
  });
  seller(db);
  const req = await db.run(request, {
    requestId: 'tr-request-0000001',
    toFairId: 'fair-1',
    lines: [line('magnet', 5)],
    note: 'stoc mic',
  });
  assert.equal(req.status, 'requested');
  assert.equal(req.createdBy, 'seller-1');
  assert.equal(req.lines[0].requestedQuantity, 5);
  assert.equal(await stockOf(db, 'magnet'), 100);

  admin(db);
  const draft = await db.run(updateDraft, {
    requestId: 'tr-update-000000001',
    transferId: req._id,
    from: workshop,
    to: fair1,
    lines: [line('magnet', 8)],
  });
  assert.equal(draft.status, 'draft');
  assert.equal(draft.lines[0].quantity, 8);
  assert.equal(draft.lines[0].requestedQuantity, 5);
  assert.equal(await stockOf(db, 'magnet'), 100);
  const events = db.all('transferEvents').filter((e) => e.transferId === req._id);
  assert.deepEqual(events.map((e) => e.kind), ['requested', 'updated']);

  await db.run(ship, { requestId: 'tr-ship-0000000012', transferId: req._id });
  await assert.rejects(
    () =>
      db.run(cancel, {
        requestId: 'tr-cancel-000000001',
        transferId: req._id,
        reason: 'nu mai e nevoie',
      }),
    /nu mai poate fi anulat/,
  );

  const db2 = fixture();
  admin(db2);
  const draft2 = await db2.run(create, {
    requestId: 'tr-create-00000011',
    from: workshop,
    to: fair1,
    lines: [line('magnet', 3)],
  });
  await assert.rejects(
    () =>
      db2.run(cancel, {
        requestId: 'tr-cancel-000000002',
        transferId: draft2._id,
        reason: 'ab',
      }),
    /Motivul/,
  );
  const cancelled = await db2.run(cancel, {
    requestId: 'tr-cancel-000000003',
    transferId: draft2._id,
    reason: 'nu mai e nevoie',
  });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(cancelled.cancelReason, 'nu mai e nevoie');
  assert.equal(await stockOf(db2, 'magnet'), 100);
});

test('permissions: seller scope, execute roles, denied identities', async () => {
  const db = fixture();
  admin(db);
  const adminTransfer = await db.run(create, {
    requestId: 'tr-create-00000012',
    from: workshop,
    to: fair1,
    lines: [line('magnet', 1)],
  });
  seller(db);
  await assert.rejects(
    () =>
      db.run(request, {
        requestId: 'tr-request-0000002',
        toFairId: 'fair-1',
        lines: [line('magnet', 1)],
      }),
    /acces la acest târg/i,
  );
  db.seed('fairAssignments', 'assign-1', {
    fairId: 'fair-1', userId: 'seller-1', assignedBy: 'admin-1', createdAt: 1,
  });
  const own = await db.run(request, {
    requestId: 'tr-request-0000003',
    toFairId: 'fair-1',
    lines: [line('magnet', 2)],
  });
  for (const [fn, args] of [
    [create, { requestId: 'tr-create-00000013', from: workshop, to: fair1, lines: [line('magnet', 1)] }],
    [updateDraft, { requestId: 'tr-update-000000002', transferId: adminTransfer._id, from: workshop, to: fair1, lines: [line('magnet', 1)] }],
    [ship, { requestId: 'tr-ship-0000000013', transferId: adminTransfer._id }],
    [receiveTransfer, { requestId: 'tr-recv-0000000008', transferId: adminTransfer._id, lines: [line('magnet', 1)] }],
    [cancel, { requestId: 'tr-cancel-000000004', transferId: adminTransfer._id, reason: 'nu e al meu' }],
  ]) {
    await assert.rejects(() => db.run(fn, args), /Forbidden/);
  }
  const sellerList = await db.run(list, {});
  assert.ok(sellerList.every((row) => row.createdBy === 'seller-1'));
  assert.equal(sellerList.length, 1);
  assert.equal(await db.run(get, { transferId: adminTransfer._id }), null);
  const ownDetail = await db.run(get, { transferId: own._id });
  assert.equal(ownDetail.transfer.createdBy, 'seller-1');

  db.identity({ subject: 'user-1', role: 'customer' });
  await assert.rejects(() => db.run(list, {}), /Forbidden/);
  await assert.rejects(
    () =>
      db.run(request, {
        requestId: 'tr-request-0000004',
        toFairId: 'fair-1',
        lines: [line('magnet', 1)],
      }),
    /Forbidden/,
  );
  db.identity(null);
  await assert.rejects(() => db.run(list, {}), /Forbidden|Unauthorized|autentic/i);

  const db2 = fixture();
  db2.identity({ subject: 'atelier-1', role: 'atelier' });
  const draft = await db2.run(create, {
    requestId: 'tr-create-00000014',
    from: workshop,
    to: fair1,
    lines: [line('magnet', 2)],
  });
  await db2.run(ship, { requestId: 'tr-ship-0000000014', transferId: draft._id });
  assert.equal(await stockOf(db2, 'magnet'), 98);
});

test('seller receives own requested transfer after it is shipped', async () => {
  const db = fixture();
  admin(db);
  db.seed('fairAssignments', 'assign-1', {
    fairId: 'fair-1', userId: 'seller-1', assignedBy: 'admin-1', createdAt: 1,
  });
  seller(db);
  const req = await db.run(request, {
    requestId: 'tr-request-0000006',
    toFairId: 'fair-1',
    lines: [line('magnet', 4)],
  });
  admin(db);
  await db.run(updateDraft, {
    requestId: 'tr-update-000000003',
    transferId: req._id,
    from: workshop,
    to: fair1,
    lines: [line('magnet', 4)],
  });
  await db.run(ship, { requestId: 'tr-ship-0000000016', transferId: req._id });
  assert.equal(await stockOf(db, 'magnet'), 96);
  assert.equal(fairQty(db, 'magnet'), 34);

  seller(db);
  const received = await db.run(receiveTransfer, {
    requestId: 'tr-recv-0000000009',
    transferId: req._id,
    lines: [line('magnet', 4)],
  });
  assert.equal(received.status, 'received');
  assert.equal(fairQty(db, 'magnet'), 38);
  const incoming = movementsFor(db, 'tr-recv-0000000009');
  assert.equal(incoming.length, 1);
  assert.equal(incoming[0].kind, 'transfer_in');
  assert.equal(incoming[0].actorId, 'seller-1');
});

test('seller cannot receive foreign transfers or without fair access', async () => {
  const db = fixture();
  admin(db);
  db.seed('fairAssignments', 'assign-1', {
    fairId: 'fair-1', userId: 'seller-1', assignedBy: 'admin-1', createdAt: 1,
  });
  seller(db);
  const req = await db.run(request, {
    requestId: 'tr-request-0000007',
    toFairId: 'fair-1',
    lines: [line('magnet', 2)],
  });
  admin(db);
  await db.run(updateDraft, {
    requestId: 'tr-update-000000004',
    transferId: req._id,
    from: workshop,
    to: fair1,
    lines: [line('magnet', 2)],
  });
  await db.run(ship, { requestId: 'tr-ship-0000000017', transferId: req._id });

  db.identity({ subject: 'seller-2', role: 'seller' });
  await assert.rejects(
    () =>
      db.run(receiveTransfer, {
        requestId: 'tr-recv-0000000010',
        transferId: req._id,
        lines: [line('magnet', 2)],
      }),
    /Forbidden/,
  );

  seller(db);
  await db.ctx.db.delete('assign-1');
  await assert.rejects(
    () =>
      db.run(receiveTransfer, {
        requestId: 'tr-recv-0000000011',
        transferId: req._id,
        lines: [line('magnet', 2)],
      }),
    /acces la acest târg/i,
  );
});

test('pendingRequestCount tracks open requests for execute roles only', async () => {
  const db = fixture();
  admin(db);
  db.seed('fairAssignments', 'assign-1', {
    fairId: 'fair-1', userId: 'seller-1', assignedBy: 'admin-1', createdAt: 1,
  });
  assert.equal(await db.run(pendingRequestCount, {}), 0);
  seller(db);
  await assert.rejects(() => db.run(pendingRequestCount, {}), /Forbidden/);
  const req = await db.run(request, {
    requestId: 'tr-request-0000008',
    toFairId: 'fair-1',
    lines: [line('magnet', 1)],
  });
  admin(db);
  assert.equal(await db.run(pendingRequestCount, {}), 1);
  await db.run(updateDraft, {
    requestId: 'tr-update-000000005',
    transferId: req._id,
    from: workshop,
    to: fair1,
    lines: [line('magnet', 1)],
  });
  assert.equal(await db.run(pendingRequestCount, {}), 0);

  seller(db);
  const refused = await db.run(request, {
    requestId: 'tr-request-0000009',
    toFairId: 'fair-1',
    lines: [line('magnet', 1)],
  });
  admin(db);
  assert.equal(await db.run(pendingRequestCount, {}), 1);
  await db.run(cancel, {
    requestId: 'tr-cancel-000000007',
    transferId: refused._id,
    reason: 'stoc suficient',
  });
  assert.equal(await db.run(pendingRequestCount, {}), 0);
});

test('accept turns a request into a workshop-sourced draft, replays and enforces roles', async () => {
  const db = fixture();
  admin(db);
  db.seed('fairAssignments', 'assign-1', {
    fairId: 'fair-1', userId: 'seller-1', assignedBy: 'admin-1', createdAt: 1,
  });
  seller(db);
  const req = await db.run(request, {
    requestId: 'tr-request-0000010',
    toFairId: 'fair-1',
    lines: [line('magnet', 5), line('brad', 2)],
  });
  admin(db);
  assert.equal(await db.run(pendingRequestCount, {}), 1);
  const acceptReq = { requestId: 'tr-accept-00000001', transferId: req._id };
  const accepted = await db.run(accept, acceptReq);
  assert.equal(accepted.status, 'draft');
  assert.equal(accepted.fromLocation, 'workshop');
  assert.equal(accepted.toFairId, 'fair-1');
  assert.equal(accepted.lines[0].quantity, 5);
  assert.equal(accepted.lines[0].requestedQuantity, 5);
  assert.equal(await stockOf(db, 'magnet'), 100);
  assert.equal(await db.run(pendingRequestCount, {}), 0);
  const events = db
    .all('transferEvents')
    .filter((e) => e.transferId === req._id);
  assert.deepEqual(
    events.map((e) => e.kind),
    ['requested', 'accepted'],
  );

  const replayed = await db.run(accept, acceptReq);
  assert.equal(replayed._id, req._id);
  await assert.rejects(
    () =>
      db.run(accept, {
        requestId: 'tr-accept-00000002',
        transferId: req._id,
      }),
    /solicitările/,
  );

  await db.run(ship, {
    requestId: 'tr-ship-0000000018',
    transferId: req._id,
  });
  assert.equal(await stockOf(db, 'magnet'), 95);
  await db.run(receiveTransfer, {
    requestId: 'tr-recv-0000000012',
    transferId: req._id,
    lines: [line('magnet', 5), line('brad', 2)],
  });
  assert.equal(fairQty(db, 'magnet'), 39);
  assert.equal(fairQty(db, 'brad'), 30);

  const db2 = fixture();
  admin(db2);
  db2.seed('fairAssignments', 'assign-1', {
    fairId: 'fair-1', userId: 'seller-1', assignedBy: 'admin-1', createdAt: 1,
  });
  seller(db2);
  const req2 = await db2.run(request, {
    requestId: 'tr-request-0000011',
    toFairId: 'fair-1',
    lines: [line('magnet', 1)],
  });
  await assert.rejects(
    () =>
      db2.run(accept, {
        requestId: 'tr-accept-00000003',
        transferId: req2._id,
      }),
    /Forbidden/,
  );
  db2.identity({ subject: 'atelier-1', role: 'atelier' });
  const acceptedByAtelier = await db2.run(accept, {
    requestId: 'tr-accept-00000003',
    transferId: req2._id,
  });
  assert.equal(acceptedByAtelier.status, 'draft');

  const db3 = fixture();
  admin(db3);
  db3.seed('fairAssignments', 'assign-1', {
    fairId: 'fair-1', userId: 'seller-1', assignedBy: 'admin-1', createdAt: 1,
  });
  seller(db3);
  const req3 = await db3.run(request, {
    requestId: 'tr-request-0000012',
    toFairId: 'fair-1',
    lines: [line('magnet', 1)],
  });
  await db3.ctx.db.patch('fair-1', { active: false });
  admin(db3);
  await assert.rejects(
    () =>
      db3.run(accept, {
        requestId: 'tr-accept-00000004',
        transferId: req3._id,
      }),
    /nu este activ/,
  );
});

test('seller can cancel own requested transfer', async () => {
  const db = fixture();
  admin(db);
  db.seed('fairAssignments', 'assign-1', {
    fairId: 'fair-1', userId: 'seller-1', assignedBy: 'admin-1', createdAt: 1,
  });
  seller(db);
  const req = await db.run(request, {
    requestId: 'tr-request-0000005',
    toFairId: 'fair-1',
    lines: [line('magnet', 1)],
  });
  const cancelled = await db.run(cancel, {
    requestId: 'tr-cancel-000000005',
    transferId: req._id,
    reason: 'greșeală de introducere',
  });
  assert.equal(cancelled.status, 'cancelled');
});

test('archive is blocked by an open transfer', async () => {
  const db = fixture();
  admin(db);
  const draft = await db.run(create, {
    requestId: 'tr-create-00000015',
    from: fair1,
    to: workshop,
    lines: [line('magnet', 3)],
  });
  await assert.rejects(
    () => db.run(getArchivePreview, { fairId: 'fair-1' }),
    /transferuri deschise/,
  );
  await assert.rejects(
    () =>
      db.run(archiveFair, {
        requestId: 'archive-00000000001',
        fairId: 'fair-1',
        expectedInventory: [
          { productId: 'magnet', quantity: 34 },
          { productId: 'brad', quantity: 28 },
          { productId: 'stea', quantity: 16 },
        ],
      }),
    /transferuri deschise/,
  );
  await db.run(cancel, {
    requestId: 'tr-cancel-000000006',
    transferId: draft._id,
    reason: 'anulat pentru arhivare',
  });
  const preview = await db.run(getArchivePreview, { fairId: 'fair-1' });
  assert.equal(preview.items.length, 3);
});

test('legacy pos.transfer rejects new requests and replays existing receipts', async () => {
  const db = fixture();
  admin(db);
  await assert.rejects(
    () =>
      db.run(legacyTransfer, {
        requestId: 'transfer-000000001',
        fairId: 'fair-1',
        productId: 'magnet',
        quantity: 5,
        direction: 'to_fair',
      }),
    /înlocuite de modulul Transferuri/,
  );
  db.seed('inventoryOperations', 'legacy-receipt', {
    requestId: 'transfer-000000002',
    actorId: 'admin-1',
    kind: 'transfer',
    direction: 'to_fair',
    fairId: 'fair-1',
    fairName: 'Targ Craciun',
    productId: 'magnet',
    productName: 'Magnet Sibiu',
    quantity: 5,
    stock: {},
    createdAt: 1,
  });
  const receipt = await db.run(legacyTransfer, {
    requestId: 'transfer-000000002',
    fairId: 'fair-1',
    productId: 'magnet',
    quantity: 5,
    direction: 'to_fair',
  });
  assert.equal(receipt._id, 'legacy-receipt');
});

test('atelier count snapshot conflicts after a shipment', async () => {
  const db = fixture();
  admin(db);
  const snapshot = await db.run(countSnapshot, { productId: 'magnet' });
  const draft = await db.run(create, {
    requestId: 'tr-create-00000016',
    from: workshop,
    to: fair1,
    lines: [line('magnet', 2)],
  });
  await db.run(ship, { requestId: 'tr-ship-0000000015', transferId: draft._id });
  await assert.rejects(
    () =>
      db.run(count, {
        requestId: 'count-0000000000010',
        productId: 'magnet',
        expectedQuantity: snapshot.expectedQuantity,
        lastMovementId: snapshot.lastMovementId,
        countedQuantity: snapshot.expectedQuantity,
      }),
    /s-a modificat după începerea numărării/,
  );
});

test('getEvent returns own event and rejects foreign ids', async () => {
  const db = fixture();
  admin(db);
  const draft = await db.run(create, {
    requestId: 'tr-create-00000017',
    from: workshop,
    to: fair1,
    lines: [line('magnet', 1)],
  });
  const event = await db.run(getEvent, { requestId: 'tr-create-00000017' });
  assert.equal(event.kind, 'created');
  assert.equal(event.transferId, draft._id);
  db.identity({ subject: 'admin-2', role: 'admin' });
  await assert.rejects(
    () => db.run(getEvent, { requestId: 'tr-create-00000017' }),
    /altui utilizator/,
  );
});

test('invalid lines and untracked products are rejected', async () => {
  const db = fixture();
  admin(db);
  db.seed('products', 'untracked', { name: 'X', price: 10, stock: 5, trackStock: false });
  const args = (lines) => ({
    requestId: `tr-create-${Math.random().toString(36).slice(2, 10)}`,
    from: workshop,
    to: fair1,
    lines,
  });
  await assert.rejects(() => db.run(create, args([])), /Selectează/);
  await assert.rejects(
    () => db.run(create, args([line('magnet', 1), line('magnet', 2)])),
    /duplicat/i,
  );
  await assert.rejects(
    () => db.run(create, args([line('magnet', 0)])),
    /cantitate/i,
  );
  await assert.rejects(
    () => db.run(create, args([line('missing', 1)])),
    /nu mai există/,
  );
  await assert.rejects(
    () => db.run(create, args([line('untracked', 1)])),
    /urmărirea stocului/,
  );
});
