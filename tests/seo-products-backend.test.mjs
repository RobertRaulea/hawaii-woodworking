import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as products from '../convex/products.ts';
import { fixture } from './helpers/convexFixture.mjs';

test('createProduct persists trimmed SEO overrides', async () => {
  const db = fixture();
  const id = await db.run(products.createProduct, {
    name: 'Tablou lemn',
    price: 90,
    seoTitle: '  Tablou din lemn sculptat  ',
    seoDescription: '  Descriere pentru motoarele de căutare. ',
  });
  const doc = db.all('products').find((p) => p._id === id);
  assert.equal(doc.seoTitle, 'Tablou din lemn sculptat');
  assert.equal(doc.seoDescription, 'Descriere pentru motoarele de căutare.');
});

test('createProduct rejects SEO values beyond editorial limits', async () => {
  const db = fixture();
  await assert.rejects(
    db.run(products.createProduct, { name: 'X', price: 1, seoTitle: 't'.repeat(101) }),
    /100 de caractere/,
  );
  await assert.rejects(
    db.run(products.createProduct, { name: 'X', price: 1, seoDescription: 'd'.repeat(321) }),
    /320 de caractere/,
  );
});

test('updateProduct sets, preserves and clears SEO overrides', async () => {
  const db = fixture();
  await db.ctx.db.patch('magnet', { seoTitle: 'Titlu vechi', seoDescription: 'Desc veche' });

  await db.run(products.updateProduct, { id: 'magnet', price: 30 });
  let doc = db.all('products').find((p) => p._id === 'magnet');
  assert.equal(doc.seoTitle, 'Titlu vechi');
  assert.equal(doc.seoDescription, 'Desc veche');

  await db.run(products.updateProduct, { id: 'magnet', seoTitle: 'Titlu nou' });
  doc = db.all('products').find((p) => p._id === 'magnet');
  assert.equal(doc.seoTitle, 'Titlu nou');
  assert.equal(doc.seoDescription, 'Desc veche');

  await db.run(products.updateProduct, { id: 'magnet', seoTitle: '', seoDescription: '' });
  doc = db.all('products').find((p) => p._id === 'magnet');
  assert.equal(doc.seoTitle, undefined);
  assert.equal(doc.seoDescription, undefined);
});

test('updateProduct validates SEO lengths and keeps stock protection', async () => {
  const db = fixture();
  await assert.rejects(
    db.run(products.updateProduct, { id: 'magnet', seoTitle: 'x'.repeat(101) }),
    /100 de caractere/,
  );
  await assert.rejects(
    db.run(products.updateProduct, { id: 'magnet', seoDescription: 'x'.repeat(321) }),
    /320 de caractere/,
  );
  await assert.rejects(db.run(products.updateProduct, { id: 'magnet', stock: 3 }));
  await assert.rejects(
    db.run(products.createProduct, { name: 'Y', price: 2, stock: 5, seoTitle: 'ok' }),
  );
});

test('SEO fields require admin role', async () => {
  const db = fixture();
  db.identity({ subject: 'seller-1', role: 'seller' });
  await assert.rejects(
    db.run(products.updateProduct, { id: 'magnet', seoTitle: 'Nou' }),
  );
  db.identity({ subject: 'anon' });
  await assert.rejects(
    db.run(products.createProduct, { name: 'Z', price: 1, seoTitle: 'Nou' }),
  );
});
