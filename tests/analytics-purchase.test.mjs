import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, mock, test } from 'node:test';
import { getFunctionName } from 'convex/server';

import { purchaseSnapshot } from '../convex/lib/analytics.utils.ts';
import { purchaseEventUuid, purchasePayload, sendPurchase } from '../convex/lib/posthog.ts';
import { markOrderPaid, reconcileStock, getCheckoutConfirmation, getAll, getById } from '../convex/orders.ts';
import { capturePurchaseAnalytics } from '../convex/postPayment.ts';
import { fixture } from './helpers/convexFixture.mjs';

const ENVIRONMENT = {
  APP_ENV: 'test',
  CONVEX_CLOUD_URL: 'https://exuberant-fox-228.convex.cloud',
  CLERK_JWT_ISSUER_DOMAIN: 'https://choice-fowl-16.clerk.accounts.dev',
  SITE_URL: 'http://127.0.0.1:5173',
  POSTHOG_ENABLED: 'true',
  POSTHOG_KEY: 'phc_fixture_token_not_a_real_project',
  POSTHOG_HOST: 'https://eu.i.posthog.com',
  POSTHOG_ENV: 'test',
};
const original = Object.fromEntries(Object.keys(ENVIRONMENT).map((key) => [key, process.env[key]]));
beforeEach(() => Object.assign(process.env, ENVIRONMENT));
afterEach(() => mock.restoreAll());
after(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
const context = {
  consent: true, distinctId: 'browser-fixture-id', sessionId: 'session-fixture-id', environment: 'test',
};
const configuration = {
  projectToken: ENVIRONMENT.POSTHOG_KEY, host: ENVIRONMENT.POSTHOG_HOST, environment: 'test',
};
const seedOrder = (patch = {}) => {
  const db = fixture();
  db.seed('orders', 'private-order-key', {
    customerId: 'private-customer-id', stripeSessionId: 'private-stripe-session',
    analytics: context, total: 80.01, status: 'pending', inventoryStatus: 'pending',
    items: [
      { productId: 'magnet', name: 'Private product name', price: 25.005, quantity: 2 },
      { productId: 'brad', name: 'Another product', price: 30, quantity: 1 },
    ],
    createdAt: 1, ...patch,
  });
  return db;
};
const paid = { stripeSessionId: 'private-stripe-session', stripePaymentIntentId: 'private-payment-intent' };
const purchaseJobs = (db) => db.jobs().filter((job) => getFunctionName(job.fn) === 'postPayment:capturePurchaseAnalytics');
const snapshot = {
  context, orderKey: 'private-order-key', amountCents: 8001, quantity: 3,
  confirmedAt: 1_800_000_000_000, inventoryStatus: 'applied', cancelled: false,
};

test('only the first confirmed-payment transaction schedules a frozen purchase snapshot', async () => {
  const db = seedOrder();
  await Promise.all([db.run(markOrderPaid, paid), db.run(markOrderPaid, paid), db.run(markOrderPaid, paid)]);
  assert.equal(purchaseJobs(db).length, 1);
  const frozen = purchaseJobs(db)[0].args.snapshot;
  assert.equal(frozen.amountCents, 8001);
  assert.equal(frozen.quantity, 3);
  assert.equal(frozen.confirmedAt, db.all('orders')[0].paymentConfirmedAt);
  assert.equal(frozen.inventoryStatus, 'applied');
  assert.deepEqual(frozen.context, context);
  assert.equal(db.all('stockMovements').length, 2);
  assert.equal(db.jobs().filter((job) => getFunctionName(job.fn) === 'postPayment:handlePostPayment').length, 1);
  await db.ctx.db.patch('private-order-key', { total: 9000 });
  assert.equal(purchaseJobs(db)[0].args.snapshot.amountCents, 8001);
  assert.doesNotMatch(JSON.stringify(frozen), /private-customer|private-stripe|private-payment|Private product/);
});

test('needs-review and paid-after-cancellation are confirmed money, not fulfillment success', async () => {
  for (const cancelled of [false, true]) {
    const db = seedOrder(cancelled ? { status: 'cancelled' } : {});
    await db.ctx.db.patch('brad', { stock: 0 });
    await db.run(markOrderPaid, paid);
    assert.equal(purchaseJobs(db).length, 1);
    const frozen = purchaseJobs(db)[0].args.snapshot;
    assert.equal(frozen.inventoryStatus, 'needs_review');
    assert.equal(frozen.cancelled, cancelled);
    assert.equal(db.jobs().filter((job) => getFunctionName(job.fn) === 'postPayment:handlePostPayment').length, 0);
    if (!cancelled) {
      await db.ctx.db.patch('brad', { stock: 1 });
      await db.run(reconcileStock, { orderId: 'private-order-key' });
      assert.equal(purchaseJobs(db).length, 1);
    }
  }
});

test('absent consent, mismatched project environment, legacy deliveries and thank-you visits never mint purchases', async () => {
  for (const analytics of [undefined, { ...context, consent: false }, { ...context, environment: 'production' }, { ...context, distinctId: 'private@example.invalid' }]) {
    const db = seedOrder({ analytics });
    await db.run(markOrderPaid, paid);
    assert.equal(purchaseJobs(db).length, 0);
    assert.ok(db.all('orders')[0].paymentConfirmedAt);
  }
  const legacy = seedOrder({ status: 'paid', inventoryStatus: undefined });
  await legacy.run(markOrderPaid, paid);
  assert.equal(purchaseJobs(legacy).length, 0);
  const pending = seedOrder({ stripeSessionId: `cs_test_${'A'.repeat(32)}` });
  await pending.run(getCheckoutConfirmation, { sessionId: `cs_test_${'A'.repeat(32)}` });
  assert.equal(purchaseJobs(pending).length, 0);
  process.env.POSTHOG_ENV = 'production';
  const wrongConfig = seedOrder();
  await wrongConfig.run(markOrderPaid, paid);
  assert.equal(purchaseJobs(wrongConfig).length, 0);
});

test('analytics scheduling failure cannot roll back confirmed payment or interfere with post-payment automation', async () => {
  const db = seedOrder();
  const schedule = db.ctx.scheduler.runAfter;
  db.ctx.scheduler.runAfter = async (delay, reference, args) => {
    if (getFunctionName(reference) === 'postPayment:capturePurchaseAnalytics') throw new Error('fixture-only analytics scheduler failure');
    return schedule(delay, reference, args);
  };
  mock.method(console, 'error', () => {});
  await db.run(markOrderPaid, paid);
  assert.equal(db.all('orders')[0].status, 'paid');
  assert.equal(db.all('stockMovements').length, 2);
  assert.equal(db.jobs().length, 1);
});

test('optional telemetry is internal-only and drops corrupt snapshot inputs', () => {
  assert.equal(capturePurchaseAnalytics.isInternal, true);
  assert.equal(capturePurchaseAnalytics.isPublic, undefined);
  for (const patch of [
    { paymentConfirmedAt: undefined }, { total: NaN }, { total: -10 },
    { items: [{ quantity: -1 }] }, { items: [] }, { inventoryStatus: 'pending' },
  ]) {
    assert.equal(purchaseSnapshot({
      _id: 'private-order', analytics: context, status: 'paid', total: 10,
      paymentConfirmedAt: 1, inventoryStatus: 'applied', items: [{ quantity: 1 }], ...patch,
    }), null);
  }
});

test('server payload uses authoritative cents, stable UUID/time and browser attribution, never customer or order keys', () => {
  const payload = purchasePayload(snapshot, configuration);
  assert.deepEqual(payload, {
    api_key: configuration.projectToken,
    uuid: purchaseEventUuid('private-order-key'),
    event: 'purchase_completed',
    distinct_id: context.distinctId,
    timestamp: '2027-01-15T08:00:00.000Z',
    properties: {
      $insert_id: purchaseEventUuid('private-order-key'),
      $session_id: context.sessionId,
      $geoip_disable: true,
      $process_person_profile: false,
      environment: 'test',
      source: 'stripe_webhook',
      currency: 'RON',
      amount_cents: 8001,
      value: 80.01,
      item_count: 3,
      inventory_status: 'applied',
      order_cancelled_at_confirmation: false,
    },
  });
  assert.match(payload.uuid, /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.equal(purchaseEventUuid('private-order-key'), purchaseEventUuid('private-order-key'));
  assert.notEqual(purchaseEventUuid('different-order-key'), payload.uuid);
  assert.doesNotMatch(JSON.stringify(payload), /private-order|private-customer|private-stripe|private-payment/);
  assert.equal(purchasePayload({ ...snapshot, context: { ...context, consent: false } }, configuration), null);
  assert.equal(purchasePayload({ ...snapshot, confirmedAt: 8_640_000_000_000_001 }, configuration), null);
});

test('transport bounds time and retries only transient outcomes without leaking provider error bodies', async () => {
  const calls = [];
  const request = async (url, init) => {
    calls.push({ url, init });
    return new Response('', { status: 200 });
  };
  assert.equal(await sendPurchase(snapshot, request), 'accepted');
  assert.equal(calls[0].url, 'https://eu.i.posthog.com/i/v0/e/');
  assert.equal(calls[0].init.method, 'POST');
  assert.ok(calls[0].init.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(calls[0].init.body), purchasePayload(snapshot, configuration));
  for (const status of [429, 500, 503]) {
    assert.equal(await sendPurchase(snapshot, async () => new Response('', { status })), 'retry');
  }
  for (const status of [400, 401, 403]) {
    assert.equal(await sendPurchase(snapshot, async () => new Response('', { status })), 'discarded');
  }
  assert.equal(await sendPurchase(snapshot, async () => { throw new Error('sensitive transport error'); }), 'retry');
  process.env.POSTHOG_ENABLED = 'false';
  assert.equal(await sendPurchase(snapshot, async () => { throw new Error('must not request'); }), 'disabled');
  process.env.POSTHOG_ENABLED = 'true';
  process.env.POSTHOG_KEY = '';
  assert.equal(await sendPurchase(snapshot, async () => { throw new Error('must not request'); }), 'disabled');
});

test('fulfillment-only staff never receive persisted browser attribution', async () => {
  const db = seedOrder({ status: 'paid', paymentConfirmedAt: 1, inventoryStatus: 'applied' });
  db.identity({ subject: 'atelier-fixture', role: 'atelier' });
  const [listOrder] = await db.run(getAll);
  const detail = await db.run(getById, { orderId: 'private-order-key' });
  assert.equal(listOrder.analytics, undefined);
  assert.equal(detail.analytics, undefined);
});

test('retry actions preserve exact snapshot and stop after three attempts without affecting invoices or payment state', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  mock.method(console, 'error', () => {});
  const scheduled = [];
  const ctx = { scheduler: { runAfter: async (...args) => { scheduled.push(args); } } };
  assert.equal(await capturePurchaseAnalytics._handler(ctx, { snapshot }), 'retry_scheduled');
  assert.equal(await capturePurchaseAnalytics._handler(ctx, scheduled[0][2]), 'retry_scheduled');
  assert.equal(await capturePurchaseAnalytics._handler(ctx, scheduled[1][2]), 'retry');
  assert.equal(scheduled.length, 2);
  assert.deepEqual(scheduled.map(([delay]) => delay), [3000, 15000]);
  for (const [, fn, args] of scheduled) {
    assert.equal(getFunctionName(fn), 'postPayment:capturePurchaseAnalytics');
    assert.deepEqual(args.snapshot, snapshot);
  }
  const before = globalThis.fetch.mock.callCount();
  assert.equal(await capturePurchaseAnalytics._handler(ctx, { snapshot, attempt: 3 }), 'discarded');
  assert.equal(await capturePurchaseAnalytics._handler(ctx, { snapshot: { ...snapshot, context: { ...context, environment: 'production' } } }), 'discarded');
  assert.equal(globalThis.fetch.mock.callCount(), before);
});
