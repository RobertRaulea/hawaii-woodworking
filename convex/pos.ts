import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  authorizedFairIds,
  requireAdmin,
  requireFairAccess,
  requirePermission,
} from "./lib/auth";
import {
  buildSale,
  businessDate,
  positiveInteger,
  toCents,
} from "./lib/pos.utils";
import { resolveImageUrls } from "./lib/storage";
import { isSellable, productStatus, validateSku } from "./lib/products.utils";
import {
  availableOnlineQuantity,
  findInventoryOperation,
  getFairBalance,
  inTransitByProduct,
  isStockQuantity,
  onlineHeldQuantity,
  onlineReviewClaims,
  openTransfersForFair,
  stockQuantity,
  transferInventory,
} from "./lib/inventory.utils";

const paymentMethod = v.union(v.literal("cash"), v.literal("card"));
const lineValidator = v.object({
  productId: v.id("products"),
  quantity: v.number(),
  expectedUnitPriceCents: v.number(),
});

const validateRequest = (requestId: string) => {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(requestId)) {
    throw new ConvexError("Identificator de operatiune invalid.");
  }
};

const getAttempt = async (
  ctx: QueryCtx,
  requestId: string,
  sellerId: string,
) => {
  validateRequest(requestId);
  const attempt = await ctx.db
    .query("posAttempts")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .unique();
  if (attempt && attempt.sellerId !== sellerId) {
    throw new ConvexError("Operatiunea apartine altui vanzator.");
  }
  return attempt;
};

const activeFair = async (ctx: QueryCtx, fairId: Id<"fairs">) => {
  const fair = await ctx.db.get(fairId);
  if (!fair?.active) throw new ConvexError("Targul nu este activ.");
  return fair;
};

const balanceFor = getFairBalance;

const resolveLines = async (
  ctx: QueryCtx,
  fairId: Id<"fairs">,
  lines: { productId: Id<"products"> }[],
  sellableOnly = false,
) =>
  Promise.all(
    lines.map(async ({ productId }) => {
      const [product, balance] = await Promise.all([
        ctx.db.get(productId),
        balanceFor(ctx, fairId, productId),
      ]);
      if (!product) throw new ConvexError("Un produs nu mai exista.");
      if (sellableOnly && !isSellable(product))
        throw new ConvexError("Produsul nu mai este disponibil.");
      return {
        productId,
        name: product.name_ro || product.name,
        price: product.price,
        stock: balance?.quantity ?? 0,
      };
    }),
  );

export const listFairs = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, { includeArchived }) => {
    const staff = await requirePermission(ctx, "inventory.read");
    const fairs = await ctx.db.query("fairs").collect();
    const authorized = await authorizedFairIds(ctx, staff);
    if (authorized === "all") {
      return fairs.filter((fair) => includeArchived || fair.active);
    }
    return fairs.filter((fair) => fair.active && authorized.has(fair._id));
  },
});

const validFairDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

const validateFairDates = (startsOn?: string, endsOn?: string) => {
  if (startsOn !== undefined && !validFairDate(startsOn))
    throw new ConvexError("Data de început este invalidă.");
  if (endsOn !== undefined && !validFairDate(endsOn))
    throw new ConvexError("Data de sfârșit este invalidă.");
  if (startsOn && endsOn && endsOn < startsOn)
    throw new ConvexError("Data de sfârșit trebuie să fie după data de început.");
};

export const createFair = mutation({
  args: {
    name: v.string(),
    startsOn: v.optional(v.string()),
    endsOn: v.optional(v.string()),
  },
  handler: async (ctx, { name, startsOn, endsOn }) => {
    const identity = await requireAdmin(ctx);
    if (!name.trim() || name.trim().length > 100)
      throw new ConvexError("Nume de targ invalid.");
    validateFairDates(startsOn, endsOn);
    return ctx.db.insert("fairs", {
      name: name.trim(),
      active: true,
      createdBy: identity.subject,
      startsOn,
      endsOn,
    });
  },
});

