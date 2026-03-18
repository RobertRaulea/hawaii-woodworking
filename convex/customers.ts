import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

const addressValidator = v.object({
  street: v.string(),
  city: v.string(),
  county: v.string(),
  postalCode: v.string(),
  country: v.string(),
});

export const upsertCustomer = internalMutation({
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
    const isRegistered = !!args.clerkUserId;

    // Try to find existing customer by email
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        shippingAddress: args.shippingAddress,
        billingAddress: args.billingAddress,
        newsletter: args.newsletter,
        isRegistered: isRegistered || existing.isRegistered,
        ...(args.clerkUserId ? { clerkUserId: args.clerkUserId } : {}),
      });
      return existing._id;
    }

    // Create new customer
    return await ctx.db.insert("customers", {
      clerkUserId: args.clerkUserId,
      isRegistered,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      shippingAddress: args.shippingAddress,
      billingAddress: args.billingAddress,
      newsletter: args.newsletter,
      createdAt: Date.now(),
    });
  },
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
    const isRegistered = !!args.clerkUserId;

    const existing = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        shippingAddress: args.shippingAddress,
        billingAddress: args.billingAddress,
        newsletter: args.newsletter,
        isRegistered: isRegistered || existing.isRegistered,
        ...(args.clerkUserId ? { clerkUserId: args.clerkUserId } : {}),
      });
      return existing._id;
    }

    return await ctx.db.insert("customers", {
      clerkUserId: args.clerkUserId,
      isRegistered,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      shippingAddress: args.shippingAddress,
      billingAddress: args.billingAddress,
      newsletter: args.newsletter,
      createdAt: Date.now(),
    });
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
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
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
