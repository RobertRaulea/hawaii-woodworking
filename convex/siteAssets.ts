import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";
import { resolveAssetUrls } from "./lib/storage";

export const generateAssetUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveSiteAsset = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    storageId: v.optional(v.id("_storage")),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
  },
  handler: async (ctx, { name, category, storageId, title, description, price }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("siteAssets")
      .withIndex("by_category_name", (q) => q.eq("category", category).eq("name", name))
      .collect();

    if (existing.length > 0) {
      const [primary, ...duplicates] = existing;

      if (duplicates.length > 0) {
        await Promise.all(duplicates.map((duplicate) => ctx.db.delete(duplicate._id)));
      }

      await ctx.db.patch(primary._id, {
        ...(storageId ? { storageId } : {}),
        title,
        description,
        price,
      });

      return primary._id;
    }

    if (!storageId) {
      throw new Error("An image is required to create a new custom work");
    }

    return await ctx.db.insert("siteAssets", {
      name,
      category,
      storageId,
      title,
      description,
      price,
    });
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const assets = await ctx.db.query("siteAssets").collect();
    return await resolveAssetUrls(ctx, assets);
  },
});

export const getByCategory = query({
  args: {
    category: v.string(),
  },
  handler: async (ctx, { category }) => {
    const assets = await ctx.db
      .query("siteAssets")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();

    return await resolveAssetUrls(ctx, assets);
  },
});
