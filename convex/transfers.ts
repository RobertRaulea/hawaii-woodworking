import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  requireFairAccess,
  requirePermission,
} from "./lib/auth";
import { hasPermission } from "./lib/permissions";
import {
  fairPosInProgress,
  getFairBalance,
  insufficientAvailableError,
  onlineHeldQuantity,
  onlineReviewClaims,
  POS_SALE_IN_PROGRESS,
  requestIdIsValid,
  stockQuantity,
} from "./lib/inventory.utils";

const MAX_QUANTITY = 10_000;
const MAX_LINES = 50;

const locationValidator = v.union(
  v.object({ location: v.literal("workshop") }),
  v.object({ location: v.literal("fair"), fairId: v.id("fairs") }),
);

const lineValidator = v.object({
  productId: v.id("products"),
  quantity: v.number(),
});

type Endpoint =
  | { location: "workshop" }
  | { location: "fair"; fairId: Id<"fairs"> };

const sameEndpoint = (a: Endpoint, b: Endpoint) =>
  a.location === b.location &&
  (a.location !== "fair" ||
    a.fairId === (b as { fairId: Id<"fairs"> }).fairId);

const activeFair = async (ctx: QueryCtx, fairId: Id<"fairs">) => {
  const fair = await ctx.db.get(fairId);
  if (!fair) throw new ConvexError("Târgul nu mai există.");
  if (!fair.active) throw new ConvexError("Târgul nu este activ.");
  return fair;
};

const validateEndpoints = async (
  ctx: QueryCtx,
  from: Endpoint,
  to: Endpoint,
) => {
  if (sameEndpoint(from, to))
    throw new ConvexError("Sursa și destinația trebuie să difere.");
  if (from.location === "fair") await activeFair(ctx, from.fairId);
  if (to.location === "fair") await activeFair(ctx, to.fairId);
};

const validateLines = async (
  ctx: QueryCtx,
  lines: { productId: Id<"products">; quantity: number }[],
) => {
  if (!lines.length || lines.length > MAX_LINES)
    throw new ConvexError(`Selectează între 1 și ${MAX_LINES} de produse.`);
  const seen = new Set<Id<"products">>();
  const result = [];
  for (const line of lines) {
    if (
      !Number.isSafeInteger(line.quantity) ||
      line.quantity <= 0 ||
      line.quantity > MAX_QUANTITY
    )
      throw new ConvexError("Introdu o cantitate întreagă pozitivă.");
    if (seen.has(line.productId))
      throw new ConvexError("Produs duplicat în transfer.");
    seen.add(line.productId);
    const product = await ctx.db.get(line.productId);
    if (!product) throw new ConvexError("Produsul nu mai există.");
    if (product.archivedAt) throw new ConvexError("Produsul este arhivat.");
    if (product.trackStock === false)
      throw new ConvexError(
        "Activează urmărirea stocului pentru acest produs.",
      );
    result.push({
      productId: line.productId,
      productName: product.name_ro || product.name,
      quantity: line.quantity,
    });
  }
  return result;
};

const findEvent = (ctx: QueryCtx, requestId: string) =>
  ctx.db
    .query("transferEvents")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .unique();

const replay = async (
  ctx: MutationCtx,
  requestId: string,
  actorId: string,
  kind: Doc<"transferEvents">["kind"],
  transferId?: Id<"transfers">,
) => {
  if (!requestIdIsValid(requestId))
    throw new ConvexError("Identificator de operațiune invalid.");
  const previous = await findEvent(ctx, requestId);
  if (!previous) return null;
  if (
    previous.actorId !== actorId ||
    previous.kind !== kind ||
    (transferId !== undefined && previous.transferId !== transferId)
  ) {
    throw new ConvexError(
      "Identificator deja utilizat pentru alta operațiune.",
    );
  }
  return ctx.db.get(previous.transferId);
};

const addEvent = (
  ctx: MutationCtx,
  args: {
    transferId: Id<"transfers">;
    requestId: string;
    actorId: string;
    kind: Doc<"transferEvents">["kind"];
    lines?: { productId: Id<"products">; quantity: number }[];
    note?: string;
  },
) =>
  ctx.db.insert("transferEvents", {
    transferId: args.transferId,
    requestId: args.requestId,
    actorId: args.actorId,
    kind: args.kind,
    lines: args.lines,
    note: args.note,
    createdAt: Date.now(),
  });

