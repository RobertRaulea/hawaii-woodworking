import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { positiveInteger, toCents } from "./pos.utils";
import { resolveImageUrls } from "./storage";
import { isSellable } from "./products.utils";

export interface InventoryLine {
  productId: Id<"products">;
  quantity: number;
  name?: string;
}

export interface CheckoutSnapshotLine extends InventoryLine {
  name: string;
  price: number;
  image?: string;
}

export interface OnlineAllocation extends InventoryLine {
  name: string;
  product: Doc<"products"> | null;
  tracked: boolean;
  physicalStock: number | null;
  availableAtPayment: number;
  appliedQuantity: number;
  unfulfilledQuantity: number;
  stockAfter: number | null;
}

export const isStockQuantity = (value: number) =>
  Number.isSafeInteger(value) && value >= 0;

export const stockQuantity = (value: number) => {
  if (!isStockQuantity(value))
    throw new ConvexError(
      "Stoc invalid. Verifică evidența înainte de transfer.",
    );
  return value;
};

export const requestIdIsValid = (value: string) =>
  /^[a-zA-Z0-9-]{16,100}$/.test(value);

export const countOnlineReviewClaims = (orders: Doc<"orders">[]) => {
  const quantities = new Map<Id<"products">, number>();
  for (const order of orders) {
    // Older needs_review orders used all-or-nothing allocation.
    for (const item of order.inventoryUnfulfilledItems ?? order.items) {
      const next = item.quantity + (quantities.get(item.productId) ?? 0);
      stockQuantity(item.quantity);
      stockQuantity(next);
      quantities.set(item.productId, next);
    }
  }
  return quantities;
};

export const onlineReviewClaims = async (
  ctx: QueryCtx,
  allocatingOrderId?: Id<"orders">,
) => {
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_inventoryStatus", (q) =>
      q.eq("inventoryStatus", "needs_review"),
    )
    .collect();
  if (!allocatingOrderId) return countOnlineReviewClaims(orders);
  // Allocate replenishments to older paid claims first, avoiding mutual blocking.
  const ordered = orders.sort(
    (a, b) =>
      (a.paymentConfirmedAt ?? a.createdAt) -
        (b.paymentConfirmedAt ?? b.createdAt) || a._id.localeCompare(b._id),
  );
  const position = ordered.findIndex(
    (order) => order._id === allocatingOrderId,
  );
  return countOnlineReviewClaims(
    position < 0 ? ordered : ordered.slice(0, position),
  );
};

export const onlineHeldQuantity = (physical: number, claims: number) =>
  Math.min(stockQuantity(physical), stockQuantity(claims));

export const availableOnlineQuantity = (physical: number, claims: number) =>
  stockQuantity(physical) - onlineHeldQuantity(physical, claims);

export const catalogAvailableStock = (
  product: Doc<"products">,
  claims: Map<Id<"products">, number>,
) =>
  product.trackStock === false
    ? undefined
    : isStockQuantity(product.stock ?? 0)
      ? availableOnlineQuantity(
          product.stock ?? 0,
          claims.get(product._id) ?? 0,
        )
      : 0;

export const getFairBalance = (
  ctx: QueryCtx,
  fairId: Id<"fairs">,
  productId: Id<"products">,
) =>
  ctx.db
    .query("fairInventory")
    .withIndex("by_fair_product", (q) =>
      q.eq("fairId", fairId).eq("productId", productId),
    )
    .unique();

export const stockSummary = async (
  ctx: QueryCtx,
  product: Doc<"products">,
  fairId: Id<"fairs">,
) => {
  const [balances, claims] = await Promise.all([
    ctx.db
      .query("fairInventory")
      .withIndex("by_product", (q) => q.eq("productId", product._id))
      .collect(),
    onlineReviewClaims(ctx),
  ]);
  const fairsStock = stockQuantity(
    balances.reduce((sum, balance) => sum + stockQuantity(balance.quantity), 0),
  );
  const storedOnline = stockQuantity(product.stock ?? 0);
  const tracked = product.trackStock !== false;
  const held = tracked
    ? onlineHeldQuantity(storedOnline, claims.get(product._id) ?? 0)
    : null;
  return {
    onlineStock: tracked ? storedOnline - held! : null,
    onlinePhysicalStock: tracked ? storedOnline : null,
    onlineHeldOrders: held,
    fairStock:
      balances.find((balance) => balance.fairId === fairId)?.quantity ?? 0,
    fairsStock,
    totalStock: tracked ? stockQuantity(storedOnline + fairsStock) : null,
  };
};

