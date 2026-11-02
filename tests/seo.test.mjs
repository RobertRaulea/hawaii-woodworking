import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SITE_NAME,
  buildProductSeo,
  canonicalUrl,
  escapeHtml,
  isPrivatePathname,
  isPublicPathname,
  mailtoHref,
  routeRobots,
  serializeJsonLd,
} from '../shared/seo/seo.utils.ts';

const SITE = 'https://www.hawaiiproducts.ro';

test('canonicalUrl strips tracking/facet query, hash and trailing slash', () => {
  assert.equal(canonicalUrl(SITE, '/products?utm_source=newsletter&gclid=abc&categories=lemn'), `${SITE}/products`);
  assert.equal(canonicalUrl(SITE, '/products?categories=a&minPrice=10#grid'), `${SITE}/products`);
  assert.equal(canonicalUrl(SITE, '/servicii/'), `${SITE}/servicii`);
  assert.equal(canonicalUrl(SITE, '/'), `${SITE}/`);
  assert.equal(canonicalUrl(SITE, 'products'), `${SITE}/products`);
});

test('canonicalUrl forces the configured origin for absolute input', () => {
  assert.equal(canonicalUrl(SITE, 'https://evil.example/path?x=1'), `${SITE}/path`);
  assert.equal(canonicalUrl(SITE, '//evil.example/x'), `${SITE}/x`);
});

test('private path prefixes match on segment boundaries only', () => {
  for (const path of ['/cart', '/cart/items', '/admin', '/admin/products', '/pos', '/checkout', '/login', '/my-orders/x', '/thank-you', '/shipping']) {
    assert.equal(isPrivatePathname(path), true, path);
  }
  for (const path of ['/cartoon', '/carts', '/administrator', '/position', '/login-page', '/products', '/']) {
    assert.equal(isPrivatePathname(path), false, path);
  }
});

test('public path detection covers known routes and product detail', () => {
  for (const path of ['/', '/products', '/catalog', '/servicii', '/servicii/prelucrare-cnc-lemn', '/servicii/debitare-circular', '/servicii/panouri-lemn-masiv-lamela-continua', '/produse-personalizate', '/product/abc123', '/terms-and-conditions']) {
    assert.equal(isPublicPathname(path), true, path);
  }
  for (const path of ['/random', '/product/', '/products/extra', '/unknown/path']) {
    assert.equal(isPublicPathname(path), false, path);
  }
});

test('robots directives: test environment always noindex/nofollow/noarchive', () => {
  for (const path of ['/', '/products', '/cart', '/servicii', '/servicii/debitare-circular', '/servicii/panouri-lemn-masiv-lamela-continua']) {
    assert.equal(
      routeRobots(path, '', 'test'),
      'noindex, nofollow, noarchive',
    );
  }
});

test('robots directives: production private/unknown noindex, public indexable', () => {
  assert.equal(routeRobots('/cart', '', 'production'), 'noindex, follow');
  assert.equal(routeRobots('/admin/dashboard', '', 'production'), 'noindex, follow');
  assert.equal(routeRobots('/unknown-route', '', 'production'), 'noindex, follow');
  assert.equal(routeRobots('/', '', 'production'), 'index, follow, max-image-preview:large');
  assert.equal(routeRobots('/servicii/prelucrare-cnc-lemn', '', 'production'), 'index, follow, max-image-preview:large');
  assert.equal(routeRobots('/servicii/debitare-circular', '', 'production'), 'index, follow, max-image-preview:large');
  assert.equal(routeRobots('/servicii/panouri-lemn-masiv-lamela-continua', '', 'production'), 'index, follow, max-image-preview:large');
  assert.equal(routeRobots('/product/jx7abc', '', 'production'), 'index, follow, max-image-preview:large');
});

test('robots directives: facet queries noindex, tracking-only stays indexable', () => {
  assert.equal(
    routeRobots('/products', '?categories=a&sort=price-asc', 'production'),
    'noindex, follow',
  );
  assert.equal(
    routeRobots('/products', '?utm_source=news&gclid=abc&fbclid=z', 'production'),
    'index, follow, max-image-preview:large',
  );
  assert.equal(
    routeRobots('/products', '?gclid=x&categories=a', 'production'),
    'noindex, follow',
  );

});

test('serializeJsonLd escapes closing tags, ampersands and line separators', () => {
  const out = serializeJsonLd({ name: '</script><script>alert(1)</script> & co\u2028\u2029' });
  assert.ok(!out.includes('</script>'));
  assert.ok(out.includes('\\u003c/script\\u003e'));
  assert.ok(out.includes('\\u003cscript\\u003e'));
  assert.ok(out.includes('\\u0026'));
  const parsed = JSON.parse(out);
  assert.equal(parsed.name, '</script><script>alert(1)</script> & co\u2028\u2029');
});

