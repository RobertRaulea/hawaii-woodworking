import { parseEnvironment } from './environment';
import type { EnvironmentName, EnvironmentVariables } from './environment';
import { PUBLIC_PATHS } from './seo/seo.utils';

export const ANALYTICS_CONSENT_VERSION = 1;
export const ANALYTICS_CONSENT_KEY = 'hawaii.analytics-consent.v1';
export const ANALYTICS_CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
export const POSTHOG_EU_HOST = 'https://eu.i.posthog.com';

export const CLIENT_ANALYTICS_EVENTS = [
  'product_viewed',
  'add_to_cart',
  'cart_viewed',
  'checkout_started',
  'checkout_initiation_failed',
  'checkout_returned_from_stripe',
  'form_submitted',
  'cta_clicked',
  'signup_completed',
  'login_completed',
  'application_error',
] as const;

export type ClientAnalyticsEvent = (typeof CLIENT_ANALYTICS_EVENTS)[number];
export type AnalyticsConsent = 'pending' | 'accepted' | 'rejected';
export type AnalyticsProperties = Readonly<Record<string, unknown>>;
export type AnalyticsContext = {
  consent: true;
  distinctId: string;
  sessionId: string;
  environment: EnvironmentName;
};
export type AnalyticsConfiguration = {
  projectToken: string;
  host: typeof POSTHOG_EU_HOST;
  environment: EnvironmentName;
};

const missingSetting = (name: string): Error => new Error(
  `${name} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${name} is configured`,
);

// Explicitly disabled is intentional; enabled but incomplete is a configuration error.
export const readAnalyticsConfiguration = (
  env: EnvironmentVariables,
  client: boolean,
): AnalyticsConfiguration | null => {
  const prefix = client ? 'VITE_PUBLIC_' : '';
  if (env[`${prefix}POSTHOG_ENABLED`] !== 'true') return null;
  const environment = parseEnvironment(env[client ? 'VITE_APP_ENV' : 'APP_ENV']);
  const tokenName = `${prefix}POSTHOG_KEY`;
  const hostName = `${prefix}POSTHOG_HOST`;
  const environmentName = `${prefix}POSTHOG_ENV`;
  const projectToken = env[tokenName]?.trim() ?? '';
  if (!/^phc_[A-Za-z0-9_-]{16,}$/.test(projectToken)) throw missingSetting(tokenName);
  if (env[hostName] !== POSTHOG_EU_HOST) throw missingSetting(hostName);
  if (env[environmentName] !== environment) throw missingSetting(environmentName);
  return { projectToken, host: POSTHOG_EU_HOST, environment };
};

export const isAnalyticsIdentifier = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9._:-]{8,200}$/.test(value);

export const validAnalyticsContext = (
  value: AnalyticsContext | undefined,
  environment: EnvironmentName,
): value is AnalyticsContext =>
  value?.consent === true &&
  value.environment === environment &&
  isAnalyticsIdentifier(value.distinctId) &&
  isAnalyticsIdentifier(value.sessionId);

const ADMIN_MODULES = new Set([
  'login', 'dashboard', 'pos', 'reports', 'inventory', 'transfers', 'orders',
  'fulfillment', 'products', 'categories', 'custom-works', 'customers', 'staff', 'fairs',
]);

// URLs are reduced to route templates: never retain session tokens, searches or record ids.
export const analyticsPath = (pathname: string): string => {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if ((PUBLIC_PATHS as readonly string[]).includes(path)) return path;
  if (/^\/product\/[^/]+$/.test(path)) return '/product/:productId';
  if (/^\/my-orders\/[^/]+$/.test(path)) return '/my-orders/:id';
  if (['/cart', '/shipping', '/checkout', '/login', '/my-orders', '/thank-you', '/pos', '/admin'].includes(path)) return path;
  const parts = path.split('/');
  if (parts[1] === 'admin' && ADMIN_MODULES.has(parts[2])) {
    return `/admin/${parts[2]}${parts.length > 3 ? '/:id' : ''}`;
  }
  return '/not-found';
};

export const analyticsReferrer = (value: string): string => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : '';
  } catch {
    return '';
  }
};

const PROPERTY_ENUMS: Record<string, readonly string[]> = {
  method: ['clerk'],
  form_name: ['shipping'],
  cta_name: ['contact_email', 'contact_phone'],
  surface: ['storefront', 'shipping', 'checkout', 'admin'],
  return_reason: ['cancelled'],
  error_code: ['checkout_initiation_failed', 'window_error', 'unhandled_rejection'],
  utm_source: ['google', 'facebook', 'instagram', 'bing', 'linkedin', 'newsletter', 'direct', 'other'],
  utm_medium: ['organic', 'cpc', 'paid_social', 'email', 'referral', 'social', 'other'],
};

export const sanitizeAnalyticsProperties = (
  properties: AnalyticsProperties,
): Record<string, string | number> => {
  const result: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(properties)) {
    const allowedValues = PROPERTY_ENUMS[key];
    if (Array.isArray(allowedValues) && allowedValues.includes(value as string)) result[key] = value as string;
    if (key === 'product_id' && isAnalyticsIdentifier(value)) result[key] = value;
    if (key === 'route_path' && typeof value === 'string') result[key] = analyticsPath(value);
    if (['quantity', 'item_count'].includes(key) && Number.isSafeInteger(value) &&
      (value as number) >= 0 && (value as number) <= 100_000) result[key] = value as number;
  }
  return result;
};

export const analyticsCampaign = (search: string): Record<string, string | number> => {
  const params = new URLSearchParams(search);
  return sanitizeAnalyticsProperties(Object.fromEntries(
    ['utm_source', 'utm_medium'].filter((key) => params.has(key)).map((key) => [
      key, PROPERTY_ENUMS[key].includes(params.get(key) ?? '') ? params.get(key) : 'other',
    ]),
  ));
};
