import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderPanel } from '../src/pages/Admin/PointOfSale/OrderPanel.tsx';
import { ProductPicker } from '../src/pages/Admin/PointOfSale/ProductPicker.tsx';
import {
  computeDiscountCents,
  formatMoney,
  parseMoney,
  readCheckpoint,
  searchText,
} from '../src/pages/Admin/PointOfSale/pos.utils.ts';

// PaymentDialog queries Convex for product thumbnails; the dialog stays a
// real component in production, so this test suite mocks only that hook.
mock.module(new URL('../src/hooks/useProductThumbnails.ts', import.meta.url).href, {
  namedExports: { useProductThumbnails: () => new Map() },
});
const { PaymentDialog } = await import(
  '../src/pages/Admin/PointOfSale/PaymentDialog.tsx'
);
const noop = () => {};
const product = {
  id: 'magnet',
  name: 'Magnet Sibiu',
  unitPriceCents: 2500,
  category: 'Suveniruri',
  sku: 'MAG-01',
  favorite: true,
  stock: 34,
  workshopStock: 100,
  trackStock: true,
  image: '',
};
const args = {
  requestId: 'request-ui-example-01',
  fairId: 'fair-1',
  paymentMethod: 'cash',
  discountCents: 0,
  discountReason: '',
  items: [{ productId: 'magnet', quantity: 2, expectedUnitPriceCents: 2500 }],
};
const payment = (phase = 'prepared', method = 'cash') => ({
  pending: { args: { ...args, paymentMethod: method }, phase },
  attempt: {
    items: [
      {
        productId: 'magnet',
        name: 'Magnet Sibiu',
        quantity: 2,
        unitPriceCents: 2500,
      },
    ],
    totalCents: 5000,
    status: 'prepared',
  },
  busy: false,
  online: true,
  error: '',
  recovered: false,
  confirm: noop,
  verify: noop,
  abandon: noop,
});
const storage = new Map();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  },
});

test('Romanian money inputs accept decimal commas and reject ambiguous values', () => {
  assert.equal(parseMoney('150'), 15000);
  assert.equal(parseMoney(' 19,99 '), 1999);
  for (const value of [
    '',
    '-1',
    '1.001',
    '1e3',
    '1,000.00',
    'NaN',
    'Infinity',
  ]) {
    assert.equal(parseMoney(value), null);
  }
  assert.equal(searchText('Decorațiuni'), searchText('decoratiuni'));
});

test('paid cash checkpoints survive reload with the same request and amount', () => {
  storage.set(
    'cash',
    JSON.stringify({ args, phase: 'paid', receivedCents: 15000 }),
  );
  const result = readCheckpoint('cash');
  assert.equal(result.error, '');
  assert.equal(result.pending.args.requestId, args.requestId);
  assert.equal(result.pending.receivedCents, 15000);
  assert.equal(result.pending.phase, 'paid');
});

test('paid card checkpoints survive reload without a cash amount', () => {
  storage.set(
    'card',
    JSON.stringify({ args: { ...args, paymentMethod: 'card' }, phase: 'paid' }),
  );
  assert.equal(readCheckpoint('card').pending.phase, 'paid');
  assert.equal(readCheckpoint('absent').pending, null);
});

test('corrupt or incomplete recovery data blocks payment instead of discarding it silently', () => {
  for (const value of [
    '{not-json',
    '{}',
    JSON.stringify({ args, phase: 'paid' }),
    JSON.stringify({
      args: { ...args, paymentMethod: 'unknown' },
      phase: 'prepared',
    }),
    JSON.stringify({
      args: { ...args, items: [{ ...args.items[0], quantity: -1 }] },
      phase: 'prepared',
    }),
  ]) {
    storage.set('broken', value);
    const result = readCheckpoint('broken');
    assert.equal(result.pending, null);
    assert.ok(result.error.length > 0);
    assert.equal(storage.get('broken'), value);
  }
});

test('unavailable storage fails closed', () => {
  const original = globalThis.localStorage.getItem;
  globalThis.localStorage.getItem = () => {
    throw new Error('Storage denied');
  };
  try {
    assert.ok(readCheckpoint('cash').error);
  } finally {
    globalThis.localStorage.getItem = original;
  }
});

