import assert from 'node:assert/strict';
import { after, beforeEach, mock, test } from 'node:test';
import { getFunctionName } from 'convex/server';
import { fixture } from './helpers/convexFixture.mjs';
import { upsertFromShipping } from '../convex/customers.ts';
import { createPendingOrder } from '../convex/orders.ts';
import { createOblioInvoice } from '../convex/lib/oblio.ts';

let stripeCalls = [];
let storedStripeId = null;
let emailStripeMatch = null;
let emails = [];
class StripeMock {
  customers = {
    retrieve: async (id) => { stripeCalls.push(['retrieve', id]); return { id, metadata: { convexCustomerId: 'customer-1' } }; },
    list: async (args) => { stripeCalls.push(['list', args]); return { data: emailStripeMatch ? [emailStripeMatch] : [] }; },
    create: async (args) => { stripeCalls.push(['create', args]); return { id: 'cus_created' }; },
    update: async (id, args) => { stripeCalls.push(['update', id, args]); return { id }; },
  };
  checkout = { sessions: {
    create: async (args) => {
      stripeCalls.push(['session', args]);
      return { id: `cs_test_${'A'.repeat(32)}`, url: 'https://checkout.stripe.test/session' };
    },
  } };
}
mock.module('stripe', { defaultExport: StripeMock });
mock.module('resend', { namedExports: {
  Resend: class {
    emails = { send: async (args) => { emails.push(args); return { data: { id: 'mock' } }; } };
  },
} });
const { createCheckoutSession } = await import('../convex/checkout.ts');
const { handlePostPayment } = await import('../convex/postPayment.ts');

