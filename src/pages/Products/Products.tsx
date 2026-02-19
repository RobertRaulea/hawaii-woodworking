import type React from 'react';
import { useState, useMemo } from 'react';
import { useProducts } from '../../hooks/useProducts';
import type { Product } from '../../types/product.types';
import { SEO } from '../../components/SEO/SEO';
import { ProductCard } from '../../components/ProductCard';
import { SITE_URL } from '../../constants/site.constants';

export const Products: React.FC = () => {
  const pageTitle = "Produse din Lemn Artizanale - Hawaii Woodworking";
  const pageDescription = "Explorați gama noastră variată de produse din lemn lucrate manual: cadouri personalizate, decorațiuni unice și mobilier pentru casă și restaurant. Calitate românească.";
  const pageKeywords = [
    'produse lemn românia',
    'magazin online cadouri lemn',
    'decorațiuni handmade lemn',
    'mobilier lemn masiv',
    'artizanat românesc lemn'
  ];

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { products, loading, error } = useProducts();

  const pageUrl = useMemo(() => 
    typeof window !== 'undefined' ? window.location.href : `${SITE_URL}/products`
  , []);

  const dynamicSchema = useMemo(() => {
    const itemListElements = (!loading && products && products.length > 0)
      ? products.map((product: Product, index: number) => {
          const imageUrl = product.imageUrls?.[0] ?? `${SITE_URL}/images/placeholder-product.jpg`;

          return {
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Product',
              name: product.name,
              url: `${SITE_URL}/product/${product.id}`,
              image: imageUrl,
              description: product.description || product.name, 
              offers: {
                '@type': 'Offer',
                priceCurrency: 'RON',
                price: product.price.toFixed(2),
                availability: 'https://schema.org/InStock', 
                url: `${SITE_URL}/product/${product.id}`
              },
              brand: {
                '@type': 'Brand',
                name: 'Hawaii Woodworking'
              }
            }
          };
        })
      : [];

    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: pageTitle,
      description: pageDescription,
      url: pageUrl,
      mainEntity: {
        '@type': 'ItemList',
        name: 'Listă Produse Hawaii Woodworking',
        description: 'Descoperiți toate produsele din lemn lucrate manual, disponibile în magazinul nostru online.',
        itemListElement: itemListElements,
      }
    };
  }, [products, loading, pageTitle, pageDescription, pageUrl]);

  const categories: string[] = useMemo(() => [
    'all',
    ...Array.from(new Set(products.map((p: Product) => p.category ?? ''))).filter((c): c is string => c !== '')
  ], [products]);

  const filteredProducts = useMemo(() => 
    selectedCategory === 'all'
      ? products
      : products.filter((product: Product) => product.category === selectedCategory)
  , [products, selectedCategory]);

  return (
    <>
      <SEO 
        title={pageTitle}
        description={pageDescription}
        keywords={pageKeywords}
        schema={dynamicSchema}
      />
      <div className="container mx-auto px-4 py-8">
        {loading && <p>Loading products...</p>}
        {error && <p className="text-red-500">{error}</p>}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Produsele Noastre</h2>
          <div className="flex flex-wrap gap-4">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg capitalize ${selectedCategory === category ? 'bg-amber-700 text-white' : 'bg-stone-100 text-gray-900 hover:bg-stone-200'}`}
              >
                {category === 'all' ? 'Toate' : category}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product: Product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              imageUrls={product.imageUrls ?? null}
            />
          ))}
        </div>
      </div>
    </>
  );
};
