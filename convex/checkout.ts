"use node";

import Stripe from 'stripe';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { api } from './_generated/api';
import { action } from './_generated/server';

type CheckoutItem = {
  productId: Id<'products'>;
  quantity: number;
};

type CheckoutResponse = {
  url: string | null;
};

export const createCheckoutSession = action({
  args: {
    origin: v.string(),
    items: v.array(
      v.object({
        productId: v.id('products'),
        quantity: v.number(),
      })
    ),
  },
  handler: async (
    ctx,
    { origin, items }: { origin: string; items: CheckoutItem[] }
  ): Promise<CheckoutResponse> => {
    if (items.length === 0) {
      throw new Error('No items provided for checkout.');
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
    }

    const stripe = new Stripe(stripeSecretKey);

    const priceEntries = await ctx.runQuery(api.products.getStripePriceIds, {
      ids: items.map((item) => item.productId),
    });
    const priceMap = new Map<Id<'products'>, string | null>(
      priceEntries.map((entry) => [entry.id, entry.stripePriceId])
    );

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (item) => {
        const priceId = priceMap.get(item.productId);
        if (!priceId) {
          throw new Error(`Missing Stripe price ID for product ${item.productId}`);
        }
        return {
          price: priceId,
          quantity: item.quantity,
        };
      }
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/checkout?success=true`,
      cancel_url: `${origin}/checkout?canceled=true`,
    });

    return { url: session.url ?? null };
  },
});
