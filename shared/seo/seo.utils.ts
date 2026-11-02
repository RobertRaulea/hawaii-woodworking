import type {
  BuiltProductSeo,
  SeoProduct,
  SiteEnvironment,
  SiteLanguage,
} from './seo.types';

export const SITE_NAME = 'Hawaii Woodworking';
export const SEO_TITLE_MAX_LENGTH = 100;
export const SEO_DESCRIPTION_MAX_LENGTH = 320;
export const META_DESCRIPTION_MAX_LENGTH = 160;

export const BUSINESS = {
  name: SITE_NAME,
  legalName: 'HAWAII WOODWORKING SIBIU SRL',
  email: 'hawaiisibiu@gmail.com',
  phoneDisplay: '+40 748 831 477',
  phoneHref: 'tel:+40748831477',
  address: 'Cristian, Str. XIII, Nr. 113, Jud. Sibiu',
  country: 'România',
} as const;

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export const PRIVATE_PATH_PREFIXES = [
  '/admin',
  '/pos',
  '/cart',
  '/shipping',
  '/checkout',
  '/login',
  '/my-orders',
  '/thank-you',
] as const;

export const PUBLIC_PATHS = [
  '/',
  '/products',
  '/catalog',
  '/servicii',
  '/servicii/prelucrare-cnc-lemn',
  '/servicii/debitare-circular',
  '/servicii/panouri-lemn-masiv-lamela-continua',
  '/produse-personalizate',
  '/terms-and-conditions',
  '/privacy-policy',
  '/return-policy',
  '/legal-information',
] as const;

const TRACKING_PARAM_PATTERN =
  /^(utm_[a-z0-9_]+|gclid|fbclid|msclkid|dclid|gad_source|gbraid|wbraid|mc_cid|mc_eid|igshid|_hsenc|_hsmi)$/i;

export const resolveSiteLanguage = (
  value: string | undefined | null,
): SiteLanguage => (value === 'en' || value === 'de' ? value : 'ro');

export const ogLocale = (language: SiteLanguage): string =>
  language === 'en' ? 'en_US' : language === 'de' ? 'de_DE' : 'ro_RO';

export const normalizePathname = (pathname: string): string => {
  let path = pathname;
  if (/^https?:\/\//i.test(path) || path.startsWith('//')) {
    try {
      path = new URL(path.startsWith('//') ? `https:${path}` : path).pathname;
    } catch {
      path = '/';
    }
  }
  path = path.split('?')[0].split('#')[0];
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/{2,}/g, '/');
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
};

export const canonicalUrl = (siteUrl: string, pathname: string): string => {
  const origin = new URL(siteUrl).origin;
  return `${origin}${normalizePathname(pathname)}`;
};

export const isTrackingParam = (name: string): boolean =>
  TRACKING_PARAM_PATTERN.test(name);

export const hasNonTrackingParams = (search: string): boolean => {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  for (const key of params.keys()) {
    if (!isTrackingParam(key)) return true;
  }
  return false;
};

export const isPrivatePathname = (pathname: string): boolean => {
  const path = normalizePathname(pathname);
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
};

export const isPublicPathname = (pathname: string): boolean => {
  const path = normalizePathname(pathname);
  return (
    (PUBLIC_PATHS as readonly string[]).includes(path) ||
    /^\/product\/[^/]+$/.test(path)
  );
};

export const routeRobots = (
  pathname: string,
  search: string,
  environment: SiteEnvironment,
): string => {
  if (environment === 'test') return 'noindex, nofollow, noarchive';
  const path = normalizePathname(pathname);
  if (path === '/products') {
    return hasNonTrackingParams(search)
      ? 'noindex, follow'
      : 'index, follow, max-image-preview:large';
  }
  if (isPublicPathname(path)) return 'index, follow, max-image-preview:large';
  return 'noindex, follow';
};

export const serializeJsonLd = (value: unknown): string =>
  JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (char) => {
    switch (char) {
      case '<':
        return '\\u003c';
      case '>':
        return '\\u003e';
      case '&':
        return '\\u0026';
      case '\u2028':
        return '\\u2028';
      default:
        return '\\u2029';
    }
  });

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const escapeXml = escapeHtml;

export const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

export const mailtoHref = (email: string, subject: string, body: string): string =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const brandedTitle = (title: string, siteName: string): string => {
  const trimmed = title.trim();
  if (!trimmed) return siteName;
  if (trimmed.toLowerCase().includes(siteName.toLowerCase())) return trimmed;
  return `${trimmed} | ${siteName}`;
};

