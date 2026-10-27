import { ConvexError, v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAdmin, requirePermission } from "./lib/auth";
import { resolveImageUrls } from "./lib/storage";
import {
  catalogAvailableStock,
  onlineReviewClaims,
} from "./lib/inventory.utils";
import {
  generateSku,
  isSellable,
  nextSku,
  productStatus,
  validateSku,
} from "./lib/products.utils";

// Fetch all products
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const [products, claims] = await Promise.all([
      ctx.db.query("products").collect(),
      onlineReviewClaims(ctx),
    ]);

    return await Promise.all(
      products.filter(isSellable).map(async (product) => {
        const imageUrls = await resolveImageUrls(ctx, product.imageStorageIds);
        return {
          ...product,
          imageUrls,
          availableStock: catalogAvailableStock(product, claims),
        };
      })
    );
  },
});

export const listAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "catalog.manage");
    const products = await ctx.db.query("products").collect();
    return await Promise.all(
      products.map(async (product) => ({
        ...product,
        status: productStatus(product),
        imageUrls: await resolveImageUrls(ctx, product.imageStorageIds),
      }))
    );
  },
});

// First image of every product, including archived/inactive ones, for
// identification thumbnails in back-office views. Readable by all staff.
export const thumbnails = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "inventory.read");
    const products = await ctx.db.query("products").collect();
    return await Promise.all(
      products.map(async (product) => ({
        id: product._id,
        url:
          (
            await resolveImageUrls(ctx, product.imageStorageIds?.slice(0, 1))
          )[0] ??
          product.images?.[0] ??
          null,
      })),
    );
  },
});

export const generateProductImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const addProductImage = mutation({
  args: {
    productId: v.id("products"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { productId, storageId }) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const next = [...(product.imageStorageIds ?? []), storageId];
    await ctx.db.patch(productId, { imageStorageIds: next });

    return { imageStorageIds: next };
  },
});

export const setProductImageStorageIds = mutation({
  args: {
    productId: v.id("products"),
    imageStorageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, { productId, imageStorageIds }) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    await ctx.db.patch(productId, { imageStorageIds });

    return { imageStorageIds };
  },
});

export const seedProducts = mutation({
  args: {
    force: v.optional(v.boolean()),
    products: v.array(
      v.object({
        name: v.string(),
        price: v.number(),
        images: v.optional(v.array(v.string())),
        imageStorageIds: v.optional(v.array(v.id("_storage"))),
        category: v.optional(v.string()),
        description: v.optional(v.string()),
        stripe_product_id: v.optional(v.string()),
        stripe_price_id: v.optional(v.string()),
        stock: v.optional(v.number()),
        lowStockThreshold: v.optional(v.number()),
        trackStock: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, { force, products }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("products").collect();

    if (!force && existing.length > 0) {
      return {
        inserted: 0,
        existing: existing.length,
        skipped: true,
      };
    }

    if (force && existing.length > 0) {
      await Promise.all(existing.map((p) => ctx.db.delete(p._id)));
    }

    const ids = await Promise.all(
      products.map((p) =>
        ctx.db.insert("products", {
          name: p.name,
          price: p.price,
          images: p.images,
          imageStorageIds: p.imageStorageIds,
          category: p.category,
          description: p.description,
          stripe_product_id: p.stripe_product_id,
          stripe_price_id: p.stripe_price_id,
          stock: p.stock ?? 0,
          lowStockThreshold: p.lowStockThreshold ?? 5,
          trackStock: p.trackStock ?? true,
        })
      )
    );

    return {
      inserted: ids.length,
      existing: existing.length,
      skipped: false,
      ids,
    };
  },
});

export const getStripePriceIds = internalQuery({
  args: { ids: v.array(v.id("products")) },
  handler: async (ctx, { ids }) => {
    const products = await Promise.all(ids.map((id) => ctx.db.get(id)));

    return ids.map((id, index) => ({
      id,
      stripePriceId: products[index]?.stripe_price_id ?? null,
    }));
  },
});

export const setStripeIds = mutation({
  args: {
    id: v.id("products"),
    stripeProductId: v.string(),
    stripePriceId: v.string(),
  },
  handler: async (ctx, { id, stripeProductId, stripePriceId }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(id, {
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
    });
  },
});

export const getById = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const product = await ctx.db.get(id);
    if (!product || !isSellable(product)) {
      return null;
    }

    const imageUrls = await resolveImageUrls(ctx, product.imageStorageIds);
    return {
      ...product,
      imageUrls,
      availableStock: catalogAvailableStock(product, await onlineReviewClaims(ctx)),
    };
  },
});

