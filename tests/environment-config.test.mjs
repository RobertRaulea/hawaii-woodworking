import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validateFrontendEnvironment,
  environmentTargets,
} from '../shared/environment.ts';
import {
  requirePaymentEnvironment,
  requireTestEnvironment,
  resolveCheckoutOrigin,
  validateWebhookMode,
} from '../convex/lib/environment.ts';

const frontend = {
  VITE_APP_ENV: 'test',
  VITE_CONVEX_URL: 'https://exuberant-fox-228.convex.cloud',
  VITE_CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from('choice-fowl-16.clerk.accounts.dev$').toString('base64')}`,
  VITE_SITE_URL: 'https://hawaii-woodworking-test.vercel.app',
};
const backend = {
  APP_ENV: 'test',
  CONVEX_CLOUD_URL: frontend.VITE_CONVEX_URL,
  CLERK_JWT_ISSUER_DOMAIN: 'https://choice-fowl-16.clerk.accounts.dev',
  STRIPE_SECRET_KEY: 'sk_test_fixture',
  SITE_URL: frontend.VITE_SITE_URL,
  CHECKOUT_ENABLED: 'true',
};

test('frontend validates explicit provider bindings, not build mode', () => {
  assert.equal(validateFrontendEnvironment(frontend).name, 'test');
  for (const overrides of [
    { VITE_APP_ENV: undefined },
    { VITE_APP_ENV: 'staging' },
    { VITE_CONVEX_URL: environmentTargets.production.convexUrl },
    { VITE_CLERK_PUBLISHABLE_KEY: 'pk_live_bad' },
    { VITE_CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from('other.clerk.accounts.dev$').toString('base64')}` },
    { VITE_SITE_URL: 'https://www.hawaiiproducts.ro' },
    { VITE_SITE_URL: 'http://example.com' },
  ]) {
    assert.throws(() => validateFrontendEnvironment({ ...frontend, ...overrides }));
  }
});

test('backend rejects mixed environments and disabled checkout', () => {
  assert.equal(requirePaymentEnvironment(backend).name, 'test');
  for (const overrides of [
    { APP_ENV: undefined },
    { APP_ENV: 'production' },
    { CONVEX_CLOUD_URL: environmentTargets.production.convexUrl },
    { STRIPE_SECRET_KEY: 'sk_live_fixture' },
    { CLERK_JWT_ISSUER_DOMAIN: 'https://other.clerk.accounts.dev' },
    { CHECKOUT_ENABLED: 'false' },
    { CHECKOUT_ENABLED: undefined },
  ]) {
    assert.throws(() => requirePaymentEnvironment({ ...backend, ...overrides }));
  }
  assert.throws(() => requireTestEnvironment({
    ...backend, CONVEX_CLOUD_URL: environmentTargets.production.convexUrl,
  }));
});

test('checkout accepts only exact configured origins within its environment', () => {
  assert.equal(resolveCheckoutOrigin(frontend.VITE_SITE_URL, backend), frontend.VITE_SITE_URL);
  assert.equal(resolveCheckoutOrigin('http://localhost:5173', backend), 'http://localhost:5173');
  for (const origin of [
    'https://www.hawaiiproducts.ro', 'https://evil.example',
    `${frontend.VITE_SITE_URL}/cart`, 'http://localhost.evil.example',
  ]) assert.throws(() => resolveCheckoutOrigin(origin, backend));
  assert.throws(() => resolveCheckoutOrigin('https://www.hawaiiproducts.ro', {
    ...backend, ALLOWED_ORIGINS: 'https://www.hawaiiproducts.ro',
  }));
});

test('signed webhook mode is checked independently of checkout being enabled', () => {
  assert.doesNotThrow(() => validateWebhookMode(false, { ...backend, CHECKOUT_ENABLED: 'false' }));
  assert.throws(() => validateWebhookMode(true, backend));
  assert.throws(() => validateWebhookMode(undefined, backend));
});
