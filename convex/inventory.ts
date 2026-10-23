import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireFairAccess, requirePermission } from "./lib/auth";
import { hasPermission } from "./lib/permissions";
import {
  fairPosInProgress,
  findStockOperation,
  getFairBalance,
  insufficientAvailableError,
  isStockQuantity,
  latestMovement,
  onlineHeldQuantity,
  onlineReviewClaims,
  POS_SALE_IN_PROGRESS,
  requestIdIsValid,
  stockQuantity,
} from "./lib/inventory.utils";

const MAX_QUANTITY = 10_000;
const MAX_COUNTED = 1_000_000;

const adjustmentReason = v.union(
  v.literal("damaged"),
  v.literal("lost"),
  v.literal("found"),
  v.literal("correction"),
  v.literal("other"),
);

const checkReplay = async (
  ctx: MutationCtx,
  requestId: string,
  actorId: string,
  same: (operation: Doc<"stockOperations">) => boolean,
) => {
  if (!requestIdIsValid(requestId))
    throw new ConvexError("Identificator de operațiune invalid.");
  const previous = await findStockOperation(ctx, requestId);
  if (!previous) return null;
  if (previous.actorId !== actorId || !same(previous)) {
    throw new ConvexError(
      "Identificator deja utilizat pentru alta operațiune.",
    );
  }
  return previous;
};

const trackedProduct = async (ctx: MutationCtx, productId: Id<"products">) => {
  const product = await ctx.db.get(productId);
  if (!product) throw new ConvexError("Produsul nu mai există.");
  if (product.trackStock === false)
    throw new ConvexError(
      "Activează urmărirea stocului pentru acest produs.",
    );
  return product;
};

const workshopHeld = async (
  ctx: MutationCtx,
  productId: Id<"products">,
  physical: number,
) => onlineHeldQuantity(physical, (await onlineReviewClaims(ctx)).get(productId) ?? 0);

const insufficientAvailable = insufficientAvailableError;

interface RecordArgs {
  requestId: string;
  actorId: string;
  kind: "receipt" | "adjustment" | "count";
  product: Doc<"products">;
  fair: Doc<"fairs"> | null;
  delta: number;
  before: number;
  reason: Doc<"stockOperations">["reason"];
  note?: string;
  expectedQuantity?: number;
  countedQuantity?: number;
}

const recordOperation = async (ctx: MutationCtx, args: RecordArgs) => {
  const after = stockQuantity(args.before + args.delta);
  if (args.fair) {
    const balance = await getFairBalance(
      ctx,
      args.fair._id,
      args.product._id,
    );
    if (balance) {
      await ctx.db.patch(balance._id, { quantity: after });
    } else {
      await ctx.db.insert("fairInventory", {
        fairId: args.fair._id,
        productId: args.product._id,
        quantity: after,
      });
    }
  } else {
    await ctx.db.patch(args.product._id, { stock: after });
  }
  const stockOperationId = await ctx.db.insert("stockOperations", {
    requestId: args.requestId,
    actorId: args.actorId,
    kind: args.kind,
    productId: args.product._id,
    productName: args.product.name_ro || args.product.name,
    location: args.fair ? "fair" : "workshop",
    fairId: args.fair?._id,
    fairName: args.fair?.name,
    delta: args.delta,
    quantityBefore: args.before,
    quantityAfter: after,
    expectedQuantity: args.expectedQuantity,
    countedQuantity: args.countedQuantity,
    reason: args.reason,
    note: args.note,
    createdAt: Date.now(),
  });
  await ctx.db.insert("stockMovements", {
    requestId: args.requestId,
    productId: args.product._id,
    fairId: args.fair?._id,
    location: args.fair ? "fair" : "workshop",
    kind: args.kind,
    quantity: args.delta,
    balanceAfter: after,
    actorId: args.actorId,
    stockOperationId,
    reason: args.reason,
    note: args.note,
    createdAt: Date.now(),
  });
  return (await ctx.db.get(stockOperationId))!;
};

const activeFair = async (ctx: MutationCtx, fairId: Id<"fairs">) => {
  const fair = await ctx.db.get(fairId);
  if (!fair?.active) throw new ConvexError("Târgul nu este activ.");
  return fair;
};

export const receive = mutation({
  args: {
    requestId: v.string(),
    productId: v.id("products"),
    quantity: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(ctx, "inventory.adjust");
    const note = args.note?.trim() || undefined;
    const replay = await checkReplay(
      ctx,
      args.requestId,
      identity.subject,
      (op) =>
        op.kind === "receipt" &&
        op.productId === args.productId &&
        op.delta === args.quantity &&
        op.note === note,
    );
    if (replay) return replay;
    if (
      !Number.isSafeInteger(args.quantity) ||
      args.quantity <= 0 ||
      args.quantity > MAX_QUANTITY
    )
      throw new ConvexError("Introdu o cantitate întreagă pozitivă.");
    const product = await trackedProduct(ctx, args.productId);
    if (product.archivedAt) throw new ConvexError("Produsul este arhivat.");
    const before = stockQuantity(product.stock ?? 0);
    return recordOperation(ctx, {
      requestId: args.requestId,
      actorId: identity.subject,
      kind: "receipt",
      product,
      fair: null,
      delta: args.quantity,
      before,
      reason: "production",
      note,
    });
  },
});

