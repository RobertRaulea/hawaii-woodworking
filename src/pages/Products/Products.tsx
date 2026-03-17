import type React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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

  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category');
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFromUrl || 'all');
  const { products, loading, error } = useProducts();

  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      setSelectedCategory(category);
    } else {
      setSelectedCategory('all');
    }
  }, [searchParams]);

  const handleClearFilter = () => {
    setSelectedCategory('all');
    setSearchParams({});
  };

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
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-stone-300 border-t-amber-600 rounded-full animate-spin"></div>
          </div>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="mb-10">
          <h2 className="font-serif text-3xl lg:text-4xl font-medium text-stone-900 mb-6">
            {selectedCategory !== 'all' ? selectedCategory : 'Produsele Noastre'}
          </h2>
          
          {/* Selected category indicator */}
          {selectedCategory !== 'all' && (
            <div className="flex items-center gap-2 text-sm text-stone-600 mb-4">
              <span>Afișare produse din categoria:</span>
              <span className="font-medium text-stone-900">{selectedCategory}</span>
              <button
                onClick={handleClearFilter}
                className="ml-2 text-amber-600 hover:text-amber-700 underline"
              >
                Șterge filtrul
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
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
