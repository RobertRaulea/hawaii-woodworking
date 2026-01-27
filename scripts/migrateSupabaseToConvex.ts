import 'dotenv/config';
import fs from 'fs';
import path from 'path';

import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';

type RawSupabaseProduct = Record<string, unknown>;

type ConvexSeedProduct = {
  name: string;
  price: number;
  images?: string[];
  category?: string;
  description?: string;
  stripe_product_id?: string;
  stripe_price_id?: string;
};

const DEFAULT_LOCAL_CONVEX_URL = 'http://127.0.0.1:3210';
const CONVEX_URL =
  !process.env.VITE_CONVEX_URL || process.env.VITE_CONVEX_URL.includes('your-project')
    ? DEFAULT_LOCAL_CONVEX_URL
    : process.env.VITE_CONVEX_URL;

const argv = process.argv.slice(2);
const force = argv.includes('--force');
const fileArg = argv.find((a) => !a.startsWith('--'));
const inputPath = fileArg
  ? path.resolve(process.cwd(), fileArg)
  : path.resolve(process.cwd(), 'data/supabase-products-export.json');

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toPriceNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error(`Invalid price value: ${JSON.stringify(value)}`);
};

const toOptionalStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const arr = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    return arr.length > 0 ? arr : undefined;
  }

  const single = toOptionalString(value);
  return single ? [single] : undefined;
};

const normalizeProduct = (raw: RawSupabaseProduct, index: number): ConvexSeedProduct => {
  const name = toOptionalString(raw.name);
  if (!name) {
    throw new Error(`Missing name for product at index ${index}`);
  }

  const price = toPriceNumber(raw.price);

  const images = toOptionalStringArray(raw.images);
  const category = toOptionalString(raw.category);
  const description = toOptionalString(raw.description);

  const stripe_product_id =
    toOptionalString(raw.stripe_product_id) ?? toOptionalString(raw.stripeProductId);
  const stripe_price_id = toOptionalString(raw.stripe_price_id) ?? toOptionalString(raw.stripePriceId);

  return {
    name,
    price,
    images,
    category,
    description,
    stripe_product_id,
    stripe_price_id,
  };
};

const parseExport = (raw: unknown): RawSupabaseProduct[] => {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is RawSupabaseProduct => typeof x === 'object' && x !== null);
  }

  if (typeof raw === 'object' && raw !== null) {
    const maybeProducts = (raw as Record<string, unknown>).products;
    if (Array.isArray(maybeProducts)) {
      return maybeProducts.filter((x): x is RawSupabaseProduct => typeof x === 'object' && x !== null);
    }
  }

  throw new Error(
    'Unsupported export format. Expected a JSON array of products or an object with a "products" array.'
  );
};

(async () => {
  try {
    console.log(`Reading Supabase export from: ${inputPath}`);
    const rawText = fs.readFileSync(inputPath, 'utf8');
    const rawJson: unknown = JSON.parse(rawText);

    const rawProducts = parseExport(rawJson);
    const products = rawProducts.map((p, index) => normalizeProduct(p, index));

    console.log(`Parsed ${products.length} products. Starting import to Convex...`);

    const convex = new ConvexHttpClient(CONVEX_URL);

    const result = await convex.mutation(api.products.seedProducts, {
      force,
      products,
    });

    if ('skipped' in result && result.skipped) {
      console.log(
        `Skipped import: found ${result.existing} existing products. Re-run with --force to replace them.`
      );
      return;
    }

    console.log(`Import complete: inserted ${result.inserted} products.`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