export const createProduct = mutation({
  args: {
    name: v.string(),
    price: v.number(),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    name_ro: v.optional(v.string()),
    name_en: v.optional(v.string()),
    name_de: v.optional(v.string()),
    description_ro: v.optional(v.string()),
    description_en: v.optional(v.string()),
    description_de: v.optional(v.string()),
    stock: v.optional(v.number()),
    lowStockThreshold: v.optional(v.number()),
    trackStock: v.optional(v.boolean()),
    sku: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.stock !== undefined && args.stock !== 0) {
      throw new ConvexError(
        "Stocul nu se modifică din produs. Folosește Stocuri.",
      );
    }
    const id = await ctx.db.insert("products", {
      name: args.name,
      price: args.price,
      category: args.category,
      description: args.description,
      imageStorageIds: args.imageStorageIds,
      name_ro: args.name_ro,
      name_en: args.name_en,
      name_de: args.name_de,
      description_ro: args.description_ro,
      description_en: args.description_en,
      description_de: args.description_de,
      stock: 0,
      lowStockThreshold: args.lowStockThreshold ?? 5,
      trackStock: args.trackStock ?? true,
      sku:
        args.sku === undefined || !args.sku.trim()
          ? await generateSku(ctx, args.name)
          : await validateSku(ctx, undefined, args.sku),
    });
    return id;
  },
});

export const updateProduct = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    name_ro: v.optional(v.string()),
    name_en: v.optional(v.string()),
    name_de: v.optional(v.string()),
    price: v.optional(v.number()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    description_ro: v.optional(v.string()),
    description_en: v.optional(v.string()),
    description_de: v.optional(v.string()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    stock: v.optional(v.number()),
    lowStockThreshold: v.optional(v.number()),
    trackStock: v.optional(v.boolean()),
    sku: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    if (fields.stock !== undefined) {
      throw new ConvexError(
        "Stocul nu se modifică din produs. Folosește Stocuri.",
      );
    }
    const product = await ctx.db.get(id);
    if (!product) {
      throw new Error("Product not found");
    }

    const update: Record<string, unknown> = {};
    if (fields.name !== undefined) update.name = fields.name;
    if (fields.name_ro !== undefined) update.name_ro = fields.name_ro;
    if (fields.name_en !== undefined) update.name_en = fields.name_en;
    if (fields.name_de !== undefined) update.name_de = fields.name_de;
    if (fields.price !== undefined) update.price = fields.price;
    if (fields.category !== undefined) update.category = fields.category;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.description_ro !== undefined) update.description_ro = fields.description_ro;
    if (fields.description_en !== undefined) update.description_en = fields.description_en;
    if (fields.description_de !== undefined) update.description_de = fields.description_de;
    if (fields.imageStorageIds !== undefined) update.imageStorageIds = fields.imageStorageIds;
    if (fields.lowStockThreshold !== undefined) update.lowStockThreshold = fields.lowStockThreshold;
    if (fields.trackStock !== undefined) update.trackStock = fields.trackStock;
    if (fields.sku !== undefined) update.sku = await validateSku(ctx, id, fields.sku);

    await ctx.db.patch(id, update);
    return id;
  },
});

export const setProductActive = mutation({
  args: { id: v.id("products"), active: v.boolean() },
  handler: async (ctx, { id, active }) => {
    await requirePermission(ctx, "catalog.manage");
    const product = await ctx.db.get(id);
    if (!product) throw new ConvexError("Produsul nu mai există.");
    if (product.archivedAt)
      throw new ConvexError("Restaurează produsul înainte.");
    await ctx.db.patch(id, { active });
    return id;
  },
});

const OPEN_TRANSFER_STATUSES = [
  "requested",
  "draft",
  "in_transit",
  "partially_received",
];

