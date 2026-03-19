import { v } from "convex/values";
import { query, internalMutation, mutation } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { internal } from "./_generated/api";

export const createPendingOrder = internalMutation({
  args: {
    customerId: v.id("customers"),
    items: v.array(
      v.object({
        productId: v.id("products"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
      })
    ),
    total: v.number(),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("orders", {
      customerId: args.customerId,
      items: args.items,
      total: args.total,
      status: "pending",
      stripeSessionId: args.stripeSessionId,
      createdAt: Date.now(),
    });
  },
});

export const markOrderPaid = internalMutation({
  args: {
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, { stripeSessionId, stripePaymentIntentId }) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_stripeSessionId", (q) =>
        q.eq("stripeSessionId", stripeSessionId)
      )
      .first();

    if (!order) {
      throw new Error(`Order not found for Stripe session: ${stripeSessionId}`);
    }

    for (const item of order.items) {
      try {
        await ctx.runMutation(internal.products.decrementStock, {
          productId: item.productId,
          quantity: item.quantity,
        });
      } catch (error) {
        console.error(`Failed to decrement stock for product ${item.productId}:`, error);
      }
    }

    await ctx.db.patch(order._id, {
      status: "paid",
      ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
    });

    return order._id;
  },
});

export const setInvoiceData = internalMutation({
  args: {
    orderId: v.id("orders"),
    invoiceId: v.string(),
    invoicePdfUrl: v.string(),
  },
  handler: async (ctx, { orderId, invoiceId, invoicePdfUrl }) => {
    await ctx.db.patch(orderId, {
      invoiceId,
      invoicePdfUrl,
    });
  },
});

export const getOrderWithCustomer = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) return null;

    const customer = await ctx.db.get(order.customerId);
    if (!customer) return null;

    return {
      ...order,
      customer,
    };
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, { orderId, status }) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    await ctx.db.patch(orderId, { status });
    return orderId;
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    // Attach customer info to each order
    return await Promise.all(
      orders.map(async (order) => {
        const customer = await ctx.db.get(order.customerId);
        return {
          ...order,
          customer: customer
            ? {
                email: customer.email,
                firstName: customer.firstName,
                lastName: customer.lastName,
              }
            : null,
        };
      })
    );
  },
});

export const getByDateRange = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, { startTime, endTime }) => {
    await requireAdmin(ctx);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    // Filter by date range in-memory (Convex doesn't support range on non-first index field)
    const filtered = orders.filter(
      (o) => o.createdAt >= startTime && o.createdAt <= endTime
    );

    return await Promise.all(
      filtered.map(async (order) => {
        const customer = await ctx.db.get(order.customerId);
        return {
          ...order,
          customer: customer
            ? {
                email: customer.email,
                firstName: customer.firstName,
                lastName: customer.lastName,
              }
            : null,
        };
      })
    );
  },
});

export const getById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(orderId);
    if (!order) return null;

    const customer = await ctx.db.get(order.customerId);
    return { ...order, customer };
  },
});

export const getByCustomerId = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .order("desc")
      .collect();
  },
});

export const getMyOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const clerkUserId = identity.subject;
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .first();

    if (!customer) return [];

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", customer._id))
      .order("desc")
      .collect();

    return orders.map((order) => ({
      ...order,
      customer: {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    }));
  },
});

export const getMyOrderById = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const clerkUserId = identity.subject;
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .first();

    if (!customer) return null;

    const order = await ctx.db.get(orderId);
    if (!order || order.customerId !== customer._id) return null;

    return { ...order, customer };
  },
});
