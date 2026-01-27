import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export interface Product {
  id: string;
  name: string;
  price: number;
  images: string[] | null; // Array of image paths
  imageUrls?: string[] | null;
  category: string | null;
  description: string | null;
  stripeProductId?: string | null;
  stripePriceId?: string | null;
}

export const useProducts = () => {
  const data = useQuery(api.products.getAll);

  const products = useMemo<Product[]>(() => {
    if (!data) {
      return [];
    }

    return data.map((product) => ({
      id: product._id,
      name: product.name,
      price: product.price,
      images: product.images ?? null,
      imageUrls:
        ((product as unknown as { imageUrls?: string[] | null }).imageUrls ?? null) ?? null,
      category: product.category ?? null,
      description: product.description ?? null,
      stripeProductId: product.stripe_product_id ?? null,
      stripePriceId: product.stripe_price_id ?? null,
    }));
  }, [data]);

  const loading = data === undefined;

  return { products, loading, error: null };
};