export const fairLocationName = async (
  ctx: QueryCtx,
  location: "workshop" | "fair" | undefined,
  fairId: Id<"fairs"> | undefined,
) => {
  if (location === "workshop") return "Atelier";
  if (location !== "fair" || !fairId) return null;
  const fair = await ctx.db.get(fairId);
  return fair?.name ?? "Târg indisponibil";
};

const eventLines = (lines: { productId: Id<"products">; quantity: number }[]) =>
  lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
  }));

export const request = mutation({
  args: {
    requestId: v.string(),
    toFairId: v.id("fairs"),
    lines: v.array(lineValidator),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requirePermission(ctx, "transfers.request");
    const actorId = staff.identity.subject;
    const previous = await replay(ctx, args.requestId, actorId, "requested");
    if (previous) return previous;
    if (!hasPermission(staff.role, "transfers.execute")) {
      await requireFairAccess(ctx, staff, args.toFairId);
    }
    const fair = await activeFair(ctx, args.toFairId);
    const lines = await validateLines(ctx, args.lines);
    const now = Date.now();
    const transferId = await ctx.db.insert("transfers", {
      status: "requested",
      createdBy: actorId,
      createdAt: now,
      updatedAt: now,
      toLocation: "fair",
      toFairId: fair._id,
      lines: lines.map((line) => ({
        ...line,
        requestedQuantity: line.quantity,
        shippedQuantity: 0,
        receivedQuantity: 0,
      })),
      note: args.note?.trim() || undefined,
    });
    await addEvent(ctx, {
      transferId,
      requestId: args.requestId,
      actorId,
      kind: "requested",
      lines: eventLines(lines),
      note: args.note?.trim() || undefined,
    });
    return ctx.db.get(transferId);
  },
});

export const create = mutation({
  args: {
    requestId: v.string(),
    from: locationValidator,
    to: locationValidator,
    lines: v.array(lineValidator),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(ctx, "transfers.execute");
    const previous = await replay(ctx, args.requestId, identity.subject, "created");
    if (previous) return previous;
    await validateEndpoints(ctx, args.from, args.to);
    const lines = await validateLines(ctx, args.lines);
    const now = Date.now();
    const transferId = await ctx.db.insert("transfers", {
      status: "draft",
      createdBy: identity.subject,
      createdAt: now,
      updatedAt: now,
      fromLocation: args.from.location,
      fromFairId: args.from.location === "fair" ? args.from.fairId : undefined,
      toLocation: args.to.location,
      toFairId: args.to.location === "fair" ? args.to.fairId : undefined,
      lines: lines.map((line) => ({
        ...line,
        shippedQuantity: 0,
        receivedQuantity: 0,
      })),
      note: args.note?.trim() || undefined,
    });
    await addEvent(ctx, {
      transferId,
      requestId: args.requestId,
      actorId: identity.subject,
      kind: "created",
      lines: eventLines(lines),
      note: args.note?.trim() || undefined,
    });
    return ctx.db.get(transferId);
  },
});

export const updateDraft = mutation({
  args: {
    requestId: v.string(),
    transferId: v.id("transfers"),
    from: locationValidator,
    to: locationValidator,
    lines: v.array(lineValidator),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(ctx, "transfers.execute");
    const previous = await replay(
      ctx,
      args.requestId,
      identity.subject,
      "updated",
      args.transferId,
    );
    if (previous) return previous;
    const transfer = await ctx.db.get(args.transferId);
    if (!transfer) throw new ConvexError("Transferul nu mai există.");
    if (transfer.status !== "requested" && transfer.status !== "draft")
      throw new ConvexError("Doar proiectele pot fi editate.");
    await validateEndpoints(ctx, args.from, args.to);
    const lines = await validateLines(ctx, args.lines);
    const requested = new Map(
      transfer.lines
        .filter((line) => line.requestedQuantity !== undefined)
        .map((line) => [line.productId, line.requestedQuantity!]),
    );
    await ctx.db.patch(args.transferId, {
      status: "draft",
      updatedAt: Date.now(),
      fromLocation: args.from.location,
      fromFairId: args.from.location === "fair" ? args.from.fairId : undefined,
      toLocation: args.to.location,
      toFairId: args.to.location === "fair" ? args.to.fairId : undefined,
      lines: lines.map((line) => ({
        ...line,
        requestedQuantity: requested.get(line.productId),
        shippedQuantity: 0,
        receivedQuantity: 0,
      })),
      note: args.note?.trim() || undefined,
    });
    await addEvent(ctx, {
      transferId: args.transferId,
      requestId: args.requestId,
      actorId: identity.subject,
      kind: "updated",
      lines: eventLines(lines),
      note: args.note?.trim() || undefined,
    });
    return ctx.db.get(args.transferId);
  },
});

