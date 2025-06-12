import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useProducts, Product as P } from '../../hooks/useProducts'; // Assuming useProducts can fetch a single product or we adapt it
import { storageUrl } from '../../utils/supabaseClient';

// Define a type for the product, can be expanded
interface Product extends P {}

export const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const { products, loading, error: productsError } = useProducts(); // Ideally, fetch single product
  const [product, setProduct] = useState<Product | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    if (productId && products.length > 0) {
      const foundProduct = products.find(p => p.id === productId) as Product | undefined;
      setProduct(foundProduct || null);
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

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="bg-white shadow-xl rounded-lg overflow-hidden md:flex">
        <div className="md:w-1/2">
          <img 
            src={product.image ? `${storageUrl}/${product.image}` : 'https://placehold.co/600x400?text=Product+Image'}
            alt={product.name}
            className="w-full h-64 md:h-full object-cover"
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
            onClick={() => addItem({ ...product, image: product.image || 'https://placehold.co/100x100?text=No+Image' })}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg transition-colors duration-300 text-lg font-medium"
          >
            Adaugă în Coș
          </button>
        </div>
      </div>
    </div>
  );
};