export const adjust = mutation({
  args: {
    requestId: v.string(),
    productId: v.id("products"),
    fairId: v.optional(v.id("fairs")),
    delta: v.number(),
    reason: adjustmentReason,
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(ctx, "inventory.adjust");
    const note = args.note.trim();
    const replay = await checkReplay(
      ctx,
      args.requestId,
      identity.subject,
      (op) =>
        op.kind === "adjustment" &&
        op.productId === args.productId &&
        (op.fairId ?? undefined) === (args.fairId ?? undefined) &&
        op.delta === args.delta &&
        op.reason === args.reason &&
        op.note === note,
    );
    if (replay) return replay;
    if (
      !Number.isSafeInteger(args.delta) ||
      args.delta === 0 ||
      Math.abs(args.delta) > MAX_QUANTITY
    )
      throw new ConvexError("Introdu o diferență întreagă nenulă.");
    if (note.length < 3 || note.length > 500)
      throw new ConvexError("Nota este obligatorie (3–500 de caractere).");
    const product = await trackedProduct(ctx, args.productId);
    if (args.fairId === undefined) {
      const before = stockQuantity(product.stock ?? 0);
      if (args.delta < 0) {
        const held = await workshopHeld(ctx, product._id, before);
        if (before - held + args.delta < 0) throw insufficientAvailable(held);
      }
      return recordOperation(ctx, {
        requestId: args.requestId,
        actorId: identity.subject,
        kind: "adjustment",
        product,
        fair: null,
        delta: args.delta,
        before,
        reason: args.reason,
        note,
      });
    }
    const fair = await activeFair(ctx, args.fairId);
    const balance = await getFairBalance(ctx, fair._id, product._id);
    const before = stockQuantity(balance?.quantity ?? 0);
    if (args.delta < 0) {
      if (await fairPosInProgress(ctx, fair._id, product._id))
        throw new ConvexError(POS_SALE_IN_PROGRESS);
      if (!balance || before + args.delta < 0)
        throw new ConvexError("Stoc insuficient la târg.");
    }
    return recordOperation(ctx, {
      requestId: args.requestId,
      actorId: identity.subject,
      kind: "adjustment",
      product,
      fair,
      delta: args.delta,
      before,
      reason: args.reason,
      note,
    });
  },
});

export const count = mutation({
  args: {
    requestId: v.string(),
    productId: v.id("products"),
    fairId: v.optional(v.id("fairs")),
    expectedQuantity: v.number(),
    lastMovementId: v.union(v.id("stockMovements"), v.null()),
    countedQuantity: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(ctx, "inventory.adjust");
    const note = args.note?.trim() || undefined;
    const replay = await checkReplay(
      ctx,
      args.requestId,
      identity.subject,
      (op) =>
        op.kind === "count" &&
        op.productId === args.productId &&
        (op.fairId ?? undefined) === (args.fairId ?? undefined) &&
        op.expectedQuantity === args.expectedQuantity &&
        op.countedQuantity === args.countedQuantity &&
        op.note === note,
    );
    if (replay) return replay;
    if (
      !isStockQuantity(args.expectedQuantity) ||
      !Number.isSafeInteger(args.countedQuantity) ||
      args.countedQuantity < 0 ||
      args.countedQuantity > MAX_COUNTED
    )
      throw new ConvexError("Cantitatea numărată este invalidă.");
    const product = await trackedProduct(ctx, args.productId);
    const fair = args.fairId ? await activeFair(ctx, args.fairId) : null;
    let before: number;
    let held = 0;
    if (fair) {
      if (await fairPosInProgress(ctx, fair._id, product._id))
        throw new ConvexError(POS_SALE_IN_PROGRESS);
      before = stockQuantity(
        (await getFairBalance(ctx, fair._id, product._id))?.quantity ?? 0,
      );
    } else {
      before = stockQuantity(product.stock ?? 0);
      held = await workshopHeld(ctx, product._id, before);
      if (args.countedQuantity < held) throw insufficientAvailable(held);
    }
    const latest = await latestMovement(ctx, product._id, fair?._id);
    if (
      before !== args.expectedQuantity ||
      (latest?._id ?? null) !== args.lastMovementId
    ) {
      throw new ConvexError(
        "Stocul s-a modificat după începerea numărării. Revalidează numărătoarea.",
      );
    }
    return recordOperation(ctx, {
      requestId: args.requestId,
      actorId: identity.subject,
      kind: "count",
      product,
      fair,
      delta: args.countedQuantity - args.expectedQuantity,
      before,
      reason: "count",
      note,
      expectedQuantity: args.expectedQuantity,
      countedQuantity: args.countedQuantity,
    });
  },
});