const keys = ['APP_ENV', 'CONVEX_CLOUD_URL', 'CLERK_JWT_ISSUER_DOMAIN', 'SITE_URL', 'CHECKOUT_ENABLED', 'STRIPE_SECRET_KEY', 'OBLIO_API_EMAIL', 'OBLIO_API_SECRET', 'OBLIO_API_CIF', 'RESEND_API_KEY', 'ADMIN_EMAIL'];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
const setEnvironment = (name) => {
  Object.assign(process.env, {
    APP_ENV: name,
    CONVEX_CLOUD_URL: name === 'test' ? 'https://exuberant-fox-228.convex.cloud' : 'https://upbeat-lyrebird-218.convex.cloud',
    CLERK_JWT_ISSUER_DOMAIN: name === 'test' ? 'https://choice-fowl-16.clerk.accounts.dev' : 'https://clerk.hawaiiproducts.ro',
    SITE_URL: name === 'test' ? 'http://127.0.0.1:5173' : 'https://www.hawaiiproducts.ro',
    CHECKOUT_ENABLED: 'true',
    STRIPE_SECRET_KEY: name === 'test' ? 'sk_test_fixture' : 'sk_live_fixture',
    OBLIO_API_EMAIL: 'oauth@example.test',
    OBLIO_API_SECRET: 'fixture-secret',
    OBLIO_API_CIF: 'fixture-cif',
    RESEND_API_KEY: 'fixture-resend',
    ADMIN_EMAIL: 'admin@example.test',
  });
};
beforeEach(() => {
  setEnvironment('test');
  stripeCalls = [];
  emails = [];
  storedStripeId = null;
  emailStripeMatch = null;
  globalThis.fetch = async () => { throw new Error('Unexpected external request'); };
});
after(() => {
  globalThis.fetch = originalFetch;
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

const address = { street: 'Shipping 1', city: 'Sibiu', county: 'Sibiu', postalCode: '550000', country: 'România' };
const customer = {
  email: 'buyer@example.test', firstName: 'Buyer', lastName: 'Example', phone: '  +40 (712) 345-678  ',
  shippingAddress: address, billingAddress: { ...address, street: 'Billing 2', country: 'Germany' }, newsletter: false,
};
const args = (overrides = {}) => ({
  origin: process.env.SITE_URL, items: [{ productId: 'product', quantity: 1 }],
  customer: { ...customer, ...overrides },
});
const checkoutContext = () => {
  const mutations = [];
  return {
    mutations,
    ctx: {
      auth: { getUserIdentity: async () => null },
      runQuery: async (fn) => {
        const name = getFunctionName(fn);
        if (name === 'shipping:getSettings') {
          return { flatRateCents: 2500, codEnabled: true, codFeeCents: 0 };
        }
        return [{ productId: 'product', name: 'Product', price: 25, quantity: 1 }];
      },
      runMutation: async (fn, value) => {
        const name = getFunctionName(fn);
        mutations.push([name, value]);
        if (name === 'customers:upsertCustomer') return 'customer-1';
        if (name === 'customers:getStripeCustomerId') return storedStripeId;
        return null;
      },
    },
  };
};

test('production tariff guard prevents all business and Stripe side effects', async () => {
  setEnvironment('production');
  const noEffects = new Proxy({}, { get: () => { throw new Error('Unexpected business side effect'); } });
  await assert.rejects(createCheckoutSession._handler(noEffects, args()), {
    data: 'Costul transportului nu este încă stabilit. Plata este indisponibilă până la configurarea tarifului.',
  });
  assert.deepEqual(stripeCalls, []);
});

test('unsupported shipping country and invalid phone reject before any writes or Stripe requests', async () => {
  const noEffects = new Proxy({}, { get: () => { throw new Error('Unexpected business side effect'); } });
  for (const country of ['Germany', 'France', '', 'România/DE', 'Rómània']) {
    await assert.rejects(createCheckoutSession._handler(noEffects, args({ shippingAddress: { ...address, country } })), /doar în România/);
  }
  for (const phone of ['', 'abc1234567', '123', '+123456789012345678901', '+40<script>']) {
    await assert.rejects(createCheckoutSession._handler(noEffects, args({ phone })), /telefon/);
  }
  assert.deepEqual(stripeCalls, []);
});

test('TEST checkout accepts normalized Romania, persists phone and immutable billing/shipping snapshots', async () => {
  for (const country of ['România', ' rOmAnIa ', 'RO', 'romÂnia']) {
    const { ctx, mutations } = checkoutContext();
    await createCheckoutSession._handler(ctx, args({ shippingAddress: { ...address, country } }));
    const profile = mutations.find(([name]) => name === 'customers:upsertCustomer')[1];
    assert.equal(profile.phone, '+40 (712) 345-678');
    const order = mutations.find(([name]) => name === 'orders:createPendingOrder')[1];
    assert.equal(order.shipping.phone, profile.phone);
    assert.equal(order.shipping.address.country, country);
    assert.equal(order.billing.address.street, 'Billing 2');
    assert.equal(order.billing.address.country, 'Germany');
    assert.equal(order.billing.phone, profile.phone);
    assert.equal(order.total, 50);
    assert.equal(order.paymentMethod, 'card');
    assert.equal(order.shippingCost, 25);
  }
  assert.equal(stripeCalls.find(([name]) => name === 'create')[1].phone, '+40 (712) 345-678');
  const session = stripeCalls.find(([name]) => name === 'session')[1];
  assert.equal(session.success_url, 'http://127.0.0.1:5173/thank-you?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(session.line_items.length, 2);
  assert.equal(session.line_items[1].price_data.unit_amount, 2500);
  assert.equal(session.line_items[1].price_data.product_data.name, 'Transport');
  assert.equal(session.shipping_options, undefined);
});

test('Stripe phone updates use a trusted stored customer, never an unrelated email-only match', async () => {
  storedStripeId = 'cus_stored';
  await createCheckoutSession._handler(checkoutContext().ctx, args());
  assert.deepEqual(stripeCalls.find(([name]) => name === 'update'), ['update', 'cus_stored', { phone: '+40 (712) 345-678' }]);
  stripeCalls = [];
  storedStripeId = null;
  emailStripeMatch = { id: 'cus_unrelated', metadata: {} };
  await createCheckoutSession._handler(checkoutContext().ctx, args());
  assert.equal(stripeCalls.some(([name]) => name === 'update'), false);
});

test('public profile upsert keeps optional legacy phone and persists trimmed phone without clearing omitted phone', async () => {
  const db = fixture();
  db.identity(null);
  const { phone, ...legacyCustomer } = customer;
  const id = await db.run(upsertFromShipping, legacyCustomer);
  assert.equal((await db.ctx.db.get(id)).phone, undefined);
  await db.run(upsertFromShipping, customer);
  assert.equal((await db.ctx.db.get(id)).phone, phone.trim());
  await db.run(upsertFromShipping, legacyCustomer);
  assert.equal((await db.ctx.db.get(id)).phone, phone.trim());
  const orderId = await db.run(createPendingOrder, {
    customerId: id, items: [], total: 0, stripeSessionId: 'legacy',
    shipping: { firstName: 'Name', lastName: 'Surname', phone: phone.trim(), address },
    billing: { firstName: 'Name', lastName: 'Surname', phone: phone.trim(), address: customer.billingAddress },
  });
  const saved = await db.ctx.db.get(orderId);
  assert.equal(saved.shipping.phone, phone.trim());
  assert.equal(saved.billing.address.street, 'Billing 2');
});

const order = () => ({
  _id: 'order-1', total: 25, inventoryStatus: 'applied', paymentConfirmedAt: 1,
  items: [{ productId: 'product', name: '<script>product & "name"</script>', price: 25, quantity: 1 }],
  customer: { ...customer, firstName: '<script>mutable</script>', shippingAddress: { ...address, street: 'Mutable shipping' } },
  shipping: { firstName: '<img src=x>', lastName: 'Snapshot & name', phone: '+40712345678', address: { ...address, street: '<b>Snapshot shipping</b>' } },
  billing: { firstName: 'Invoice', lastName: 'Snapshot', phone: '+49123456789', address: { ...customer.billingAddress, street: 'Invoice snapshot' } },
});
const invoiceResponse = (status = 200) => ({ status, data: { seriesName: 'HW', number: '42', link: 'https://www.oblio.eu/invoice/42' } });
const mockOblio = (result = invoiceResponse(), token = { access_token: 'fixture-access-token', token_type: 'Bearer' }) => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push([url, init]);
    return new Response(JSON.stringify(calls.length % 2 === 1 ? token : result), { status: 200 });
  };
  return calls;
};

test('Oblio uses form OAuth then Bearer invoice, numeric 200, billing snapshot, real phone/country and non-VAT products', async () => {
  const calls = mockOblio();
  assert.deepEqual(await createOblioInvoice(order(), 'email+client@example.test', 'secret&value', 'cif'), {
    seriesName: 'HW', number: '42', link: 'https://www.oblio.eu/invoice/42',
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'https://www.oblio.eu/api/authorize/token');
  assert.equal(calls[0][1].method, 'POST');
  assert.deepEqual(calls[0][1].headers, { 'Content-Type': 'application/x-www-form-urlencoded' });
  assert.deepEqual(Object.fromEntries(new URLSearchParams(calls[0][1].body)), {
    grant_type: 'client_credentials', client_id: 'email+client@example.test', client_secret: 'secret&value',
  });
  assert.equal(calls[1][0], 'https://www.oblio.eu/api/docs/invoice');
  assert.equal(calls[1][1].headers.Authorization, 'Bearer fixture-access-token');
  const payload = JSON.parse(calls[1][1].body);
  assert.equal(payload.idempotencyKey, 'order-1');
  assert.equal(payload.client.name, 'Invoice Snapshot');
  assert.equal(payload.client.address, 'Invoice snapshot');
  assert.equal(payload.client.country, 'Germany');
  assert.equal(payload.client.phone, '+49123456789');
  assert.equal(payload.client.vatPayer, 0);
  assert.equal(payload.products[0].vatIncluded, 1);
  assert.equal('vatName' in payload.products[0], false);
  assert.equal('vatPercentage' in payload.products[0], false);
  await createOblioInvoice(order(), 'email', 'secret', 'cif');
  assert.equal(calls.length, 4, 'each invocation obtains a fresh token');
});

test('checkout carries only consented same-environment browser attribution and never exposes it to Stripe metadata', async () => {
  const analytics = {
    consent: true, distinctId: 'browser-fixture-id', sessionId: 'session-fixture-id', environment: 'test',
  };
  const valid = checkoutContext();
  await createCheckoutSession._handler(valid.ctx, { ...args(), analytics });
  const stored = valid.mutations.find(([name]) => name === 'orders:createPendingOrder')[1];
  assert.deepEqual(stored.analytics, analytics);
  const stripeSession = stripeCalls.find(([name]) => name === 'session')[1];
  assert.equal(JSON.stringify(stripeSession).includes(analytics.distinctId), false);
  assert.equal(JSON.stringify(stripeSession).includes(analytics.sessionId), false);
  for (const invalid of [
    undefined, { ...analytics, consent: false }, { ...analytics, environment: 'production' },
    { ...analytics, distinctId: 'private@example.invalid' },
  ]) {
    const attempt = checkoutContext();
    await createCheckoutSession._handler(attempt.ctx, { ...args(), analytics: invalid });
    const pending = attempt.mutations.find(([name]) => name === 'orders:createPendingOrder')[1];
    assert.equal('analytics' in pending, false);
  }
});

test('legacy fiscal fallback uses billing, never mutable shipping', async () => {
  const calls = mockOblio();
  const legacy = order();
  delete legacy.billing;
  delete legacy.shipping;
  await createOblioInvoice(legacy, 'email', 'secret', 'cif');
  const payload = JSON.parse(calls[1][1].body);
  assert.equal(payload.client.address, 'Billing 2');
  assert.equal(payload.client.country, 'Germany');
  assert.equal(payload.client.phone, customer.phone);
});

test('Oblio rejects malformed auth and invoice responses without leaking bodies or retrying', async () => {
  for (const token of [{ access_token: '' }, { access_token: 'secret', token_type: 'Basic' }, { access_token: 'secret\nbad', token_type: 'Bearer' }]) {
    const calls = mockOblio(invoiceResponse(), token);
    await assert.rejects(createOblioInvoice(order(), 'email', 'secret', 'cif'), /^Error: Invalid Oblio authorization response$/);
    assert.equal(calls.length, 1);
  }
  for (const result of [invoiceResponse(400), invoiceResponse('success'), { status: 200, data: {} }, { status: 200, data: { ...invoiceResponse().data, link: 'javascript:alert(1)' } }]) {
    const calls = mockOblio(result);
    await assert.rejects(createOblioInvoice(order(), 'email', 'secret', 'cif'), /Invalid Oblio invoice/);
    assert.equal(calls.length, 2);
  }
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response('private customer and token', { status: 400 });
  };
  await assert.rejects(createOblioInvoice(order(), 'email', 'secret', 'cif'), /^Error: Oblio request rejected$/);
  assert.equal(calls, 1);
});

test('post-payment TEST without Resend credentials returns without touching the context', async () => {
  delete process.env.RESEND_API_KEY;
  const blocked = new Proxy({}, { get: () => { throw new Error('Unexpected automation'); } });
  await handlePostPayment._handler(blocked, { orderId: 'order-1' });
});

test('post-payment TEST sends admin then customer emails with a simulated invoice and no external calls', async () => {
  const calls = [];
  globalThis.fetch = async (...args) => { calls.push(args); throw new Error('Unexpected external request'); };
  const mutations = [];
  await handlePostPayment._handler({
    runMutation: async (fn, value) => {
      mutations.push([getFunctionName(fn), value]);
      return order();
    },
  }, { orderId: 'order-1' });
  assert.deepEqual(mutations.map(([name]) => name), ['orders:getOrderWithCustomer']);
  assert.equal(calls.length, 0);
  assert.equal(emails.length, 2);
  assert.equal(emails[0].to, 'admin@example.test');
  assert.equal(emails[1].to, 'buyer@example.test');
  for (const email of emails) assert.ok(email.subject.startsWith('[TEST] '));
  const customerHtml = emails[1].html;
  assert.ok(customerHtml.includes('TEST-ORDER-1'));
  assert.ok(customerHtml.includes('Mod TEST'));
  assert.equal(/<a [^>]*href="[^"]*oblio/i.test(customerHtml), false);
});

