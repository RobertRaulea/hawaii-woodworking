import { useState } from 'react';

interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  category: string;
  description: string;
}

export const Products: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const products: Product[] = [
    {
      id: 1,
      name: "Masă din Lemn Masiv",
      price: "2.999 RON",
      image: "https://images.unsplash.com/photo-1578685666972-015e0f32e477?auto=format&fit=crop&q=80",
      category: "mese",
      description: "Masă elegantă din lemn masiv, perfectă pentru dining."
    },
    {
      id: 2,
      name: "Dulap Personalizat",
      price: "4.899 RON",
      image: "https://images.unsplash.com/photo-1609587312208-cea54be969e7?auto=format&fit=crop&q=80",
      category: "depozitare",
      description: "Dulap spațios cu design personalizat pentru nevoile tale."
    },
    {
      id: 3,
      name: "Ramă Foto Artizanală",
      price: "799 RON",
      image: "https://images.unsplash.com/photo-1533377379833-82591c6e4e78?auto=format&fit=crop&q=80",
      category: "decoratiuni",
      description: "Ramă foto handmade din lemn natural."
    },
    // Add more products here
  ];

  const categories = ['all', 'mese', 'depozitare', 'decoratiuni'];

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  return (
    <div className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-center mb-8">Produsele Noastre</h1>
        
        {/* Categories */}
        <div className="flex justify-center space-x-4 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full transition-colors ${
                selectedCategory === category
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-100 text-stone-900 hover:bg-stone-200'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <div key={product.id} className="group">
              <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="relative">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-80 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform">
                      Vizualizare Rapidă
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                  <p className="text-gray-600 mb-4">{product.description}</p>
                  <p className="text-amber-700 font-medium text-lg">{product.price}</p>
                  <button className="mt-4 w-full bg-stone-100 hover:bg-stone-200 text-gray-900 px-4 py-3 rounded-lg transition-colors">
                    Adaugă în Coș
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
