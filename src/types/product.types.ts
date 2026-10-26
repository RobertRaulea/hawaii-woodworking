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
 stock?: number;
 lowStockThreshold?: number;
 trackStock?: boolean;
 name_ro?: string;
 name_en?: string;
 name_de?: string;
 description_ro?: string;
 description_en?: string;
 description_de?: string;
}