export const findInventoryOperation = (ctx: QueryCtx, requestId: string) =>
  ctx.db
    .query("inventoryOperations")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .unique();

export const findStockOperation = (ctx: QueryCtx, requestId: string) =>
  ctx.db
    .query("stockOperations")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .unique();

export const POS_SALE_IN_PROGRESS =
  "Există o vânzare POS în curs pentru acest produs. Finalizeaz-o înainte.";

export const insufficientAvailableError = (held: number) =>
  new ConvexError(
    held > 0
      ? `Stoc disponibil insuficient: ${held} buc. sunt ținute pentru comenzi plătite. Reconciliază comenzile înainte.`
      : "Stoc insuficient.",
  );

export const inTransitByProduct = async (ctx: QueryCtx) => {
  const open = await ctx.db
    .query("transfers")
    .collect()
    .then((rows) =>
      rows.filter(
        (row) =>
          row.status === "in_transit" || row.status === "partially_received",
      ),
    );
  const totals = new Map<Id<"products">, number>();
  for (const transfer of open) {
    for (const line of transfer.lines) {
      totals.set(
        line.productId,
        (totals.get(line.productId) ?? 0) +
          Math.max(0, line.shippedQuantity - line.receivedQuantity),
      );
    }
  }
  return totals;
};

export const openTransfersForFair = async (
  ctx: QueryCtx,
  fairId: Id<"fairs">,
) => {
  const open = await ctx.db.query("transfers").collect();
  return open.some(
    (row) =>
      (row.status === "requested" ||
        row.status === "draft" ||
        row.status === "in_transit" ||
        row.status === "partially_received") &&
      (row.fromFairId === fairId || row.toFairId === fairId),
  );
};

export const fairPosInProgress = async (
  ctx: QueryCtx,
  fairId: Id<"fairs">,
  productId: Id<"products">,
): Promise<boolean> => {
  const attempts = await ctx.db
    .query("posAttempts")
    .withIndex("by_fair_status", (q) =>
      q.eq("fairId", fairId).eq("status", "prepared"),
    )
    .collect();
  return attempts.some((attempt) =>
    attempt.items.some((item) => item.productId === productId),
  );
};

/**
 * Latest ledger movement for one product at one location.
 * Atelier uses the product+location prefix only: transfer/archive rows
 * carry a fairId, so constraining fairId would miss them.
 */
export const latestMovement = (
  ctx: QueryCtx,
  productId: Id<"products">,
  fairId?: Id<"fairs">,
) =>
  ctx.db
    .query("stockMovements")
    .withIndex("by_product_location", (q) =>
      fairId === undefined
        ? q.eq("productId", productId).eq("location", "workshop")
        : q
            .eq("productId", productId)
            .eq("location", "fair")
            .eq("fairId", fairId),
    )
    .order("desc")
    .first();

