import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { marketingCopy } from '../shared/seo/marketing';
import type { LandingPage, MarketingCopy } from '../shared/seo/marketing';
import {
  BUSINESS,
  SITE_NAME,
  brandedTitle,
  buildProductSeo,
  buildServiceSchema,
  canonicalUrl,
  escapeHtml,
  mailtoHref,
  normalizeWhitespace,
  offerAvailability,
  organizationSchema,
  routeRobots,
  serializeJsonLd,
  webSiteSchema,
} from '../shared/seo/seo.utils';
import type { SeoProduct } from '../shared/seo/seo.types';

export interface StaticPage {
  path: string;
  title: string;
  description: string;
  canonical: string;
  type: 'website' | 'product' | 'article';
  robots: string;
  image?: string;
  schema?: Record<string, unknown>;
  body: string;
}

export type LocaleDict = Record<string, Record<string, string | undefined> | undefined>;

const text = (locale: LocaleDict, group: string, key: string): string =>
  locale[group]?.[key] ?? '';

const AVAILABILITY_LABELS: Record<string, string> = {
  'https://schema.org/InStock': 'În stoc',
  'https://schema.org/LimitedAvailability': 'Stoc limitat',
  'https://schema.org/OutOfStock': 'Stoc epuizat',
};

export const assertSafeProductId = (id: string): string => {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error(`Product id is not safe for static paths: ${id}`);
  }
  return id;
};

const navHtml = (locale: LocaleDict) => `<header>
<nav aria-label="Navigare principală">
<a href="/">${escapeHtml(text(locale, 'nav', 'home'))}</a>
<a href="/products">${escapeHtml(text(locale, 'nav', 'products'))}</a>
<a href="/catalog">${escapeHtml(text(locale, 'nav', 'catalog'))}</a>
<a href="/servicii">${escapeHtml(text(locale, 'nav', 'services'))}</a>
</nav>
</header>`;

const footerHtml = (locale: LocaleDict) => `<footer>
<h2>${escapeHtml(text(locale, 'footer', 'contact') || 'Contact')}</h2>
<p><a href="mailto:${escapeHtml(BUSINESS.email)}">${escapeHtml(BUSINESS.email)}</a></p>
<p><a href="${escapeHtml(BUSINESS.phoneHref)}">${escapeHtml(BUSINESS.phoneDisplay)}</a></p>
<p>${escapeHtml(BUSINESS.legalName)}</p>
</footer>`;

const productListHtml = (products: SeoProduct[]) =>
  products.length === 0
    ? ''
    : `<ul>\n${products
        .map((product) => {
          const description = normalizeWhitespace(product.description_ro ?? product.description ?? '');
          return `  <li><a href="/product/${escapeHtml(assertSafeProductId(product._id))}">${escapeHtml(product.name_ro || product.name)}</a> — ${escapeHtml(product.price.toFixed(2))} RON${description ? `<br>${escapeHtml(description)}` : ''}</li>`;
        })
        .join('\n')}\n</ul>`;

const serviceCardsHtml = (content: LandingPage) =>
  !content.cards || content.cards.length === 0
    ? ''
    : `<ul>\n${content.cards
        .map(
          (card) =>
            `  <li><a href="${escapeHtml(card.href)}"><strong>${escapeHtml(card.title)}</strong><br>${escapeHtml(card.body)}<br>${escapeHtml(card.linkLabel)}</a></li>`,
        )
        .join('\n')}\n</ul>`;

const landingSectionsHtml = (content: LandingPage) =>
  content.sections
    .map((section) => {
      const paragraphs = (section.paragraphs ?? [])
        .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
        .join('\n');
      const bullets =
        section.bullets && section.bullets.length > 0
          ? `<ul>\n${section.bullets.map((bullet) => `  <li>${escapeHtml(bullet)}</li>`).join('\n')}\n</ul>`
          : '';
      return `<section>\n<h2>${escapeHtml(section.heading)}</h2>\n${paragraphs}\n${bullets}\n</section>`;
    })
    .join('\n');

const landingFaqHtml = (content: LandingPage) => `<section>
<h2>${escapeHtml(content.faqTitle)}</h2>
${content.faqs
  .map(
    (faq) => `<details>\n<summary>${escapeHtml(faq.question)}</summary>\n<p>${escapeHtml(faq.answer)}</p>\n</details>`,
  )
  .join('\n')}
</section>`;

const landingCtaHtml = (content: LandingPage, copy: MarketingCopy) => `<section>
<h2>${escapeHtml(content.ctaTitle)}</h2>
<p>${escapeHtml(content.ctaBody)}</p>
<p><a href="${escapeHtml(BUSINESS.phoneHref)}">${escapeHtml(copy.contact.callLabel)}: ${escapeHtml(BUSINESS.phoneDisplay)}</a></p>
<p><a href="${escapeHtml(mailtoHref(BUSINESS.email, content.emailSubject, content.emailBody))}">${escapeHtml(copy.contact.emailLabel)}</a></p>
<p>${escapeHtml(BUSINESS.email)}</p>
</section>`;

