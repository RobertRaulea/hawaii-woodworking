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
import { cancelOrderCore } from "./lib/orderCancel.utils";
import { enforceRateLimit } from "./lib/rateLimit";
import { analyticsContextValidator, purchaseSnapshot } from "./lib/analytics.utils";

interface PaymentResult {
  orderId: Id<"orders">;
  inventoryStatus: "pending" | "applied" | "needs_review" | "released" | "legacy";
  alreadyProcessed: boolean;
}

export const applyOrderStock = async (
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
      // COD orders already carry "cod:" in their order key; card uses stripe:.
      requestId:
        order.paymentMethod === "cod"
          ? order.stripeSessionId
          : `stripe:${order.stripeSessionId}`,
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
    // COD stays "pending" (cash on delivery); card moves to "paid".
    status: reserveOnly || order.paymentMethod === "cod" ? order.status : "paid",
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
    analytics: v.optional(analyticsContextValidator),
    items: v.array(
      v.object({
        productId: v.id("products"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
      }),
    ),
    total: v.number(),
    paymentMethod: v.optional(v.union(v.literal("card"), v.literal("cod"))),
    shippingCost: v.optional(v.number()),
    codFee: v.optional(v.number()),
    stripeSessionId: v.string(),
    shipping: v.optional(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        phone: v.optional(v.string()),
        address: v.object({
          street: v.string(),
          city: v.string(),
          county: v.string(),
          postalCode: v.string(),
          country: v.string(),
        }),
      }),
    ),
    billing: v.optional(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        phone: v.optional(v.string()),
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
      paymentMethod: args.paymentMethod,
      shippingCost: args.shippingCost,
      codFee: args.codFee,
      status: "pending",
      inventoryStatus: "pending",
      stripeSessionId: args.stripeSessionId,
      shipping: args.shipping,
      billing: args.billing,
      ...(args.analytics ? { analytics: args.analytics } : {}),
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
    // A late payment never reopens a closed order.
    const closed = order.status === "cancelled" || order.status === "returned";
    await ctx.db.patch(order._id, {
      paymentConfirmedAt,
      status: closed ? order.status : "paid",
      ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
    });
    const result = await applyOrderStock(
      ctx,
      {
        ...order,
        status: closed ? order.status : "paid",
        paymentConfirmedAt,
      },
      "system:stripe",
      closed,
    );
    if (result.inventoryStatus === "applied" || result.inventoryStatus === "needs_review") {
      const snapshot = purchaseSnapshot({
        ...order,
        status: closed ? order.status : "paid",
        paymentConfirmedAt,
        inventoryStatus: result.inventoryStatus,
      });
      if (snapshot) {
        try {
          await ctx.scheduler.runAfter(0, internal.postPayment.capturePurchaseAnalytics, { snapshot });
        } catch {
          // Optional telemetry cannot roll back an otherwise successful payment.
          console.error("Purchase analytics could not be scheduled");
        }
      }
    }
    return result;
  },
});

const FULFILLABLE_STATUSES = new Set(["paid", "shipped", "delivered"]);

// COD orders stay "pending" until delivery but are still visible to
// fulfillment staff once their stock is applied.
const fulfillmentVisible = (order: Doc<"orders">) =>
  FULFILLABLE_STATUSES.has(order.status) ||
  (order.paymentMethod === "cod" &&
    order.status === "pending" &&
    order.inventoryStatus === "applied");

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
  analytics: undefined,
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
    // COD cash is collected by the courier on delivery.
    await ctx.db.patch(orderId, {
      status,
      ...(order.paymentMethod === "cod"
        ? { paymentConfirmedAt: Date.now() }
        : {}),
    });
    return orderId;
  },
});

type OrderNoticeKind = "customer_cancelled" | "return_requested" | "returned";

// Email notices are best-effort: scheduling must never roll back the order
// change when delivery is unconfigured or unavailable.
const scheduleOrderNotice = async (
  ctx: MutationCtx,
  orderId: Id<"orders">,
  kind: OrderNoticeKind,
) => {
  try {
    await ctx.scheduler.runAfter(0, internal.postPayment.sendOrderNotice, {
      orderId,
      kind,
    });
  } catch {
    console.error("Notificarea de comandă nu a putut fi programată.");
  }
};

