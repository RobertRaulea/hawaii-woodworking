export interface Product {
  id: string;
  name: string;
  price: number;
  images: string[] | null;
  imageUrls?: string[] | null;
  category: string | null;
  description: string | null;
  stripeProductId?: string | null;
  stripePriceId?: string | null;
}
