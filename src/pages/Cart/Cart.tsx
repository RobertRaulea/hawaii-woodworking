import { ShoppingCart, Minus, Plus, Trash2, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CartItem } from '../../context/CartContext';
import { useCart } from '../../context/CartContext';
import { storageUrl } from '../../utils/storageUrl.utils';

interface CartProps {}

export const Cart: React.FC<CartProps> = () => {
  const { state, removeItem, updateQuantity } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCanceled = searchParams.get('canceled') === 'true';

  const dismissCanceled = () => {
    searchParams.delete('canceled');
    setSearchParams(searchParams, { replace: true });
  };

  const calculateTotal = () => {
    return state.items.reduce(
      (total: number, item: CartItem) => total + item.price * item.quantity,
      0
    );
  };

  const formatPrice = (price: number): string => {
    return `${price.toFixed(2)} RON`;
  };

  const getCartImageSrc = (image: string): string => {
    if (!image) {
      return '';
    }

    if (
      image.startsWith('http://') ||
      image.startsWith('https://') ||
      image.startsWith('data:') ||
      image.startsWith('blob:')
    ) {
      return image;
    }

    return storageUrl ? `${storageUrl}/${image}` : image;
  };

  if (state.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <ShoppingCart className="w-16 h-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Coșul tău este gol</h2>
          <p className="text-gray-600 mb-6">Adaugă produse în coș pentru a începe!</p>
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => window.history.back()}
          >
            Continuă cumpărăturile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {isCanceled && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-300 text-amber-800 rounded-lg px-4 py-3 mb-6">
          <span>Plata a fost anulată. Produsele tale sunt încă în coș.</span>
          <button onClick={dismissCanceled} aria-label="Închide">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}
      <h1 className="text-2xl font-bold mb-8">Coș de cumpărături</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-grow">
          {state.items.map((item: CartItem) => (
            <div key={item.id} className="flex flex-col md:flex-row items-start md:items-center gap-4 border-b border-gray-200 py-4">
              <img
                src={getCartImageSrc(item.image)}
                alt={item.name}
                className="w-24 h-24 object-cover rounded"
              />
              <div className="flex-grow">
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <p className="text-gray-600">{formatPrice(item.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="lg:w-1/3">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Sumar comandă</h2>
            <div className="flex justify-between mb-4">
              <span>Subtotal</span>
              <span>{formatPrice(calculateTotal())}</span>
            </div>
            <button
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
              onClick={() => navigate('/checkout')}
            >
              Finalizează comanda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
