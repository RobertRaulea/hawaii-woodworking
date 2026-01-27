import { useState } from 'react';
import { useAction } from 'convex/react';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import type { CartItem } from '../../context/CartContext';
import { useCart } from '../../context/CartContext';

export const Checkout: React.FC = () => {
  const { state } = useCart();
  const [loading, setLoading] = useState(false);
  const createCheckoutSession = useAction(api.checkout.createCheckoutSession);

  const total = state.items.reduce(
    (sum: number, item: CartItem) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    setLoading(true);

    try {
      const items = state.items.map((item: CartItem) => ({
        productId: item.id as Id<'products'>,
        quantity: item.quantity,
      }));
      const response = await createCheckoutSession({
        origin: window.location.origin,
        items,
      });

      if (!response?.url) {
        alert('URL sesiune Stripe indisponibilă');
        return;
      }

      window.location.href = response.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create checkout session';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Finalizare comandă</h1>
      {state.items.length === 0 && <p>Coșul este gol.</p>}
      {state.items.map((item: CartItem) => (
        <div key={item.id} className="flex justify-between py-2 border-b">
          <span>{item.name} x {item.quantity}</span>
          <span>{(item.price * item.quantity).toFixed(2)} RON</span>
        </div>
      ))}
      <div className="text-right font-semibold mt-4">Total: {total.toFixed(2)} RON</div>
      <button disabled={loading || total === 0} onClick={handleCheckout} className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50">
        {loading ? 'Se redirecționează...' : 'Plătește cu cardul'}
      </button>
    </div>
  );
};
