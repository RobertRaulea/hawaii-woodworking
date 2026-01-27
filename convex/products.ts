import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Fetch all products
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    return await Promise.all(
      products.map(async (product) => {
        const imageUrls = product.imageStorageIds
          ? (await Promise.all(product.imageStorageIds.map((id) => ctx.storage.getUrl(id)))).filter(
              (url): url is string => typeof url === "string" && url.length > 0
            )
          : [];

        return {
          ...product,
          imageUrls,
        };
      })
    );
  },
});

export const generateProductImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const addProductImage = mutation({
  args: {
    productId: v.id("products"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { productId, storageId }) => {
    const product = await ctx.db.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const next = [...(product.imageStorageIds ?? []), storageId];
    await ctx.db.patch(productId, { imageStorageIds: next });

    return { imageStorageIds: next };
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
      })
    ),
  },
  handler: async (ctx, { force, products }) => {
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
    await ctx.db.patch(id, {
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
    });
  },
});
