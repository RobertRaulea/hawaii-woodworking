import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture } from './helpers/convexFixture.mjs';
import * as products from '../convex/products.ts';
import * as categories from '../convex/categories.ts';
import * as pos from '../convex/pos.ts';
import * as transfers from '../convex/transfers.ts';
import * as inventory from '../convex/inventory.ts';
import { checkoutSnapshot } from '../convex/lib/inventory.utils.ts';

const admin = (db) => db.identity({ subject: 'admin-1', role: 'admin' });
const asRole = (db, role) =>
  db.identity({ subject: `user-${role}`, role });

const workshop = { location: 'workshop' };
const fair1 = { location: 'fair', fairId: 'fair-1' };

const prepareArgs = (requestId, productId = 'magnet') => ({
  requestId,
  fairId: 'fair-1',
  paymentMethod: 'cash',
  discountCents: 0,
  discountReason: '',
  items: [{ productId, quantity: 1, expectedUnitPriceCents: 2500 }],
});

const seedOrder = (db, id, fields = {}) => {
  db.seed('orders', id, {
    customerId: 'cust-1',
    items: [
      { productId: 'magnet', name: 'Magnet Sibiu', price: 25, quantity: 2 },
    ],
    total: 50,
    status: 'paid',
    stripeSessionId: `sess-${id}`,
    inventoryStatus: 'applied',
    createdAt: Date.now(),
    ...fields,
  });
};

test('admin updates name, price and SKU; duplicate SKU is rejected', async () => {
  const db = fixture();
  admin(db);
  await db.run(products.updateProduct, {
    id: 'magnet',
    name: 'Magnet Bran',
    price: 30,
    sku: '  magnet-01 ',
  });
  const updated = await db.ctx.db.get('magnet');
  assert.equal(updated.name, 'Magnet Bran');
  assert.equal(updated.price, 30);
  assert.equal(updated.sku, 'MAGNET-01');
  await assert.rejects(
    db.run(products.updateProduct, { id: 'brad', sku: 'Magnet-01' }),
    /SKU deja utilizat/,
  );
  await assert.rejects(
    db.run(products.createProduct, { name: 'Nou', price: 10, sku: 'MAGNET-01' }),
    /SKU deja utilizat/,
  );
});

test('createProduct generează SKU din nume când câmpul e gol sau lipsește', async () => {
  const db = fixture();
  admin(db);
  const first = await db.run(products.createProduct, {
    name: 'Tocător din Stejar',
    price: 10,
  });
  const firstDoc = await db.ctx.db.get(first);
  assert.equal(firstDoc.sku, 'TDS-01');
  const second = await db.run(products.createProduct, {
    name: 'Tocator de Salcam',
    price: 5,
    sku: '  ',
  });
  const secondDoc = await db.ctx.db.get(second);
  assert.equal(secondDoc.sku, 'TDS-02');
  const custom = await db.run(products.createProduct, {
    name: 'Altceva',
    price: 5,
    sku: 'custom-9',
  });
  const customDoc = await db.ctx.db.get(custom);
  assert.equal(customDoc.sku, 'CUSTOM-9');
});

test('backfillSkus generează coduri doar pentru produsele fără SKU', async () => {
  const db = fixture();
  db.seed('products', 'manual', {
    name: 'Produs Manual',
    price: 5,
    sku: 'SL-01',
  });
  const result = await db.run(products.backfillSkus);
  assert.equal(result.updated, 3);
  const docs = await Promise.all(
    ['magnet', 'brad', 'stea'].map((id) => db.ctx.db.get(id)),
  );
  assert.deepEqual(
    docs.map((doc) => doc.sku).sort(),
    ['MS-01', 'OB-01', 'SL-02'],
  );
  assert.equal((await db.ctx.db.get('manual')).sku, 'SL-01');
  const again = await db.run(products.backfillSkus);
  assert.equal(again.updated, 0);
});

