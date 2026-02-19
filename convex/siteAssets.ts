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
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { name, category, storageId }) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query("siteAssets")
      .withIndex("by_category_name", (q) => q.eq("category", category).eq("name", name))
      .collect();

    if (existing.length > 0) {
      const [primary, ...duplicates] = existing;

      await ctx.db.patch(primary._id, { storageId });

      if (duplicates.length > 0) {
        await Promise.all(duplicates.map((duplicate) => ctx.db.delete(duplicate._id)));
      }

      return primary._id;
    }

    return await ctx.db.insert("siteAssets", {
      name,
      category,
      storageId,
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
