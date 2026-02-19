import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

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
    // Try to find existing customer by email
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      // Update existing customer with latest info
      await ctx.db.patch(existing._id, {
        firstName: args.firstName,
        lastName: args.lastName,
        shippingAddress: args.shippingAddress,
        billingAddress: args.billingAddress,
        newsletter: args.newsletter,
        ...(args.clerkUserId ? { clerkUserId: args.clerkUserId } : {}),
      });
      return existing._id;
    }

    // Create new customer
    return await ctx.db.insert("customers", {
      clerkUserId: args.clerkUserId,
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

export const getByClerkUserId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .first();
  },
});
