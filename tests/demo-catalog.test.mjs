import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { demoProducts } from '../convex/lib/demoProducts.ts';
import { insertCatalog } from '../convex/demoData.ts';
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
test('demo catalog has 30 unique purchasable items', () => {
  assert.equal(demoProducts.length, 30);
  assert.equal(new Set(demoProducts.map((p) => p.demoKey)).size, 30);
  assert.equal(new Set(demoProducts.map((p) => p.sku)).size, 30);
  assert.ok(demoProducts.every((p) => p.stock > 0 && p.price > 0));
});
test('internal demo seed is idempotent and preserves old products and stock', async () => {
  const db = fixture();
  assert.equal(insertCatalog.isInternal, true);
  for (const key of ['shelves','table','room','sofa','chair','decor']) {
    db.seed('demoAssets', key, { key, storageId: `storage-${key}` });
  }
  assert.equal((await db.run(insertCatalog)).inserted, 30);
  const product = db.all('products').find((p) => p.demoKey);
  await db.ctx.db.patch(product._id, { stock: 12 });
  assert.equal((await db.run(insertCatalog)).skipped, 30);
  assert.equal(db.all('products').length, 33);
  assert.equal((await db.ctx.db.get(product._id)).stock, 12);
});
test('demo seed refuses production and missing images before inserting products', async () => {
  const db = fixture();
  await assert.rejects(db.run(insertCatalog), /images/i);
  assert.equal(db.all('products').length, 3);
  process.env.APP_ENV = 'production';
  try { await assert.rejects(db.run(insertCatalog)); }
  finally { process.env.APP_ENV = 'test'; }
  assert.equal(db.all('products').length, 3);
});