export const archiveProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const staff = await requirePermission(ctx, "catalog.manage");
    const product = await ctx.db.get(id);
    if (!product) throw new ConvexError("Produsul nu mai există.");
    if (product.archivedAt) return id;
    const balances = await ctx.db
      .query("fairInventory")
      .withIndex("by_product", (q) => q.eq("productId", id))
      .collect();
    if (balances.some((balance) => balance.quantity > 0))
      throw new ConvexError(
        "Produsul are stoc la târg. Transferă stocul în Atelier înainte de arhivare.",
      );
    const transfers = await ctx.db.query("transfers").collect();
    if (
      transfers.some(
        (transfer) =>
          OPEN_TRANSFER_STATUSES.includes(transfer.status) &&
          transfer.lines.some((line) => line.productId === id),
      )
    )
      throw new ConvexError(
        "Produsul face parte din transferuri deschise. Finalizează-le sau anulează-le înainte de arhivare.",
      );
    const prepared = await ctx.db.query("posAttempts").collect();
    if (
      prepared.some(
        (attempt) =>
          attempt.status === "prepared" &&
          attempt.items.some((item) => item.productId === id),
      )
    )
      throw new ConvexError(
        "Există o vânzare în curs la un târg pentru acest produs. Finalizeaz-o sau anuleaz-o înainte de arhivare.",
      );
    await ctx.db.patch(id, {
      archivedAt: Date.now(),
      archivedBy: staff.identity.subject,
      active: false,
    });
    return id;
  },
});

export const restoreProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await requirePermission(ctx, "catalog.manage");
    const product = await ctx.db.get(id);
    if (!product) throw new ConvexError("Produsul nu mai există.");
    await ctx.db.patch(id, {
      archivedAt: undefined,
      archivedBy: undefined,
      active: false,
    });
    return id;
  },
});

export const deleteProduct = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(id);
    if (!product) {
      throw new Error("Product not found");
    }
    const historyError = () =>
      new ConvexError(
        "Produsul are istoric (comenzi, vânzări sau mișcări de stoc). Arhivează-l în loc să-l ștergi.",
      );
    const [
      movements,
      orders,
      sales,
      attempts,
      transfers,
      stockOps,
      inventoryOps,
      balances,
    ] = await Promise.all([
      ctx.db
        .query("stockMovements")
        .withIndex("by_product_location", (q) => q.eq("productId", id))
        .collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("posSales").collect(),
      ctx.db.query("posAttempts").collect(),
      ctx.db.query("transfers").collect(),
      ctx.db.query("stockOperations").collect(),
      ctx.db.query("inventoryOperations").collect(),
      ctx.db
        .query("fairInventory")
        .withIndex("by_product", (q) => q.eq("productId", id))
        .collect(),
    ]);
    const hasHistory =
      movements.length > 0 ||
      orders.some((order) => order.items.some((item) => item.productId === id)) ||
      sales.some((sale) => sale.items.some((item) => item.productId === id)) ||
      attempts.some((attempt) => attempt.items.some((item) => item.productId === id)) ||
      transfers.some((transfer) => transfer.lines.some((line) => line.productId === id)) ||
      stockOps.some((op) => op.productId === id) ||
      inventoryOps.some((op) => op.productId === id) ||
      (product.stock ?? 0) !== 0 ||
      balances.some((balance) => balance.quantity !== 0);
    if (hasHistory) throw historyError();
    await ctx.db.delete(id);
    return { deleted: true };
  },
});

export const backfillSkus = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    const taken = new Set(
      products
        .map((product) => product.sku?.toUpperCase())
        .filter((sku): sku is string => Boolean(sku)),
    );
    const updated: { id: Id<"products">; sku: string }[] = [];
    for (const product of products) {
      if (product.sku?.trim()) continue;
      const sku = nextSku(product.name, taken);
      taken.add(sku);
      await ctx.db.patch(product._id, { sku });
      updated.push({ id: product._id, sku });
    }
    return { updated: updated.length, items: updated };
  },
});

export const decrementStock = internalMutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
  },
  handler: async (ctx, { productId, quantity }) => {
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const trackStock = product.trackStock ?? true;
    if (!trackStock) {
      return { success: true, stock: product.stock ?? 0 };
    }

    const currentStock = product.stock ?? 0;
    const newStock = currentStock - quantity;

    if (newStock < 0) {
      throw new Error(`Insufficient stock for product ${product.name}. Available: ${currentStock}, Requested: ${quantity}`);
    }

    await ctx.db.patch(productId, { stock: newStock });
    return { success: true, stock: newStock };
  },
});
