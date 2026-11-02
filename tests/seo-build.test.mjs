import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock, test } from 'node:test';

const convexCalls = [];
let catalogResult = 'default';
class FakeConvexHttpClient {
  constructor(url) {
    convexCalls.push(['construct', url]);
  }
  async query(reference, args) {
    convexCalls.push(['query', reference, args]);
    if (catalogResult === 'fail') throw new Error('catalog unavailable');
    if (catalogResult === 'hostile') {
      return [
        {
          _id: 'jx7tok',
          name: "Produs $& $` $' </title><img src=x onerror=alert(1)>",
          seoTitle: 'Titlu $& preț',
          seoDescription: "Desc $` & $' <b>rau</b>",
          description: "Text $& $` $' </script><script>alert(1)</script>",
          price: 10,
          availableStock: 3,
          trackStock: true,
          imageUrls: [],
        },
      ];
    }
    if (catalogResult === 'invalid-id') {
      return [
        { _id: '../escape', name: 'Bad', price: 1 },
      ];
    }
    return [
      {
        _id: 'jx7prod1',
        name: 'Tocător',
        name_ro: 'Tocător stejar',
        description: 'Descriere & "ghilimele" </script><script>alert(1)</script>',
        price: 120.5,
        sku: 'TCS-01',
        category: 'Bucătărie',
        availableStock: 4,
        trackStock: true,
        lowStockThreshold: 5,
        imageUrls: ['https://files.example.com/tocator.jpg'],
      },
      {
        _id: 'jx7prod2',
        name: 'Fără stoc',
        price: 80,
        availableStock: 0,
        trackStock: true,
        imageUrls: [],
      },
    ];
  }
}

mock.module('convex/browser', {
  namedExports: { ConvexHttpClient: FakeConvexHttpClient },
});

const { writeSearchFiles } = await import('../scripts/generate-sitemap.ts');

const TEST_ENV = {
  VITE_APP_ENV: 'test',
  VITE_CONVEX_URL: 'https://exuberant-fox-228.convex.cloud',
  VITE_CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from('choice-fowl-16.clerk.accounts.dev$').toString('base64')}`,
  VITE_SITE_URL: 'https://hawaii-woodworking-test-robertrauleas-projects.vercel.app',
};

const PROD_ENV = {
  VITE_APP_ENV: 'production',
  VITE_CONVEX_URL: 'https://upbeat-lyrebird-218.convex.cloud',
  VITE_CLERK_PUBLISHABLE_KEY: `pk_live_${Buffer.from('clerk.hawaiiproducts.ro$').toString('base64')}`,
  VITE_SITE_URL: 'https://www.hawaiiproducts.ro',
};

const template = (robots) => `<!doctype html>
<html lang="ro">
  <head>
    <meta charset="UTF-8" />
    <link rel="preconnect" href="https://example.convex.cloud" crossorigin>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Template description" data-rh="true" />
    <script src="/theme-init.js"></script>
    <title>Template title</title>
    <script type="module" crossorigin src="/assets/index-ABC123.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-XYZ.css">
    <meta name="app-environment" content="test">
${robots ? '    <meta name="robots" content="noindex, nofollow, noarchive">\n' : ''}  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

