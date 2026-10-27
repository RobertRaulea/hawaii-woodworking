'use node';

import Stripe from 'stripe';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { action } from './_generated/server';
import type { CheckoutSnapshotLine } from './lib/inventory.utils';
import { toCents } from './lib/pos.utils';

type CheckoutItem = {
  productId: Id<'products'>;
  quantity: number;
};

type CheckoutResponse = {
  url: string | null;
};

const FALLBACK_ORIGIN = 'https://www.hawaiiproducts.ro';

/**
 * Only store-owned origins may be used for Stripe success/cancel URLs;
 * anything else falls back to the canonical shop origin so a crafted
 * client request cannot redirect payers to a phishing domain.
 * Extra origins (e.g. preview deployments) go in the ALLOWED_ORIGINS
 * env var, comma-separated.
 */
const resolveSafeOrigin = (origin: string): string => {
  const allowed = new Set([
    FALLBACK_ORIGIN,
    'https://hawaiiproducts.ro',
    ...(process.env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ]);
  try {
    const url = new URL(origin);
    const isLocalDev =
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
      url.protocol === 'http:';
    if (allowed.has(url.origin) || isLocalDev) return url.origin;
  } catch {
    // fall through to the safe default
  }
  return FALLBACK_ORIGIN;
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
      }),
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
    {
      origin,
      items,
      customer,
    }: {
      origin: string;
      items: CheckoutItem[];
      customer: {
        clerkUserId?: string;
        email: string;
        firstName: string;
        lastName: string;
        shippingAddress: {
          street: string;
          city: string;
          county: string;
          postalCode: string;
          country: string;
        };
        billingAddress: {
          street: string;
          city: string;
          county: string;
          postalCode: string;
          country: string;
        };
        newsletter: boolean;
      };
    },
  ): Promise<CheckoutResponse> => {
    if (items.length === 0) {
      throw new Error('No items provided for checkout.');
    }
    const snapshot: CheckoutSnapshotLine[] = await ctx.runQuery(
      internal.orders.getCheckoutSnapshot,
      { items },
    );

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
    }

    const stripe = new Stripe(stripeSecretKey);

    // 1. Upsert customer in Convex (identity comes from auth, never the client)
    const identity = await ctx.auth.getUserIdentity();
    const customerId: Id<'customers'> = await ctx.runMutation(
      internal.customers.upsertCustomer,
      {
        callerId: identity?.subject,
        callerEmail:
          identity && identity.emailVerified === true
            ? (identity.email as string | undefined)
            : undefined,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        shippingAddress: customer.shippingAddress,
        billingAddress: customer.billingAddress,
        newsletter: customer.newsletter,
      },
    );

    // 1b. Create or reuse Stripe Customer
    const existingStripeId = (await ctx.runMutation(
      internal.customers.getStripeCustomerId,
      { customerId },
    )) as string | null;

    let stripeCustomerId: string | undefined = existingStripeId ?? undefined;

    // Stored ids can belong to another Stripe mode/account (e.g. test ids
    // after switching prod to live keys); drop them and resolve again.
    if (stripeCustomerId) {
      try {
        const stored = await stripe.customers.retrieve(stripeCustomerId);
        if (stored.deleted) stripeCustomerId = undefined;
      } catch (error) {
        if (
          error instanceof Stripe.errors.StripeError &&
          error.code === 'resource_missing'
        ) {
          stripeCustomerId = undefined;
        } else {
          throw error;
        }
      }
    }

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
    const productMap = new Map(
      snapshot.map((product) => [product.productId, product]),
    );

    // 3. Build order items with product snapshots
    const orderItems = snapshot.map(({ productId, name, price, quantity }) => ({
      productId,
      name,
      price,
      quantity,
    }));

    const total =
      orderItems.reduce(
        (sum, item) => sum + toCents(item.price) * item.quantity,
        0,
      ) / 100;

    // 4. Build Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      orderItems.map((item) => {
        const product = productMap.get(item.productId);
        const image = product?.image;

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
      });

    // 5. Create Stripe session with Stripe Customer
    const safeOrigin = resolveSafeOrigin(origin);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      customer: stripeCustomerId,
      success_url: `${safeOrigin}/thank-you`,
      cancel_url: `${safeOrigin}/cart?canceled=true`,
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
      shipping: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        address: customer.shippingAddress,
      },
    });

    return { url: session.url ?? null };
  },
});
