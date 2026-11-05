import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { enforceRateLimit } from "./lib/rateLimit";
import { customerSpend } from "./lib/orders.utils";

const addressValidator = v.object({
  street: v.string(),
  city: v.string(),
  county: v.string(),
  postalCode: v.string(),
  country: v.string(),
});

interface CustomerProfile {
  email: string;
  phone?: string;
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
}

// GDPR proof for ad campaigns: stamp when consent is first given, keep it
// while it stays granted, and clear it when consent is withdrawn.
const newsletterConsentAt = (
  storedNewsletter: boolean,
  storedConsentAt: number | undefined,
  incomingNewsletter: boolean,
): number | undefined => {
  if (!incomingNewsletter) return undefined;
  if (storedNewsletter && storedConsentAt !== undefined) return storedConsentAt;
  return Date.now();
};

// Links a customer record to a Clerk account only when the account's
// verified email matches the profile email; never trusts client ids.
export const saveCustomer = async (
  ctx: MutationCtx,
  args: CustomerProfile,
  callerId: string | undefined,
  callerEmail: string | undefined,
): Promise<Id<"customers">> => {
  // Both public entry points funnel here; cap per-email writes so the
  // guest path can't be scripted into customer/order/Stripe spam.
  await enforceRateLimit(
    ctx,
    `customer-upsert:${args.email.toLowerCase()}`,
    15,
    60 * 60 * 1000,
  );
  const linkId =
    callerId &&
    callerEmail &&
    callerEmail.toLowerCase() === args.email.toLowerCase()
      ? callerId
      : undefined;
  const existing = await ctx.db
    .query("customers")
    .withIndex("by_email", (q) => q.eq("email", args.email))
    .first();

  if (existing) {
    if (existing.clerkUserId && existing.clerkUserId !== callerId) {
      throw new ConvexError(
        "Adresa de email aparține unui cont existent. Autentifică-te cu acel cont.",
      );
    }
    await ctx.db.patch(existing._id, {
      firstName: args.firstName,
      lastName: args.lastName,
      ...(args.phone !== undefined ? { phone: args.phone.trim() } : {}),
      shippingAddress: args.shippingAddress,
      billingAddress: args.billingAddress,
      newsletter: args.newsletter,
      newsletterConsentAt: newsletterConsentAt(
        existing.newsletter,
        existing.newsletterConsentAt,
        args.newsletter,
      ),
      isRegistered: Boolean(callerId) || existing.isRegistered,
      ...(linkId ? { clerkUserId: linkId } : {}),
    });
    return existing._id;
  }

  return await ctx.db.insert("customers", {
    clerkUserId: linkId,
    isRegistered: Boolean(callerId),
    email: args.email,
    ...(args.phone !== undefined ? { phone: args.phone.trim() } : {}),
    firstName: args.firstName,
    lastName: args.lastName,
    shippingAddress: args.shippingAddress,
    billingAddress: args.billingAddress,
    newsletter: args.newsletter,
    newsletterConsentAt: args.newsletter ? Date.now() : undefined,
    createdAt: Date.now(),
  });
};

export const upsertCustomer = internalMutation({
  args: {
    clerkUserId: v.optional(v.string()),
    callerId: v.optional(v.string()),
    callerEmail: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    shippingAddress: addressValidator,
    billingAddress: addressValidator,
    newsletter: v.boolean(),
  },
  handler: async (ctx, args) =>
    saveCustomer(ctx, args, args.callerId, args.callerEmail),
});

export const upsertFromShipping = mutation({
  args: {
    clerkUserId: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    shippingAddress: addressValidator,
    billingAddress: addressValidator,
    newsletter: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const callerId = identity?.subject;
    const callerEmail =
      identity && identity.emailVerified === true
        ? (identity.email as string | undefined)
        : undefined;
    return saveCustomer(ctx, args, callerId, callerEmail);
  },
});

export const getStripeCustomerId = internalMutation({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const customer = await ctx.db.get(customerId);
    return customer?.stripeCustomerId ?? null;
  },
});

export const setStripeCustomerId = internalMutation({
  args: {
    customerId: v.id("customers"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, { customerId, stripeCustomerId }) => {
    await ctx.db.patch(customerId, { stripeCustomerId });
  },
});

export const getByClerkUserId = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("customers")
      .withIndex("by_clerkUserId", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .first();
  },
});

/**
 * Links a guest-era customer row to the signed-in Clerk account. Guest
 * checkout created rows without clerkUserId, so getByClerkUserId cannot
 * find them; the only safe link is the account's own verified email.
 */
export const syncMyProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const linked = await ctx.db
      .query("customers")
      .withIndex("by_clerkUserId", (q) =>
        q.eq("clerkUserId", identity.subject),
      )
      .first();
    if (linked) return linked;

    if (identity.emailVerified !== true || !identity.email) return null;

    const findByEmail = (email: string) =>
      ctx.db
        .query("customers")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    const lowercased = identity.email.toLowerCase();
    const candidate =
      (await findByEmail(lowercased)) ??
      (lowercased !== identity.email ? await findByEmail(identity.email) : null);
    if (!candidate) return null;
    if (candidate.clerkUserId && candidate.clerkUserId !== identity.subject) {
      return null;
    }
    if (candidate.clerkUserId === identity.subject) return candidate;

    await ctx.db.patch(candidate._id, {
      clerkUserId: identity.subject,
      isRegistered: true,
    });
    return await ctx.db.get(candidate._id);
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const customers = await ctx.db.query("customers").order("desc").collect();

    return await Promise.all(
      customers.map(async (customer) => {
        const orders = await ctx.db
          .query("orders")
          .withIndex("by_customerId", (q) =>
            q.eq("customerId", customer._id)
          )
          .collect();

        const totalSpent = customerSpend(orders);

        return {
          ...customer,
          orderCount: orders.length,
          totalSpent,
        };
      })
    );
  },
});

export const getById = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    await requireAdmin(ctx);
    const customer = await ctx.db.get(customerId);
    if (!customer) return null;

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", customer._id))
      .order("desc")
      .collect();

    return { ...customer, orders };
  },
});

export const updateCustomer = mutation({
  args: {
    customerId: v.id("customers"),
    email: v.string(),
    phone: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    shippingAddress: addressValidator,
    billingAddress: addressValidator,
    newsletter: v.boolean(),
  },
  handler: async (ctx, { customerId, ...updates }) => {
    await requireAdmin(ctx);
    
    const customer = await ctx.db.get(customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    await ctx.db.patch(customerId, {
      ...updates,
      newsletterConsentAt: newsletterConsentAt(
        customer.newsletter,
        customer.newsletterConsentAt,
        updates.newsletter,
      ),
    });
    return customerId;
  },
});

export const deleteCustomer = mutation({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    await requireAdmin(ctx);
    
    const customer = await ctx.db.get(customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .collect();

    if (orders.length > 0) {
      throw new Error("Cannot delete customer with existing orders");
    }

    await ctx.db.delete(customerId);
  },
});

export const getNewsletterSubscribers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    
    const subscribers = await ctx.db
      .query("customers")
      .filter((q) => q.eq(q.field("newsletter"), true))
      .collect();

    return subscribers.map((sub) => ({
      email: sub.email,
      firstName: sub.firstName,
      lastName: sub.lastName,
      phone: sub.phone,
      isRegistered: sub.isRegistered,
      newsletterConsentAt: sub.newsletterConsentAt,
      createdAt: sub.createdAt,
    }));
  },
});
