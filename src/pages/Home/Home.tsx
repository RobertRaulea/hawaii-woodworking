import { Hero } from '../../components/Hero';
import { Products } from '../Products/Products';
import { SEO } from '../../components/SEO/SEO';
import WoodPhoto from '../../../assets/HeroAssets/WoodPhoto.jpg';

export const Home: React.FC = () => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Hawaii Tâmplărie',
    description: 'Produse din lemn personalizate, cadouri artizanale și mobilier pentru restaurante realizate cu pasiune în România',
    url: window.location.origin,
    potentialAction: {
      '@type': 'SearchAction',
      'target': `${window.location.origin}/products?search={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <>
      <SEO
        title="Cadouri din Lemn Personalizate și Mobilier pentru Restaurante"
        description="Descoperă colecția noastră de cadouri din lemn personalizate, decorațiuni artizanale și mobilier pentru restaurante. Produse handmade cu dragoste în România."
        keywords={[
          'cadouri din lemn personalizate',
          'decorațiuni restaurant lemn',
          'cadouri pentru părinți',
          'mobilier restaurant personalizat',
          'cadouri artizanale romania'
        ]}
        schema={schema}
      />
      <Hero backgroundImage={WoodPhoto} />
      {/* Product listing directly on homepage */}
      <Products />
    </>
  );
};