export const updateFair = mutation({
  args: {
    fairId: v.id("fairs"),
    name: v.string(),
    startsOn: v.optional(v.string()),
    endsOn: v.optional(v.string()),
  },
  handler: async (ctx, { fairId, name, startsOn, endsOn }) => {
    await requirePermission(ctx, "fairs.manage");
    const fair = await ctx.db.get(fairId);
    if (!fair) throw new ConvexError("Târgul nu mai există.");
    if (!fair.active) throw new ConvexError("Târgul este arhivat.");
    if (!name.trim() || name.trim().length > 100)
      throw new ConvexError("Nume de targ invalid.");
    validateFairDates(startsOn, endsOn);
    await ctx.db.patch(fairId, {
      name: name.trim(),
      startsOn,
      endsOn,
    });
    return fairId;
  },
});

export const workspace = query({
  args: { fairId: v.id("fairs") },
  handler: async (ctx, { fairId }) => {
    const staff = await requirePermission(ctx, "pos.sell");
    await requireFairAccess(ctx, staff, fairId);
    if (!(await ctx.db.get(fairId)))
      throw new ConvexError("Târgul nu mai există.");
    const [products, balances] = await Promise.all([
      ctx.db.query("products").collect(),
      ctx.db
        .query("fairInventory")
        .withIndex("by_fair", (q) => q.eq("fairId", fairId))
        .collect(),
    ]);
    const quantities = new Map(
      balances.map((balance) => [balance.productId, balance.quantity]),
    );
    return Promise.all(
      products.filter(isSellable).map(async (product) => ({
        id: product._id,
        name: product.name_ro || product.name,
        category: product.category || "Altele",
        sku: product.sku || "",
        favorite: product.posFavorite ?? false,
        unitPriceCents: toCents(product.price),
        stock: quantities.get(product._id) ?? 0,
        trackStock: product.trackStock ?? true,
        image:
          (await resolveImageUrls(ctx, product.imageStorageIds))[0] ||
          product.images?.[0] ||
          "",
      })),
    );
  },
});

export const setProductOptions = mutation({
  args: { productId: v.id("products"), sku: v.string(), favorite: v.boolean() },
  handler: async (ctx, { productId, sku, favorite }) => {
    await requirePermission(ctx, "products.posOptions");
    if (!(await ctx.db.get(productId)))
      throw new ConvexError("Produsul nu mai exista.");
    const normalizedSku = await validateSku(ctx, productId, sku);
    await ctx.db.patch(productId, {
      sku: normalizedSku,
      posFavorite: favorite,
    });
  },
});

export const transfer = mutation({
  args: {
    requestId: v.string(),
    fairId: v.id("fairs"),
    productId: v.id("products"),
    quantity: v.number(),
    direction: v.optional(
      v.union(v.literal("to_fair"), v.literal("to_online")),
    ),
  },
  handler: async (ctx, args) => {
    const { identity } = await requirePermission(ctx, "inventory.transfer");
    validateRequest(args.requestId);
    const previous = await findInventoryOperation(ctx, args.requestId);
    const legacy = previous
      ? []
      : await ctx.db
          .query("stockMovements")
          .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
          .collect();
    if (!previous && !legacy.length) {
      throw new ConvexError(
        "Transferurile directe au fost înlocuite de modulul Transferuri.",
      );
    }
    return transferInventory(
      ctx,
      { ...args, direction: args.direction ?? "to_fair" },
      identity.subject,
    );
  },
});

export const getInventoryOperation = query({
  args: { requestId: v.string() },
  handler: async (ctx, { requestId }) => {
    const { identity } = await requirePermission(ctx, "inventory.transfer");
    validateRequest(requestId);
    const operation = await findInventoryOperation(ctx, requestId);
    if (operation && operation.actorId !== identity.subject)
      throw new ConvexError("Operațiunea aparține altui administrator.");
    return operation;
  },
});

