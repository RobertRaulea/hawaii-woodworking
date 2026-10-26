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
 stock: product.availableStock,
 lowStockThreshold: product.lowStockThreshold,
 trackStock: product.trackStock,
 name_ro: product.name_ro,
 name_en: product.name_en,
 name_de: product.name_de,
 description_ro: product.description_ro,
 description_en: product.description_en,
 description_de: product.description_de,
 }));
 }, [data]);

 const loading = data === undefined;

 return { products, loading, error: null };
};