test('post-payment TEST COD sends emails without a simulated invoice block', async () => {
  await handlePostPayment._handler({
    runMutation: async () => ({ ...order(), paymentMethod: 'cod' }),
  }, { orderId: 'order-1' });
  assert.equal(emails.length, 2);
  const customerHtml = emails[1].html;
  assert.equal(customerHtml.includes('Mod TEST'), false);
  assert.equal(customerHtml.includes('TEST-ORDER-1'), false);
  assert.ok(customerHtml.includes('Plată ramburs la livrare'));
});

test('production post-payment reuses existing invoices and escapes snapshot text', async () => {
  setEnvironment('production');
  const existing = { ...order(), invoiceId: 'HW-42', invoicePdfUrl: 'https://www.oblio.eu/invoice/42?a=1&b="quoted"' };
  await handlePostPayment._handler({
    runMutation: async (fn) => {
      assert.equal(getFunctionName(fn), 'orders:getOrderWithCustomer');
      return existing;
    },
  }, { orderId: 'order-1' });
  assert.equal(emails.length, 2);
  for (const email of emails) {
    assert.ok(email.html.includes('&lt;b&gt;Snapshot shipping&lt;/b&gt;'));
    assert.ok(email.html.includes('&lt;script&gt;product &amp; &quot;name&quot;&lt;/script&gt;'));
    assert.ok(email.html.includes('b=&quot;quoted&quot;'));
    assert.equal(email.html.includes('<script>'), false);
    assert.equal(email.html.includes('Mutable shipping'), false);
  }
  assert.ok(emails[0].html.includes('+40712345678'));
  assert.ok(emails[0].html.includes('&lt;img src=x&gt;'));
  const customerHtml = emails[1].html;
  assert.ok(customerHtml.includes('Descarcă factura (PDF)'));
  assert.ok(customerHtml.includes('Comandă #ORDER-1'));
  assert.ok(customerHtml.includes('HW-42'));
  assert.equal(customerHtml.includes('AWB'), false);
  assert.ok(customerHtml.includes('hawaiisibiu@gmail.com'));
  assert.equal(customerHtml.includes('contact@hawaii-woodworking.ro'), false);
  assert.equal(customerHtml.includes('linear-gradient'), false);
  assert.equal(customerHtml.includes('🌺'), false);
});

