import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import Stripe from 'stripe';

const deployment = 'exuberant-fox-228';
const siteUrl = 'https://hawaii-woodworking-test-robertrauleas-projects.vercel.app';
const endpointUrl = `https://${deployment}.convex.site/stripe-webhook`;
const cli = './node_modules/.bin/convex';
const convex = (...args: string[]): string => execFileSync(cli, [
  'env', ...args, '--deployment-name', deployment,
], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();

try {
  const local = parse(readFileSync('.env.local'));
  if (local.CONVEX_DEPLOYMENT !== `dev:${deployment}` ||
      local.VITE_CONVEX_URL !== `https://${deployment}.convex.cloud`) {
    throw new Error('Local configuration must select the approved TEST deployment.');
  }
  const key = convex('get', 'STRIPE_SECRET_KEY');
  if (!key.startsWith('sk_test_')) throw new Error('Backend Stripe credential is not a test key.');
  const stripe = new Stripe(key);
  const [balance, account, endpoints] = await Promise.all([
    stripe.balance.retrieve(), stripe.accounts.retrieve(),
    stripe.webhookEndpoints.list({ limit: 100 }),
  ]);
  if (balance.livemode || account.id !== 'acct_1RYni5I8gZB3b1Rz') {
    throw new Error('Stripe account is not the verified Hawaii TEST sandbox.');
  }
  const endpoint = endpoints.data.find((item) =>
    item.url === endpointUrl && !item.livemode && item.status === 'enabled' &&
    item.enabled_events.includes('checkout.session.completed'));
  if (!endpoint || !convex('get', 'STRIPE_WEBHOOK_SECRET').startsWith('whsec_')) {
    throw new Error('Expected TEST webhook and signing configuration are missing. Configure explicitly; do not rotate blindly.');
  }
  const settings = {
    APP_ENV: 'test',
    SITE_URL: siteUrl,
    ALLOWED_ORIGINS: siteUrl,
    CLERK_JWT_ISSUER_DOMAIN: 'https://choice-fowl-16.clerk.accounts.dev',
    CHECKOUT_ENABLED: 'true',
  };
  for (const [name, value] of Object.entries(settings)) {
    convex('set', name, value);
    console.log(`TEST: configured ${name}`);
  }
  console.log(`Verified sandbox ${account.id}; webhook ${endpoint.id}. Production unchanged.`);
} catch {
  // CLI/SDK errors can include credentials in request metadata.
  console.error('TEST configuration failed. No secret values printed. Check deployment access, sandbox account, and existing webhook.');
  process.exitCode = 1;
}
