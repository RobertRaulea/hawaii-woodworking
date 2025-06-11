import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export interface CartItemRemote {
  id: string;
  product_id: string;
  quantity: number;
  product?: {
    name: string;
    price: number;
    image: string | null;
  };
}

export const useCartRemote = (userId: string | null) => {
  const [items, setItems] = useState<CartItemRemote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const fetchCart = async () => {
      const { data, error } = await supabase
        .from('cart_items')
        .select('id, product_id, quantity, product:products(id, name, price, image)')
        .eq('user_id', userId);

      if (error) setError(error.message);
      else setItems(data as CartItemRemote[]);
      setLoading(false);
    };

    fetchCart();
  }, [userId]);

  const addToCart = async (productId: string, quantity = 1) => {
    if (!userId) return;
    await supabase.from('cart_items').upsert({ user_id: userId, product_id: productId, quantity });
  };

  const clearCart = async () => {
    if (!userId) return;
    await supabase.from('cart_items').delete().eq('user_id', userId);
  };

  return { items, loading, error, addToCart, clearCart };
};
