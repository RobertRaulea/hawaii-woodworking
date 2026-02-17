import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateAssetUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
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

    const withUrls = await Promise.all(
      assets.map(async (asset) => {
        const url = await ctx.storage.getUrl(asset.storageId);
        if (!url) {
          return null;
        }

        return {
          _id: asset._id,
          name: asset.name,
          category: asset.category,
          storageId: asset.storageId,
          url,
        };
      })
    );

    return withUrls.filter(
      (asset): asset is NonNullable<(typeof withUrls)[number]> => asset !== null
    );
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

    const withUrls = await Promise.all(
      assets.map(async (asset) => {
        const url = await ctx.storage.getUrl(asset.storageId);
        if (!url) {
          return null;
        }

        return {
          _id: asset._id,
          name: asset.name,
          category: asset.category,
          storageId: asset.storageId,
          url,
        };
      })
    );

    return withUrls.filter(
      (asset): asset is NonNullable<(typeof withUrls)[number]> => asset !== null
    );
  },
});