test('production COD post-payment never calls Oblio and shows no invoice block', async () => {
  setEnvironment('production');
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('Unexpected external request'); };
  await handlePostPayment._handler({
    runMutation: async (fn) => {
      assert.equal(getFunctionName(fn), 'orders:getOrderWithCustomer');
      return { ...order(), paymentMethod: 'cod' };
    },
  }, { orderId: 'order-1' });
  assert.equal(calls, 0);
  assert.equal(emails.length, 2);
  const customerHtml = emails[1].html;
  assert.equal(customerHtml.includes('Descarcă factura'), false);
  assert.equal(customerHtml.includes('Factura îți va fi trimisă separat'), false);
  assert.equal(customerHtml.includes('factură simulată'), false);
  assert.ok(customerHtml.includes('Plată ramburs la livrare'));
  assert.ok(emails[0].html.includes('RAMBURS'));
});

test('ambiguous invoice failures are sanitized, admin-visible and never blindly retried', async () => {
  setEnvironment('production');
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('secret-token customer-private'); };
  const errors = [];
  const log = mock.method(console, 'error', (...args) => { errors.push(args.join(' ')); });
  try {
    await handlePostPayment._handler({ runMutation: async () => order() }, { orderId: 'order-1' });
    assert.equal(calls, 1);
    assert.ok(emails[0].html.includes('Verifică manual în Oblio'));
    assert.equal(emails[1].html.includes('Verifică manual în Oblio'), false);
    assert.ok(emails[1].html.includes('Factura îți va fi trimisă separat'));
    assert.equal(emails[1].html.includes('Descarcă factura'), false);
    assert.equal(errors.join().includes('secret-token'), false);
    assert.equal(errors.join().includes('customer-private'), false);
  } finally {
    log.mock.restore();
  }
});