export const normalizeDescription = (
  text: string | null | undefined,
  maxLength = META_DESCRIPTION_MAX_LENGTH,
): string => {
  if (!text) return '';
  const clean = normalizeWhitespace(text);
  if (clean.length <= maxLength) return clean;
  const cut = clean.slice(0, maxLength + 1);
  const boundary = cut.lastIndexOf(' ');
  return `${cut.slice(0, boundary > 0 ? boundary : maxLength).trimEnd()}…`;
};

export const offerAvailability = (product: SeoProduct): string => {
  const tracked = product.trackStock ?? true;
  if (!tracked) return 'https://schema.org/InStock';
  const stock = product.availableStock ?? 0;
  if (stock <= 0) return 'https://schema.org/OutOfStock';
  const threshold = product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  return stock <= threshold
    ? 'https://schema.org/LimitedAvailability'
    : 'https://schema.org/InStock';
};

const fallbackProductDescriptions: Record<SiteLanguage, (name: string) => string> = {
  ro: (name) => `${name} – disponibil în magazinul online Hawaii Woodworking.`,
  en: (name) => `${name} – available in the Hawaii Woodworking online shop.`,
  de: (name) => `${name} – im Hawaii Woodworking Online-Shop erhältlich.`,
};

const breadcrumbNames: Record<SiteLanguage, [string, string]> = {
  ro: ['Acasă', 'Produse'],
  en: ['Home', 'Products'],
  de: ['Startseite', 'Produkte'],
};

export const buildProductSeo = (
  product: SeoProduct,
  siteUrl: string,
  language: SiteLanguage = 'ro',
): BuiltProductSeo => {
  const isRo = language === 'ro';
  const name = (isRo ? product.name_ro || product.name : product.name).trim() || product.name;
  const rawDescription = isRo
    ? product.description_ro || product.description
    : product.description;
  const overrideTitle = isRo ? product.seoTitle?.trim() : undefined;
  const overrideDescription = isRo ? product.seoDescription?.trim() : undefined;
  const title = overrideTitle || name;
  const normalized = normalizeDescription(rawDescription);
  const description =
    overrideDescription ||
    normalized ||
    fallbackProductDescriptions[language](name);
  const canonicalPath = `/product/${encodeURIComponent(product._id)}`;
  const canonical = canonicalUrl(siteUrl, canonicalPath);
  const images = (product.imageUrls ?? []).filter(
    (url): url is string => typeof url === 'string' && url.length > 0,
  );
  const [homeLabel, productsLabel] = breadcrumbNames[language];
  const productNode: Record<string, unknown> = {
    '@type': 'Product',
    '@id': `${canonical}#product`,
    name,
    description,
    sku: product.sku || product._id,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: canonical,
      priceCurrency: 'RON',
      price: product.price.toFixed(2),
      availability: offerAvailability(product),
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
  if (images.length > 0) productNode.image = images;
  return {
    title,
    description,
    canonicalPath,
    image: images[0],
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        productNode,
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: homeLabel, item: canonicalUrl(siteUrl, '/') },
            { '@type': 'ListItem', position: 2, name: productsLabel, item: canonicalUrl(siteUrl, '/products') },
            { '@type': 'ListItem', position: 3, name, item: canonical },
          ],
        },
      ],
    },
  };
};

export const buildProductListSchema = (
  items: { name: string; url: string }[],
  siteUrl: string,
  name: string,
  description: string,
): Record<string, unknown> => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name,
  description,
  url: canonicalUrl(siteUrl, '/products'),
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  },
});

export const webSiteSchema = (
  siteUrl: string,
  name: string,
  description: string,
): Record<string, unknown> => ({
  '@type': 'WebSite',
  name,
  url: canonicalUrl(siteUrl, '/'),
  description,
});

export const organizationSchema = (siteUrl: string): Record<string, unknown> => ({
  '@type': 'Organization',
  name: BUSINESS.name,
  legalName: BUSINESS.legalName,
  url: canonicalUrl(siteUrl, '/'),
  email: BUSINESS.email,
  telephone: BUSINESS.phoneDisplay,
});

export interface ServiceSchemaInput {
  siteUrl: string;
  name: string;
  description: string;
  canonicalPath: string;
  breadcrumbs: { name: string; path: string }[];
}

export const buildServiceSchema = ({
  siteUrl,
  name,
  description,
  canonicalPath,
  breadcrumbs,
}: ServiceSchemaInput): Record<string, unknown> => {
  const url = canonicalUrl(siteUrl, canonicalPath);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        '@id': `${url}#service`,
        name,
        description,
        url,
        serviceType: name,
        provider: {
          '@type': 'Organization',
          name: BUSINESS.name,
          url: canonicalUrl(siteUrl, '/'),
          email: BUSINESS.email,
          telephone: BUSINESS.phoneDisplay,
        },
        areaServed: { '@type': 'Country', name: 'Romania' },
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
