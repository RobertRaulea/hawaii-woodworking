export type SiteLanguage = 'ro' | 'en' | 'de';

export type SiteEnvironment = 'test' | 'production';

export interface SeoProduct {
  _id: string;
  name: string;
  description?: string | null;
  name_ro?: string;
  description_ro?: string;
  price: number;
  imageUrls?: string[] | null;
  sku?: string;
  category?: string | null;
  availableStock?: number;
  trackStock?: boolean;
  lowStockThreshold?: number;
  seoTitle?: string;
  seoDescription?: string;
}

export interface BuiltProductSeo {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  schema: Record<string, unknown>;
}
