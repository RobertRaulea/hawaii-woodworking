import type React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAction } from 'convex/react';
import { useAuth } from '@clerk/clerk-react';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';
import type { CartItem } from '../../context/CartContext';
import { useCart } from '../../context/CartContext';
import { useShipping } from '../../context/ShippingContext';

export const Checkout: React.FC = () => {
  const { state } = useCart();
  const { shippingData } = useShipping();
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const createCheckoutSession = useAction(api.checkout.createCheckoutSession);

  // Redirect to shipping if no shipping data
  useEffect(() => {
    if (!shippingData) {
      navigate('/shipping', { replace: true });
    }
  }, [shippingData, navigate]);

  const total = state.items.reduce(
    (sum: number, item: CartItem) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (!shippingData) return;
    setLoading(true);

    try {
      const items = state.items.map((item: CartItem) => ({
        productId: item.id as Id<'products'>,
        quantity: item.quantity,
      }));

      const billingAddress = shippingData.sameAsShipping
        ? shippingData.shippingAddress
        : shippingData.billingAddress;

      const response = await createCheckoutSession({
        origin: window.location.origin,
        items,
        customer: {
          clerkUserId: userId ?? undefined,
          email: shippingData.email,
          firstName: shippingData.firstName,
          lastName: shippingData.lastName,
          shippingAddress: shippingData.shippingAddress,
          billingAddress,
          newsletter: shippingData.newsletter,
        },
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
      <button disabled={loading || total === 0} onClick={handleCheckout} className="mt-6 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg disabled:opacity-50 transition-colors">
        {loading ? 'Se redirecționează...' : 'Plătește cu cardul'}
      </button>
    </div>
  );
};
