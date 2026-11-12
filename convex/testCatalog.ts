'use node';

import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { requireTestEnvironment } from './lib/environment';
import { downloadImage } from './lib/downloadImage';
import { testProducts } from './lib/testProducts';

export const replace = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    inserted: number;
    skipped: number;
    archived: number;
    fairRowsCleared: number;
    attemptsCancelled: number;
    categoriesDeleted: number;
    imagesUploaded: number;
  }> => {
    requireTestEnvironment();
    const existing = await ctx.runQuery(internal.demoData.assets, {});
    const known = new Set(existing.map((asset) => asset.key));
    let imagesUploaded = 0;
    for (const product of testProducts) {
      if (known.has(product.demoKey)) continue;
      const storageId = await ctx.storage.store(
        await downloadImage(product.image.sourceUrl),
      );
      await ctx.runMutation(internal.demoData.rememberAsset, {
        key: product.demoKey,
        storageId,
        sourceUrl: product.image.sourceUrl,
        licenseUrl: product.image.licenseUrl,
      });
      imagesUploaded += 1;
    }
    const requestId = `test-catalog-reset-${Date.now()}`;
    const reset = await ctx.runMutation(
      internal.testCatalogData.archiveExistingCatalog,
      { requestId },
    );
    const inserted = await ctx.runMutation(
      internal.testCatalogData.insertTestCatalog,
      {},
    );
    return { ...reset, ...inserted, imagesUploaded };
  },
});
