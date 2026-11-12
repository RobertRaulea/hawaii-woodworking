'use node';

import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { requireTestEnvironment } from './lib/environment';
import { demoImageUrl, demoPhotos } from './lib/demoProducts';
import { downloadImage } from './lib/downloadImage';

export const seed = internalAction({
  args: {},
  handler: async (ctx): Promise<{ inserted: number; skipped: number }> => {
    requireTestEnvironment();
    const existing = await ctx.runQuery(internal.demoData.assets, {});
    const known = new Set(existing.map((asset) => asset.key));
    for (const photo of demoPhotos) {
      if (known.has(photo.key)) continue;
      const sourceUrl = demoImageUrl(photo.photo);
      const storageId = await ctx.storage.store(await downloadImage(sourceUrl));
      await ctx.runMutation(internal.demoData.rememberAsset, {
        key: photo.key, storageId, sourceUrl, licenseUrl: 'https://unsplash.com/license',
      });
    }
    return ctx.runMutation(internal.demoData.insertCatalog, {});
  },
});
