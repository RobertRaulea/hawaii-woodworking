import 'dotenv/config';
import Stripe from 'stripe';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api.js';
// Ensure env vars exist
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const CONVEX_URL = process.env.VITE_CONVEX_URL;
if (!STRIPE_SECRET_KEY) {
    console.error('Missing STRIPE_SECRET_KEY in environment');
    process.exit(1);
}
if (!CONVEX_URL) {
    console.error('Missing VITE_CONVEX_URL in environment');
    process.exit(1);
}
const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});
const convex = new ConvexHttpClient(CONVEX_URL);
(async () => {
    const products = await convex.query(api.products.getAll, {});
    for (const p of products) {
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
        // Persist IDs back to Convex
        await convex.mutation(api.products.setStripeIds, {
            id: p._id,
            stripeProductId: stripeProduct.id,
            stripePriceId: stripePrice.id,
        });
        console.log(`Synced ${p.name} -> ${stripePrice.id}`);
    }
    console.log('All products synced to Stripe.');
})();