test('escapeHtml escapes markup characters for HTML/XML output', () => {
  assert.equal(escapeHtml('a & <b> "c" \'d\''), 'a &amp; &lt;b&gt; &quot;c&quot; &#39;d&#39;');
});

test('mailtoHref encodes subject and body', () => {
  const href = mailtoHref('a@b.ro', 'Ofertă & preț', 'Linia 1\nLinia 2');
  assert.equal(href.startsWith('mailto:a@b.ro?subject='), true);
  assert.ok(href.includes(encodeURIComponent('Ofertă & preț')));
  assert.ok(href.includes(encodeURIComponent('Linia 1\nLinia 2')));
});

const baseProduct = {
  _id: 'jx7abc',
  name: 'Tocător stejar',
  description: '  Tocător   din\nlemn masiv.  ',
  price: 120,
  imageUrls: ['https://cdn.example.com/img1.jpg'],
  sku: 'TCS-01',
  availableStock: 10,
  trackStock: true,
  lowStockThreshold: 5,
};

test('buildProductSeo defaults: romanian fields, branded schema once, canonical path', () => {
  const seo = buildProductSeo(baseProduct, SITE, 'ro');
  assert.equal(seo.title, 'Tocător stejar');
  assert.equal(seo.description, 'Tocător din lemn masiv.');
  assert.equal(seo.canonicalPath, '/product/jx7abc');
  const graph = seo.schema['@graph'];
  assert.equal(graph[0]['@type'], 'Product');
  assert.equal(graph[0].brand.name, SITE_NAME);
  assert.equal(graph[0].offers.priceCurrency, 'RON');
  assert.equal(graph[0].offers.price, '120.00');
  assert.equal(graph[0].offers.availability, 'https://schema.org/InStock');
  assert.equal(graph[0].offers.url, `${SITE}/product/jx7abc`);
  assert.equal(graph[0].offers.itemCondition, 'https://schema.org/NewCondition');
  assert.equal(graph[0].sku, 'TCS-01');
  assert.deepEqual(graph[0].image, ['https://cdn.example.com/img1.jpg']);
  assert.equal(graph[1]['@type'], 'BreadcrumbList');
  assert.equal(graph[1].itemListElement[2].item, `${SITE}/product/jx7abc`);
  assert.equal(seo.image, 'https://cdn.example.com/img1.jpg');
});

test('buildProductSeo: romanian overrides apply only for ro, name_ro/description_ro preferred', () => {
  const overridden = { ...baseProduct, seoTitle: 'Titlu custom', seoDescription: 'Descriere custom', name_ro: 'Nume RO', description_ro: 'Desc RO' };
  const ro = buildProductSeo(overridden, SITE, 'ro');
  assert.equal(ro.title, 'Titlu custom');
  assert.equal(ro.description, 'Descriere custom');
  const en = buildProductSeo(overridden, SITE, 'en');
  assert.equal(en.title, 'Tocător stejar');
  assert.equal(en.description, 'Tocător din lemn masiv.');
  const roNoOverride = buildProductSeo({ ...baseProduct, name_ro: 'Nume RO' }, SITE, 'ro');
  assert.equal(roNoOverride.title, 'Nume RO');
});

test('buildProductSeo: empty override falls back; no images means no image key', () => {
  const seo = buildProductSeo({ ...baseProduct, seoTitle: '   ', imageUrls: [] }, SITE, 'ro');
  assert.equal(seo.title, 'Tocător stejar');
  assert.equal(seo.schema['@graph'][0].image, undefined);
  assert.equal(seo.image, undefined);
});

test('buildProductSeo: availability from catalog stock only', () => {
  const out = buildProductSeo({ ...baseProduct, availableStock: 0 }, SITE, 'ro');
  assert.equal(out.schema['@graph'][0].offers.availability, 'https://schema.org/OutOfStock');
  const limited = buildProductSeo({ ...baseProduct, availableStock: 3, lowStockThreshold: 5 }, SITE, 'ro');
  assert.equal(limited.schema['@graph'][0].offers.availability, 'https://schema.org/LimitedAvailability');
  const untracked = buildProductSeo({ ...baseProduct, trackStock: false, availableStock: 0 }, SITE, 'ro');
  assert.equal(untracked.schema['@graph'][0].offers.availability, 'https://schema.org/InStock');
});

test('buildProductSeo: sku falls back to id, description falls back to name', () => {
  const seo = buildProductSeo({ ...baseProduct, sku: undefined, description: null }, SITE, 'ro');
  assert.equal(seo.schema['@graph'][0].sku, 'jx7abc');
  assert.ok(seo.description.includes('Tocător stejar'));
});
