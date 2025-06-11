import { useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useCart } from '@context/CartContext';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';

export const Checkout: React.FC = () => {
  const { state, removeItem } = useCart();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const total = state.items.reduce((t, it) => t + it.price * it.quantity, 0);

  const handleCheckout = async () => {
    setLoading(true);

    // fetch stripe_price_ids for items
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id,stripe_price_id')
      .in('id', state.items.map((i) => i.id));

    if (prodErr) {
      alert(prodErr.message);
      setLoading(false);
      return;
    }

    const items = state.items.map((ci) => ({
      priceId: products!.find((p) => p.id === ci.id)!.stripe_price_id,
      quantity: ci.quantity,
    }));

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ items }),
      },
    );

    if (!res.ok) {
      alert('Failed to create checkout session');
      setLoading(false);
      return;
    }

    const { url } = await res.json();
    if (!url) {
      alert('URL sesiune Stripe indisponibilă');
      setLoading(false);
      return;
    }

    // Redirecționează către pagina de plată Stripe
    window.location.href = url;
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Finalizare comandă</h1>
      {state.items.length === 0 && <p>Coșul este gol.</p>}
      {state.items.map(it => (
        <div key={it.id} className="flex justify-between py-2 border-b">
          <span>{it.name} x {it.quantity}</span>
          <span>{(it.price * it.quantity).toFixed(2)} RON</span>
        </div>
      ))}
      <div className="text-right font-semibold mt-4">Total: {total.toFixed(2)} RON</div>
      <button disabled={loading || total === 0} onClick={handleCheckout} className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50">
        {loading ? 'Se redirecționează...' : 'Plătește cu cardul'}
      </button>
    </div>
  );
};
