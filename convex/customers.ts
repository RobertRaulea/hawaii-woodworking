import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";

const addressValidator = v.object({
  street: v.string(),
  city: v.string(),
  county: v.string(),
  postalCode: v.string(),
  country: v.string(),
});

interface CustomerProfile {
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
}

// Links a customer record to a Clerk account only when the account's
// verified email matches the profile email; never trusts client ids.
const saveCustomer = async (
  ctx: MutationCtx,
  args: CustomerProfile,
  callerId: string | undefined,
  callerEmail: string | undefined,
): Promise<Id<"customers">> => {
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
      shippingAddress: args.shippingAddress,
      billingAddress: args.billingAddress,
      newsletter: args.newsletter,
      isRegistered: Boolean(callerId) || existing.isRegistered,
      ...(linkId ? { clerkUserId: linkId } : {}),
    });
    return existing._id;
  }

  return await ctx.db.insert("customers", {
    clerkUserId: linkId,
    isRegistered: Boolean(callerId),
    email: args.email,
    firstName: args.firstName,
    lastName: args.lastName,
    shippingAddress: args.shippingAddress,
    billingAddress: args.billingAddress,
    newsletter: args.newsletter,
    createdAt: Date.now(),
  });
};

export const upsertCustomer = internalMutation({
  args: {
    clerkUserId: v.optional(v.string()),
    callerId: v.optional(v.string()),
    callerEmail: v.optional(v.string()),
    email: v.string(),
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

        const totalSpent = orders
          .filter((o) => o.status !== "cancelled")
          .reduce((sum, o) => sum + o.total, 0);

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

    await ctx.db.patch(customerId, updates);
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
      isRegistered: sub.isRegistered,
      createdAt: sub.createdAt,
    }));
  },
});
