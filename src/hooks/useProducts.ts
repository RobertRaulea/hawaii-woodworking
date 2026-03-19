import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Product } from '../types/product.types';

export type { Product } from '../types/product.types';

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
      imageUrls: product.imageUrls ?? null,
      category: product.category ?? null,
      description: product.description ?? null,
      stripeProductId: product.stripe_product_id ?? null,
      stripePriceId: product.stripe_price_id ?? null,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      trackStock: product.trackStock,
    }));
  }, [data]);

  const loading = data === undefined;

  return { products, loading, error: null };
};
