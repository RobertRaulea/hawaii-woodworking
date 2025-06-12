import { useState } from 'react';
import { useCart } from '@context/CartContext';
import { Link } from 'react-router-dom';
import { useProducts, Product as P } from '../../hooks/useProducts';
import { storageUrl } from '../../utils/supabaseClient';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  images: string[] | null; // Changed from image to images
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
        {/* Image Carousel Area */}
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
        {/* Text Details Area */}
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2 truncate" title={name}>{name}</h3>
          <p className="text-amber-700 font-medium text-lg">{price.toFixed(2)} RON</p>
        </div>
      </Link>
      {/* Add to Cart Button Area (outside Link) */}
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { products, loading, error } = useProducts();

  const categories: string[] = [
    'all',
    ...Array.from(new Set(products.map((p: P) => p.category ?? ''))).filter((c): c is string => c !== '')
  ];

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter((product: P) => product.category === selectedCategory);

  return (
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
              className={`px-4 py-2 rounded-lg capitalize ${
                selectedCategory === category
                  ? 'bg-amber-700 text-white'
                  : 'bg-stone-100 text-gray-900 hover:bg-stone-200'
              }`}
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
  );
};
