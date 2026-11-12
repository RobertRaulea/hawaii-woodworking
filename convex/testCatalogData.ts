import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import { requireTestEnvironment } from './lib/environment';
import { testProducts } from './lib/testProducts';

const ACTOR = 'test-catalog';

export const archiveExistingCatalog = internalMutation({
  args: { requestId: v.string() },
  handler: async (ctx, { requestId }) => {
    requireTestEnvironment();
    const now = Date.now();
    let fairRowsCleared = 0;
    for (const balance of await ctx.db.query('fairInventory').collect()) {
      if (balance.quantity <= 0) continue;
      const product = await ctx.db.get(balance.productId);
      const nextOnline = product
        ? (Number.isSafeInteger(product.stock) ? (product.stock as number) : 0) +
          balance.quantity
        : 0;
      if (product)
        await ctx.db.patch(product._id, { stock: nextOnline });
      await ctx.db.patch(balance._id, { quantity: 0 });
      await ctx.db.insert('stockMovements', {
        requestId,
        productId: balance.productId,
        fairId: balance.fairId,
        location: 'fair',
        kind: 'transfer',
        quantity: -balance.quantity,
        balanceAfter: 0,
        actorId: ACTOR,
        reason: 'correction',
        note: 'Reset catalog TEST: stoc intors din targ in atelier.',
        createdAt: now,
      });
      await ctx.db.insert('stockMovements', {
        requestId,
        productId: balance.productId,
        fairId: balance.fairId,
        location: 'workshop',
        kind: 'transfer',
        quantity: balance.quantity,
        balanceAfter: nextOnline,
        actorId: ACTOR,
        reason: 'correction',
        note: 'Reset catalog TEST: stoc intors din targ in atelier.',
        createdAt: now,
      });
      fairRowsCleared += 1;
    }
    let attemptsCancelled = 0;
    for (const attempt of await ctx.db.query('posAttempts').collect()) {
      if (attempt.status !== 'prepared') continue;
      await ctx.db.patch(attempt._id, { status: 'cancelled' });
      attemptsCancelled += 1;
    }
    const keepKeys = new Set(testProducts.map((p) => p.demoKey));
    let archived = 0;
    for (const product of await ctx.db.query('products').collect()) {
      if (product.archivedAt || keepKeys.has(product.demoKey ?? '')) continue;
      await ctx.db.patch(product._id, {
        archivedAt: now,
        archivedBy: ACTOR,
        active: false,
      });
      archived += 1;
    }
    return { archived, fairRowsCleared, attemptsCancelled };
  },
});

export const insertTestCatalog = internalMutation({
  args: {},
  handler: async (ctx) => {
    requireTestEnvironment();
    const assets = await ctx.db.query('demoAssets').collect();
    const images = new Map(assets.map((asset) => [asset.key, asset.storageId]));
    const missing = testProducts
      .filter((product) => !images.has(product.demoKey))
      .map((product) => product.demoKey);
    if (missing.length)
      throw new Error(`Test catalog images not uploaded: ${missing.join(', ')}`);
    const wantedCategories = new Set(testProducts.map((p) => p.category));
    const inUseCategories = new Set(
      (await ctx.db.query('products').collect())
        .filter((product) => !product.archivedAt && product.category)
        .map((product) => product.category as string),
    );
    const categories = await ctx.db.query('categories').collect();
    let categoriesDeleted = 0;
    for (const category of categories) {
      if (
        !wantedCategories.has(category.name) &&
        !inUseCategories.has(category.name)
      ) {
        await ctx.db.delete(category._id);
        categoriesDeleted += 1;
      }
    }
    const existingNames = new Set(
      (await ctx.db.query('categories').collect()).map((c) => c.name),
    );
    for (const name of wantedCategories) {
      if (!existingNames.has(name))
        await ctx.db.insert('categories', { name });
    }
    let inserted = 0;
    let skipped = 0;
    for (const product of testProducts) {
      const existing = await ctx.db
        .query('products')
        .withIndex('by_demoKey', (q) => q.eq('demoKey', product.demoKey))
        .unique();
      if (existing) {
        skipped += 1;
        continue;
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
        imageStorageIds: [images.get(product.demoKey)!],
      });
      inserted += 1;
    }
    return { inserted, skipped, categoriesDeleted };
  },
});
