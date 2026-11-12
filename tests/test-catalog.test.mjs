import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { testProducts } from '../convex/lib/testProducts.ts';
import {
  archiveExistingCatalog,
  insertTestCatalog,
} from '../convex/testCatalogData.ts';
import { fixture } from './helpers/convexFixture.mjs';

const vars = {
  APP_ENV: 'test',
  CONVEX_CLOUD_URL: 'https://exuberant-fox-228.convex.cloud',
  CLERK_JWT_ISSUER_DOMAIN: 'https://choice-fowl-16.clerk.accounts.dev',
  SITE_URL: 'https://hawaii-woodworking-test-robertrauleas-projects.vercel.app',
};
const old = {};
before(() => {
  for (const [k,v] of Object.entries(vars)) { old[k] = process.env[k]; process.env[k] = v; }
});
after(() => {
  for (const k of Object.keys(vars)) {
    if (old[k] === undefined) delete process.env[k]; else process.env[k] = old[k];
  }
});

const seedImages = (db) => {
  for (const product of testProducts)
    db.seed('demoAssets', `asset-${product.demoKey}`, {
      key: product.demoKey,
      storageId: `storage-${product.demoKey}`,
      sourceUrl: product.image.sourceUrl,
      licenseUrl: product.image.licenseUrl,
    });
};

test('test catalog has 30 unique purchasable items in six categories', () => {
  assert.equal(testProducts.length, 30);
  assert.equal(new Set(testProducts.map((p) => p.demoKey)).size, 30);
  assert.equal(new Set(testProducts.map((p) => p.sku)).size, 30);
  assert.equal(new Set(testProducts.map((p) => p.category)).size, 6);
  assert.ok(testProducts.every((p) => p.stock > 0 && p.price > 0));
  assert.ok(testProducts.every((p) => !/demo|test/i.test(p.name)));
  assert.ok(testProducts.every((p) => p.image.sourceUrl.startsWith('https://')));
});

test('archive returns fair stock to workshop, cancels open POS attempts and archives old products', async () => {
  const db = fixture();
  db.seed('posAttempts', 'attempt-1', { status: 'prepared' });
  db.seed('products', 'gone', { name: 'Produs sters' });
  db.seed('fairInventory', 'balance-gone', {
    fairId: 'fair-1',
    productId: 'gone',
    quantity: 7,
  });
  const result = await db.run(archiveExistingCatalog, {
    requestId: 'test-catalog-reset-0001',
  });
  assert.equal(result.archived, 4);
  assert.equal(result.fairRowsCleared, 4);
  assert.equal(result.attemptsCancelled, 1);
  const magnet = db.all('products').find((p) => p._id === 'magnet');
  assert.equal(magnet.archivedAt > 0, true);
  assert.equal(magnet.active, false);
  assert.equal(magnet.stock, 134);
  assert.equal(
    db.all('fairInventory').every((b) => b.quantity === 0),
    true,
  );
  const movements = db.all('stockMovements');
  assert.equal(movements.length, 8);
  assert.ok(
    movements.every(
      (m) =>
        m.requestId === 'test-catalog-reset-0001' &&
        m.kind === 'transfer' &&
        m.actorId === 'test-catalog',
    ),
  );
  assert.equal(db.all('posAttempts')[0].status, 'cancelled');
  const again = await db.run(archiveExistingCatalog, {
    requestId: 'test-catalog-reset-0002',
  });
  assert.equal(again.archived, 0);
  assert.equal(again.fairRowsCleared, 0);
  assert.equal(again.attemptsCancelled, 0);
});

test('insert is idempotent, removes stale categories and never archives the new catalog', async () => {
  const db = fixture();
  seedImages(db);
  db.seed('categories', 'cat-old', { name: 'Rafturi' });
  db.seed('categories', 'cat-used', { name: 'Bucatarie' });
  await db.run(archiveExistingCatalog, {
    requestId: 'test-catalog-reset-0003',
  });
  const result = await db.run(insertTestCatalog);
  assert.equal(result.inserted, 30);
  assert.equal(result.skipped, 0);
  const names = db.all('categories').map((c) => c.name);
  assert.equal(names.includes('Rafturi'), false);
  assert.equal(names.includes('Bucatarie'), false);
  assert.equal(new Set(names).size, 6);
  const again = await db.run(insertTestCatalog);
  assert.equal(again.inserted, 0);
  assert.equal(again.skipped, 30);
  const rerun = await db.run(archiveExistingCatalog, {
    requestId: 'test-catalog-reset-0004',
  });
  assert.equal(rerun.archived, 0);
  assert.equal(
    db
      .all('products')
      .filter((p) => p.demoKey)
      .every((p) => !p.archivedAt && p.active === true),
    true,
  );
});

test('test catalog mutations refuse production and missing images', async () => {
  const db = fixture();
  await assert.rejects(db.run(insertTestCatalog), /images|uploaded/i);
  process.env.APP_ENV = 'production';
  try {
    await assert.rejects(db.run(insertTestCatalog));
    await assert.rejects(
      db.run(archiveExistingCatalog, { requestId: 'test-catalog-reset-0005' }),
    );
  } finally {
    process.env.APP_ENV = 'test';
  }
});
