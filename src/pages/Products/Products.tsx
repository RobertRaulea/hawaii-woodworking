import { useState, useMemo } from 'react';
import { useCart } from '@context/CartContext';
import { Link } from 'react-router-dom';
import { useProducts, Product as P } from '../../hooks/useProducts';
import { storageUrl } from '../../utils/supabaseClient';
import { SEO } from '../../components/SEO/SEO';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  images: string[] | null;
}

const ProductCard: React.FC<ProductCardProps> = ({ name, price, images: productImages, id }) => {
  const { addItem } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(() => {
    if (!productImages || productImages.length === 0) return 0;
    const mainImageIdx = productImages.findIndex(img => 
      img.endsWith('_main.png') || img.endsWith('_main.jpg') || img.endsWith('_main.webp')
    );
    return mainImageIdx !== -1 ? mainImageIdx : 0;
  });

  const coverImagePathOnly = productImages && productImages.length > 0 
    ? (productImages.find(img => img.endsWith('_main.png') || img.endsWith('_main.jpg') || img.endsWith('_main.webp')) || productImages[0]) 
    : null;

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (productImages && productImages.length > 0) {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % productImages.length);
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (productImages && productImages.length > 0) {
      setCurrentImageIndex((prevIndex) => (prevIndex - 1 + productImages.length) % productImages.length);
    }
  };

  return (
    <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <Link to={`/product/${id}`} className="block">
        <div className="relative group/carousel"> 
          <img
            src={productImages && productImages.length > 0 ? `${storageUrl}/${productImages[currentImageIndex]}` : 'https://placehold.co/600x400?text=Product+Image'}
            alt={`${name} - image ${currentImageIndex + 1}`}
            className="w-full h-64 object-cover transition-all duration-300 ease-in-out"
          />
          {productImages && productImages.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-30 text-white p-2 rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hover:bg-opacity-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-75 z-10"
                aria-label="Previous Image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-30 text-white p-2 rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hover:bg-opacity-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-75 z-10"
                aria-label="Next Image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </>
          )}
        </div>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2 truncate" title={name}>{name}</h3>
          <p className="text-amber-700 font-medium text-lg">{price.toFixed(2)} RON</p>
        </div>
      </Link>
      <div className="p-6 pt-0">
        <button
          onClick={() => addItem({ id, name, price, image: coverImagePathOnly || 'https://placehold.co/100x100?text=No+Image' })}
          className="w-full bg-stone-100 hover:bg-stone-200 text-gray-900 px-4 py-3 rounded-lg transition-colors"
        >
          Adaugă în Coș
        </button>
      </div>
    </div>
  );
};

export const Products: React.FC = () => {
  const SITE_URL = 'https://www.hawaiiproducts.ro';
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
  , [SITE_URL]);

  const dynamicSchema = useMemo(() => {
    const itemListElements = (!loading && products && products.length > 0)
      ? products.map((product: P, index: number) => {
          const mainImage = product.images && product.images.length > 0
            ? (product.images.find(img => img.endsWith('_main.png') || img.endsWith('_main.jpg') || img.endsWith('_main.webp')) || product.images[0])
            : null;
          const imageUrl = mainImage ? `${storageUrl}/${mainImage}` : `${SITE_URL}/images/placeholder-product.jpg`; 

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
  }, [products, loading, pageTitle, pageDescription, pageUrl, SITE_URL]);

  const categories: string[] = useMemo(() => [
    'all',
    ...Array.from(new Set(products.map((p: P) => p.category ?? ''))).filter((c): c is string => c !== '')
  ], [products]);

  const filteredProducts = useMemo(() => 
    selectedCategory === 'all'
      ? products
      : products.filter((product: P) => product.category === selectedCategory)
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
          {filteredProducts.map((product: P) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              images={product.images ?? null}
            />
          ))}
        </div>
      </div>
    </>
  );
};