export const accept = mutation({
  args: {
    requestId: v.string(),
    transferId: v.id("transfers"),
  },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(ctx, "transfers.execute");
    const previous = await replay(
      ctx,
      args.requestId,
      identity.subject,
      "accepted",
      args.transferId,
    );
    if (previous) return previous;
    const transfer = await ctx.db.get(args.transferId);
    if (!transfer) throw new ConvexError("Transferul nu mai există.");
    if (transfer.status !== "requested")
      throw new ConvexError("Doar solicitările pot fi acceptate.");
    if (transfer.toLocation !== "fair" || !transfer.toFairId)
      throw new ConvexError("Solicitarea nu are o destinație validă.");
    await activeFair(ctx, transfer.toFairId);
    await ctx.db.patch(args.transferId, {
      status: "draft",
      updatedAt: Date.now(),
      fromLocation: "workshop",
    });
    await addEvent(ctx, {
      transferId: args.transferId,
      requestId: args.requestId,
      actorId: identity.subject,
      kind: "accepted",
      lines: eventLines(transfer.lines),
    });
    return ctx.db.get(args.transferId);
  },
});

export const ship = mutation({
  args: {
    requestId: v.string(),
    transferId: v.id("transfers"),
  },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(ctx, "transfers.execute");
    const previous = await replay(
      ctx,
      args.requestId,
      identity.subject,
      "shipped",
      args.transferId,
    );
    if (previous) return previous;
    const transfer = await ctx.db.get(args.transferId);
    if (!transfer) throw new ConvexError("Transferul nu mai există.");
    if (transfer.status !== "draft")
      throw new ConvexError("Doar proiectele pot fi expediate.");
    if (!transfer.fromLocation)
      throw new ConvexError("Transferul nu are o sursă definită.");
    const claims = await onlineReviewClaims(ctx);
    for (const line of transfer.lines) {
      const product = await ctx.db.get(line.productId);
      if (!product) throw new ConvexError("Produsul nu mai există.");
      if (transfer.fromLocation === "fair") {
        const fairId = transfer.fromFairId!;
        const balance = await getFairBalance(ctx, fairId, line.productId);
        const available = stockQuantity(balance?.quantity ?? 0);
        if (available < line.quantity)
          throw new ConvexError("Stoc insuficient la târg.");
        if (await fairPosInProgress(ctx, fairId, line.productId))
          throw new ConvexError(POS_SALE_IN_PROGRESS);
      } else {
        const physical = stockQuantity(product.stock ?? 0);
        const held = onlineHeldQuantity(
          physical,
          claims.get(line.productId) ?? 0,
        );
        if (physical - held < line.quantity)
          throw insufficientAvailableError(held);
      }
    }
    const now = Date.now();
    for (const line of transfer.lines) {
      const product = (await ctx.db.get(line.productId))!;
      if (transfer.fromLocation === "fair") {
        const fairId = transfer.fromFairId!;
        const balance = (await getFairBalance(ctx, fairId, line.productId))!;
        const after = stockQuantity(balance.quantity - line.quantity);
        await ctx.db.patch(balance._id, { quantity: after });
        await ctx.db.insert("stockMovements", {
          requestId: args.requestId,
          productId: line.productId,
          fairId,
          location: "fair",
          kind: "transfer_out",
          quantity: -line.quantity,
          balanceAfter: after,
          actorId: identity.subject,
          transferId: transfer._id,
          createdAt: now,
        });
      } else {
        const after = stockQuantity(stockQuantity(product.stock ?? 0) - line.quantity);
        await ctx.db.patch(product._id, { stock: after });
        await ctx.db.insert("stockMovements", {
          requestId: args.requestId,
          productId: line.productId,
          location: "workshop",
          kind: "transfer_out",
          quantity: -line.quantity,
          balanceAfter: after,
          actorId: identity.subject,
          transferId: transfer._id,
          createdAt: now,
        });
      }
    }
    await ctx.db.patch(transfer._id, {
      status: "in_transit",
      updatedAt: now,
      shippedAt: now,
      shippedBy: identity.subject,
      lines: transfer.lines.map((line) => ({
        ...line,
        shippedQuantity: line.quantity,
      })),
    });
    await addEvent(ctx, {
      transferId: transfer._id,
      requestId: args.requestId,
      actorId: identity.subject,
      kind: "shipped",
      lines: eventLines(transfer.lines),
    });
    return ctx.db.get(transfer._id);
  },
});