const withDist = async (robots, fn) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'seo-build-'));
  try {
    await writeFile(path.join(dir, 'index.html'), template(robots));
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

const read = (dir, rel) => readFile(path.join(dir, rel), 'utf8');

const countMatches = (text, pattern) => (text.match(pattern) ?? []).length;

test('TEST build: no convex client, empty sitemap, deny robots, noindex static pages', async () => {
  convexCalls.length = 0;
  await withDist(true, async (dir) => {
    await writeSearchFiles(TEST_ENV, dir);
    assert.equal(convexCalls.length, 0);
    const sitemap = await read(dir, 'sitemap.xml');
    assert.ok(!sitemap.includes('<loc>'));
    assert.equal(await read(dir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
    for (const file of ['index.html', 'products/index.html', 'servicii/index.html', 'servicii/prelucrare-cnc-lemn/index.html', 'servicii/debitare-circular/index.html', 'servicii/panouri-lemn-masiv-lamela-continua/index.html', 'produse-personalizate/index.html']) {
      const html = await read(dir, file);
      assert.equal(countMatches(html, /name="robots"/g), 1, file);
      assert.ok(html.includes('noindex, nofollow, noarchive'), file);
      assert.ok(html.includes('<div id="root"><header>'), file);
      assert.ok(html.includes('<h1>'), file);
      assert.ok(html.includes('/assets/index-ABC123.js'), file);
    }
    const cnc = await read(dir, 'servicii/prelucrare-cnc-lemn/index.html');
    assert.ok(cnc.includes('Prelucrare CNC a lemnului, MDF-ului și placajului'));
    assert.ok(cnc.includes('tel:+40748831477'));
    assert.ok(cnc.includes('mailto:hawaiisibiu@gmail.com?subject='));
    const hub = await read(dir, 'servicii/index.html');
    for (const href of ['/servicii/prelucrare-cnc-lemn', '/servicii/debitare-circular', '/servicii/panouri-lemn-masiv-lamela-continua', '/produse-personalizate', '/products']) {
      assert.ok(hub.includes(`href="${href}"`), href);
    }
  });
});

test('production build: one catalog query feeds sitemap and all static documents', async () => {
  convexCalls.length = 0;
  await withDist(false, async (dir) => {
    await writeSearchFiles(PROD_ENV, dir);
    const queries = convexCalls.filter(([kind]) => kind === 'query');
    assert.equal(queries.length, 1);
    const sitemap = await read(dir, 'sitemap.xml');
    assert.ok(sitemap.includes('<loc>https://www.hawaiiproducts.ro/servicii</loc>'));
    assert.ok(sitemap.includes('<loc>https://www.hawaiiproducts.ro/produse-personalizate</loc>'));
    assert.ok(sitemap.includes('<loc>https://www.hawaiiproducts.ro/servicii/debitare-circular</loc>'));
    assert.ok(sitemap.includes('<loc>https://www.hawaiiproducts.ro/servicii/panouri-lemn-masiv-lamela-continua</loc>'));
    assert.ok(sitemap.includes('<loc>https://www.hawaiiproducts.ro/product/jx7prod1</loc>'));
    const robots = await read(dir, 'robots.txt');
    for (const disallowed of ['/admin', '/pos', '/cart', '/checkout', '/shipping', '/my-orders', '/login', '/thank-you']) {
      assert.ok(robots.includes(`Disallow: ${disallowed}`), disallowed);
    }
    const home = await read(dir, 'index.html');
    assert.ok(home.includes('index, follow, max-image-preview:large'));
    assert.equal(countMatches(home, /rel="canonical"/g), 1);
    assert.ok(home.includes('<link rel="canonical" href="https://www.hawaiiproducts.ro/"'));
    assert.ok(home.includes('href="/product/jx7prod1"'));
    const listing = await read(dir, 'products/index.html');
    assert.ok(listing.includes('Tocător stejar'));
    const product = await read(dir, 'product/jx7prod1/index.html');
    assert.ok(product.includes('<link rel="canonical" href="https://www.hawaiiproducts.ro/product/jx7prod1"'));
    assert.ok(product.includes('120.50 RON'));
    assert.ok(product.includes('Stoc limitat'));
    assert.ok(product.includes('Tocător stejar'));
    assert.ok(product.includes('Descriere &amp; &quot;ghilimele&quot; &lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;'));
    const ldJson = product.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    assert.ok(ldJson, 'product JSON-LD present');
    assert.ok(ldJson[1].includes('\\u003c/script\\u003e'));
    assert.ok(!ldJson[1].includes('</script><script>'));
    assert.equal(countMatches(product, /name="robots"/g), 1);
    const outOfStock = await read(dir, 'product/jx7prod2/index.html');
    assert.ok(outOfStock.includes('Stoc epuizat'));
    assert.ok(outOfStock.includes('https://schema.org/OutOfStock'));
    assert.ok(!outOfStock.includes('og:image'));
    const circular = await read(dir, 'servicii/debitare-circular/index.html');
    assert.ok(circular.includes('<h1>Debitare la circular</h1>'));
    assert.ok(circular.includes('<link rel="canonical" href="https://www.hawaiiproducts.ro/servicii/debitare-circular"'));
    assert.ok(circular.includes('"Service"'));
    assert.ok(circular.includes('BreadcrumbList'));
    assert.ok(circular.includes('tel:+40748831477'));
    const panels = await read(dir, 'servicii/panouri-lemn-masiv-lamela-continua/index.html');
    assert.ok(panels.includes('<h1>Panouri din lemn masiv cu lamelă continuă</h1>'));
    assert.ok(panels.includes('<link rel="canonical" href="https://www.hawaiiproducts.ro/servicii/panouri-lemn-masiv-lamela-continua"'));
    assert.ok(panels.includes('BreadcrumbList'));
    assert.ok(!panels.includes('"Product"'), 'panels page must not emit Product schema');
    assert.ok(!panels.includes('"Offer"'), 'panels page must not emit Offer schema');
    const panelsTitle = panels.match(/<title[^>]*>([^<]*)<\/title>/);
    assert.ok(panelsTitle && !panelsTitle[1].includes('| Hawaii Woodworking | '), 'single brand');
  });
});

test('renderStaticPage output preserves literal $ tokens and hostile text without template duplication', async () => {
  convexCalls.length = 0;
  catalogResult = 'hostile';
  try {
    await withDist(false, async (dir) => {
      await writeSearchFiles(PROD_ENV, dir);
      const html = await read(dir, 'product/jx7tok/index.html');
      assert.ok(html.includes("Produs $&amp; $` $&#39;"), 'literal dollar tokens preserved in body');
      assert.ok(html.includes('Titlu $&amp; preț'), 'title preserved');
      assert.equal(countMatches(html, /<div id="root">/g), 1);
      assert.equal(countMatches(html, /index-ABC123\.js/g), 1);
      assert.equal(countMatches(html, /<title/g), 1, 'one title element, no nested template title');
      const ld = html.match(/application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
      assert.ok(ld && ld[1].includes('\\u003c') && !ld[1].includes('</title>'));
      assert.ok(!html.includes('</script><script>alert(1)</script></script>'));
    });
  } finally {
    catalogResult = 'default';
  }
});

test('unsafe product ids reject before any search output is written', async () => {
  convexCalls.length = 0;
  catalogResult = 'invalid-id';
  try {
    await withDist(false, async (dir) => {
      await assert.rejects(writeSearchFiles(PROD_ENV, dir), /not safe/);
      for (const rel of ['sitemap.xml', 'robots.txt', 'servicii/index.html', 'products/index.html']) {
        await assert.rejects(read(dir, rel), undefined, `${rel} must not exist`);
      }
      await assert.rejects(read(dir, 'product/index.html'));
      await assert.rejects(read(dir, 'product/escape/index.html'));
    });
  } finally {
    catalogResult = 'default';
  }
});

test('production catalog query failure propagates without emitting success artifacts', async () => {
  convexCalls.length = 0;
  catalogResult = 'fail';
  try {
    await withDist(false, async (dir) => {
      await assert.rejects(writeSearchFiles(PROD_ENV, dir), /catalog unavailable/);
      await assert.rejects(read(dir, 'sitemap.xml'));
    });
  } finally {
    catalogResult = 'default';
  }
});
