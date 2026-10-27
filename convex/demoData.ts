import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { requireTestEnvironment } from './lib/environment';
import { demoProducts } from './lib/demoProducts';

export const assets = internalQuery({
  args: {},
  handler: async (ctx) => {
    requireTestEnvironment();
    return ctx.db.query('demoAssets').collect();
  },
});

export const rememberAsset = internalMutation({
  args: {
    key: v.string(), storageId: v.id('_storage'),
    sourceUrl: v.string(), licenseUrl: v.string(),
  },
  handler: async (ctx, args) => {
    requireTestEnvironment();
    const existing = await ctx.db.query('demoAssets')
      .withIndex('by_key', (q) => q.eq('key', args.key)).unique();
    if (!existing) await ctx.db.insert('demoAssets', args);
  },
});

export const insertCatalog = internalMutation({
  args: {},
  handler: async (ctx) => {
    requireTestEnvironment();
    const assets = await ctx.db.query('demoAssets').collect();
    const images = new Map(assets.map((asset) => [asset.key, asset.storageId]));
    if (demoProducts.some((product) => !images.has(product.imageKey))) {
      throw new Error('Demo images must be uploaded before inserting products.');
    }
    const existingCategories = await ctx.db.query('categories').collect();
    const categories = new Set(existingCategories.map((category) => category.name));
    let inserted = 0;
    let skipped = 0;
    for (const product of demoProducts) {
      const existing = await ctx.db.query('products')
        .withIndex('by_demoKey', (q) => q.eq('demoKey', product.demoKey)).unique();
      if (existing) { skipped++; continue; }
      if (!categories.has(product.category)) {
        await ctx.db.insert('categories', { name: product.category });
        categories.add(product.category);
      }
      await ctx.db.insert('products', {
        demoKey: product.demoKey,
        sku: product.sku,
        name: product.name,
        name_ro: product.name,
        description: product.description,
        description_ro: product.description,
        category: product.category,
        price: product.price,
        stock: product.stock,
        trackStock: true,
        active: true,
        lowStockThreshold: 5,
        imageStorageIds: [images.get(product.imageKey)!],
      });
      inserted++;
    }
    return { inserted, skipped };
  },
});