const orderEventReplay = async (
  ctx: MutationCtx,
  requestId: string,
  actorId: string,
  kind: Doc<"orderEvents">["kind"],
  orderId: Id<"orders">,
) => {
  if (!requestIdIsValid(requestId)) {
    throw new ConvexError("Identificator de operațiune invalid.");
  }
  const previous = await ctx.db
    .query("orderEvents")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .unique();
  if (!previous) return null;
  if (
    previous.actorId !== actorId ||
    previous.kind !== kind ||
    previous.orderId !== orderId
  ) {
    throw new ConvexError(
      "Identificator deja utilizat pentru alta operațiune.",
    );
  }
  return previous;
};

// Customer-owned order lookup: a missing account, missing order or foreign
// order all get the same generic error so the endpoint leaks nothing.
const requireOwnedOrder = async (ctx: MutationCtx, orderId: Id<"orders">) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Trebuie să fii autentificat.");
  }
  const customer = await ctx.db
    .query("customers")
    .withIndex("by_clerkUserId", (q) =>
      q.eq("clerkUserId", identity.subject),
    )
    .first();
  const order = await ctx.db.get(orderId);
  if (!customer || !order || order.customerId !== customer._id) {
    throw new ConvexError("Comanda nu există.");
  }
  return { identity, customer, order };
};

export const cancel = mutation({
  args: {
    requestId: v.string(),
    orderId: v.id("orders"),
    reason: v.string(),
  },
  handler: async (ctx, { requestId, orderId, reason }) => {
    const { identity } = await requirePermission(ctx, "orders.manage");
    const result = await cancelOrderCore(ctx, {
      requestId,
      orderId,
      reason,
      actorId: identity.subject,
    });
    // Admin cancellations do not notify: the customer-cancel email text only
    // fits self-service cancels, and staff cancels are handled out-of-band.
    return result.order;
  },
});

