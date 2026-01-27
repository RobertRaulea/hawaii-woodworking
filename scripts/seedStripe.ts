import 'dotenv/config';
import Stripe from 'stripe';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import type { Id } from '../convex/_generated/dataModel';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const DEFAULT_LOCAL_CONVEX_URL = 'http://127.0.0.1:3210';
const CONVEX_URL =
  !process.env.VITE_CONVEX_URL || process.env.VITE_CONVEX_URL.includes('your-project')
    ? DEFAULT_LOCAL_CONVEX_URL
    : process.env.VITE_CONVEX_URL;

if (!STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY in environment');
  process.exit(1);
}

if (!CONVEX_URL) {
  console.error('Missing VITE_CONVEX_URL in environment');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);
const convex = new ConvexHttpClient(CONVEX_URL);

type ConvexProduct = {
  _id: Id<'products'>;
  name: string;
  description?: string | null;
  price: number;
  stripe_price_id?: string | null;
  stripe_product_id?: string | null;
};

(async () => {
  const products = (await convex.query(api.products.getAll, {})) as ConvexProduct[];

  for (const product of products) {
    if (product.stripe_price_id) {
      continue;
    }

    const stripeProduct = await stripe.products.create({
      name: product.name,
      description: product.description ?? undefined,
    });

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.round(product.price * 100),
      currency: 'ron',
    });

    await convex.mutation(api.products.setStripeIds, {
      id: product._id,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
    });

    console.log(`Synced ${product.name} -> ${stripePrice.id}`);
  }

  console.log('All products synced to Stripe.');
})();
