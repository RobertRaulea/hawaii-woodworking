import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requirePermission } from "./lib/auth";
import { resolveStaffUserId } from "./lib/directory";
import { hasPermission } from "./lib/permissions";
import { requestIdIsValid } from "./lib/inventory.utils";
import { fulfillmentState, isFulfillEligible } from "./lib/orders.utils";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

const viewableStates = new Set([
  "ready",
  "preparing",
  "packed",
  "shipped",
  "delivered",
]);

const findEvent = (ctx: QueryCtx, requestId: string) =>
  ctx.db
    .query("orderEvents")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .unique();

const replay = async (
  ctx: MutationCtx,
  requestId: string,
  actorId: string,
  kind: Doc<"orderEvents">["kind"],
  orderId: Id<"orders">,
) => {
  if (!requestIdIsValid(requestId))
    throw new ConvexError("Identificator de operațiune invalid.");
  const previous = await findEvent(ctx, requestId);
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

const insertEvent = (
  ctx: MutationCtx,
  args: {
    orderId: Id<"orders">;
    requestId: string;
    actorId: string;
    kind: Doc<"orderEvents">["kind"];
    note?: string;
    data?: Doc<"orderEvents">["data"];
  },
) =>
  ctx.db.insert("orderEvents", {
    orderId: args.orderId,
    requestId: args.requestId,
    actorId: args.actorId,
    kind: args.kind,
    note: args.note,
    data: args.data,
    createdAt: Date.now(),
  });

const getOrderOrThrow = async (ctx: MutationCtx, orderId: Id<"orders">) => {
  const order = await ctx.db.get(orderId);
  if (!order) throw new ConvexError("Comanda nu există.");
  return order;
};

export const claim = mutation({
  args: { requestId: v.string(), orderId: v.id("orders") },
  handler: async (ctx, { requestId, orderId }) => {
    const { identity } = await requirePermission(ctx, "orders.fulfill");
    const previous = await replay(
      ctx,
      requestId,
      identity.subject,
      "claimed",
      orderId,
    );
    if (previous) return ctx.db.get(orderId);
    const order = await getOrderOrThrow(ctx, orderId);
    if (!isFulfillEligible(order))
      throw new ConvexError("Comanda nu este eligibilă pentru fulfillment.");
    if (order.assignedTo && order.assignedTo !== identity.subject)
      throw new ConvexError("Comanda este deja preluată de alt operator.");
    const checklist =
      order.checklist ??
      order.items.map((item) => ({
        productId: item.productId,
        checked: false,
      }));
    await ctx.db.patch(orderId, {
      assignedTo: identity.subject,
      assignedAt: Date.now(),
      fulfillmentStatus: "preparing",
      checklist,
    });
    await insertEvent(ctx, {
      orderId,
      requestId,
      actorId: identity.subject,
      kind: "claimed",
    });
    return ctx.db.get(orderId);
  },
});

export const release = mutation({
  args: { requestId: v.string(), orderId: v.id("orders") },
  handler: async (ctx, { requestId, orderId }) => {
    const staff = await requirePermission(ctx, "orders.fulfill");
    const previous = await replay(
      ctx,
      requestId,
      staff.identity.subject,
      "released",
      orderId,
    );
    if (previous) return ctx.db.get(orderId);
    const order = await getOrderOrThrow(ctx, orderId);
    const isAdmin = hasPermission(staff.role, "orders.manage");
    if (order.fulfillmentStatus !== "preparing")
      throw new ConvexError("Comanda nu este în pregătire.");
    if (order.assignedTo !== staff.identity.subject && !isAdmin)
      throw new ConvexError("Doar operatorul care a preluat comanda o poate elibera.");
    await ctx.db.patch(orderId, {
      assignedTo: undefined,
      assignedAt: undefined,
      fulfillmentStatus: undefined,
    });
    await insertEvent(ctx, {
      orderId,
      requestId,
      actorId: staff.identity.subject,
      kind: "released",
    });
    return ctx.db.get(orderId);
  },
});

export const reassign = mutation({
  args: {
    requestId: v.string(),
    orderId: v.id("orders"),
    userId: v.string(),
  },
  handler: async (ctx, { requestId, orderId, userId }) => {
    const { identity } = await requirePermission(ctx, "orders.manage");
    const previous = await replay(
      ctx,
      requestId,
      identity.subject,
      "reassigned",
      orderId,
    );
    if (previous) return ctx.db.get(orderId);
    const order = await getOrderOrThrow(ctx, orderId);
    const targetId = await resolveStaffUserId(ctx, userId);
    if (!targetId)
      throw new ConvexError(
        "Introdu un ID Clerk valid sau emailul unui cont staff cunoscut.",
      );
    if (
      order.fulfillmentStatus !== "preparing" &&
      order.fulfillmentStatus !== "packed"
    )
      throw new ConvexError(
        "Comanda poate fi realocată doar în timpul pregătirii.",
      );
    const fromUser = order.assignedTo;
    await ctx.db.patch(orderId, {
      assignedTo: targetId,
      assignedAt: Date.now(),
    });
    await insertEvent(ctx, {
      orderId,
      requestId,
      actorId: identity.subject,
      kind: "reassigned",
      data: { fromUser, toUser: targetId },
    });
    return ctx.db.get(orderId);
  },
});

export const setChecked = mutation({
  args: {
    requestId: v.string(),
    orderId: v.id("orders"),
    productId: v.id("products"),
    checked: v.boolean(),
  },
  handler: async (ctx, { requestId, orderId, productId, checked }) => {
    const staff = await requirePermission(ctx, "orders.fulfill");
    const previous = await replay(
      ctx,
      requestId,
      staff.identity.subject,
      "checked",
      orderId,
    );
    if (previous) return ctx.db.get(orderId);
    const order = await getOrderOrThrow(ctx, orderId);
    const isAdmin = hasPermission(staff.role, "orders.manage");
    if (order.fulfillmentStatus !== "preparing")
      throw new ConvexError("Comanda nu este în pregătire.");
    if (order.assignedTo !== staff.identity.subject && !isAdmin)
      throw new ConvexError("Doar operatorul care a preluat comanda o poate modifica.");
    const checklist = order.checklist ?? [];
    if (!checklist.some((entry) => entry.productId === productId))
      throw new ConvexError("Produsul nu face parte din comandă.");
    await ctx.db.patch(orderId, {
      checklist: checklist.map((entry) =>
        entry.productId === productId ? { ...entry, checked } : entry,
      ),
    });
    await insertEvent(ctx, {
      orderId,
      requestId,
      actorId: staff.identity.subject,
      kind: "checked",
      data: { productId, checked },
    });
    return ctx.db.get(orderId);
  },
});

export const addNote = mutation({
  args: {
    requestId: v.string(),
    orderId: v.id("orders"),
    note: v.string(),
  },
  handler: async (ctx, { requestId, orderId, note }) => {
    const { identity } = await requirePermission(ctx, "orders.fulfill");
    const previous = await replay(
      ctx,
      requestId,
      identity.subject,
      "note",
      orderId,
    );
    if (previous) return ctx.db.get(orderId);
    const order = await getOrderOrThrow(ctx, orderId);
    if (order.status === "cancelled")
      throw new ConvexError("Comanda este anulată.");
    const trimmed = note.trim();
    if (trimmed.length < 3 || trimmed.length > 500)
      throw new ConvexError("Notița trebuie să aibă între 3 și 500 de caractere.");
    await insertEvent(ctx, {
      orderId,
      requestId,
      actorId: identity.subject,
      kind: "note",
      note: trimmed,
    });
    return ctx.db.get(orderId);
  },
});

export const markPacked = mutation({
  args: { requestId: v.string(), orderId: v.id("orders") },
  handler: async (ctx, { requestId, orderId }) => {
    const staff = await requirePermission(ctx, "orders.fulfill");
    const previous = await replay(
      ctx,
      requestId,
      staff.identity.subject,
      "packed",
      orderId,
    );
    if (previous) return ctx.db.get(orderId);
    const order = await getOrderOrThrow(ctx, orderId);
    const isAdmin = hasPermission(staff.role, "orders.manage");
    if (order.fulfillmentStatus !== "preparing")
      throw new ConvexError("Comanda nu este în pregătire.");
    if (order.assignedTo !== staff.identity.subject && !isAdmin)
      throw new ConvexError("Doar operatorul care a preluat comanda o poate modifica.");
    if (!(order.checklist ?? []).every((entry) => entry.checked))
      throw new ConvexError(
        "Bifează toate produsele înainte de ambalare.",
      );
    await ctx.db.patch(orderId, {
      fulfillmentStatus: "packed",
      packedAt: Date.now(),
    });
    await insertEvent(ctx, {
      orderId,
      requestId,
      actorId: staff.identity.subject,
      kind: "packed",
    });
    return ctx.db.get(orderId);
  },
});

export const ship = mutation({
  args: {
    requestId: v.string(),
    orderId: v.id("orders"),
    awb: v.optional(v.string()),
    carrier: v.optional(v.string()),
  },
  handler: async (ctx, { requestId, orderId, awb, carrier }) => {
    const staff = await requirePermission(ctx, "orders.fulfill");
    const previous = await replay(
      ctx,
      requestId,
      staff.identity.subject,
      "shipped",
      orderId,
    );
    if (previous) return ctx.db.get(orderId);
    const order = await getOrderOrThrow(ctx, orderId);
    const isAdmin = hasPermission(staff.role, "orders.manage");
    if (order.fulfillmentStatus !== "packed")
      throw new ConvexError("Comanda nu este ambalată.");
    if (order.assignedTo !== staff.identity.subject && !isAdmin)
      throw new ConvexError("Doar operatorul care a preluat comanda o poate modifica.");
    if (!isFulfillEligible(order))
      throw new ConvexError("Comanda nu mai este eligibilă pentru expediere.");
    const trimmedAwb = awb?.trim();
    if (trimmedAwb && !/^[A-Za-z0-9-]{3,50}$/.test(trimmedAwb))
      throw new ConvexError("Număr AWB invalid.");
    const trimmedCarrier = carrier?.trim();
    if (trimmedCarrier && trimmedCarrier.length > 50)
      throw new ConvexError("Numele curierului este prea lung.");
    await ctx.db.patch(orderId, {
      status: "shipped",
      shippedAt: Date.now(),
      shippedBy: staff.identity.subject,
      awb: trimmedAwb || undefined,
      carrier: trimmedCarrier || undefined,
    });
    await insertEvent(ctx, {
      orderId,
      requestId,
      actorId: staff.identity.subject,
      kind: "shipped",
      data: { awb: trimmedAwb, carrier: trimmedCarrier },
    });
    return ctx.db.get(orderId);
  },
});

export const markDelivered = mutation({
  args: { requestId: v.string(), orderId: v.id("orders") },
  handler: async (ctx, { requestId, orderId }) => {
    const { identity } = await requirePermission(ctx, "orders.fulfill");
    const previous = await replay(
      ctx,
      requestId,
      identity.subject,
      "delivered",
      orderId,
    );
    if (previous) return ctx.db.get(orderId);
    const order = await getOrderOrThrow(ctx, orderId);
    if (order.status !== "shipped")
      throw new ConvexError("Comanda nu a fost expediată.");
    await ctx.db.patch(orderId, {
      status: "delivered",
      deliveredAt: Date.now(),
    });
    await insertEvent(ctx, {
      orderId,
      requestId,
      actorId: identity.subject,
      kind: "delivered",
    });
    return ctx.db.get(orderId);
  },
});

export const queue = query({
  args: { state: v.optional(v.string()) },
  handler: async (ctx, { state }) => {
    const { identity } = await requirePermission(ctx, "orders.fulfill");
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
    const cutoff = Date.now() - THIRTY_DAYS;
    const rows = orders
      .map((order) => ({ order, state: fulfillmentState(order) }))
      .filter(
        ({ order, state: s }) =>
          s === "ready" ||
          s === "preparing" ||
          s === "packed" ||
          (s === "shipped" && (order.shippedAt ?? order.createdAt) >= cutoff),
      )
      .filter(({ state: s }) => state === undefined || s === state)
      .map(({ order, state: s }) => ({
        _id: order._id,
        shortNumber: order._id.slice(-8).toUpperCase(),
        createdAt: order.createdAt,
        state: s,
        assignedTo: order.assignedTo,
        assignedToMe: order.assignedTo === identity.subject,
        itemCount: order.items.length,
        units: order.items.reduce((sum, item) => sum + item.quantity, 0),
      }));
    return rows;
  },
});

export const get = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const { identity } = await requirePermission(ctx, "orders.fulfill");
    const order = await ctx.db.get(orderId);
    if (!order) return null;
    const state = fulfillmentState(order);
    if (!viewableStates.has(state)) return null;
    const customer = await ctx.db.get(order.customerId);
    const events = await ctx.db
      .query("orderEvents")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    const shipping = order.shipping ??
      (customer
        ? {
            firstName: customer.firstName,
            lastName: customer.lastName,
            address: customer.shippingAddress,
          }
        : undefined);
    return {
      _id: order._id,
      shortNumber: order._id.slice(-8).toUpperCase(),
      createdAt: order.createdAt,
      state,
      assignedTo: order.assignedTo,
      assignedToMe: order.assignedTo === identity.subject,
      items: order.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
      })),
      checklist: order.checklist ?? [],
      recipient: shipping,
      awb: order.awb,
      carrier: order.carrier,
      note: undefined,
      events: events.sort((a, b) => a.createdAt - b.createdAt),
      invoicePdfUrl: order.invoicePdfUrl,
    };
  },
});

export const getEvent = query({
  args: { requestId: v.string() },
  handler: async (ctx, { requestId }) => {
    const { identity } = await requirePermission(ctx, "orders.fulfill");
    const event = await findEvent(ctx, requestId);
    if (!event || event.actorId !== identity.subject) return null;
    return event;
  },
});