export const getStockOverview = query({
  args: {},
  handler: async (ctx) => {
    const staff = await requirePermission(ctx, "inventory.read");
    const authorized = await authorizedFairIds(ctx, staff);
    const [products, balances, allFairs, claims, inTransit] = await Promise.all([
      ctx.db.query("products").collect(),
      ctx.db.query("fairInventory").collect(),
      ctx.db.query("fairs").collect(),
      onlineReviewClaims(ctx),
      authorized === "all" ? inTransitByProduct(ctx) : Promise.resolve(null),
    ]);
    const byProduct = new Map<Id<"products">, typeof balances>();
    for (const balance of balances) {
      const rows = byProduct.get(balance.productId) ?? [];
      rows.push(balance);
      byProduct.set(balance.productId, rows);
    }
    const fairs =
      authorized === "all"
        ? allFairs
        : allFairs.filter(
            (fair) => fair.active && authorized.has(fair._id),
          );
    const fairNames = new Map(fairs.map((fair) => [fair._id, fair.name]));
    const activeFairs = new Set(
      fairs.filter((fair) => fair.active).map((fair) => fair._id),
    );
    const knownIds = new Set(products.map((product) => product._id));
    return {
      scope: authorized === "all" ? ("all" as const) : ("assigned" as const),
      fairs,
      issues:
        authorized === "all"
          ? balances
              .filter(
                (balance) =>
                  balance.quantity !== 0 &&
                  (!knownIds.has(balance.productId) ||
                    !activeFairs.has(balance.fairId)),
              )
              .map(
                (balance) =>
                  `Balanță de verificat ${balance.productId}: ${balance.quantity} buc. la ${fairNames.get(balance.fairId) ?? "târg necunoscut"}. Produsul sau târgul nu mai este disponibil; necesită reconciliere.`,
              )
          : [],
      products: products.map((product) => {
        const rows = (byProduct.get(product._id) ?? []).filter(
          (row) => authorized === "all" || authorized.has(row.fairId),
        );
        const sum = rows.reduce((total, row) => total + row.quantity, 0);
        const valid =
          authorized === "all"
            ? rows.every((row) => isStockQuantity(row.quantity)) &&
              isStockQuantity(product.stock ?? 0) &&
              isStockQuantity(sum) &&
              isStockQuantity(sum + (product.stock ?? 0))
            : rows.every((row) => isStockQuantity(row.quantity)) &&
              isStockQuantity(sum);
        const fairsStock = valid ? sum : null;
        const onlinePhysicalStock =
          authorized === "all" &&
          valid &&
          product.trackStock !== false
            ? (product.stock ?? 0)
            : null;
        const onlineHeldOrders =
          onlinePhysicalStock === null
            ? null
            : onlineHeldQuantity(
                onlinePhysicalStock,
                claims.get(product._id) ?? 0,
              );
        const onlineStock =
          onlinePhysicalStock === null
            ? null
            : onlinePhysicalStock - onlineHeldOrders!;
        const inTransitStock =
          inTransit === null ? null : (inTransit.get(product._id) ?? 0);
        const total =
          onlinePhysicalStock !== null && fairsStock !== null
            ? onlinePhysicalStock + fairsStock + (inTransitStock ?? 0)
            : null;
        return {
          id: product._id,
          name: product.name_ro || product.name,
          category: product.category ?? "",
          sku: product.sku ?? "",
          favorite: product.posFavorite ?? false,
          trackStock: product.trackStock !== false,
          onlineStock,
          onlinePhysicalStock,
          onlineHeldOrders,
          fairsStock:
            fairsStock !== null && isStockQuantity(fairsStock)
              ? fairsStock
              : null,
          inTransitStock: inTransitStock ?? null,
          status: productStatus(product),
          totalStock: total !== null && isStockQuantity(total) ? total : null,
          invalidStock: !valid,
          lowStockThreshold: product.lowStockThreshold ?? null,
          fairs: rows.map((row) => ({
            fairId: row.fairId,
            name: fairNames.get(row.fairId) ?? "Târg indisponibil",
            quantity: row.quantity,
          })),
        };
      }),
    };
  },
});