test('non-admin roles are denied catalog mutations and listAdmin', async () => {
  for (const role of ['atelier', 'seller', 'customer']) {
    const db = fixture();
    asRole(db, role);
    await assert.rejects(
      db.run(products.updateProduct, { id: 'magnet', name: 'X' }),
    );
    await assert.rejects(db.run(products.setProductActive, { id: 'magnet', active: false }));
    await assert.rejects(db.run(products.archiveProduct, { id: 'magnet' }));
    await assert.rejects(db.run(products.deleteProduct, { id: 'magnet' }));
    await assert.rejects(db.run(products.listAdmin));
  }
});

test('price change is reflected in pos.workspace unitPriceCents', async () => {
  const db = fixture();
  admin(db);
  await db.run(products.updateProduct, { id: 'magnet', price: 42.5 });
  const workspace = await db.run(pos.workspace, { fairId: 'fair-1' });
  const row = workspace.find((item) => item.id === 'magnet');
  assert.equal(row.unitPriceCents, 4250);
});

test('deactivation hides product from workspace, shop and prepare; prepared attempt still completes', async () => {
  const db = fixture();
  admin(db);
  const attempt = await db.run(pos.prepare, prepareArgs('request-before-00001'));
  assert.equal(attempt.status, 'prepared');

  await db.run(products.setProductActive, { id: 'magnet', active: false });
  assert.equal(
    (await db.run(pos.workspace, { fairId: 'fair-1' })).some(
      (item) => item.id === 'magnet',
    ),
    false,
  );
  assert.equal(
    (await db.run(products.getAll)).some((p) => p._id === 'magnet'),
    false,
  );
  assert.equal(await db.run(products.getById, { id: 'magnet' }), null);

  // The attempt prepared before deactivation can still finish.
  const result = await db.run(pos.complete, {
    requestId: 'request-before-00001',
    receivedCents: 2500,
  });
  assert.equal(result.totalCents, 2500);

  // New prepares with the deactivated product are rejected.
  await assert.rejects(
    db.run(pos.prepare, prepareArgs('request-after-000001')),
    /nu mai este disponibil/,
  );

  // Reactivation restores visibility.
  await db.run(products.setProductActive, { id: 'magnet', active: true });
  assert.ok(
    (await db.run(products.getAll)).some((p) => p._id === 'magnet'),
  );
  assert.ok(
    (await db.run(pos.workspace, { fairId: 'fair-1' })).some(
      (item) => item.id === 'magnet',
    ),
  );
});

test('delete with order history is rejected; archive keeps order snapshot intact', async () => {
  const db = fixture();
  admin(db);
  seedOrder(db, 'order-1');
  await assert.rejects(
    db.run(products.deleteProduct, { id: 'magnet' }),
    /Arhivează-l în loc/,
  );
  await db.run(products.updateProduct, { id: 'magnet', name: 'Nou nume', price: 99 });
  await db.ctx.db.patch('balance-magnet', { quantity: 0 });
  await db.run(products.archiveProduct, { id: 'magnet' });
  const order = db.all('orders').find((o) => o._id === 'order-1');
  assert.deepEqual(order.items[0], {
    productId: 'magnet',
    name: 'Magnet Sibiu',
    price: 25,
    quantity: 2,
  });
  const product = await db.ctx.db.get('magnet');
  assert.ok(product.archivedAt);
  assert.equal(product.active, false);
  assert.equal(product.archivedBy, 'admin-1');
});

test('unreferenced zero-stock product can be deleted', async () => {
  const db = fixture();
  admin(db);
  const id = await db.run(products.createProduct, {
    name: 'Ephemeral',
    price: 10,
  });
  assert.equal(await db.ctx.db.get(id) !== null, true);
  await db.run(products.deleteProduct, { id });
  assert.equal(await db.ctx.db.get(id), null);
});