export const cancelMine = mutation({
  args: {
    requestId: v.string(),
    orderId: v.id("orders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { requestId, orderId, reason }) => {
    const { identity } = await requireOwnedOrder(ctx, orderId);
    await enforceRateLimit(
      ctx,
      `order-cancel:${identity.subject}`,
      20,
      60 * 60 * 1000,
    );
    const trimmed = reason?.trim() ?? "";
    const result = await cancelOrderCore(ctx, {
      requestId,
      orderId,
      reason: trimmed.length < 3 ? "Anulată de client" : trimmed,
      actorId: identity.subject,
      checkEligible: (order) => {
        if (order.status === "cancelled") {
          throw new ConvexError("Comanda este deja anulată.");
        }
        if (order.status === "returned") {
          throw new ConvexError(
            "Comanda returnată nu mai poate fi anulată.",
          );
        }
        if (order.status === "shipped" || order.status === "delivered") {
          throw new ConvexError(
            "Comanda este deja expediată. Pentru retur sau alte modificări, contactează-ne.",
          );
        }
        if (order.fulfillmentStatus === "packed") {
          throw new ConvexError(
            "Comanda este deja ambalată pentru expediere. Contactează-ne urgent dacă vrei să o anulezi.",
          );
        }
        // Self-cancel needs stock cleanly applied and money either already
        // collected by card or due on delivery (COD); anything else is
        // reconciled by staff, not by the customer.
        if (
          order.inventoryStatus !== "applied" ||
          (paymentStatus(order) !== "paid" && order.paymentMethod !== "cod")
        ) {
          throw new ConvexError(
            "Comanda nu poate fi anulată online. Contactează-ne și o rezolvăm împreună.",
          );
        }
      },
    });
    if (result.cancelledNow) {
      await scheduleOrderNotice(ctx, orderId, "customer_cancelled");
    }
    return result.order;
  },
});

const RETURN_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export const requestReturnMine = mutation({
  args: {
    requestId: v.string(),
    orderId: v.id("orders"),
    reason: v.string(),
  },
  handler: async (ctx, { requestId, orderId, reason }) => {
    const { identity, order } = await requireOwnedOrder(ctx, orderId);
    await enforceRateLimit(
      ctx,
      `order-return:${identity.subject}`,
      20,
      60 * 60 * 1000,
    );
    const previous = await orderEventReplay(
      ctx,
      requestId,
      identity.subject,
      "return_requested",
      orderId,
    );
    if (previous) return ctx.db.get(orderId);
    const trimmed = reason.trim();
    if (trimmed.length < 3 || trimmed.length > 300) {
      throw new ConvexError(
        "Motivul returului trebuie să aibă între 3 și 300 de caractere.",
      );
    }
    if (order.status !== "delivered") {
      throw new ConvexError(
        "Returul se poate cere doar pentru comenzi livrate.",
      );
    }
    const now = Date.now();
    if (
      order.deliveredAt === undefined ||
      now - order.deliveredAt > RETURN_WINDOW_MS
    ) {
      throw new ConvexError(
        "Perioada de retur de 14 zile a expirat. Contactează-ne pentru detalii.",
      );
    }
    if (order.returnRequestedAt !== undefined) {
      throw new ConvexError("Ai cerut deja returul pentru această comandă.");
    }
    await ctx.db.patch(orderId, {
      returnRequestedAt: now,
      returnRequestReason: trimmed,
    });
    await ctx.db.insert("orderEvents", {
      orderId,
      requestId,
      actorId: identity.subject,
      kind: "return_requested",
      note: trimmed,
      createdAt: now,
    });
    await scheduleOrderNotice(ctx, orderId, "return_requested");
    return ctx.db.get(orderId);
  },
});

export const markReturned = mutation({
  args: {
    requestId: v.string(),
    orderId: v.id("orders"),
    reason: v.string(),
    restock: v.boolean(),
  },
  handler: async (ctx, { requestId, orderId, reason, restock }) => {
    const { identity } = await requirePermission(ctx, "orders.manage");
    const previous = await orderEventReplay(
      ctx,
      requestId,
      identity.subject,
      "returned",
      orderId,
    );
    if (previous) return ctx.db.get(orderId);
    const trimmed = reason.trim();
    if (trimmed.length < 3 || trimmed.length > 300) {
      throw new ConvexError(
        "Motivul returului trebuie să aibă între 3 și 300 de caractere.",
      );
    }
    const order = await ctx.db.get(orderId);
    if (!order) throw new ConvexError("Comanda nu există.");
    if (order.status === "returned") {
      throw new ConvexError("Comanda este deja returnată.");
    }
    // "delivered" covers the withdrawal window and "shipped" covers the
    // parcel refused at the door.
    if (order.status !== "delivered" && order.status !== "shipped") {
      throw new ConvexError(
        "Doar comenzile expediate sau livrate pot fi marcate ca returnate.",
      );
    }
    const now = Date.now();
    const actorId = identity.subject;
    const notes: string[] = [];
    const patch: Record<string, unknown> = {
      status: "returned",
      returnedAt: now,
      returnedBy: actorId,
      returnReason: trimmed,
      returnRestocked: restock,
      assignedTo: undefined,
      assignedAt: undefined,
    };
    if (restock) {
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
            kind: "online_return",
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
    }
    // Money is refunded manually; a refused unpaid COD parcel has nothing
    // to refund.
    const collected =
      (order.paymentMethod !== "cod" && paymentStatus(order) === "paid") ||
      (order.paymentMethod === "cod" && order.paymentConfirmedAt !== undefined);
    if (collected) patch.refundStatus = "manual_required";
    const eventNote = `${trimmed} — ${restock ? "stoc restabilit" : "fără restocare"}${notes.length > 0 ? ` — ${notes.join(" ")}` : ""}`;
    await ctx.db.patch(orderId, patch);
    await ctx.db.insert("orderEvents", {
      orderId,
      requestId,
      actorId,
      kind: "returned",
      note: eventNote,
      createdAt: now,
    });
    await scheduleOrderNotice(ctx, orderId, "returned");
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
      : orders.filter((order) => fulfillmentVisible(order));

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
        (manage || fulfillmentVisible(o)),
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
      if (!fulfillmentVisible(order)) return null;
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

export const getCheckoutConfirmation = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const isCard = /^cs_(?:test_|live_)?[A-Za-z0-9]{16,240}$/.test(sessionId);
    const isCod = /^cod:[a-zA-Z0-9-]{16,100}$/.test(sessionId);
    if (!isCard && !isCod) return null;
    const order = await ctx.db.query('orders').withIndex('by_stripeSessionId', (q) => q.eq('stripeSessionId', sessionId)).first();
    if (!order) return null;
    const confirmed = paymentStatus(order) === 'paid';
    const state =
      order.status === 'cancelled'
        ? (confirmed ? 'review' as const : 'cancelled' as const)
        : order.paymentMethod === 'cod'
          ? 'confirmed' as const
          : confirmed
            ? (order.inventoryStatus === 'needs_review' ? 'review' as const : 'confirmed' as const)
            : 'pending' as const;
    return { state, paymentMethod: order.paymentMethod ?? null, total: order.total };
  },
});
