"use node";

import Stripe from 'stripe';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { api, internal } from './_generated/api';
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

const addressValidator = v.object({
  street: v.string(),
  city: v.string(),
  county: v.string(),
  postalCode: v.string(),
  country: v.string(),
});

export const createCheckoutSession = action({
  args: {
    origin: v.string(),
    items: v.array(
      v.object({
        productId: v.id('products'),
        quantity: v.number(),
      })
    ),
    customer: v.object({
      clerkUserId: v.optional(v.string()),
      email: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      shippingAddress: addressValidator,
      billingAddress: addressValidator,
      newsletter: v.boolean(),
    }),
  },
  handler: async (
    ctx,
    { origin, items, customer }: {
      origin: string;
      items: CheckoutItem[];
      customer: {
        clerkUserId?: string;
        email: string;
        firstName: string;
        lastName: string;
        shippingAddress: { street: string; city: string; county: string; postalCode: string; country: string };
        billingAddress: { street: string; city: string; county: string; postalCode: string; country: string };
        newsletter: boolean;
      };
    }
  ): Promise<CheckoutResponse> => {
    if (items.length === 0) {
      throw new Error('No items provided for checkout.');
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
    }

    const stripe = new Stripe(stripeSecretKey);

    // 1. Upsert customer in Convex
    const customerId: Id<'customers'> = await ctx.runMutation(
      internal.customers.upsertCustomer,
      {
        clerkUserId: customer.clerkUserId,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        shippingAddress: customer.shippingAddress,
        billingAddress: customer.billingAddress,
        newsletter: customer.newsletter,
      }
    );

    // 1b. Create or reuse Stripe Customer
    const existingStripeId = await ctx.runMutation(
      internal.customers.getStripeCustomerId,
      { customerId }
    ) as string | null;

    let stripeCustomerId: string | undefined = existingStripeId ?? undefined;

    if (!stripeCustomerId) {
      // Search Stripe for existing customer by email
      const existingStripeCustomers = await stripe.customers.list({
        email: customer.email,
        limit: 1,
      });

      if (existingStripeCustomers.data.length > 0) {
        stripeCustomerId = existingStripeCustomers.data[0].id;
      } else {
        const newStripeCustomer = await stripe.customers.create({
          email: customer.email,
          name: `${customer.firstName} ${customer.lastName}`,
          address: {
            line1: customer.shippingAddress.street,
            city: customer.shippingAddress.city,
            state: customer.shippingAddress.county,
            postal_code: customer.shippingAddress.postalCode,
            country: 'RO',
          },
          metadata: {
            convexCustomerId: customerId,
            source: 'hawaii-woodworking',
          },
        });
        stripeCustomerId = newStripeCustomer.id;
      }

      // Save Stripe Customer ID back to Convex
      await ctx.runMutation(internal.customers.setStripeCustomerId, {
        customerId,
        stripeCustomerId,
      });
    }

    // 2. Resolve products
    const products = (await ctx.runQuery(api.products.getAll, {})) as CheckoutProduct[];
    const requestedIds = new Set(items.map((item) => item.productId));
    const productMap = new Map<Id<'products'>, CheckoutProduct>(
      products
        .filter((product) => requestedIds.has(product._id))
        .map((product) => [product._id, product])
    );

    // 3. Build order items with product snapshots
    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new Error(`Product not found for checkout: ${item.productId}`);
      }
      return {
        productId: item.productId,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      };
    });

    const total = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // 4. Build Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = orderItems.map(
      (item) => {
        const product = productMap.get(item.productId);
        const image = product?.imageUrls?.[0];

        return {
          price_data: {
            currency: 'ron',
            unit_amount: Math.round(item.price * 100),
            product_data: {
              name: item.name,
              ...(image ? { images: [image] } : {}),
            },
          },
          quantity: item.quantity,
        };
      }
    );

    // 5. Create Stripe session with Stripe Customer
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer: stripeCustomerId,
      success_url: `${origin}/thank-you`,
      cancel_url: `${origin}/cart?canceled=true`,
      metadata: {
        convexCustomerId: customerId,
      },
    });

    // 6. Create pending order with the Stripe session ID
    await ctx.runMutation(internal.orders.createPendingOrder, {
      customerId,
      items: orderItems,
      total,
      stripeSessionId: session.id,
    });

    return { url: session.url ?? null };
  },
});
