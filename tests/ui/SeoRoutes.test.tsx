import { render, screen } from '@testing-library/react';
import assert from 'node:assert/strict';
import { it, mock } from 'node:test';
import * as helmetEsm from 'react-helmet-async/lib/index.esm.js';
const { HelmetProvider } = helmetEsm;
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { readFileSync } from 'node:fs';

const ro = JSON.parse(
  readFileSync(new URL('../../src/i18n/locales/ro.json', import.meta.url), 'utf8'),
);
await i18n.use(initReactI18next).init({
  resources: { ro: { translation: ro } },
  lng: 'ro',
  fallbackLng: 'ro',
  interpolation: { escapeValue: false },
});

mock.module('react-helmet-async', { namedExports: helmetEsm });

const { SEO } = await import('../../src/components/SEO/SEO.tsx');
const { RouteSEO } = await import('../../src/components/SEO/RouteSEO.tsx');
const { NotFound } = await import('../../src/pages/NotFound/NotFound.tsx');

const renderSeo = (element: React.ReactNode, route = '/') =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>
    </HelmetProvider>,
  );

const head = () => document.head;

it('emits one canonical matching the clean OG url', async () => {
  renderSeo(<SEO title="Test" environment="production" />, '/products?utm_source=x&categories=a#top');
  await new Promise((resolve) => setTimeout(resolve, 60));
  const canonicals = head().querySelectorAll('link[rel="canonical"]');
  assert.equal(canonicals.length, 1);
  const href = canonicals[0].getAttribute('href');
  assert.equal(href, 'https://www.hawaiiproducts.ro/products');
  assert.equal(head().querySelector('meta[property="og:url"]')?.getAttribute('content'), href);
});

it('robots: private path noindex, facet query noindex, tracking stays indexable', async () => {
  const view = renderSeo(<RouteSEO environment="production" />, '/cart');
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.match(
    head().querySelector('meta[name="robots"]')?.getAttribute('content') ?? '',
    /noindex, follow/,
  );
  view.unmount();
  renderSeo(<RouteSEO environment="production" />, '/products?utm_source=a&gclid=b');
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.match(
    head().querySelector('meta[name="robots"]')?.getAttribute('content') ?? '',
    /index, follow, max-image-preview:large/,
  );
});

it('brand appended exactly once and JSON-LD escaped', async () => {
  renderSeo(
    <SEO title="Nume produs" environment="production" schema={{ name: '</script><script>' }} />,
    '/product/abc',
  );
  await new Promise((resolve) => setTimeout(resolve, 60));
  const title = head().querySelector('title')?.textContent ?? '';
  assert.equal(title, 'Nume produs | Hawaii Woodworking');
  assert.equal(title.split('Hawaii Woodworking').length - 1, 1);
  const ld = head().querySelector('script[type="application/ld+json"]')?.textContent ?? '';
  assert.ok(!ld.includes('</script><script>'));
  assert.ok(ld.includes('\\u003c'));
});

it('noindex prop forces noindex and html lang is ro', async () => {
  renderSeo(<SEO environment="production" noindex />, '/product/missing');
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.match(
    head().querySelector('meta[name="robots"]')?.getAttribute('content') ?? '',
    /noindex/,
  );
  assert.equal(document.documentElement.lang, 'ro');
});

it('NotFound renders localized content with noindex', async () => {
  renderSeo(<NotFound />, '/definitely-unknown');
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.ok(screen.getByRole('heading', { level: 1, name: 'Pagina nu a fost găsită' }));
  assert.ok(screen.getByRole('link', { name: 'Mergi la pagina principală' }));
  assert.match(
    head().querySelector('meta[name="robots"]')?.getAttribute('content') ?? '',
    /noindex/,
  );
});

it('test environment always emits noindex/nofollow/noarchive even with explicit props', async () => {
  renderSeo(<SEO environment="test" noindex />, '/');
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(
    head().querySelector('meta[name="robots"]')?.getAttribute('content'),
    'noindex, nofollow, noarchive',
  );
});

it('route without page SEO clears a previous product schema via RouteSEO fallback', async () => {
  const view = renderSeo(
    <SEO environment="production" schema={{ '@type': 'Product', name: 'Old' }} />,
    '/product/old',
  );
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.ok(
    document.head.querySelector('script[type="application/ld+json"]'),
  );
  view.unmount();
  renderSeo(<RouteSEO environment="production" />, '/cart');
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(
    document.head.querySelector('script[type="application/ld+json"]'),
    null,
  );
  assert.match(
    head().querySelector('meta[name="robots"]')?.getAttribute('content') ?? '',
    /noindex/,
  );
});
