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
      <div className="container mx-auto px-4 py-12">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden md:flex">
          <div className="md:w-1/2">
            <ImageCarousel
              images={productImages}
              alt={product.name}
              className="w-full h-64 sm:h-80 md:h-96 lg:h-[500px] object-cover rounded-lg shadow-lg"
            />
          </div>
          <div className="md:w-1/2 p-6 md:p-10 flex flex-col justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{product.name}</h1>
              <p className="text-gray-700 text-base mb-6">
                {shortDescription}
              </p>
              <p className="text-amber-700 font-semibold text-2xl mb-6">{product.price.toFixed(2)} RON</p>
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
              className="w-full bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg transition-colors duration-300 text-lg font-medium"
            >
              Adaugă în Coș
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