test('product cards display fair stock and stop additions at the available quantity', () => {
  const html = renderToStaticMarkup(
    createElement(ProductPicker, {
      products: [product],
      cart: [{ product, quantity: 34 }],
      disabled: false,
      onAdd: noop,
    }),
  );
  assert.ok(html.includes('34 buc. disponibile'));
  assert.ok(!html.includes('100 buc. disponibile'));
  const button = [...html.matchAll(/<button\b[^>]*>/g)].find(([tag]) =>
    tag.includes('Adauga Magnet Sibiu'),
  );
  assert.ok(button[0].includes('disabled=""'));
  assert.ok(html.includes('grid-cols-2'));
  assert.ok(html.includes('lg:grid-cols-3'));
  assert.ok(html.includes('xl:flex-row'));
});

test('the order displays quantities, unit prices, totals, and named cart controls', () => {
  const html = renderToStaticMarkup(
    createElement(OrderPanel, {
      cart: [{ product, quantity: 2 }],
      products: [product],
      disabled: false,
      canPay: true,
      onQuantity: noop,
      onClear: noop,
      onPay: noop,
    }),
  );
  assert.ok(html.includes(formatMoney(2500)));
  assert.ok(html.includes(formatMoney(5000)));
  assert.ok(html.includes('2 bucati selectate'));
  assert.ok(html.includes('Elimina Magnet Sibiu'));
  assert.ok(html.includes('Scade cantitatea pentru Magnet Sibiu'));
  assert.ok(html.includes('Creste cantitatea pentru Magnet Sibiu'));
});

test('offline orders disable payment without disabling cart cleanup', () => {
  const html = renderToStaticMarkup(
    createElement(OrderPanel, {
      cart: [{ product, quantity: 2 }],
      products: [product],
      disabled: false,
      canPay: false,
      onQuantity: noop,
      onClear: noop,
      onPay: noop,
    }),
  );
  const buttons = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(
    ([tag]) => tag,
  );
  assert.ok(
    buttons
      .find((tag) => tag.includes('Incaseaza CASH'))
      .includes('disabled=""'),
  );
  assert.ok(
    buttons
      .find((tag) => tag.includes('Plata cu cardul'))
      .includes('disabled=""'),
  );
  assert.ok(
    !buttons
      .find((tag) => tag.includes('Goleste cosul'))
      .includes('disabled=""'),
  );
});

test('card confirmation explicitly requires approval on a separate terminal', () => {
  const html = renderToStaticMarkup(
    createElement(PaymentDialog, { payment: payment('prepared', 'card') }),
  );
  assert.ok(html.includes('Aplicatia nu debiteaza cardul.'));
  assert.ok(html.includes('Terminal aprobat'));
  assert.ok(html.includes('Plata neefectuata / refuzata'));
});

test('paid but unconfirmed orders offer only same-operation recovery, not another payment or cancellation', () => {
  const html = renderToStaticMarkup(
    createElement(PaymentDialog, { payment: payment('paid', 'card') }),
  );
  assert.ok(html.includes('Nu incasa din nou'));
  assert.ok(html.includes('Verifica / reia aceeasi salvare'));
  assert.ok(!html.includes('Terminal aprobat'));
  assert.ok(!html.includes('Plata neefectuata / refuzata'));
  assert.ok(html.includes(args.requestId));
});

test('recovered unpaid attempts instruct the seller to verify any earlier external payment first', () => {
  const html = renderToStaticMarkup(
    createElement(PaymentDialog, {
      payment: { ...payment('prepared', 'card'), recovered: true },
    }),
  );
  assert.ok(html.includes('Operatiune recuperata'));
  assert.ok(html.includes('Nu solicita automat o noua plata.'));
});

test('computeDiscountCents supports fixed amounts, percentages, and negotiated totals', () => {
  // Fixed amount in lei, clamped to the subtotal.
  assert.equal(computeDiscountCents('fixed', '20', 10000), 2000);
  assert.equal(computeDiscountCents('fixed', '20,50', 10000), 2050);
  assert.equal(computeDiscountCents('fixed', '150', 10000), 10000);
  assert.equal(computeDiscountCents('fixed', 'abc', 10000), 0);
  assert.equal(computeDiscountCents('fixed', '', 10000), 0);

  // Percentage discounts, comma decimal included.
  assert.equal(computeDiscountCents('percent', '10', 10000), 1000);
  assert.equal(computeDiscountCents('percent', '12,5', 9999), 1250);
  assert.equal(computeDiscountCents('percent', '100', 10000), 10000);
  assert.equal(computeDiscountCents('percent', '0', 10000), 0);
  assert.equal(computeDiscountCents('percent', '150', 10000), 0);

  // Negotiated final totals convert to the implied discount.
  assert.equal(computeDiscountCents('final', '80', 10000), 2000);
  assert.equal(computeDiscountCents('final', '100', 10000), 0);
  assert.equal(computeDiscountCents('final', '150', 10000), 0);
});