export const transferInventory = async (
  ctx: MutationCtx,
  args: {
    requestId: string;
    fairId: Id<"fairs">;
    productId: Id<"products">;
    quantity: number;
    direction: "to_fair" | "to_online";
  },
  actorId: string,
): Promise<Doc<"inventoryOperations">> => {
  positiveInteger(args.quantity);
  if (!requestIdIsValid(args.requestId))
    throw new ConvexError("Identificator de operațiune invalid.");
  const previous = await findInventoryOperation(ctx, args.requestId);
  if (previous) {
    if (
      previous.kind !== "transfer" ||
      previous.actorId !== actorId ||
      previous.fairId !== args.fairId ||
      previous.productId !== args.productId ||
      previous.quantity !== args.quantity ||
      previous.direction !== args.direction
    ) {
      throw new ConvexError(
        "Identificator deja utilizat pentru alta operatiune.",
      );
    }
    return previous;
  }
  const [fair, product, legacy] = await Promise.all([
    ctx.db.get(args.fairId),
    ctx.db.get(args.productId),
    ctx.db
      .query("stockMovements")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .collect(),
  ]);
  if (!fair || !product)
    throw new ConvexError(
      "Târgul sau produsul nu mai există. Verifică evidența.",
    );
  const sign = args.direction === "to_fair" ? 1 : -1;
  if (legacy.length) {
    const fairMove = legacy.find((row) => row.location === "fair");
    const onlineMove = legacy.find((row) => row.location === "workshop");
    if (
      legacy.length !== 2 ||
      !fairMove ||
      !onlineMove ||
      fairMove.fairId !== args.fairId ||
      legacy.some(
        (row) =>
          row.kind !== "transfer" ||
          row.productId !== args.productId ||
          row.actorId !== actorId,
      ) ||
      fairMove.quantity !== sign * args.quantity ||
      onlineMove.quantity !== -sign * args.quantity
    ) {
      throw new ConvexError(
        "Identificator deja utilizat pentru alta operatiune.",
      );
    }
    const id = await ctx.db.insert("inventoryOperations", {
      ...args,
      kind: "transfer",
      actorId,
      fairName: fair.name,
      productName: product.name_ro || product.name,
      stockAfter: await stockSummary(ctx, product, fair._id),
      legacyReplay: true,
      createdAt: Date.now(),
    });
    return (await ctx.db.get(id))!;
  }
  if (!fair.active) throw new ConvexError("Târgul este arhivat.");
  if (args.direction === "to_fair" && product.trackStock === false) {
    throw new ConvexError(
      "Activează urmărirea stocului online înainte de alocarea la târg.",
    );
  }
  if (args.direction === "to_online") {
    const attempts = await ctx.db
      .query("posAttempts")
      .withIndex("by_fair_status", (q) =>
        q.eq("fairId", fair._id).eq("status", "prepared"),
      )
      .collect();
    if (
      attempts.some((attempt) =>
        attempt.items.some((item) => item.productId === product._id),
      )
    ) {
      throw new ConvexError(
        "Există o plată POS neclarificată pentru acest produs. Rezolvă plata înainte de retragere.",
      );
    }
  }
  const balance = await getFairBalance(ctx, fair._id, product._id);
  const before = await stockSummary(ctx, product, fair._id);
  const onlineStock = stockQuantity(product.stock ?? 0);
  const claims = await onlineReviewClaims(ctx);
  const onlineAvailable =
    product.trackStock === false
      ? null
      : availableOnlineQuantity(onlineStock, claims.get(product._id) ?? 0);
  const fairStock = stockQuantity(balance?.quantity ?? 0);
  if (
    (args.direction === "to_fair" ? (onlineAvailable ?? 0) : fairStock) <
    args.quantity
  ) {
    throw new ConvexError(
      args.direction === "to_fair"
        ? "Stoc insuficient în magazinul online."
        : "Stoc insuficient la târg.",
    );
  }
  const nextOnline = stockQuantity(onlineStock - sign * args.quantity);
  const nextFair = stockQuantity(fairStock + sign * args.quantity);
  const fairsStock = stockQuantity(before.fairsStock + sign * args.quantity);
  const onlineHeld =
    product.trackStock === false
      ? null
      : onlineHeldQuantity(nextOnline, claims.get(product._id) ?? 0);
  const operationId = await ctx.db.insert("inventoryOperations", {
    ...args,
    kind: "transfer",
    actorId,
    fairName: fair.name,
    productName: product.name_ro || product.name,
    stockAfter: {
      onlineStock: onlineHeld === null ? null : nextOnline - onlineHeld,
      onlinePhysicalStock: product.trackStock === false ? null : nextOnline,
      onlineHeldOrders: onlineHeld,
      fairStock: nextFair,
      fairsStock,
      totalStock: before.totalStock,
    },
    createdAt: Date.now(),
  });
  await ctx.db.patch(product._id, { stock: nextOnline });
  if (balance) await ctx.db.patch(balance._id, { quantity: nextFair });
  else
    await ctx.db.insert("fairInventory", {
      fairId: fair._id,
      productId: product._id,
      quantity: nextFair,
    });
  const common = {
    requestId: args.requestId,
    productId: product._id,
    fairId: fair._id,
    kind: "transfer" as const,
    actorId,
    operationId,
    createdAt: Date.now(),
  };
  await ctx.db.insert("stockMovements", {
    ...common,
    location: "workshop",
    quantity: -sign * args.quantity,
    balanceAfter: nextOnline,
  });
  await ctx.db.insert("stockMovements", {
    ...common,
    location: "fair",
    quantity: sign * args.quantity,
    balanceAfter: nextFair,
  });
  return (await ctx.db.get(operationId))!;
};