export const setLowStockThreshold = mutation({
  args: {
    productId: v.id("products"),
    threshold: v.union(v.number(), v.null()),
  },
  handler: async (ctx, { productId, threshold }) => {
    await requirePermission(ctx, "inventory.adjust");
    const product = await ctx.db.get(productId);
    if (!product) throw new ConvexError("Produsul nu mai există.");
    if (threshold !== null) {
      if (
        !Number.isSafeInteger(threshold) ||
        threshold < 0 ||
        threshold > 100_000
      )
        throw new ConvexError("Pragul minim este invalid.");
      await ctx.db.patch(productId, { lowStockThreshold: threshold });
    } else {
      await ctx.db.patch(productId, { lowStockThreshold: undefined });
    }
    return productId;
  },
});

export const countSnapshot = query({
  args: {
    productId: v.id("products"),
    fairId: v.optional(v.id("fairs")),
  },
  handler: async (ctx, { productId, fairId }) => {
    await requirePermission(ctx, "inventory.adjust");
    const product = await ctx.db.get(productId);
    if (!product) throw new ConvexError("Produsul nu mai există.");
    if (fairId) {
      const fair = await ctx.db.get(fairId);
      if (!fair?.active) throw new ConvexError("Târgul nu este activ.");
      const balance = await getFairBalance(ctx, fairId, productId);
      const latest = await latestMovement(ctx, productId, fairId);
      return {
        expectedQuantity: balance?.quantity ?? 0,
        lastMovementId: latest?._id ?? null,
        held: 0,
        posSaleInProgress: await fairPosInProgress(ctx, fairId, productId),
      };
    }
    const physical = stockQuantity(product.stock ?? 0);
    const held = onlineHeldQuantity(
      physical,
      (await onlineReviewClaims(ctx)).get(productId) ?? 0,
    );
    const latest = await latestMovement(ctx, productId);
    return {
      expectedQuantity: physical,
      lastMovementId: latest?._id ?? null,
      held,
      posSaleInProgress: false,
    };
  },
});

export const getStockOperation = query({
  args: { requestId: v.string() },
  handler: async (ctx, { requestId }) => {
    const { identity } = await requirePermission(ctx, "inventory.adjust");
    if (!requestIdIsValid(requestId))
      throw new ConvexError("Identificator de operațiune invalid.");
    const operation = await findStockOperation(ctx, requestId);
    if (operation && operation.actorId !== identity.subject)
      throw new ConvexError("Operațiunea aparține altui utilizator.");
    return operation;
  },
});

export const movements = query({
  args: {
    paginationOpts: paginationOptsValidator,
    location: v.optional(
      v.union(v.literal("workshop"), v.literal("fair")),
    ),
    fairId: v.optional(v.id("fairs")),
    productId: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    const staff = await requirePermission(ctx, "inventory.read");
    if (!hasPermission(staff.role, "inventory.readAll")) {
      if (args.location !== "fair" || !args.fairId)
        throw new ConvexError("Selectează un târg alocat.");
      await requireFairAccess(ctx, staff, args.fairId);
    }
    const build = () => {
      if (args.productId) {
        return ctx.db
          .query("stockMovements")
          .withIndex("by_product_location", (q) =>
            args.fairId
              ? q
                  .eq("productId", args.productId!)
                  .eq("location", "fair")
                  .eq("fairId", args.fairId)
              : args.location
                ? q
                    .eq("productId", args.productId!)
                    .eq("location", args.location)
                : q.eq("productId", args.productId!),
          );
      }
      if (args.location) {
        return ctx.db
          .query("stockMovements")
          .withIndex("by_location_fair", (q) =>
            args.location === "fair" && args.fairId
              ? q.eq("location", "fair").eq("fairId", args.fairId)
              : q.eq("location", args.location!),
          );
      }
      return ctx.db.query("stockMovements");
    };
    const result = await build()
      .order("desc")
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map(async (row) => {
        const [product, fair] = await Promise.all([
          ctx.db.get(row.productId),
          row.fairId ? ctx.db.get(row.fairId) : null,
        ]);
        return {
          _id: row._id,
          createdAt: row.createdAt,
          productId: row.productId,
          productName: product?.name_ro || product?.name || "Produs șters",
          location: row.location,
          fairId: row.fairId,
          fairName: fair ? fair.name : null,
          kind: row.kind,
          reason: row.reason ?? null,
          note: row.note ?? null,
          quantity: row.quantity,
          balanceAfter: row.balanceAfter,
          actorId: row.actorId,
        };
      }),
    );
    return { ...result, page };
  },
});
