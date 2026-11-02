import { ConvexHttpClient } from 'convex/browser';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { api } from '../convex/_generated/api.js';
import { validateFrontendEnvironment } from '../shared/environment';
import type { EnvironmentVariables } from '../shared/environment';
import { escapeHtml } from '../shared/seo/seo.utils';
import type { SeoProduct } from '../shared/seo/seo.types';
import { assertSafeProductId, writeStaticPages } from './prerender';

export const writeSearchFiles = async (variables: EnvironmentVariables, outputDirectory: string) => {
  const environment = validateFrontendEnvironment(variables);
  await mkdir(outputDirectory, { recursive: true });
  const paths = ['/', '/products', '/catalog', '/servicii',
    '/servicii/prelucrare-cnc-lemn', '/servicii/debitare-circular',
    '/servicii/panouri-lemn-masiv-lamela-continua', '/produse-personalizate', '/terms-and-conditions',
    '/privacy-policy', '/return-policy', '/legal-information'];

  let catalogProducts: SeoProduct[] = [];
  if (environment.name === 'production') {
    const convex = new ConvexHttpClient(environment.convexUrl);
    const products = await convex.query(api.products.getAll, {});
    products.forEach((product) => assertSafeProductId(product._id));
    catalogProducts = products;
    paths.push(...products.map((product) => `/product/${product._id}`));
  }
  const locations = environment.name === 'test' ? '' : paths
    .map((route) => `  <url><loc>${escapeHtml(environment.siteUrl + route)}</loc></url>`).join('\n');
  await writeFile(path.join(outputDirectory, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations}\n</urlset>\n`);
  await writeFile(path.join(outputDirectory, 'robots.txt'), environment.name === 'test'
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /pos\nDisallow: /cart\nDisallow: /checkout\nDisallow: /shipping\nDisallow: /my-orders\nDisallow: /login\nDisallow: /thank-you\nSitemap: ${environment.siteUrl}/sitemap.xml\n`);

  const locale = JSON.parse(
    await readFile(path.resolve('src/i18n/locales/ro.json'), 'utf8'),
  );
  await writeStaticPages({ environment: environment.name, siteUrl: environment.siteUrl, products: catalogProducts, locale }, outputDirectory);
};
