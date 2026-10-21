import { ConvexError, v } from "convex/values";
import {
  query,
  internalQuery,
  internalMutation,
  mutation,
} from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";
import { internal } from "./_generated/api";
import { checkoutSnapshot, onlineDeductions } from "./lib/inventory.utils";
import type { CheckoutSnapshotLine } from "./lib/inventory.utils";

interface PaymentResult {
  orderId: Id<"orders">;
  inventoryStatus: "pending" | "applied" | "needs_review" | "legacy";
  alreadyProcessed: boolean;
}

const applyOrderStock = async (
  ctx: MutationCtx,
  order: Doc<"orders">,
  actorId = "system:stripe",
  reserveOnly = false,
): Promise<PaymentResult> => {
  let deductions: Awaited<ReturnType<typeof onlineDeductions>>;
  try {
    const items =
      order.inventoryStatus === "needs_review"
        ? (order.inventoryUnfulfilledItems ?? order.items)
        : order.items;
    deductions = await onlineDeductions(ctx, items, order._id, true);
  } catch (error) {
    if (!(error instanceof ConvexError)) throw error;
    await ctx.db.patch(order._id, {
      inventoryStatus: "needs_review",
      inventoryReviewReason: "stock",
      inventoryUnfulfilledItems:
        order.inventoryUnfulfilledItems ??
        order.items.map(({ productId, name, quantity }) => ({
          productId,
          name,
          quantity,
        })),
      inventoryError:
        typeof error.data === "string"
          ? error.data
          : "Stocul necesită verificare.",
    });
    return {
      orderId: order._id,
      inventoryStatus: "needs_review",
      alreadyProcessed: false,
    };
  }
  const unfulfilledItems = deductions
    .filter((item) => reserveOnly || item.unfulfilledQuantity > 0)
    .map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: reserveOnly ? item.quantity : item.unfulfilledQuantity,
    }));
  const appliedItems = new Map(
    (order.inventoryAppliedItems ?? []).map((item) => [item.productId, item]),
  );
  for (const item of deductions) {
    const appliedQuantity = reserveOnly ? 0 : item.appliedQuantity;
    if (appliedQuantity > 0) {
      appliedItems.set(item.productId, {
        productId: item.productId,
        name: item.name,
        quantity:
          (appliedItems.get(item.productId)?.quantity ?? 0) + appliedQuantity,
      });
    }
    if (!item.tracked || item.physicalStock === null || appliedQuantity === 0)
      continue;
    const stockAfter = item.physicalStock - appliedQuantity;
    await ctx.db.patch(item.productId, { stock: stockAfter });
    await ctx.db.insert("stockMovements", {
      requestId: `stripe:${order.stripeSessionId}`,
      productId: item.productId,
      location: "workshop",
      kind: "online_sale",
      quantity: -appliedQuantity,
      balanceAfter: stockAfter,
      actorId,
      orderId: order._id,
      createdAt: Date.now(),
    });
  }
  const cancelledReview = reserveOnly;
  const needsReview = cancelledReview || unfulfilledItems.length > 0;
  const scheduledAt = needsReview
    ? order.postPaymentScheduledAt
    : (order.postPaymentScheduledAt ?? Date.now());
  if (!needsReview && order.postPaymentScheduledAt === undefined) {
    await ctx.scheduler.runAfter(0, internal.postPayment.handlePostPayment, {
      orderId: order._id,
    });
  }
  await ctx.db.patch(order._id, {
    status: reserveOnly ? order.status : "paid",
    inventoryStatus: needsReview ? "needs_review" : "applied",
    inventoryAppliedAt: needsReview ? undefined : Date.now(),
    inventoryError:
      unfulfilledItems.length > 0
        ? unfulfilledItems
            .map(
              (item) =>
                `${item.name}: ${item.quantity} buc. plătite, dar încă nealocate.`,
            )
            .join(" ")
        : cancelledReview
          ? "Plata a fost confirmată după anularea comenzii. Verifică plata și posibilitatea de onorare înainte de livrare."
          : undefined,
    inventoryReviewReason: reserveOnly
      ? "cancelled"
      : needsReview
        ? "stock"
        : undefined,
    inventoryUnfulfilledItems: needsReview ? unfulfilledItems : undefined,
    inventoryAppliedItems: [...appliedItems.values()],
    postPaymentScheduledAt: scheduledAt,
  });
  return {
    orderId: order._id,
    inventoryStatus: needsReview ? "needs_review" : "applied",
    alreadyProcessed: false,
  };
};