export const receive = mutation({
  args: {
    requestId: v.string(),
    transferId: v.id("transfers"),
    lines: v.array(lineValidator),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requirePermission(ctx, "transfers.view");
    const actorId = staff.identity.subject;
    const previous = await replay(
      ctx,
      args.requestId,
      actorId,
      "received",
      args.transferId,
    );
    if (previous) return previous;
    const transfer = await ctx.db.get(args.transferId);
    if (!transfer) throw new ConvexError("Transferul nu mai există.");
    if (!hasPermission(staff.role, "transfers.execute")) {
      if (
        transfer.createdBy !== actorId ||
        transfer.toLocation !== "fair" ||
        !transfer.toFairId
      )
        throw new ConvexError("Forbidden: nu ai permisiunea necesară.");
      await requireFairAccess(ctx, staff, transfer.toFairId);
    }
    if (
      transfer.status !== "in_transit" &&
      transfer.status !== "partially_received"
    )
      throw new ConvexError("Doar transferurile în tranzit pot fi recepționate.");
    if (!args.lines.length)
      throw new ConvexError("Introdu cel puțin o cantitate recepționată.");
    const received = new Map<Id<"products">, number>();
    for (const line of args.lines) {
      if (
        !Number.isSafeInteger(line.quantity) ||
        line.quantity <= 0 ||
        line.quantity > MAX_QUANTITY
      )
        throw new ConvexError("Introdu o cantitate întreagă pozitivă.");
      const planned = transfer.lines.find(
        (item) => item.productId === line.productId,
      );
      if (!planned)
        throw new ConvexError("Produsul nu face parte din transfer.");
      const remaining = planned.shippedQuantity - planned.receivedQuantity;
      received.set(
        line.productId,
        (received.get(line.productId) ?? 0) + line.quantity,
      );
      if (received.get(line.productId)! > remaining)
        throw new ConvexError(
          "Cantitatea recepționată depășește cantitatea în tranzit.",
        );
    }
    const now = Date.now();
    for (const line of args.lines) {
      const incoming = line.quantity;
      if (transfer.toLocation === "fair") {
        const fairId = transfer.toFairId!;
        const balance = await getFairBalance(ctx, fairId, line.productId);
        const after = stockQuantity((balance?.quantity ?? 0) + incoming);
        if (balance) await ctx.db.patch(balance._id, { quantity: after });
        else
          await ctx.db.insert("fairInventory", {
            fairId,
            productId: line.productId,
            quantity: after,
          });
        await ctx.db.insert("stockMovements", {
          requestId: args.requestId,
          productId: line.productId,
          fairId,
          location: "fair",
          kind: "transfer_in",
          quantity: incoming,
          balanceAfter: after,
          actorId,
          transferId: transfer._id,
          createdAt: now,
        });
      } else {
        const product = (await ctx.db.get(line.productId))!;
        const after = stockQuantity(stockQuantity(product.stock ?? 0) + incoming);
        await ctx.db.patch(product._id, { stock: after });
        await ctx.db.insert("stockMovements", {
          requestId: args.requestId,
          productId: line.productId,
          location: "workshop",
          kind: "transfer_in",
          quantity: incoming,
          balanceAfter: after,
          actorId,
          transferId: transfer._id,
          createdAt: now,
        });
      }
    }
    const lines = transfer.lines.map((line) => ({
      ...line,
      receivedQuantity:
        line.receivedQuantity + (received.get(line.productId) ?? 0),
    }));
    const complete = lines.every(
      (line) => line.shippedQuantity === line.receivedQuantity,
    );
    await ctx.db.patch(transfer._id, {
      status: complete ? "received" : "partially_received",
      updatedAt: now,
      receivedAt: complete ? now : transfer.receivedAt,
      lines,
    });
    await addEvent(ctx, {
      transferId: transfer._id,
      requestId: args.requestId,
      actorId,
      kind: "received",
      lines: eventLines(args.lines),
      note: args.note?.trim() || undefined,
    });
    return ctx.db.get(transfer._id);
  },
});

