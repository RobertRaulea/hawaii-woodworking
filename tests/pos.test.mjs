import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSale, businessDate, toCents } from '../convex/lib/pos.utils.ts';

const product = {
  productId: 'magnet',
  name: 'Magnet Sibiu',
  price: 25,
  stock: 34,
};
const line = { productId: 'magnet', quantity: 2, expectedUnitPriceCents: 2500 };

test('money is calculated in bani, not floating point totals', () => {
  assert.equal(toCents(19.99), 1999);
  const sale = buildSale([line], [product], 0, '');
  assert.equal(sale.totalCents, 5000);
  assert.equal(sale.items[0].quantity, 2);
});

test('quantities must be positive integers and lines must be unique', () => {
  for (const quantity of [0, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => buildSale([{ ...line, quantity }], [product], 0, ''));
  }
  assert.throws(() => buildSale([line, line], [product], 0, ''));
  assert.throws(() => buildSale([], [product], 0, ''));
});

test('location stock and current prices are checked', () => {
  assert.throws(
    () => buildSale([line], [{ ...product, stock: 1 }], 0, ''),
    /Stoc/,
  );
  assert.throws(
    () => buildSale([line], [{ ...product, price: 30 }], 0, ''),
    /Pretul/,
  );
  assert.throws(() => buildSale([line], [], 0, ''), /exista/);
});

test('discounts require a reason and cannot exceed the order', () => {
  assert.throws(() => buildSale([line], [product], 100, '  '), /motiv/);
  for (const discount of [-1, 1.5, 5001, Infinity]) {
    assert.throws(() => buildSale([line], [product], discount, 'Reducere'));
  }
  assert.equal(
    buildSale([line], [product], 1000, 'Client fidel').totalCents,
    4000,
  );
});

test('invalid or unsafe catalog prices are rejected', () => {
  for (const price of [-1, Infinity, NaN, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => toCents(price));
  }
});

test('daily totals use the Bucharest date, including DST and midnight', () => {
  assert.equal(businessDate(Date.parse('2026-10-21T21:30:00Z')), '2026-10-22');
  assert.equal(businessDate(Date.parse('2026-12-21T21:30:00Z')), '2026-12-21');
});
