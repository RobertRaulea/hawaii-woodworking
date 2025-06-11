import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string | null;
  category: string | null;
  description: string | null;
}

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        setError(error.message);
      } else {
        setProducts(data as Product[]);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return { products, loading, error };
};
