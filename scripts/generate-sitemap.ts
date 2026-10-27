import { ConvexHttpClient } from 'convex/browser';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { api } from '../convex/_generated/api.js';
import { validateFrontendEnvironment } from '../shared/environment';
import type { EnvironmentVariables } from '../shared/environment';

export const writeSearchFiles = async (variables: EnvironmentVariables, outputDirectory: string) => {
  const environment = validateFrontendEnvironment(variables);
  await mkdir(outputDirectory, { recursive: true });
  const paths = ['/', '/products', '/catalog', '/terms-and-conditions',
    '/privacy-policy', '/return-policy', '/legal-information'];

  if (environment.name === 'production') {
    const convex = new ConvexHttpClient(environment.convexUrl);
    const products = await convex.query(api.products.getAll, {});
    paths.push(...products.map((product) => `/product/${product._id}`));
  }
  const locations = environment.name === 'test' ? '' : paths
    .map((route) => `  <url><loc>${environment.siteUrl}${route}</loc></url>`).join('\n');
  await writeFile(path.join(outputDirectory, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations}\n</urlset>\n`);
  await writeFile(path.join(outputDirectory, 'robots.txt'), environment.name === 'test'
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /checkout\nDisallow: /shipping\nDisallow: /my-orders\nSitemap: ${environment.siteUrl}/sitemap.xml\n`);
};
