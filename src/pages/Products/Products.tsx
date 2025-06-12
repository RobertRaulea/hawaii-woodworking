import { useState } from 'react';
import { useCart } from '@context/CartContext';
import { Link } from 'react-router-dom';
import { useProducts, Product as P } from '../../hooks/useProducts';
import { storageUrl } from '../../utils/supabaseClient';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image: string | null;
}

const ProductCard: React.FC<ProductCardProps> = ({ name, price, image, id }) => {
  const { addItem } = useCart();

  return (
    <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <Link to={`/product/${id}`} className="block">
        <div className="relative">
          <img
            src={image ? `${storageUrl}/${image}` : 'https://placehold.co/600x400?text=Product+Image'}
            alt={name}
            className="w-full h-64 object-cover"
          />
        </div>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2 truncate" title={name}>{name}</h3>
          <p className="text-amber-700 font-medium text-lg">{price.toFixed(2)} RON</p>
        </div>
      </Link>
      <div className="p-6 pt-0">
        <button
          onClick={() => addItem({ id, name, price, image: image || 'https://placehold.co/100x100?text=No+Image' })}
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
            image={product.image ?? ''}
          />
        ))}
      </div>
    </div>
  );
};