export const cancel = mutation({
  args: {
    requestId: v.string(),
    transferId: v.id("transfers"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const staff = await requirePermission(ctx, "transfers.view");
    const actorId = staff.identity.subject;
    const previous = await replay(
      ctx,
      args.requestId,
      actorId,
      "cancelled",
      args.transferId,
    );
    if (previous) return previous;
    const transfer = await ctx.db.get(args.transferId);
    if (!transfer) throw new ConvexError("Transferul nu mai există.");
    const own =
      transfer.status === "requested" && transfer.createdBy === actorId;
    if (!hasPermission(staff.role, "transfers.execute") && !own)
      throw new ConvexError("Forbidden: nu ai permisiunea necesară.");
    if (transfer.status !== "requested" && transfer.status !== "draft")
      throw new ConvexError(
        "Transferul expediat nu mai poate fi anulat.",
      );
    const reason = args.reason.trim();
    if (reason.length < 3 || reason.length > 300)
      throw new ConvexError("Motivul este obligatoriu (3–300 de caractere).");
    const now = Date.now();
    await ctx.db.patch(transfer._id, {
      status: "cancelled",
      updatedAt: now,
      cancelledAt: now,
      cancelledBy: actorId,
      cancelReason: reason,
    });
    await addEvent(ctx, {
      transferId: transfer._id,
      requestId: args.requestId,
      actorId,
      kind: "cancelled",
      note: reason,
    });
    return ctx.db.get(transfer._id);
  },
});

const summary = async (ctx: QueryCtx, transfer: Doc<"transfers">) => {
  const [fromName, toName] = await Promise.all([
    fairLocationName(ctx, transfer.fromLocation, transfer.fromFairId),
    fairLocationName(ctx, transfer.toLocation, transfer.toFairId),
  ]);
  return {
    ...transfer,
    fromName,
    toName,
    lineCount: transfer.lines.length,
    totalUnits: transfer.lines.reduce((sum, line) => sum + line.quantity, 0),
    inTransitUnits: transfer.lines.reduce(
      (sum, line) =>
        sum + Math.max(0, line.shippedQuantity - line.receivedQuantity),
      0,
    ),
  };
};

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("requested"),
        v.literal("draft"),
        v.literal("in_transit"),
        v.literal("partially_received"),
        v.literal("received"),
        v.literal("cancelled"),
      ),
    ),
    fairId: v.optional(v.id("fairs")),
    location: v.optional(v.literal("workshop")),
  },
  handler: async (ctx, args) => {
    const staff = await requirePermission(ctx, "transfers.view");
    let transfers: Doc<"transfers">[];
    if (hasPermission(staff.role, "transfers.execute")) {
      transfers = args.status
        ? await ctx.db
            .query("transfers")
            .withIndex("by_status", (q) => q.eq("status", args.status!))
            .order("desc")
            .take(200)
        : await ctx.db.query("transfers").order("desc").take(200);
      if (args.fairId) {
        const fairId = args.fairId;
        transfers = transfers.filter(
          (row) => row.fromFairId === fairId || row.toFairId === fairId,
        );
      } else if (args.location === "workshop") {
        transfers = transfers.filter(
          (row) =>
            row.fromLocation === "workshop" || row.toLocation === "workshop",
        );
      }
    } else {
      transfers = await ctx.db
        .query("transfers")
        .withIndex("by_createdBy", (q) => q.eq("createdBy", staff.identity.subject))
        .order("desc")
        .take(200);
    }
    return Promise.all(transfers.map((row) => summary(ctx, row)));
  },
});

export const get = query({
  args: { transferId: v.id("transfers") },
  handler: async (ctx, { transferId }) => {
    const staff = await requirePermission(ctx, "transfers.view");
    const transfer = await ctx.db.get(transferId);
    if (!transfer) return null;
    if (
      !hasPermission(staff.role, "transfers.execute") &&
      transfer.createdBy !== staff.identity.subject
    )
      return null;
    const events = await ctx.db
      .query("transferEvents")
      .withIndex("by_transfer", (q) => q.eq("transferId", transferId))
      .collect();
    return { transfer: await summary(ctx, transfer), events };
  },
});

export const getEvent = query({
  args: { requestId: v.string() },
  handler: async (ctx, { requestId }) => {
    const { identity } = await requirePermission(ctx, "transfers.view");
    if (!requestIdIsValid(requestId))
      throw new ConvexError("Identificator de operațiune invalid.");
    const event = await findEvent(ctx, requestId);
    if (event && event.actorId !== identity.subject)
      throw new ConvexError("Operațiunea aparține altui utilizator.");
    return event;
  },
});

export const pendingRequestCount = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "transfers.execute");
    const requested = await ctx.db
      .query("transfers")
      .withIndex("by_status", (q) => q.eq("status", "requested"))
      .collect();
    return requested.length;
  },
});