export const getCheckoutSnapshot = internalQuery({
  args: {
    items: v.array(
      v.object({ productId: v.id("products"), quantity: v.number() }),
    ),
  },
  handler: async (ctx, { items }): Promise<CheckoutSnapshotLine[]> =>
    checkoutSnapshot(ctx, items),
});

export const createPendingOrder = internalMutation({
  args: {
    customerId: v.id("customers"),
    items: v.array(
      v.object({
        productId: v.id("products"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
      }),
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
      inventoryStatus: "pending",
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
  handler: async (
    ctx,
    { stripeSessionId, stripePaymentIntentId },
  ): Promise<PaymentResult> => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_stripeSessionId", (q) =>
        q.eq("stripeSessionId", stripeSessionId),
      )
      .unique();

    if (!order) {
      throw new Error(`Order not found for Stripe session: ${stripeSessionId}`);
    }

    const legacyPaid =
      order.inventoryStatus === undefined &&
      (["paid", "shipped", "delivered"].includes(order.status) ||
        order.stripePaymentIntentId !== undefined ||
        order.invoiceId !== undefined);
    if (
      legacyPaid ||
      order.paymentConfirmedAt !== undefined ||
      order.inventoryStatus === "applied"
    ) {
      return {
        orderId: order._id,
        inventoryStatus: order.inventoryStatus ?? "legacy",
        alreadyProcessed: true,
      };
    }
    const paymentConfirmedAt = Date.now();
    const cancelled = order.status === "cancelled";
    await ctx.db.patch(order._id, {
      paymentConfirmedAt,
      status: cancelled ? "cancelled" : "paid",
      ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
    });
    return applyOrderStock(
      ctx,
      {
        ...order,
        status: cancelled ? "cancelled" : "paid",
        paymentConfirmedAt,
      },
      "system:stripe",
      cancelled,
    );
  },
});

export const reconcileStock = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }): Promise<PaymentResult> => {
    const identity = await requireAdmin(ctx);
    const order = await ctx.db.get(orderId);
    if (!order) throw new ConvexError("Comanda nu există.");
    if (order.inventoryStatus === "applied")
      return { orderId, inventoryStatus: "applied", alreadyProcessed: true };
    if (
      order.paymentConfirmedAt === undefined ||
      order.inventoryStatus !== "needs_review"
    ) {
      throw new ConvexError(
        "Poți reconcilia doar o plată confirmată cu inventar de verificat.",
      );
    }
    return applyOrderStock(ctx, order, identity.subject);
  },
});

export const getInventoryIssues = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_inventoryStatus", (q) =>
        q.eq("inventoryStatus", "needs_review"),
      )
      .collect();
    return orders.map((order) => ({
      orderId: order._id,
      error: order.inventoryError ?? "Stoc de verificat",
      createdAt: order.createdAt,
    }));
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
      v.literal("cancelled"),
    ),
  },
  handler: async (ctx, { orderId, status }) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    if (
      ["shipped", "delivered"].includes(status) &&
      order.inventoryStatus !== undefined &&
      order.inventoryStatus !== "applied"
    ) {
      throw new ConvexError(
        "Inventarul comenzii trebuie reconciliat înainte de expediere.",
      );
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
      }),
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
      (o) => o.createdAt >= startTime && o.createdAt <= endTime,
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
      }),
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