const landingBody = (content: LandingPage, copy: MarketingCopy) => {
  const crumbs =
    content.path === '/servicii'
      ? `<a href="/">${escapeHtml(copy.crumbs.home)}</a>`
      : `<a href="/">${escapeHtml(copy.crumbs.home)}</a> / <a href="/servicii">${escapeHtml(copy.crumbs.services)}</a>`;
  return `<main>
<nav aria-label="Breadcrumb"><ol><li>${crumbs}</li><li>${escapeHtml(content.crumb)}</li></ol></nav>
<p>${escapeHtml(content.eyebrow)}</p>
<h1>${escapeHtml(content.heading)}</h1>
<p>${escapeHtml(content.intro)}</p>
${serviceCardsHtml(content)}
${landingSectionsHtml(content)}
${landingFaqHtml(content)}
${landingCtaHtml(content, copy)}
</main>`;
};

const landingSchema = (siteUrl: string, copy: MarketingCopy, content: LandingPage) => {
  const breadcrumbs = [
    { name: copy.crumbs.home, path: '/' },
    ...(content.path === '/servicii' ? [] : [{ name: copy.crumbs.services, path: '/servicii' }]),
    { name: content.crumb, path: content.path },
  ];
  if (content.kind === 'service') {
    return buildServiceSchema({
      siteUrl,
      name: content.heading,
      description: content.seoDescription,
      canonicalPath: content.path,
      breadcrumbs,
    });
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        name: content.heading,
        description: content.seoDescription,
        url: canonicalUrl(siteUrl, content.path),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: canonicalUrl(siteUrl, crumb.path),
        })),
      },
    ],
  };
};

const productBody = (product: SeoProduct, locale: LocaleDict) => {
  const description = normalizeWhitespace(product.description_ro ?? product.description ?? '');
  const images = (product.imageUrls ?? []).filter(
    (url): url is string => typeof url === 'string' && url.trim() !== '',
  );
  const availability =
    AVAILABILITY_LABELS[offerAvailability(product)] ?? AVAILABILITY_LABELS['https://schema.org/InStock'];
  return `<main>
<nav aria-label="Breadcrumb"><ol><li><a href="/">${escapeHtml(text(locale, 'nav', 'home'))}</a></li><li><a href="/products">${escapeHtml(text(locale, 'nav', 'products'))}</a></li><li>${escapeHtml(product.name_ro || product.name)}</li></ol></nav>
<h1>${escapeHtml(product.name_ro || product.name)}</h1>
${images.map((url) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(product.name_ro || product.name)}" loading="lazy">`).join('\n')}
<p>${escapeHtml(product.price.toFixed(2))} RON</p>
<p>${escapeHtml(availability)}</p>
${description ? `<p>${escapeHtml(description)}</p>` : ''}
<p><a href="/products">${escapeHtml(text(locale, 'nav', 'allProducts') || text(locale, 'nav', 'products'))}</a></p>
</main>`;
};

export interface StaticPagesInput {
  environment: string;
  siteUrl: string;
  products: SeoProduct[];
  locale: LocaleDict;
}

export const buildStaticPages = ({
  environment,
  siteUrl,
  products,
  locale,
}: StaticPagesInput): StaticPage[] => {
  const copy = marketingCopy.ro;
  const robots = (pathname: string) => routeRobots(pathname, '', environment as 'test' | 'production');
  const pages: StaticPage[] = [];

  const homeTitle = text(locale, 'seo', 'homeTitle') || SITE_NAME;
  const homeDescription =
    text(locale, 'seo', 'homeDescription') || text(locale, 'hero', 'description');
  pages.push({
    path: '/',
    title: brandedTitle(homeTitle, SITE_NAME),
    description: homeDescription,
    canonical: canonicalUrl(siteUrl, '/'),
    type: 'website',
    robots: robots('/'),
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        webSiteSchema(siteUrl, SITE_NAME, homeDescription),
        organizationSchema(siteUrl),
      ],
    },
    body: `<main>
<h1>${escapeHtml(text(locale, 'hero', 'title'))}</h1>
<p>${escapeHtml(text(locale, 'hero', 'subtitle'))}</p>
<p>${escapeHtml(text(locale, 'hero', 'description'))}</p>
<p><a href="/catalog">${escapeHtml(text(locale, 'hero', 'viewCatalog'))}</a></p>
<section>
<h2>${escapeHtml(text(locale, 'nav', 'products'))}</h2>
${productListHtml(products)}
<p><a href="/products">${escapeHtml(text(locale, 'nav', 'allProducts') || text(locale, 'nav', 'products'))}</a></p>
</section>
<section>
<h2>${escapeHtml(copy.pages.services.heading)}</h2>
<p>${escapeHtml(copy.pages.services.intro)}</p>
${serviceCardsHtml(copy.pages.services)}
</section>
</main>`,
  });

  const productsTitle = text(locale, 'seo', 'productsTitle') || text(locale, 'nav', 'products');
  const productsDescription = text(locale, 'seo', 'productsDescription');
  pages.push({
    path: '/products',
    title: brandedTitle(productsTitle, SITE_NAME),
    description: productsDescription,
    canonical: canonicalUrl(siteUrl, '/products'),
    type: 'website',
    robots: robots('/products'),
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: productsTitle,
      description: productsDescription,
      url: canonicalUrl(siteUrl, '/products'),
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: products.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: product.name_ro || product.name,
          url: canonicalUrl(siteUrl, `/product/${product._id}`),
        })),
      },
    },
    body: `<main>
