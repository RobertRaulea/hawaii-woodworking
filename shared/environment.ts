export type EnvironmentName = 'test' | 'production';
export type EnvironmentVariables = Readonly<Record<string, string | undefined>>;

export const environmentTargets = {
  test: {
    convexUrl: 'https://exuberant-fox-228.convex.cloud',
    clerkIssuer: 'https://choice-fowl-16.clerk.accounts.dev',
  },
  production: {
    convexUrl: 'https://upbeat-lyrebird-218.convex.cloud',
  },
} as const;

const productionHosts = new Set(['hawaiiproducts.ro', 'www.hawaiiproducts.ro']);

export const parseEnvironment = (value: string | undefined): EnvironmentName => {
  if (value !== 'test' && value !== 'production') {
    throw new Error('Explicit APP_ENV / VITE_APP_ENV must be test or production.');
  }
  return value;
};

export const isLocalOrigin = (url: URL): boolean =>
  url.protocol === 'http:' &&
  (url.hostname === 'localhost' || url.hostname === '127.0.0.1');

export const validateSiteOrigin = (value: string | undefined, name: EnvironmentName): string => {
  if (!value) throw new Error('SITE_URL / VITE_SITE_URL is required.');
  const url = new URL(value);
  if (url.origin !== value || url.username || url.password ||
      (url.protocol !== 'https:' && !(name === 'test' && isLocalOrigin(url)))) {
    throw new Error('Site URL must be an exact HTTPS origin (localhost is test-only).');
  }
  if ((name === 'production') !== productionHosts.has(url.hostname)) {
    throw new Error('Site URL belongs to the wrong application environment.');
  }
  return url.origin;
};

export const validateClerkIssuer = (issuer: string | undefined, name: EnvironmentName): void => {
  if (!issuer) throw new Error('Clerk issuer is required.');
  const url = new URL(issuer);
  if (url.protocol !== 'https:' || url.origin !== issuer) {
    throw new Error('Clerk issuer must be an HTTPS origin.');
  }
  if (name === 'test'
    ? issuer !== environmentTargets.test.clerkIssuer
    : url.hostname !== 'clerk.hawaiiproducts.ro') {
    throw new Error('Clerk issuer belongs to the wrong application environment.');
  }
};

export const validateFrontendEnvironment = (env: EnvironmentVariables) => {
  const name = parseEnvironment(env.VITE_APP_ENV);
  const convexUrl = environmentTargets[name].convexUrl;
  if (env.VITE_CONVEX_URL !== convexUrl) {
    throw new Error('Convex URL does not match VITE_APP_ENV.');
  }
  const key = env.VITE_CLERK_PUBLISHABLE_KEY ?? '';
  const prefix = name === 'test' ? 'pk_test_' : 'pk_live_';
  if (!key.startsWith(prefix)) throw new Error('Clerk key mode does not match VITE_APP_ENV.');
  let clerkHost: string;
  try {
    clerkHost = atob(key.slice(prefix.length)).replace(/\$$/, '');
  } catch {
    throw new Error('Invalid Clerk publishable key encoding.');
  }
  validateClerkIssuer(`https://${clerkHost}`, name);
  const siteUrl = validateSiteOrigin(env.VITE_SITE_URL, name);
  return { name, convexUrl, publishableKey: key, siteUrl };
};
