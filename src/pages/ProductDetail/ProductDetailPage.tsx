import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useProducts, Product as P } from '../../hooks/useProducts'; // Assuming useProducts can fetch a single product or we adapt it
import { storageUrl } from '../../utils/supabaseClient';
import { SEO } from '../../components/SEO/SEO';

// Define a type for the product, can be expanded
interface Product extends P {
}

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { products, loading, error: productsError } = useProducts(); // Ideally, fetch single product
  const [product, setProduct] = useState<Product | null>(null);
  const { addItem } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (productId && products.length > 0) {
      const foundProduct = products.find(p => p.id === productId) as Product | undefined;
      setProduct(foundProduct || null);
      if (foundProduct) {
        setCurrentImageIndex(0); // Reset image index when product changes
      }
    }
  }, [productId, products]);

  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading product details...</div>;
  }

  if (productsError) {
    return <div className="container mx-auto px-4 py-8 text-center text-red-500">Error loading product: {productsError}</div>;
  }

  if (!product) {
    return <div className="container mx-auto px-4 py-8 text-center">Product not found.</div>;
  }

  // Fallback for description if not available
  const shortDescription = product.description || `Details for ${product.name}. Discover the quality and craftsmanship of our handmade ${product.category || 'item'}.`;

  // Image gallery state and handlers
  const getDisplayImages = (imageArray: string[] | null): string[] => {
    if (!imageArray || imageArray.length === 0) {
      return ['https://placehold.co/600x400?text=Product+Image'];
    }
    // Ensure the main image is first if it exists, then others
    const mainImageIndex = imageArray.findIndex(img => 
      img.endsWith('_main.png') || img.endsWith('_main.jpg') || img.endsWith('_main.webp')
    );
    let sortedImages = [...imageArray];
    if (mainImageIndex > 0) { // if main image exists and is not already first
      const mainImg = sortedImages.splice(mainImageIndex, 1)[0];
      sortedImages.unshift(mainImg);
    }
    return sortedImages.map(img => `${storageUrl}/${img}`);
  };

  const productImages = getDisplayImages(product?.images);

  // SEO Meta Tags and Schema
  const pageTitle = product ? `${product.name} - Hawaii Woodworking` : 'Detalii Produs - Hawaii Woodworking';
  const pageDescription = product?.description ? product.description.substring(0, 160) : `Descoperă ${product?.name || 'acest produs unic'}, un articol din lemn lucrat manual, perfect pentru cadouri sau decorațiuni. Calitate și design românesc de la Hawaii Woodworking.`;
  const pageKeywords = product ? [
    product.name,
    product.category || 'produs lemn',
    'cadouri lemn personalizate',
    'artizanat românesc',
    'handmade România',
    'Hawaii Woodworking',
    'platouase',
    'hawaii sibiu'
  ] : ['produs lemn', 'Hawaii Woodworking'];
  
  const productSchema = product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || pageDescription,
    image: productImages[0], // Use the first image (ideally main image) for schema
    sku: product.id,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'RON',
      price: product.price.toFixed(2),
      availability: 'https://schema.org/InStock', // Assuming product is in stock
      url: window.location.href
    },
    brand: {
      '@type': 'Brand',
      name: 'Hawaii Woodworking'
    }
    // Potentially add reviews, aggregateRating, etc. later
  } : {};

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % productImages.length);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + productImages.length) % productImages.length);
  };

  return (
    <>
      <SEO 
        title={pageTitle}
        description={pageDescription}
        keywords={pageKeywords}
        image={productImages[0]} // OpenGraph image
        type="product"
        schema={productSchema}
      />
      <div className="container mx-auto px-4 py-12">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden md:flex">
        <div className="md:w-1/2 relative">
          <img 
            src={productImages[currentImageIndex]}
            alt={`${product.name} - Image ${currentImageIndex + 1}`}
            className="w-full h-64 sm:h-80 md:h-96 lg:h-[500px] object-cover rounded-lg shadow-lg transition-all duration-300 ease-in-out"
          />
          {productImages.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-60 transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                aria-label="Previous Image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-60 transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                aria-label="Next Image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </>
          )}
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
              const mainImageFromGallery = product?.images?.find(img => img.endsWith('_main.png') || img.endsWith('_main.jpg') || img.endsWith('_main.webp')) || product?.images?.[0];
              addItem({ ...product, id: product.id, name: product.name, price: product.price, image: mainImageFromGallery || 'https://placehold.co/100x100?text=No+Image' });
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
