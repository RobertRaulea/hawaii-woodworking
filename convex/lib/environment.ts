import {
  environmentTargets,
  isLocalOrigin,
  parseEnvironment,
  validateClerkIssuer,
  validateSiteOrigin,
} from '../../shared/environment';
import type { EnvironmentVariables } from '../../shared/environment';

export const readEnvironment = (env: EnvironmentVariables = process.env) => {
  const name = parseEnvironment(env.APP_ENV);
  if (env.CONVEX_CLOUD_URL !== environmentTargets[name].convexUrl) {
    throw new Error('Backend deployment does not match APP_ENV.');
  }
  validateClerkIssuer(env.CLERK_JWT_ISSUER_DOMAIN, name);
  return { name, siteUrl: validateSiteOrigin(env.SITE_URL, name) };
};

export const requireTestEnvironment = (env: EnvironmentVariables = process.env) => {
  const config = readEnvironment(env);
  if (config.name !== 'test') throw new Error('Demo data is allowed only in TEST.');
  return config;
};

export const requirePaymentEnvironment = (
  env: EnvironmentVariables = process.env,
  checkout = true,
) => {
  const config = readEnvironment(env);
  const secretKey = env.STRIPE_SECRET_KEY ?? '';
  const prefix = config.name === 'test' ? 'sk_test_' : 'sk_live_';
  if (!secretKey.startsWith(prefix)) throw new Error('Stripe key mode does not match APP_ENV.');
  if (checkout && env.CHECKOUT_ENABLED !== 'true') throw new Error('Checkout is disabled.');
  return { ...config, secretKey };
};

export const resolveCheckoutOrigin = (
  origin: string,
  env: EnvironmentVariables = process.env,
): string => {
  const config = readEnvironment(env);
  const safeOrigin = validateSiteOrigin(origin, config.name);
  const allowed = new Set([
    config.siteUrl,
    ...(env.ALLOWED_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean),
  ]);
  if (!allowed.has(safeOrigin) && !(config.name === 'test' && isLocalOrigin(new URL(safeOrigin)))) {
    throw new Error('Checkout origin is not allowed in this environment.');
  }
  return safeOrigin;
};

export const validateWebhookMode = (
  livemode: boolean,
  env: EnvironmentVariables = process.env,
): void => {
  const { name } = requirePaymentEnvironment(env, false);
  if (livemode !== (name === 'production')) {
    throw new Error('Stripe webhook mode does not match APP_ENV.');
  }
};
