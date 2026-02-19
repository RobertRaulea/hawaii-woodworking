import type React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS } from '../../constants/site.constants';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  type?: 'website' | 'product' | 'article';
  schema?: object;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords = [],
  image,
  type = 'website',
  schema,
}) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const finalDescription = description || DEFAULT_DESCRIPTION;
  const finalKeywords = [...DEFAULT_KEYWORDS, ...keywords].join(', ');

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      <meta name="robots" content="index, follow" />
      <meta name="language" content="ro" />
      <meta name="geo.region" content="RO" />
      <meta name="geo.placename" content="Romania" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:url" content={`${SITE_URL}${window.location.pathname}${window.location.search}`} />
      {image && <meta property="og:image" content={image.startsWith('http') ? image : `${SITE_URL}${image}`} />}
      <meta property="og:locale" content="ro_RO" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDescription} />
      {image && <meta name="twitter:image" content={image.startsWith('http') ? image : `${SITE_URL}${image}`} />}

      {/* Schema.org JSON-LD */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}

      {/* Canonical URL */}
      <link rel="canonical" href={`${SITE_URL}${window.location.pathname}${window.location.search}`} />
    </Helmet>
  );
};