export const normalizeInventoryLines = (items: InventoryLine[]) => {
  if (!items.length || items.length > 200)
    throw new ConvexError("Selectează între 1 și 200 de produse.");
  const quantities = new Map<Id<"products">, number>();
  for (const item of items) {
    positiveInteger(item.quantity);
    const quantity = (quantities.get(item.productId) ?? 0) + item.quantity;
    positiveInteger(quantity);
    quantities.set(item.productId, quantity);
  }
  return [...quantities].map(([productId, quantity]) => ({
    productId,
    quantity,
    name: items.find((item) => item.productId === productId)?.name,
  }));
};

export const onlineDeductions = async (
  ctx: QueryCtx,
  items: InventoryLine[],
  allocatingOrderId?: Id<"orders">,
  allowShortfall = false,
): Promise<OnlineAllocation[]> => {
  const [normalized, claims] = await Promise.all([
    Promise.resolve(normalizeInventoryLines(items)),
    onlineReviewClaims(ctx, allocatingOrderId),
  ]);
  return Promise.all(
    normalized.map(async (item) => {
      const product = await ctx.db.get(item.productId);
      if (!product) {
        if (!allowShortfall) {
          throw new ConvexError(
            `Produsul ${item.name ?? item.productId} nu mai există.`,
          );
        }
        return {
          ...item,
          name: item.name ?? `Produs indisponibil (${item.productId})`,
          product: null,
          tracked: true,
          physicalStock: null,
          availableAtPayment: 0,
          appliedQuantity: 0,
          unfulfilledQuantity: item.quantity,
          stockAfter: null,
        };
      }
      const tracked = product.trackStock !== false;
      const valid = isStockQuantity(product.stock ?? 0);
      if (tracked && !valid && !allowShortfall)
        throw new ConvexError(`Stoc invalid pentru ${product.name}.`);
      const physicalStock = tracked && valid ? (product.stock ?? 0) : null;
      const availableAtPayment = tracked
        ? availableOnlineQuantity(
            physicalStock ?? 0,
            claims.get(item.productId) ?? 0,
          )
        : item.quantity;
      if (tracked && availableAtPayment < item.quantity && !allowShortfall) {
        throw new ConvexError(
          `Stoc online disponibil insuficient pentru ${product.name}: ${availableAtPayment} buc., necesar ${item.quantity}.`,
        );
      }
      const appliedQuantity = tracked
        ? Math.min(availableAtPayment, item.quantity)
        : item.quantity;
      return {
        ...item,
        name: product.name,
        product,
        tracked,
        physicalStock,
        availableAtPayment,
        appliedQuantity,
        unfulfilledQuantity: tracked ? item.quantity - appliedQuantity : 0,
        stockAfter:
          tracked && physicalStock !== null
            ? physicalStock - appliedQuantity
            : null,
      };
    }),
  );
};

export const checkoutSnapshot = async (
  ctx: QueryCtx,
  items: InventoryLine[],
): Promise<CheckoutSnapshotLine[]> => {
  const snapshot = await Promise.all(
    (await onlineDeductions(ctx, items)).map(async ({ product, quantity }) => {
      if (!product) throw new ConvexError("Produsul nu mai există.");
      if (!isSellable(product))
        throw new ConvexError("Produsul nu mai este disponibil.");
      toCents(product.price);
      return {
        productId: product._id,
        quantity,
        name: product.name,
        price: product.price,
        image:
          (await resolveImageUrls(ctx, product.imageStorageIds))[0] ||
          product.images?.[0],
      };
    }),
  );
  if (
    !Number.isSafeInteger(
      snapshot.reduce(
        (sum, item) => sum + toCents(item.price) * item.quantity,
        0,
      ),
    )
  ) {
    throw new ConvexError("Valoarea comenzii depășește limita acceptată.");
  }
  return snapshot;
};
