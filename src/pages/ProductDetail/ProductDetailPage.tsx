import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProducts, Product as P } from '../../hooks/useProducts';
import { useCart } from '../../contexts/CartContext';
import { storageUrl } from '../../utils/supabaseClient';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

// Assume Product type P might be extended to include description
// export interface Product {
//   id: string;
//   name: string;
//   price: number;
//   image: string | null;
//   category?: string;
//   description?: string; // Ensure this is part of your Product type
// }

interface ProductDetailPageProps {}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = () => {
  const { productId } = useParams<{ productId: string }>();
  const { products, loading, error } = useProducts(); // Fetches all products
  const { addItem } = useCart();

  if (loading) return <p className="text-center py-10">Loading product details...</p>;
  if (error) return <p className="text-red-500 text-center py-10">Error: {error}</p>;
  if (!productId) return <p className="text-red-500 text-center py-10">Product ID not found.</p>;

  const product = products.find((p: P) => p.id === productId);

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-xl text-gray-700">Product not found.</p>
        <Link to="/products" className="mt-4 inline-block bg-amber-700 text-white px-6 py-2 rounded-lg hover:bg-amber-800 transition-colors">
          Back to Products
        </Link>
      </div>
    );
  }

  // Placeholder for description - assuming product.description exists or can be added
  const description = (product as any).description || "Această piesă unică de artizanat din lemn hawaiian aduce frumusețea naturală și măiestria tradițională în casa ta. Perfectă ca element decorativ sau un cadou special.";

  return (
    <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-200px)]"> {/* Adjust min-height as needed */}
      <Link to="/products" className="inline-flex items-center text-amber-700 hover:text-amber-800 mb-6 group">
        <ArrowLeftIcon className="h-5 w-5 mr-2 transition-transform group-hover:-translate-x-1" />
        Înapoi la Produse
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
        <div className="bg-white rounded-xl overflow-hidden shadow-lg">
          <img
            src={product.image ? `${storageUrl}/${product.image}` : ''}
            alt={product.name}
            className="w-full h-80 md:h-96 lg:h-[500px] object-cover"
          />
        </div>
        <div className="flex flex-col justify-between h-full py-4 md:py-0">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4">{product.name}</h1>
            <p className="text-gray-700 text-base md:text-lg mb-4 md:mb-6 leading-relaxed">{description}</p>
            <p className="text-amber-700 font-semibold text-2xl lg:text-3xl mb-6">{product.price.toFixed(2)} RON</p>
          </div>
          <button
            onClick={() => addItem({ id: product.id, name: product.name, price: product.price, image: product.image ?? '' })}
            className="w-full bg-stone-100 hover:bg-stone-200 text-gray-900 px-6 py-3 rounded-lg text-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-opacity-50"
          >
            Adaugă în Coș
          </button>
        </div>
      </div>
    </div>
  );
};