<h1>${escapeHtml(text(locale, 'nav', 'products'))}</h1>
<p>${escapeHtml(productsDescription)}</p>
${productListHtml(products)}
</main>`,
  });

  for (const key of ['services', 'cnc', 'custom', 'circular', 'panels'] as const) {
    const content = copy.pages[key];
    pages.push({
      path: content.path,
      title: brandedTitle(content.seoTitle, SITE_NAME),
      description: content.seoDescription,
      canonical: canonicalUrl(siteUrl, content.path),
      type: 'website',
      robots: robots(content.path),
      schema: landingSchema(siteUrl, copy, content),
      body: landingBody(content, copy),
    });
  }

  for (const product of products) {
    const id = assertSafeProductId(product._id);
    if (!id) continue;
    const seo = buildProductSeo(product, siteUrl, 'ro');
    pages.push({
      path: `/product/${id}`,
      title: brandedTitle(seo.title, SITE_NAME),
      description: seo.description,
      canonical: canonicalUrl(siteUrl, seo.canonicalPath),
      type: 'product',
      robots: robots(`/product/${id}`),
      ...(seo.image ? { image: seo.image } : {}),
      schema: seo.schema,
      body: productBody(product, locale),
    });
  }

  return pages;
};

const HEAD_REMOVALS = [
  /<title[^>]*>[\s\S]*?<\/title[^>]*>\s*/gi,
  /<meta[^>]*name="description"[^>]*>\s*/gi,
  /<meta[^>]*name="robots"[^>]*>\s*/gi,
  /<link[^>]*rel="canonical"[^>]*>\s*/gi,
  /<meta[^>]*property="og:[^"]*"[^>]*>\s*/gi,
  /<meta[^>]*name="twitter:[^"]*"[^>]*>\s*/gi,
  /<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script[^>]*>\s*/gi,
];

export const renderStaticPage = (template: string, page: StaticPage): string => {
  let html = template;
  for (const pattern of HEAD_REMOVALS) {
    html = html.replace(pattern, '');
  }
  const head = [
    `<title data-rh="true">${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}" data-rh="true">`,
    `<meta name="robots" content="${escapeHtml(page.robots)}" data-rh="true">`,
    `<link rel="canonical" href="${escapeHtml(page.canonical)}" data-rh="true">`,
    `<meta property="og:type" content="${page.type === 'article' ? 'article' : 'website'}" data-rh="true">`,
    `<meta property="og:title" content="${escapeHtml(page.title)}" data-rh="true">`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" data-rh="true">`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" data-rh="true">`,
    `<meta property="og:url" content="${escapeHtml(page.canonical)}" data-rh="true">`,
    `<meta property="og:locale" content="ro_RO" data-rh="true">`,
    `<meta name="twitter:card" content="summary_large_image" data-rh="true">`,
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" data-rh="true">`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}" data-rh="true">`,
    page.image
      ? `<meta property="og:image" content="${escapeHtml(page.image)}" data-rh="true">\n    <meta name="twitter:image" content="${escapeHtml(page.image)}" data-rh="true">`
      : '',
    page.schema
      ? `<script type="application/ld+json" data-rh="true">${serializeJsonLd(page.schema)}</script>`
      : '',
  ]
    .filter(Boolean)
    .join('\n    ');
  if (!html.includes('</head>')) {
    throw new Error('index.html template is missing </head>.');
  }
  html = html.replace('</head>', () => `    ${head}\n  </head>`);
  if (!html.includes('<div id="root"></div>')) {
    throw new Error('index.html template is missing the #root mount point.');
  }
  return html.replace('<div id="root"></div>', () => `<div id="root"><div data-prerender>${page.body}</div></div>`);
};

export const writeStaticPages = async (
  input: StaticPagesInput,
  outputDirectory: string,
): Promise<StaticPage[]> => {
  const template = await readFile(path.join(outputDirectory, 'index.html'), 'utf8');
  const pages = buildStaticPages(input);
  const shellStart = `${navHtml(input.locale)}\n`;
  const shellEnd = `\n${footerHtml(input.locale)}`;
  for (const page of pages) {
    const html = renderStaticPage(template, {
      ...page,
      body: `${shellStart}${page.body}${shellEnd}`,
    });
    const target =
      page.path === '/'
        ? path.join(outputDirectory, 'index.html')
        : path.join(outputDirectory, ...page.path.split('/').filter(Boolean), 'index.html');
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html);
  }
  return pages;
};
