import { ConvexError, v } from "convex/values";
import {
  query,
  internalQuery,
  internalMutation,
  mutation,
} from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin, requirePermission } from "./lib/auth";
import { hasPermission } from "./lib/permissions";
import { internal } from "./_generated/api";
import {
  checkoutSnapshot,
  onlineDeductions,
  requestIdIsValid,
  stockQuantity,
} from "./lib/inventory.utils";
import type { CheckoutSnapshotLine } from "./lib/inventory.utils";
import {
  fulfillmentState,
  paymentStatus,
} from "./lib/orders.utils";

interface PaymentResult {
  orderId: Id<"orders">;
  inventoryStatus: "pending" | "applied" | "needs_review" | "released" | "legacy";
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
    shipping: v.optional(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        address: v.object({
          street: v.string(),
          city: v.string(),
          county: v.string(),
          postalCode: v.string(),
          country: v.string(),
        }),
      }),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("orders", {
      customerId: args.customerId,
      items: args.items,
      total: args.total,
      status: "pending",
      inventoryStatus: "pending",
      stripeSessionId: args.stripeSessionId,
      shipping: args.shipping,
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
      order.inventoryStatus === "applied" ||
      // Only paid orders are released on cancel; a redelivered webhook must not re-hold stock.
      order.inventoryStatus === "released"
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

const FULFILLABLE_STATUSES = new Set(["paid", "shipped", "delivered"]);

// Same keys as the admin view, with money, payment and customer
// identifiers removed for fulfillment staff.
const redactOrder = (
  order: Doc<"orders">,
  customer: Doc<"customers"> | null,
  detail = false,
) => ({
  ...order,
  items: order.items.map((item) => ({ ...item, price: null })),
  total: null,
  stripeSessionId: null,
  stripePaymentIntentId: undefined,
  invoiceId: undefined,
  invoicePdfUrl: undefined,
  postPaymentScheduledAt: undefined,
  customer: customer
    ? detail
      ? {
          _id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          shippingAddress: customer.shippingAddress,
          email: null,
          billingAddress: null,
        }
      : {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: null,
        }
    : null,
});

export const reconcileStock = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }): Promise<PaymentResult> => {
    const { identity } = await requirePermission(ctx, "inventory.reconcile");
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
    await requirePermission(ctx, "inventory.reconcile");
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
    await requirePermission(ctx, "orders.fulfill");
    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new ConvexError("Comanda nu există.");
    }
    if (!(order.status === "shipped" && status === "delivered")) {
      throw new ConvexError(
        "Folosește acțiunile dedicate (Fulfillment sau Anulează). Plata se confirmă doar din Stripe.",
      );
    }
    await ctx.db.patch(orderId, { status });
    return orderId;
  },
});

export const cancel = mutation({
  args: {
    requestId: v.string(),
    orderId: v.id("orders"),
    reason: v.string(),
  },
  handler: async (ctx, { requestId, orderId, reason }) => {
    const { identity } = await requirePermission(ctx, "orders.manage");
    if (!requestIdIsValid(requestId)) {
      throw new ConvexError("Identificator de operațiune invalid.");
    }
    const previous = await ctx.db
      .query("orderEvents")
      .withIndex("by_request", (q) => q.eq("requestId", requestId))
      .unique();
    if (previous) {
      if (
        previous.actorId !== identity.subject ||
        previous.orderId !== orderId ||
        previous.kind !== "cancelled"
      ) {
        throw new ConvexError(
          "Identificator deja utilizat pentru alta operațiune.",
        );
      }
      return ctx.db.get(orderId);
    }
    const trimmed = reason.trim();
    if (trimmed.length < 3 || trimmed.length > 300) {
      throw new ConvexError(
        "Motivul anulării trebuie să aibă între 3 și 300 de caractere.",
      );
    }
    const order = await ctx.db.get(orderId);
    if (!order) throw new ConvexError("Comanda nu există.");
    if (order.status === "shipped" || order.status === "delivered") {
      throw new ConvexError(
        "Comanda expediată nu mai poate fi anulată.",
      );
    }
    const now = Date.now();
    const actorId = identity.subject;
    let eventNote = trimmed;

    if (order.status === "cancelled") {
      if (order.inventoryStatus !== "needs_review") {
        throw new ConvexError("Comanda este deja anulată.");
      }
      // Paid after cancel: release the held claims only.
      await ctx.db.patch(orderId, {
        inventoryStatus: "released",
        refundStatus: "manual_required",
        cancelReason: trimmed,
      });
      await ctx.db.insert("orderEvents", {
        orderId,
        requestId,
        actorId: identity.subject,
        kind: "cancelled",
        note: trimmed,
        createdAt: now,
      });
      return ctx.db.get(orderId);
    }

    const paid = paymentStatus(order) === "paid";
    const notes: string[] = [];
    const patch: Record<string, unknown> = {
      status: "cancelled",
      cancelledAt: now,
      cancelledBy: actorId,
      cancelReason: trimmed,
      assignedTo: undefined,
      assignedAt: undefined,
    };
    if (paid) {
      const applied = order.inventoryAppliedItems ?? [];
      if (applied.length > 0) {
        for (const item of applied) {
          const product = await ctx.db.get(item.productId);
          if (!product) {
            notes.push(
              `${item.name}: produsul nu mai există, stocul nu a fost restabilit.`,
            );
            continue;
          }
          const after = stockQuantity((product.stock ?? 0) + item.quantity);
          await ctx.db.patch(item.productId, { stock: after });
          await ctx.db.insert("stockMovements", {
            requestId,
            productId: item.productId,
            location: "workshop",
            kind: "online_cancel",
            quantity: item.quantity,
            balanceAfter: after,
            actorId,
            orderId,
            createdAt: now,
          });
        }
        patch.inventoryRestockedAt = now;
      } else {
        notes.push(
          "Stoc neverificat (comandă veche) — ajustează manual în Stocuri dacă e cazul.",
        );
      }
      patch.inventoryStatus = "released";
      patch.refundStatus = "manual_required";
    }
    if (notes.length > 0) eventNote = `${trimmed} — ${notes.join(" ")}`;
    await ctx.db.patch(orderId, patch);
    await ctx.db.insert("orderEvents", {
      orderId,
      requestId,
      actorId,
      kind: "cancelled",
      note: eventNote,
      createdAt: now,
    });
    return ctx.db.get(orderId);
  },
});

