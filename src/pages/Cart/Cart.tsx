import type React from 'react';
import { ShoppingCart, Minus, Plus, Trash2, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CartItem } from '../../context/CartContext';
import { useCart } from '../../context/CartContext';

export const Cart: React.FC = () => {
  const { t } = useTranslation();
  const { state, removeItem, updateQuantity } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isCanceled = searchParams.get('canceled') === 'true';
  const cartImageFallback = 'https://placehold.co/100x100?text=No+Image';

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
      return cartImageFallback;
    }

    if (
      image.startsWith('http://') ||
      image.startsWith('https://') ||
      image.startsWith('data:') ||
      image.startsWith('blob:')
    ) {
      return image;
    }

    return cartImageFallback;
  };

  if (state.items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-6">
            <ShoppingCart className="w-7 h-7 text-stone-400" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-stone-900 mb-2">{t('cart.empty')}</h2>
          <p className="text-stone-500 text-sm mb-8">{t('cart.emptyDescription')}</p>
          <button
            className="border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white px-8 py-2.5 rounded-md text-sm font-medium transition-all duration-200"
            onClick={() => window.history.back()}
          >
            {t('cart.continueShopping')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
      {isCanceled && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-4 py-3 mb-8 text-sm">
          <span>{t('cart.paymentCanceled')}</span>
          <button onClick={dismissCanceled} aria-label={t('common.close')} className="hover:text-amber-600 transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
      <h1 className="font-serif text-3xl lg:text-4xl font-medium text-stone-900 mb-10">{t('cart.title')}</h1>
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
        <div className="flex-grow">
          {state.items.map((item: CartItem) => (
            <div key={item.id} className="flex flex-col md:flex-row items-start md:items-center gap-5 border-b border-stone-200 py-6 first:pt-0">
              <img
                src={getCartImageSrc(item.image)}
                alt={item.name}
                className="w-20 h-20 object-cover rounded-md"
              />
              <div className="flex-grow">
                <h3 className="font-medium text-stone-900">{item.name}</h3>
                <p className="text-stone-500 text-sm mt-0.5">{formatPrice(item.price)}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-stone-200 hover:border-stone-400 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5 text-stone-600" />
                </button>
                <span className="w-8 text-center text-sm font-medium text-stone-900">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-stone-200 hover:border-stone-400 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-stone-600" />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-medium text-stone-900 text-sm">{formatPrice(item.price * item.quantity)}</p>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-white border border-stone-200 rounded-lg p-6 sticky top-24">
            <h2 className="font-serif text-lg font-medium text-stone-900 mb-5">{t('cart.orderSummary')}</h2>
            <div className="flex justify-between mb-6 text-sm">
              <span className="text-stone-500">{t('common.subtotal')}</span>
              <span className="font-medium text-stone-900">{formatPrice(calculateTotal())}</span>
            </div>
            <div className="border-t border-stone-200 pt-4 mb-6">
              <div className="flex justify-between">
                <span className="font-medium text-stone-900">{t('common.total')}</span>
                <span className="font-semibold text-stone-900">{formatPrice(calculateTotal())}</span>
              </div>
            </div>
            <button
              className="w-full bg-stone-900 text-white py-3 rounded-md hover:bg-stone-800 text-sm font-medium tracking-wide transition-all duration-200"
              onClick={() => navigate('/shipping')}
            >
              {t('cart.checkout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