test('archive is blocked by fair stock, open transfer and prepared POS attempt', async () => {
  // fair stock
  {
    const db = fixture();
    admin(db);
    await assert.rejects(
      db.run(products.archiveProduct, { id: 'magnet' }),
      /târg|targ/,
    );
  }
  // open transfer
  {
    const db = fixture();
    admin(db);
    await db.ctx.db.patch('balance-magnet', { quantity: 0 });
    await db.run(transfers.create, {
      requestId: 'tr-open-0000000001',
      from: workshop,
      to: fair1,
      lines: [{ productId: 'magnet', quantity: 1 }],
    });
    await assert.rejects(
      db.run(products.archiveProduct, { id: 'magnet' }),
      /transferuri deschise/,
    );
  }
  // prepared POS attempt
  {
    const db = fixture();
    admin(db);
    db.seed('posAttempts', 'attempt-1', {
      requestId: 'request-seeded-000001',
      sellerId: 'admin-1',
      fairId: 'fair-1',
      paymentMethod: 'cash',
      status: 'prepared',
      items: [
        {
          productId: 'magnet',
          name: 'Magnet Sibiu',
          quantity: 1,
          unitPriceCents: 2500,
          lineTotalCents: 2500,
        },
      ],
      discountCents: 0,
      discountReason: '',
      totalCents: 2500,
    });
    await db.ctx.db.patch('balance-magnet', { quantity: 0 });
    await assert.rejects(
      db.run(products.archiveProduct, { id: 'magnet' }),
      /vânzare în curs/,
    );
  }
});

test('archived product is rejected by transfers.create and inventory.receive', async () => {
  const db = fixture();
  admin(db);
  db.seed('products', 'old', { name: 'Vechi', price: 5, stock: 3, trackStock: true, archivedAt: 1, active: false });
  await assert.rejects(
    db.run(transfers.create, {
      requestId: 'tr-arch-0000000001',
      from: workshop,
      to: fair1,
      lines: [{ productId: 'old', quantity: 1 }],
    }),
    /Produsul este arhivat/,
  );
  await assert.rejects(
    db.run(transfers.request, {
      requestId: 'tr-arch-0000000002',
      toFairId: 'fair-1',
      lines: [{ productId: 'old', quantity: 1 }],
    }),
    /Produsul este arhivat/,
  );
  await assert.rejects(
    db.run(inventory.receive, {
      requestId: 'inv-arch-0000000001',
      productId: 'old',
      quantity: 2,
    }),
    /Produsul este arhivat/,
  );
});

test('inactive (not archived) product remains usable in transfers and receive', async () => {
  const db = fixture();
  admin(db);
  db.seed('products', 'paused', { name: 'Pauzat', price: 5, stock: 3, trackStock: true, active: false });
  const draft = await db.run(transfers.create, {
    requestId: 'tr-paus-0000000001',
    from: workshop,
    to: fair1,
    lines: [{ productId: 'paused', quantity: 1 }],
  });
  assert.equal(draft.status, 'draft');
  const op = await db.run(inventory.receive, {
    requestId: 'inv-paus-0000000001',
    productId: 'paused',
    quantity: 2,
  });
  assert.equal(op.delta, 2);
});

test('checkoutSnapshot rejects inactive products', async () => {
  const db = fixture();
  admin(db);
  await db.run(products.setProductActive, { id: 'magnet', active: false });
  await assert.rejects(
    checkoutSnapshot(db.ctx, [{ productId: 'magnet', quantity: 1 }]),
    /nu mai este disponibil/,
  );
});

test('category rename is blocked while in use; translations remain editable', async () => {
  const db = fixture();
  admin(db);
  db.seed('categories', 'cat-1', { name: 'Magneti', name_ro: 'Magneti' });
  await db.ctx.db.patch('magnet', { category: 'Magneti' });

  await assert.rejects(
    db.run(categories.update, { id: 'cat-1', name: 'Magneti 2' }),
    /folosită de produse/,
  );
  await db.run(categories.update, {
    id: 'cat-1',
    name: 'Magneti',
    name_en: 'Magnets',
  });
  assert.equal((await db.ctx.db.get('cat-1')).name_en, 'Magnets');

  db.seed('categories', 'cat-2', { name: 'Noua' });
  await db.run(categories.update, { id: 'cat-2', name: 'Noua 2' });
  assert.equal((await db.ctx.db.get('cat-2')).name, 'Noua 2');

  await assert.rejects(
    db.run(categories.remove, { id: 'cat-1' }),
    /folosită de produse/,
  );
  await db.run(categories.remove, { id: 'cat-2' });
  assert.equal(await db.ctx.db.get('cat-2'), null);
});

