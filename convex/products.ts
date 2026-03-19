import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { resolveImageUrls } from "./lib/storage";

// Fetch all products
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    return await Promise.all(
      products.map(async (product) => {
        const imageUrls = await resolveImageUrls(ctx, product.imageStorageIds);
        return { ...product, imageUrls };
      })
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

export const getStripePriceIds = query({
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
    if (!product) {
      return null;
    }

    const imageUrls = await resolveImageUrls(ctx, product.imageStorageIds);
    return { ...product, imageUrls };
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
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
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
      stock: args.stock ?? 0,
      lowStockThreshold: args.lowStockThreshold ?? 5,
      trackStock: args.trackStock ?? true,
    });
    return id;
  },
});

export const updateProduct = mutation({
  args: {
    id: v.id("products"),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
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
  },
  handler: async (ctx, { id, ...fields }) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(id);
    if (!product) {
      throw new Error("Product not found");
    }

    const update: Record<string, unknown> = {};
    if (fields.name !== undefined) update.name = fields.name;
    if (fields.price !== undefined) update.price = fields.price;
    if (fields.category !== undefined) update.category = fields.category;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.imageStorageIds !== undefined) update.imageStorageIds = fields.imageStorageIds;
    if (fields.name_ro !== undefined) update.name_ro = fields.name_ro;
    if (fields.name_en !== undefined) update.name_en = fields.name_en;
    if (fields.name_de !== undefined) update.name_de = fields.name_de;
    if (fields.description_ro !== undefined) update.description_ro = fields.description_ro;
    if (fields.description_en !== undefined) update.description_en = fields.description_en;
    if (fields.description_de !== undefined) update.description_de = fields.description_de;
    if (fields.stock !== undefined) update.stock = fields.stock;
    if (fields.lowStockThreshold !== undefined) update.lowStockThreshold = fields.lowStockThreshold;
    if (fields.trackStock !== undefined) update.trackStock = fields.trackStock;

    await ctx.db.patch(id, update);
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
    await ctx.db.delete(id);
    return { deleted: true };
  },
});

export const updateStock = mutation({
  args: {
    id: v.id("products"),
    stock: v.number(),
  },
  handler: async (ctx, { id, stock }) => {
    await requireAdmin(ctx);
    const product = await ctx.db.get(id);
    if (!product) {
      throw new Error("Product not found");
    }
    if (stock < 0) {
      throw new Error("Stock cannot be negative");
    }
    await ctx.db.patch(id, { stock });
    return { stock };
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