export const getArchivePreview = query({
  args: { fairId: v.id("fairs") },
  handler: async (ctx, { fairId }) => {
    await requireAdmin(ctx);
    const fair = await ctx.db.get(fairId);
    if (!fair) throw new ConvexError("Târgul nu mai există.");
    if (await openTransfersForFair(ctx, fairId))
      throw new ConvexError(
        "Există transferuri deschise pentru acest târg. Finalizează-le sau anulează-le înainte de arhivare.",
      );
    const [balances, attempts, claims] = await Promise.all([
      ctx.db
        .query("fairInventory")
        .withIndex("by_fair", (q) => q.eq("fairId", fairId))
        .collect(),
      ctx.db
        .query("posAttempts")
        .withIndex("by_fair_status", (q) =>
          q.eq("fairId", fairId).eq("status", "prepared"),
        )
        .collect(),
      onlineReviewClaims(ctx),
    ]);
    const items = await Promise.all(
      balances
        .filter((row) => row.quantity !== 0)
        .map(async (balance) => {
          const product = await ctx.db.get(balance.productId);
          const valid =
            Boolean(product) &&
            isStockQuantity(balance.quantity) &&
            isStockQuantity(product?.stock ?? 0);
          const onlinePhysicalStock =
            valid && product?.trackStock !== false
              ? (product?.stock ?? 0)
              : null;
          const productClaims = claims.get(balance.productId) ?? 0;
          const onlineStock =
            onlinePhysicalStock === null
              ? null
              : availableOnlineQuantity(onlinePhysicalStock, productClaims);
          return {
            productId: balance.productId,
            name:
              product?.name_ro ||
              product?.name ||
              `Produs indisponibil (${balance.productId})`,
            quantity: balance.quantity,
            onlineStock,
            onlineAfter:
              onlinePhysicalStock !== null &&
              isStockQuantity(onlinePhysicalStock + balance.quantity)
                ? availableOnlineQuantity(
                    onlinePhysicalStock + balance.quantity,
                    productClaims,
                  )
                : null,
            issue: !valid
              ? "Produs sau stoc invalid; verifică evidența."
              : null,
          };
        }),
    );
    return {
      fair,
      items,
      pendingPayments: attempts.length,
      tooLarge: items.length > 500,
    };
  },
});