test('fair create/update validates dates and admin role', async () => {
  const db = fixture();
  admin(db);
  const fairId = await db.run(pos.createFair, {
    name: 'Târg Paște',
    startsOn: '2026-04-10',
    endsOn: '2026-04-13',
  });
  let fair = await db.ctx.db.get(fairId);
  assert.equal(fair.startsOn, '2026-04-10');
  assert.equal(fair.endsOn, '2026-04-13');

  await db.run(pos.updateFair, {
    fairId,
    name: 'Târg Paște 2026',
    endsOn: '2026-04-14',
  });
  fair = await db.ctx.db.get(fairId);
  assert.equal(fair.name, 'Târg Paște 2026');
  assert.equal(fair.endsOn, '2026-04-14');

  await assert.rejects(
    db.run(pos.createFair, {
      name: 'Bad',
      startsOn: '2026-05-02',
      endsOn: '2026-05-01',
    }),
    /sfârșit/,
  );
  await assert.rejects(
    db.run(pos.updateFair, {
      fairId,
      name: 'Bad',
      startsOn: 'not-a-date',
    }),
    /început/,
  );

  asRole(db, 'seller');
  await assert.rejects(
    db.run(pos.updateFair, { fairId, name: 'Hacked' }),
  );

  admin(db);
  await db.ctx.db.patch(fairId, { active: false });
  await assert.rejects(
    db.run(pos.updateFair, { fairId, name: 'Arhivat' }),
    /arhivat/,
  );
});

test('fair gets its own inventory after a transfer; other fairs unchanged', async () => {
  const db = fixture();
  admin(db);
  const fairId = await db.run(pos.createFair, { name: 'Târg Nou' });
  const draft = await db.run(transfers.create, {
    requestId: 'tr-fair-0000000001',
    from: workshop,
    to: { location: 'fair', fairId },
    lines: [{ productId: 'brad', quantity: 4 }],
  });
  await db.run(transfers.ship, {
    requestId: 'tr-fair-0000000002',
    transferId: draft._id,
  });
  await db.run(transfers.receive, {
    requestId: 'tr-fair-0000000003',
    transferId: draft._id,
    lines: [{ productId: 'brad', quantity: 4 }],
  });
  const overview = await db.run(pos.getStockOverview);
  const row = overview.products.find((item) => item.id === 'brad');
  assert.equal(row.fairs.find((f) => f.fairId === fairId).quantity, 4);
  assert.equal(
    row.fairs.find((f) => f.fairId === 'fair-1').quantity,
    28,
  );
  assert.equal(row.status, 'active');
});

test('seller sees a fair in listFairs only after assignment', async () => {
  const db = fixture();
  asRole(db, 'seller');
  assert.deepEqual(await db.run(pos.listFairs), []);
  db.seed('fairAssignments', 'asg-1', {
    fairId: 'fair-1',
    userId: 'user-seller',
    assignedBy: 'admin-1',
    createdAt: 1,
  });
  const fairs = await db.run(pos.listFairs);
  assert.equal(fairs.length, 1);
  assert.equal(fairs[0]._id, 'fair-1');
});

test('restore keeps product inactive until re-activated', async () => {
  const db = fixture();
  admin(db);
  db.seed('products', 'arch', { name: 'Arhivat', price: 5, stock: 0, trackStock: true, archivedAt: 1, active: false });
  await db.run(products.restoreProduct, { id: 'arch' });
  let product = await db.ctx.db.get('arch');
  assert.equal(product.archivedAt, undefined);
  assert.equal(product.active, false);
  assert.equal(
    (await db.run(products.listAdmin)).find((p) => p._id === 'arch').status,
    'inactive',
  );
  await db.run(products.setProductActive, { id: 'arch', active: true });
  product = await db.ctx.db.get('arch');
  assert.equal(product.active, true);
});
