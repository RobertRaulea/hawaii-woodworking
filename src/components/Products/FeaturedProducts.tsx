interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
}

interface ProductCardProps extends Product {}

import { useCart } from '../../context/CartContext';

const ProductCard: React.FC<ProductCardProps> = ({ name, price, image, id }) => {
  const { addItem } = useCart();
  const parsePrice = (priceString: string): number => {
    return parseFloat(priceString.replace(' RON', '').replace('.', ''));
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

export const FeaturedProducts = () => {
  const { addItem } = useCart();
  const products: Product[] = [
    {
      id: '1',
      name: "Masă din Lemn Masiv",
      price: "2.999 RON",
      image: "https://images.unsplash.com/photo-1578685666972-015e0f32e477?auto=format&fit=crop&q=80"
    },
    {
      id: '2',
      name: "Dulap Personalizat",
      price: "4.899 RON",
      image: "https://images.unsplash.com/photo-1609587312208-cea54be969e7?auto=format&fit=crop&q=80"
    },
    {
      id: '3',
      name: "Ramă Foto Artizanală",
      price: "799 RON",
      image: "https://images.unsplash.com/photo-1533377379833-82591c6e4e78?auto=format&fit=crop&q=80"
    }
  ];

  const parsePrice = (priceString: string): number => {
    return parseFloat(priceString.replace(' RON', '').replace(',', ''));
  };

  return (
    <div className="py-24 bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center mb-16">Creații în Evidență</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {products.map((product, index) => (
            <div key={index}>
              <ProductCard {...product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
