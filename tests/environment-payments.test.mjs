import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import Stripe from 'stripe';
import { createCheckoutSession } from '../convex/checkout.ts';
import { verifyWebhookSignature } from '../convex/stripeVerify.ts';
import { handlePostPayment } from '../convex/postPayment.ts';

const values = {
  APP_ENV: 'test',
  CONVEX_CLOUD_URL: 'https://exuberant-fox-228.convex.cloud',
  CLERK_JWT_ISSUER_DOMAIN: 'https://choice-fowl-16.clerk.accounts.dev',
  SITE_URL: 'https://hawaii-woodworking-test.vercel.app',
  CHECKOUT_ENABLED: 'true',
  STRIPE_SECRET_KEY: 'sk_test_fixture',
  STRIPE_WEBHOOK_SECRET: 'whsec_fixture',
};
const previous = {};
before(() => {
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
});
after(() => {
  for (const key of Object.keys(values)) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
});

test('checkout rejects mixed keys and wrong origins before business side effects', async () => {
  const ctx = new Proxy({}, { get: () => { throw new Error('Unexpected side effect'); } });
  process.env.STRIPE_SECRET_KEY = 'sk_live_fixture';
  try {
    await assert.rejects(createCheckoutSession._handler(ctx, { origin: values.SITE_URL, items: [] }), /Stripe key mode/);
  } finally {
    process.env.STRIPE_SECRET_KEY = values.STRIPE_SECRET_KEY;
  }
  await assert.rejects(createCheckoutSession._handler(ctx, {
    origin: 'https://www.hawaiiproducts.ro', items: [],
  }), /wrong application environment/);
});

test('webhook verifies signature and rejects a correctly signed live event in test', async () => {
  const verify = (livemode, secret = values.STRIPE_WEBHOOK_SECRET) => {
    const body = JSON.stringify({
      id: 'evt_fixture', type: 'checkout.session.completed', livemode,
      data: { object: { id: 'cs_test_fixture', payment_status: 'paid', payment_intent: 'pi_fixture' } },
    });
    return verifyWebhookSignature._handler({}, {
      body,
      signature: Stripe.webhooks.generateTestHeaderString({ payload: body, secret }),
    });
  };
  assert.equal((await verify(false)).sessionId, 'cs_test_fixture');
  await assert.rejects(verify(true), /webhook mode/);
  await assert.rejects(verify(false, 'whsec_wrong'));
});

test('test post-payment processing never requires invoice/email credentials or calls integrations', async () => {
  const ctx = new Proxy({}, { get: () => { throw new Error('Unexpected external automation'); } });
  await handlePostPayment._handler(ctx, { orderId: 'order-test' });
});
