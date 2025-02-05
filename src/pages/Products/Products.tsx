import { useState } from 'react';
import { useCart } from '../../context/CartContext';

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  category: string;
  description?: string;
}

interface ProductCardProps extends Omit<Product, 'category' | 'description'> {}

const ProductCard: React.FC<ProductCardProps> = ({ name, price, image, id }) => {
  const { addItem } = useCart();
  const parsePrice = (priceString: string): number => {
    return parseFloat(priceString.replace(' RON', ''));
  };

  return (
    <div className="group">
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="relative">
          <img
            src={image}
            alt={name}
            className="w-full h-64 object-cover"
          />
        </div>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2">{name}</h3>
          <p className="text-amber-700 font-medium text-lg">{price}</p>
          <button
            onClick={() => addItem({
              id,
              name,
              price: parsePrice(price),
              image
            })}
            className="mt-4 w-full bg-stone-100 hover:bg-stone-200 text-gray-900 px-4 py-3 rounded-lg transition-colors"
          >
            Adaugă în Coș
          </button>
        </div>
      </div>
    </div>
  );
};

export const Products: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const products: Product[] = [
    {
      id: '1',
      name: "Platou Rustic din Lemn de Fag",
      price: "89.99 RON",
      image: "../../assets/ProductsAssets/Screenshot_1.png",
      category: "platouri",
      description: "Platou elegant din lemn masiv de fag, perfect pentru servire."
    },
    {
      id: '2',
      name: "Platou Rotund din Lemn de Nuc",
      price: "94.99 RON",
      image: "../../assets/ProductsAssets/Screenshot_2.png",
      category: "platouri",
      description: "Platou rotund din lemn de nuc, ideal pentru aperitive."
    },
    {
      id: '3',
      name: "Platou Decorativ din Lemn Natural",
      price: "84.99 RON",
      image: "../../assets/ProductsAssets/Screenshot_3.png",
      category: "platouri",
      description: "Platou decorativ handmade din lemn natural."
    },
    {
      id: '4',
      name: "Platou Oval din Lemn Masiv",
      price: "99.99 RON",
      image: "../../assets/ProductsAssets/Screenshot_4.png",
      category: "platouri",
      description: "Platou oval din lemn masiv pentru servire elegantă."
    },
    {
      id: '5',
      name: "Platou Inima din Lemn",
      price: "92.99 RON",
      image: "../../assets/ProductsAssets/Screenshot_5.png",
      category: "platouri",
      description: "Platou Inima din lemn pentru Valentines Day."
    }
  ];

  const categories = ['all', 'platouri'];

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  return (
    <div className="container mx-auto px-4 py-8">
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
        {filteredProducts.map(product => (
          <ProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            price={product.price}
            image={product.image}
          />
        ))}
      </div>
    </div>
  );
};
