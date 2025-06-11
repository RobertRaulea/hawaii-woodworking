import 'dotenv/config';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Ensure env vars exist
const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;

if (!STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY in environment');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type DBProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

(async () => {
  const { data, error } = await supabase.from('products').select<DBProduct[]>('*');
  if (error) throw error;
  if (!data) return;

  for (const p of data) {
    // Create Stripe product
    const stripeProduct = await stripe.products.create({
      name: p.name,
      description: p.description ?? undefined,
    });

    // Create Stripe price (amount in bani / cents)
    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.round(p.price * 100),
      currency: 'ron',
    });

    // Persist IDs back to Supabase (assumes columns exist)
    await supabase
      .from('products')
      .update({ stripe_product_id: stripeProduct.id, stripe_price_id: stripePrice.id })
      .eq('id', p.id);

    console.log(`Synced ${p.name} -> ${stripePrice.id}`);
  }

  console.log('All products synced to Stripe.');
})();
