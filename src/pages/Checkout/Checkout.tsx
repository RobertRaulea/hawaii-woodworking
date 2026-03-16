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
    <div className="max-w-2xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
      <h1 className="font-serif text-3xl font-medium text-stone-900 mb-8">Finalizare comandă</h1>
      
      <div className="bg-white border border-stone-200 rounded-lg p-6">
        {state.items.length === 0 && <p className="text-stone-500 text-sm">Coșul este gol.</p>}
        <div className="space-y-0">
          {state.items.map((item: CartItem) => (
            <div key={item.id} className="flex justify-between items-center py-4 border-b border-stone-100 last:border-b-0">
              <div>
                <span className="text-sm font-medium text-stone-900">{item.name}</span>
                <span className="text-stone-400 text-sm ml-2">× {item.quantity}</span>
              </div>
              <span className="text-sm font-medium text-stone-900">{(item.price * item.quantity).toFixed(2)} RON</span>
            </div>
          ))}
        </div>
        
        <div className="border-t border-stone-200 mt-4 pt-4 flex justify-between items-center">
          <span className="font-medium text-stone-900">Total</span>
          <span className="text-lg font-semibold text-stone-900">{total.toFixed(2)} RON</span>
        </div>
      </div>

      <button 
        disabled={loading || total === 0} 
        onClick={handleCheckout} 
        className="mt-8 w-full bg-stone-900 hover:bg-stone-800 text-white px-6 py-3.5 rounded-md text-sm font-medium tracking-wide disabled:opacity-50 transition-all duration-200"
      >
        {loading ? 'Se redirecționează...' : 'Plătește cu cardul'}
      </button>
    </div>
  );
};
