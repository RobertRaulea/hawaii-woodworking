import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildWorkImages,
  formatWorkPrice,
} from '../src/pages/Catalog/customWork.utils.ts';

test('buildWorkImages puts the cover photo first, then gallery photos in order', () => {
  assert.deepEqual(
    buildWorkImages({ url: 'cover.jpg', gallery: ['a.jpg', 'b.jpg'] }),
    ['cover.jpg', 'a.jpg', 'b.jpg'],
  );
});

test('buildWorkImages tolerates a missing or empty gallery', () => {
  assert.deepEqual(buildWorkImages({ url: 'cover.jpg' }), ['cover.jpg']);
  assert.deepEqual(buildWorkImages({ url: 'cover.jpg', gallery: [] }), [
    'cover.jpg',
  ]);
});

test('formatWorkPrice renders RON with two decimals', () => {
  assert.equal(formatWorkPrice(250), '250.00 RON');
  assert.equal(formatWorkPrice(1249.5), '1249.50 RON');
});

test('formatWorkPrice returns undefined so the page can show the on-request label', () => {
  assert.equal(formatWorkPrice(undefined), undefined);
});
