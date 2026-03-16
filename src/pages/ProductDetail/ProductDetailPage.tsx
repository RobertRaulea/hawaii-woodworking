import type React from 'react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useCart } from '../../context/CartContext';
import { SEO } from '../../components/SEO/SEO';
import { ImageCarousel } from '../../components/ImageCarousel';

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { addItem } = useCart();

  const product = useQuery(
    api.products.getById,
    productId ? { id: productId as Id<'products'> } : 'skip'
  );

  const loading = product === undefined;

  const productImages = useMemo(() => {
    if (product?.imageUrls && product.imageUrls.length > 0) {
      return product.imageUrls;
    }
    return ['https://placehold.co/600x400?text=Product+Image'];
  }, [product?.imageUrls]);

  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading product details...</div>;
  }

  if (!product) {
    return <div className="container mx-auto px-4 py-8 text-center">Product not found.</div>;
  }

  // Fallback for description if not available
  const shortDescription = product.description || `Details for ${product.name}. Discover the quality and craftsmanship of our handmade ${product.category || 'item'}.`;

  // SEO Meta Tags and Schema
  const pageTitle = `${product.name} - Hawaii Woodworking`;
  const pageDescription = product.description ? product.description.substring(0, 160) : `Descoperă ${product.name}, un articol din lemn lucrat manual, perfect pentru cadouri sau decorațiuni. Calitate și design românesc de la Hawaii Woodworking.`;
  const pageKeywords = [
    product.name,
    product.category || 'produs lemn',
    'cadouri lemn personalizate',
    'artizanat românesc',
    'handmade România',
    'Hawaii Woodworking',
    'platouase',
    'hawaii sibiu'
  ];
  
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || pageDescription,
    image: productImages[0],
    sku: product._id,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'RON',
      price: product.price.toFixed(2),
      availability: 'https://schema.org/InStock',
      url: window.location.href
    },
    brand: {
      '@type': 'Brand',
      name: 'Hawaii Woodworking'
    }
  };

  return (
    <>
      <SEO 
        title={pageTitle}
        description={pageDescription}
        keywords={pageKeywords}
        image={productImages[0]}
        type="product"
        schema={productSchema}
      />
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
          <div className="overflow-hidden rounded-lg">
            <ImageCarousel
              images={productImages}
              alt={product.name}
              className="w-full h-72 sm:h-96 md:h-[480px] lg:h-[560px] object-cover"
            />
          </div>
          <div className="flex flex-col justify-center py-4">
            <div>
              <p className="text-amber-600 text-xs font-medium tracking-[0.2em] uppercase mb-3">
                {product.category || 'Produs din lemn'}
              </p>
              <h1 className="font-serif text-3xl md:text-4xl font-medium text-stone-900 mb-5 leading-tight">{product.name}</h1>
              <p className="text-stone-500 text-base leading-relaxed mb-8">
                {shortDescription}
              </p>
              <p className="text-stone-900 font-semibold text-2xl mb-8 tracking-wide">{product.price.toFixed(2)} <span className="text-base font-normal text-stone-500">RON</span></p>
            </div>
            <button
              onClick={() => {
                const image = product.imageUrls?.[0] ?? null;
                addItem({
                  id: product._id,
                  name: product.name,
                  price: product.price,
                  image: image || 'https://placehold.co/100x100?text=No+Image',
                });
              }}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white px-6 py-3.5 rounded-md transition-all duration-300 text-sm font-medium tracking-wide hover:shadow-soft-lg"
            >
              Adaugă în Coș
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
