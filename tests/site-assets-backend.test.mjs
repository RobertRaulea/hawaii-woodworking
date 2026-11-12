import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getByCategory, saveSiteAsset } from '../convex/siteAssets.ts';
import { fixture } from './helpers/convexFixture.mjs';

const base = { name: 'tava.jpeg', category: 'catalog' };

test('creating a work without galleryStorageIds stores no gallery', async () => {
  const db = fixture();
  await db.run(saveSiteAsset, { ...base, storageId: 'cover-1' });
  const [doc] = db.all('siteAssets');
  assert.equal(doc.galleryStorageIds, undefined);
});

test('creating a work stores the provided gallery in order', async () => {
  const db = fixture();
  await db.run(saveSiteAsset, {
    ...base,
    storageId: 'cover-1',
    galleryStorageIds: ['g-1', 'g-2'],
  });
  const [doc] = db.all('siteAssets');
  assert.deepEqual(doc.galleryStorageIds, ['g-1', 'g-2']);
});

test('omitting galleryStorageIds on update leaves the existing gallery untouched', async () => {
  const db = fixture();
  db.seed('siteAssets', 'work-1', {
    ...base,
    storageId: 'cover-1',
    galleryStorageIds: ['g-1', 'g-2'],
  });
  await db.run(saveSiteAsset, { ...base, title: 'Titlu nou' });
  const [doc] = db.all('siteAssets');
  assert.deepEqual(doc.galleryStorageIds, ['g-1', 'g-2']);
});

test('passing an array on update replaces the gallery, including with an empty one', async () => {
  const db = fixture();
  db.seed('siteAssets', 'work-1', {
    ...base,
    storageId: 'cover-1',
    galleryStorageIds: ['g-1', 'g-2'],
  });
  await db.run(saveSiteAsset, { ...base, galleryStorageIds: ['g-3'] });
  assert.deepEqual(db.all('siteAssets')[0].galleryStorageIds, ['g-3']);
  await db.run(saveSiteAsset, { ...base, galleryStorageIds: [] });
  assert.deepEqual(db.all('siteAssets')[0].galleryStorageIds, []);
});

test('more than 8 extra photos are rejected', async () => {
  const db = fixture();
  await assert.rejects(
    db.run(saveSiteAsset, {
      ...base,
      storageId: 'cover-1',
      galleryStorageIds: Array.from({ length: 9 }, (_, i) => `g-${i}`),
    }),
    /at most 8 extra photos/,
  );
  assert.equal(db.all('siteAssets').length, 0);
});

test('getByCategory resolves the gallery to ordered url entries and drops unresolved ones', async () => {
  const db = fixture();
  db.ctx.storage.getUrl = async (id) => (id === 'g-broken' ? null : `url-${id}`);
  db.seed('siteAssets', 'work-1', {
    ...base,
    storageId: 'cover-1',
    galleryStorageIds: ['g-1', 'g-broken', 'g-2'],
  });
  const [asset] = await db.run(getByCategory, { category: 'catalog' });
  assert.equal(asset.url, 'url-cover-1');
  assert.deepEqual(asset.gallery, [
    { storageId: 'g-1', url: 'url-g-1' },
    { storageId: 'g-2', url: 'url-g-2' },
  ]);
});

test('getByCategory returns an empty gallery for legacy works', async () => {
  const db = fixture();
  db.ctx.storage.getUrl = async (id) => `url-${id}`;
  db.seed('siteAssets', 'work-1', { ...base, storageId: 'cover-1' });
  const [asset] = await db.run(getByCategory, { category: 'catalog' });
  assert.deepEqual(asset.gallery, []);
});