export const listAdmin = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, { from, to }) => {
    await requirePermission(ctx, "orders.manage");
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
    const filtered = orders
      .filter(
        (order) =>
          (from === undefined || order.createdAt >= from) &&
          (to === undefined || order.createdAt <= to),
      )
      .slice(0, 1000);
    return await Promise.all(
      filtered.map(async (order) => {
        const customer = await ctx.db.get(order.customerId);
        return {
          ...order,
          shortNumber: order._id.slice(-8).toUpperCase(),
          paymentStatus: paymentStatus(order),
          fulfillmentState: fulfillmentState(order),
          customer: customer
            ? {
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
              }
            : null,
          itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        };
      }),
    );
  },
});

export const getAdmin = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    await requirePermission(ctx, "orders.manage");
    const order = await ctx.db.get(orderId);
    if (!order) return null;
    const [customer, events] = await Promise.all([
      ctx.db.get(order.customerId),
      ctx.db
        .query("orderEvents")
        .withIndex("by_order", (q) => q.eq("orderId", orderId))
        .collect(),
    ]);
    return {
      ...order,
      shortNumber: order._id.slice(-8).toUpperCase(),
      paymentStatus: paymentStatus(order),
      fulfillmentState: fulfillmentState(order),
      customer,
      shipping:
        order.shipping ??
        (customer
          ? {
              firstName: customer.firstName,
              lastName: customer.lastName,
              address: customer.shippingAddress,
            }
          : undefined),
      shippingSource: order.shipping ? "snapshot" : "customer",
      events: events.sort((a, b) => a.createdAt - b.createdAt),
    };
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const staff = await requirePermission(ctx, "orders.fulfill");
    const manage = hasPermission(staff.role, "orders.manage");
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    const visible = manage
      ? orders
      : orders.filter((order) => FULFILLABLE_STATUSES.has(order.status));

    // Attach customer info to each order
    return await Promise.all(
      visible.map(async (order) => {
        const customer = await ctx.db.get(order.customerId);
        if (!manage) return redactOrder(order, customer);
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
    const staff = await requirePermission(ctx, "orders.fulfill");
    const manage = hasPermission(staff.role, "orders.manage");
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    // Filter by date range in-memory (Convex doesn't support range on non-first index field)
    const filtered = orders.filter(
      (o) =>
        o.createdAt >= startTime &&
        o.createdAt <= endTime &&
        (manage || FULFILLABLE_STATUSES.has(o.status)),
    );

    return await Promise.all(
      filtered.map(async (order) => {
        const customer = await ctx.db.get(order.customerId);
        if (!manage) return redactOrder(order, customer);
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
    const staff = await requirePermission(ctx, "orders.fulfill");
    const order = await ctx.db.get(orderId);
    if (!order) return null;

    const customer = await ctx.db.get(order.customerId);
    if (!hasPermission(staff.role, "orders.manage")) {
      if (!FULFILLABLE_STATUSES.has(order.status)) return null;
      return redactOrder(order, customer, true);
    }
    return { ...order, customer };
  },
});

export const getByCustomerId = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    await requireAdmin(ctx);
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
