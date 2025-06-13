import { Helmet } from 'react-helmet-async';

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
  const siteUrl = 'https://www.hawaiiproducts.ro';
  const siteName = 'Hawaii Woodworking';
  const defaultDescription = 'Produse din lemn personalizate, cadouri artizanale și mobilier pentru restaurante realizate cu pasiune în România';
  const defaultKeywords = [
    'cadouri din lemn',
    'cadouri personalizate',
    'cadouri pentru mama',
    'cadouri pentru tata',
    'decorațiuni din lemn',
    'mobilier restaurant lemn',
    'produse din lemn masiv',
    'cadouri artizanale',
    'decorațiuni restaurant',
    'tâmplărie cnc',
    'prelucrare lemn cnc',
    'mobilier personalizat',
    'cadouri handmade',
    'decorațiuni interioare lemn',
    'cadouri aniversare lemn',
    'hawaii sibiu',
    'platouase'
  ];

  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const finalDescription = description || defaultDescription;
  const finalKeywords = [...defaultKeywords, ...keywords].join(', ');

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
      <meta property="og:site_name" content={siteName} />
      <meta property="og:url" content={`${siteUrl}${window.location.pathname}${window.location.search}`} />
      {image && <meta property="og:image" content={image.startsWith('http') ? image : `${siteUrl}${image}`} />}
      <meta property="og:locale" content="ro_RO" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDescription} />
      {image && <meta name="twitter:image" content={image.startsWith('http') ? image : `${siteUrl}${image}`} />}

      {/* Schema.org JSON-LD */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}

      {/* Canonical URL */}
      <link rel="canonical" href={`${siteUrl}${window.location.pathname}${window.location.search}`} />
    </Helmet>
  );
};
