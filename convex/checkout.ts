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

type CheckoutProduct = {
  _id: Id<'products'>;
  name: string;
  price: number;
  imageUrls?: string[];
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

    const products = (await ctx.runQuery(api.products.getAll, {})) as CheckoutProduct[];
    const requestedIds = new Set(items.map((item) => item.productId));
    const productMap = new Map<Id<'products'>, CheckoutProduct>(
      products
        .filter((product) => requestedIds.has(product._id))
        .map((product) => [product._id, product])
    );

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(`Product not found for checkout: ${item.productId}`);
        }

        const unitAmount = Math.round(product.price * 100);
        const image = product.imageUrls?.[0];

        return {
          price_data: {
            currency: 'ron',
            unit_amount: unitAmount,
            product_data: {
              name: product.name,
              ...(image ? { images: [image] } : {}),
            },
          },
          quantity: item.quantity,
        };
      }
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/thank-you`,
      cancel_url: `${origin}/cart?canceled=true`,
    });

    return { url: session.url ?? null };
  },
});
