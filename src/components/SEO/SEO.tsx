import type React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS } from '../../constants/site.constants';
import { brandedTitle, canonicalUrl, routeRobots, serializeJsonLd } from '../../../shared/seo/seo.utils';
import type { EnvironmentName } from '../../../shared/environment';

interface SEOProps {
 title?: string;
 description?: string;
 keywords?: string[];
 image?: string;
 type?: 'website' | 'product' | 'article';
 schema?: object;
 canonicalPath?: string;
 noindex?: boolean;
 environment?: EnvironmentName;
}

const OG_LOCALES: Record<string, string> = {
 ro: 'ro_RO',
 en: 'en_US',
 de: 'de_DE',
};

export const SEO: React.FC<SEOProps> = ({
 title,
 description,
 keywords = [],
 image,
 type = 'website',
 schema,
 canonicalPath,
 noindex = false,
 environment,
}) => {
 const { i18n } = useTranslation();
 const location = useLocation();
 const language = i18n.language === 'en' || i18n.language === 'de' ? i18n.language : 'ro';
 const fullTitle = title ? brandedTitle(title, SITE_NAME) : SITE_NAME;
 const finalDescription = description || DEFAULT_DESCRIPTION;
 const finalKeywords = [...DEFAULT_KEYWORDS, ...keywords].join(', ');
 const canonical = canonicalUrl(SITE_URL, canonicalPath ?? location.pathname);
 const resolvedEnvironment =
 environment ??
 ((import.meta.env?.VITE_APP_ENV as string | undefined) === 'production' ? 'production' : 'test');
 const robots = resolvedEnvironment === 'test'
 ? routeRobots(location.pathname, location.search, resolvedEnvironment)
 : noindex
 ? 'noindex, follow'
 : routeRobots(location.pathname, location.search, resolvedEnvironment);
 const absoluteImage = image
 ? image.startsWith('http') ? image : `${SITE_URL}${image}`
 : undefined;

 return (
 <Helmet>
 <html lang={language} />
 {/* Basic Meta Tags */}
 <title>{fullTitle}</title>
 <meta name="description" content={finalDescription} />
 <meta name="keywords" content={finalKeywords} />
 <meta name="robots" content={robots} />
 <meta name="language" content={language} />
 <meta name="geo.region" content="RO" />
 <meta name="geo.placename" content="Romania" />

 {/* Open Graph / Facebook */}
 <meta property="og:type" content={type === 'article' ? 'article' : 'website'} />
 <meta property="og:title" content={fullTitle} />
 <meta property="og:description" content={finalDescription} />
 <meta property="og:site_name" content={SITE_NAME} />
 <meta property="og:url" content={canonical} />
 {absoluteImage && <meta property="og:image" content={absoluteImage} />}
 <meta property="og:locale" content={OG_LOCALES[language]} />

 {/* Twitter */}
 <meta name="twitter:card" content="summary_large_image" />
 <meta name="twitter:title" content={fullTitle} />
 <meta name="twitter:description" content={finalDescription} />
 {absoluteImage && <meta name="twitter:image" content={absoluteImage} />}

 {/* Schema.org JSON-LD */}
 {schema && (
 <script type="application/ld+json">
 {serializeJsonLd(schema)}
 </script>
 )}

 {/* Canonical URL */}
 <link rel="canonical" href={canonical} />
 </Helmet>
 );
};