export const archiveFair = mutation({
  args: {
    requestId: v.string(),
    fairId: v.id("fairs"),
    expectedInventory: v.array(
      v.object({ productId: v.id("products"), quantity: v.number() }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    validateRequest(args.requestId);
    if (args.expectedInventory.length > 500)
      throw new ConvexError("Prea multe produse pentru o singură arhivare.");
    const expected = new Map<Id<"products">, number>();
    for (const item of args.expectedInventory) {
      positiveInteger(item.quantity);
      if (expected.has(item.productId))
        throw new ConvexError("Produs duplicat în confirmare.");
      expected.set(item.productId, item.quantity);
    }
    const previous = await findInventoryOperation(ctx, args.requestId);
    if (previous) {
      if (
        previous.kind !== "archive" ||
        previous.actorId !== identity.subject ||
        previous.fairId !== args.fairId ||
        previous.expectedInventory?.length !== expected.size ||
        previous.expectedInventory.some(
          (item) => expected.get(item.productId) !== item.quantity,
        )
      ) {
        throw new ConvexError("Identificator utilizat pentru altă operațiune.");
      }
      return previous;
    }
    if (
      await ctx.db
        .query("stockMovements")
        .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
        .first()
    ) {
      throw new ConvexError("Identificator utilizat pentru altă operațiune.");
    }
    const fair = await activeFair(ctx, args.fairId);
    if (await openTransfersForFair(ctx, fair._id))
      throw new ConvexError(
        "Există transferuri deschise pentru acest târg. Finalizează-le sau anulează-le înainte de arhivare.",
      );
    const pending = await ctx.db
      .query("posAttempts")
      .withIndex("by_fair_status", (q) =>
        q.eq("fairId", fair._id).eq("status", "prepared"),
      )
      .first();
    if (pending)
      throw new ConvexError(
        "Există plăți POS neclarificate. Rezolvă plățile înainte de arhivare.",
      );
    const balances = (
      await ctx.db
        .query("fairInventory")
        .withIndex("by_fair", (q) => q.eq("fairId", fair._id))
        .collect()
    ).filter((row) => row.quantity !== 0);
    if (balances.length > 500)
      throw new ConvexError(
        "Prea multe produse pentru o singură arhivare. Transferă stocul explicit înainte de arhivare.",
      );
    if (
      balances.length !== expected.size ||
      balances.some((row) => expected.get(row.productId) !== row.quantity)
    ) {
      throw new ConvexError(
        "Stocul s-a schimbat. Verifică lista și confirmă din nou.",
      );
    }
    const returns = await Promise.all(
      balances.map(async (balance) => {
        const product = await ctx.db.get(balance.productId);
        if (!product)
          throw new ConvexError(
            "Un produs nu mai există. Reconciliază stocul înainte de arhivare.",
          );
        return {
          balance,
          product,
          nextOnline: stockQuantity(
            stockQuantity(product.stock ?? 0) + stockQuantity(balance.quantity),
          ),
        };
      }),
    );
    const returnedUnits = stockQuantity(
      returns.reduce((sum, row) => sum + row.balance.quantity, 0),
    );
    const operationId = await ctx.db.insert("inventoryOperations", {
      requestId: args.requestId,
      actorId: identity.subject,
      kind: "archive",
      fairId: fair._id,
      fairName: fair.name,
      expectedInventory: args.expectedInventory,
      returnedProducts: returns.length,
      returnedUnits,
      createdAt: Date.now(),
    });
    for (const { balance, product, nextOnline } of returns) {
      await ctx.db.patch(product._id, { stock: nextOnline });
      await ctx.db.patch(balance._id, { quantity: 0 });
      const common = {
        requestId: args.requestId,
        productId: product._id,
        fairId: fair._id,
        kind: "transfer" as const,
        actorId: identity.subject,
        operationId,
        reason: "fair_archive" as const,
        createdAt: Date.now(),
      };
      await ctx.db.insert("stockMovements", {
        ...common,
        location: "fair",
        quantity: -balance.quantity,
        balanceAfter: 0,
      });
      await ctx.db.insert("stockMovements", {
        ...common,
        location: "workshop",
        quantity: balance.quantity,
        balanceAfter: nextOnline,
      });
    }
    await ctx.db.patch(fair._id, {
      active: false,
      archivedAt: Date.now(),
      archivedBy: identity.subject,
      archiveOperationId: operationId,
    });
    return (await ctx.db.get(operationId))!;
  },
});

export const prepare = mutation({
  args: {
    requestId: v.string(),
    fairId: v.id("fairs"),
    paymentMethod,
    items: v.array(lineValidator),
    discountCents: v.number(),
    discountReason: v.string(),
  },
  handler: async (ctx, args) => {
    const staff = await requirePermission(ctx, "pos.sell");
    await requireFairAccess(ctx, staff, args.fairId);
    const { identity } = staff;
    const existing = await getAttempt(ctx, args.requestId, identity.subject);
    if (existing) {
      const sameLines =
        existing.items.length === args.items.length &&
        existing.items.every(
          (item, index) =>
            item.productId === args.items[index].productId &&
            item.quantity === args.items[index].quantity &&
            item.unitPriceCents === args.items[index].expectedUnitPriceCents,
        );
      if (
        existing.fairId !== args.fairId ||
        existing.paymentMethod !== args.paymentMethod ||
        existing.discountCents !== args.discountCents ||
        existing.discountReason !== args.discountReason.trim() ||
        !sameLines
      ) {
        throw new ConvexError(
          "Identificator deja utilizat pentru alta comanda.",
        );
      }
      if (existing.status === "cancelled")
        throw new ConvexError("Operatiunea a fost anulata.");
      return existing;
    }
    const outstanding = await ctx.db
      .query("posAttempts")
      .withIndex("by_seller_status", (q) =>
        q.eq("sellerId", identity.subject).eq("status", "prepared"),
      )
      .first();
    if (outstanding)
      throw new ConvexError(
        "Ai o operatiune anterioara de verificat. Recupereaz-o inainte de o noua incasare.",
      );
    await activeFair(ctx, args.fairId);
    const sale = buildSale(
      args.items,
      await resolveLines(ctx, args.fairId, args.items, true),
      args.discountCents,
      args.discountReason,
    );
    const id = await ctx.db.insert("posAttempts", {
      ...sale,
      requestId: args.requestId,
      sellerId: identity.subject,
      fairId: args.fairId,
      paymentMethod: args.paymentMethod,
      status: "prepared",
    });
    return (await ctx.db.get(id))!;
  },
});

export const openAttempts = query({
  args: {},
  handler: async (ctx) => {
    const { identity } = await requirePermission(ctx, "pos.sell");
    return ctx.db
      .query("posAttempts")
      .withIndex("by_seller_status", (q) =>
        q.eq("sellerId", identity.subject).eq("status", "prepared"),
      )
      .collect();
  },
});

export const lookup = query({
  args: { requestId: v.string() },
  handler: async (ctx, { requestId }) => {
    const { identity } = await requirePermission(ctx, "pos.sell");
    const attempt = await getAttempt(ctx, requestId, identity.subject);
    const sale =
      attempt?.status === "completed"
        ? await ctx.db
            .query("posSales")
            .withIndex("by_request", (q) => q.eq("requestId", requestId))
            .unique()
        : null;
    return { attempt, sale };
  },
});

export const cancel = mutation({
  args: { requestId: v.string() },
  handler: async (ctx, { requestId }) => {
    const { identity } = await requirePermission(ctx, "pos.sell");
    const attempt = await getAttempt(ctx, requestId, identity.subject);
    if (!attempt || attempt.status === "cancelled") return;
    if (attempt.status === "completed")
      throw new ConvexError("Vanzarea este deja finalizata.");
    await ctx.db.patch(attempt._id, { status: "cancelled" });
  },
});

export const complete = mutation({
  args: { requestId: v.string(), receivedCents: v.optional(v.number()) },
  handler: async (ctx, { requestId, receivedCents }) => {
    const { identity } = await requirePermission(ctx, "pos.sell");
    const attempt = await getAttempt(ctx, requestId, identity.subject);
    if (!attempt || attempt.status === "cancelled")
      throw new ConvexError("Operatiune inexistenta sau anulata.");
    const existing = await ctx.db
      .query("posSales")
      .withIndex("by_request", (q) => q.eq("requestId", requestId))
      .unique();
    if (existing)
      return {
        saleId: existing._id,
        totalCents: existing.totalCents,
        changeCents: existing.changeCents,
      };
    await activeFair(ctx, attempt.fairId);
    const lines = attempt.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      expectedUnitPriceCents: item.unitPriceCents,
    }));
    const sale = buildSale(
      lines,
      await resolveLines(ctx, attempt.fairId, lines),
      attempt.discountCents,
      attempt.discountReason,
    );
    let changeCents = 0;
    if (attempt.paymentMethod === "cash") {
      if (
        receivedCents !== undefined &&
        (!Number.isSafeInteger(receivedCents) ||
          receivedCents < sale.totalCents)
      ) {
        throw new ConvexError("Suma primita nu acopera totalul.");
      }
      if (receivedCents !== undefined) {
        changeCents = receivedCents - sale.totalCents;
      }
    } else if (receivedCents !== undefined) {
      throw new ConvexError("Plata cu cardul nu are suma numerar.");
    }
    const completedAt = Date.now();
    const saleId = await ctx.db.insert("posSales", {
      ...sale,
      requestId,
      sellerId: identity.subject,
      fairId: attempt.fairId,
      paymentMethod: attempt.paymentMethod,
      receivedCents,
      changeCents,
      completedAt,
      businessDate: businessDate(completedAt),
    });
    for (const item of sale.items) {
      const balance = await balanceFor(ctx, attempt.fairId, item.productId);
      if (!balance) throw new ConvexError("Stoc inexistent la targ.");
      const quantity = balance.quantity - item.quantity;
      await ctx.db.patch(balance._id, { quantity });
      await ctx.db.insert("stockMovements", {
        requestId,
        productId: item.productId,
        fairId: attempt.fairId,
        location: "fair",
        kind: "sale",
        quantity: -item.quantity,
        balanceAfter: quantity,
        actorId: identity.subject,
        saleId,
        createdAt: completedAt,
      });
    }
    await ctx.db.patch(attempt._id, { status: "completed" });
    return { saleId, totalCents: sale.totalCents, changeCents };
  },
});

export const dailySummary = query({
  args: { fairId: v.id("fairs"), date: v.string() },
  handler: async (ctx, { fairId, date }) => {
    const staff = await requirePermission(ctx, "pos.sell");
    await requireFairAccess(ctx, staff, fairId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new ConvexError("Data invalida.");
    const sales = await ctx.db
      .query("posSales")
      .withIndex("by_fair_date", (q) =>
        q.eq("fairId", fairId).eq("businessDate", date),
      )
      .collect();
    return sales.reduce(
      (summary, sale) => ({
        totalCents: summary.totalCents + sale.totalCents,
        cashCents:
          summary.cashCents +
          (sale.paymentMethod === "cash" ? sale.totalCents : 0),
        cardCents:
          summary.cardCents +
          (sale.paymentMethod === "card" ? sale.totalCents : 0),
        units:
          summary.units +
          sale.items.reduce((sum, item) => sum + item.quantity, 0),
        count: summary.count + 1,
      }),
      { totalCents: 0, cashCents: 0, cardCents: 0, units: 0, count: 0 },
    );
  },
});
